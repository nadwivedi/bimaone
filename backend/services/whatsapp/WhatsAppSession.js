const path = require('path')
const fs = require('fs')
const { WaUnavailableError, WaRecipientError, withTimeout } = require('./errors')

// Session states. The string values are what the API/DB expose ("authenticated" = ready to send,
// kept for compatibility with the dashboard badge).
const STATE = {
  DISCONNECTED: 'disconnected', // not connected
  INITIALIZING: 'initializing', // connecting to WhatsApp
  QR: 'qr_ready',               // waiting for the user to scan
  SYNCING: 'syncing',           // QR scanned, finishing the login
  READY: 'authenticated',       // connected, can send
  NEEDS_QR: 'needs_qr',         // saved login is gone or invalid — only a QR scan can fix it
  STOPPED: 'stopped',           // user paused sending
}

// Client "disconnected" reasons that mean the linked device was removed.
const LOGGED_OUT_REASONS = new Set(['LOGOUT'])

// Connection errors worth an immediate retry while starting (network blips, WhatsApp busy).
const TRANSIENT_LAUNCH = /connection closed|connection lost|connection failure|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up|stream errored/i
const MAX_LAUNCH_RETRIES = 2

// Send errors meaning the connection dropped (message stays pending, session is restarted).
const CONNECTION_GONE = /connection closed|connection lost|connection was lost|not open|timed out|stream errored|ECONNRESET/i

// Serializes async work. Every lifecycle change (start/stop/logout/crash handling) runs through
// one of these per user, so two connections can never be opened for the same login.
class Mutex {
  constructor() { this._tail = Promise.resolve() }
  run(fn) {
    const result = this._tail.then(() => fn())
    this._tail = result.catch(() => {})
    return result
  }
}

class WhatsAppSession {
  /**
   * @param {string} userId
   * @param {object} deps
   *   config, store (DB), createClient({ sessionId }), profile: { hasSavedSession(id), wipe(id) },
   *   launchSlots, log, toQrDataUrl(qr), onReady(userId)
   */
  constructor(userId, deps) {
    this.userId = String(userId)
    this.sessionId = `user_${this.userId}`
    this.deps = deps
    this.config = deps.config

    this.state = STATE.DISCONNECTED
    this.initStage = null
    this.qrDataUrl = null
    this.qrStartedAt = null
    this.lastPollAt = 0
    this.phoneNumber = null
    this.lastConnectedAt = null
    this.lastError = null
    this.autoStart = false // reconnect automatically (keep-alive mode)
    this.nextReconnectAt = null

    this.client = null
    this.generation = 0     // bumped on every launch/teardown; events from older connections are ignored
    this.allowQr = false    // false for background starts: a QR means "login lost", not "show it"
    this.lock = new Mutex()
    this.sendLock = new Mutex()
    this.readyWaiters = new Set()
    this.reconnectAttempts = 0
    this.reconnectTimer = null
    this.launchTimer = null
    this.releaseLaunchSlot = null
    this.healthFails = 0
    this.launchRetries = 0
    this.qrRefreshes = 0
    this.sendsInFlight = 0
    this.lastActivityAt = Date.now()
    this.startedAt = null

    this._saveChain = Promise.resolve()
    this._hydrated = null
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  hydrate() {
    if (!this._hydrated) {
      this._hydrated = (async () => {
        const doc = await this.deps.store.load(this.userId).catch(() => null)
        if (!doc) return
        this.phoneNumber = doc.phoneNumber || null
        this.lastConnectedAt = doc.lastConnectedAt || null
        this.lastError = doc.lastError || null
        this.autoStart = doc.autoStart === true
        if (doc.status === STATE.STOPPED || doc.isStopped) this.state = STATE.STOPPED
        else if (doc.status === STATE.NEEDS_QR || doc.status === 'auth_failure') this.state = STATE.NEEDS_QR
        else this.state = STATE.DISCONNECTED // nothing is running in this process yet

        // Linked with the old browser-based engine: that login can't be reused, one scan is needed.
        if (doc.engine !== 'baileys' && doc.lastConnectedAt && !this.hasSavedSession() && this.state === STATE.DISCONNECTED) {
          this.state = STATE.NEEDS_QR
          this.lastError = 'WhatsApp connection was upgraded. Please scan the QR code once to reconnect.'
          this.autoStart = false
        }
      })()
    }
    return this._hydrated
  }

  _persist() {
    const snapshot = {
      sessionId: this.sessionId,
      status: this.state,
      initStage: this.initStage,
      phoneNumber: this.phoneNumber,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError,
      isStopped: this.state === STATE.STOPPED,
      autoStart: this.autoStart,
      engine: 'baileys',
      qrCodeDataUrl: null,
    }
    // Chained so an older write can never land after a newer one.
    this._saveChain = this._saveChain
      .then(() => this.deps.store.save(this.userId, snapshot))
      .catch(err => this.deps.log.warn(this.userId, 'DB_SAVE_FAILED', err.message))
    return this._saveChain
  }

  _setState(state, extra = {}) {
    const prev = this.state
    this.state = state
    for (const [k, v] of Object.entries(extra)) this[k] = v
    if (state !== STATE.INITIALIZING) this.initStage = extra.initStage ?? null
    if (state !== STATE.QR) { this.qrDataUrl = null; this.qrStartedAt = null }
    if (prev !== state) this.deps.log.info(this.userId, 'STATE', `${prev} -> ${state}${this.lastError && state !== STATE.READY ? ` (${this.lastError})` : ''}`)
    if (state === STATE.READY) this._resolveWaiters()
    else if (![STATE.INITIALIZING, STATE.SYNCING].includes(state)) {
      this._rejectWaiters(this._unavailableError())
    }
    return this._persist()
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  hasSavedSession() {
    return this.deps.profile.hasSavedSession(this.sessionId)
  }

  isRunning() {
    return !!this.client
  }

  // A connection exists, or a start is queued waiting for a free session slot.
  _isStarting() {
    return !!this.client || [STATE.INITIALIZING, STATE.SYNCING].includes(this.state)
  }

  touchPoll() {
    this.lastPollAt = Date.now()
  }

  snapshot() {
    return {
      status: this.state,
      initStage: this.initStage,
      qrCodeDataUrl: this.state === STATE.QR ? this.qrDataUrl : null,
      qrExpiresAt: this.state === STATE.QR && this.qrStartedAt
        ? new Date(this.qrStartedAt + this.config.qrMaxMs).toISOString()
        : null,
      phoneNumber: this.phoneNumber,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError,
      isStopped: this.state === STATE.STOPPED,
      isInitializing: [STATE.INITIALIZING, STATE.SYNCING].includes(this.state),
      clientActive: this.state === STATE.READY,
      hasSavedSession: this.hasSavedSession(),
      nextReconnectAt: this.nextReconnectAt ? new Date(this.nextReconnectAt).toISOString() : null,
      startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
      keepAlive: this.config.keepAlive,
    }
  }

  // ── Public lifecycle (all serialized) ──────────────────────────────────────

  // User clicked Connect / Resume: connect and show a QR if one is needed.
  connect() {
    return this.lock.run(async () => {
      await this.hydrate()
      this._clearReconnect()
      if (this._isStarting()) {
        // A background start is already running — let it show a QR if the login turns out invalid.
        this.allowQr = true
        if (this.state === STATE.QR) this.lastPollAt = Date.now()
        return
      }
      await this._launch({ allowQr: true, reason: 'user' })
    })
  }

  // Background start (message send, keep-alive reconnect). Never shows a QR.
  ensureRunning(reason = 'background') {
    return this.lock.run(async () => {
      await this.hydrate()
      if (this._isStarting()) return
      if ([STATE.STOPPED, STATE.NEEDS_QR].includes(this.state)) return
      if (!this.hasSavedSession()) return
      await this._launch({ allowQr: false, reason })
    })
  }

  // Pause: disconnect, keep the login on disk.
  stop() {
    return this.lock.run(async () => {
      await this.hydrate()
      this._clearReconnect()
      await this._teardown()
      await this._setState(STATE.STOPPED, { lastError: null, autoStart: false })
    })
  }

  // Cancel a QR / connection attempt without changing the saved login.
  cancel() {
    return this.lock.run(async () => {
      await this.hydrate()
      this._clearReconnect()
      await this._teardown()
      await this._setState(this.hasSavedSession() ? STATE.DISCONNECTED : STATE.NEEDS_QR, { lastError: null })
    })
  }

  // Unlink the device and delete the saved login.
  logout() {
    return this.lock.run(async () => {
      await this.hydrate()
      this._clearReconnect()
      const client = this.client
      if (client && this.state === STATE.READY) {
        await withTimeout(client.logout(), 20000, 'logout').catch(() => {})
      }
      await this._teardown()
      await this.deps.profile.wipe(this.sessionId)
      await this._setState(STATE.DISCONNECTED, { phoneNumber: null, lastError: null, autoStart: false })
      this.deps.log.info(this.userId, 'LOGOUT', 'Logged out and saved session deleted')
    })
  }

  // Fresh QR: reconnect in "show QR" mode.
  renewQr() {
    return this.lock.run(async () => {
      await this.hydrate()
      this._clearReconnect()
      await this._teardown()
      await this._launch({ allowQr: true, reason: 'renew-qr' })
    })
  }

  // Server shutdown: close the connection and flush credentials to disk.
  shutdown() {
    return this.lock.run(async () => {
      this._clearReconnect()
      await this._teardown()
    })
  }

  // ── Launch / teardown (must run inside this.lock) ──────────────────────────

  async _launch({ allowQr, reason, retry = false }) {
    if (!retry) {
      this.launchRetries = 0
      this.qrRefreshes = 0
    }
    const gen = ++this.generation
    this.allowQr = allowQr
    this.startedAt = Date.now()
    this.healthFails = 0
    this._launchReason = reason
    this.deps.log.info(this.userId, 'LAUNCH', `Connecting to WhatsApp (${reason}, qr ${allowQr ? 'allowed' : 'not allowed'})`)
    await this._setState(STATE.INITIALIZING, { initStage: 'waiting', lastError: null, nextReconnectAt: null })

    // Not awaited: waiting for a free session slot can take a while and must not block stop/logout.
    this._runLaunch(gen).catch(err => this._onLaunchFailed(gen, err))
  }

  async _runLaunch(gen) {
    if (this.deps.launchSlots.active >= this.deps.launchSlots.max) {
      this.deps.log.info(this.userId, 'WAITING_FOR_SLOT', 'Another WhatsApp session is active — waiting for it to finish')
    }
    const release = await this.deps.launchSlots.acquire()
    let released = false
    const releaseOnce = () => { if (!released) { released = true; release() } }
    if (gen !== this.generation) return releaseOnce() // cancelled while waiting for a slot
    this.releaseLaunchSlot = releaseOnce

    // Saved data without a completed login (e.g. an abandoned QR scan) is worth nothing: start clean.
    if (!this.hasSavedSession()) {
      await this.deps.profile.wipe(this.sessionId)
      if (gen !== this.generation) return releaseOnce() // cancelled meanwhile
    }

    const client = this.deps.createClient({ sessionId: this.sessionId })
    this.client = client
    this._attachClientEvents(client, gen)
    this.initStage = 'connecting'
    this._persist()

    this.launchTimer = setTimeout(() => {
      this._onLaunchFailed(gen, new Error(`WhatsApp did not connect within ${Math.round(this.config.launchTimeoutMs / 1000)}s`))
    }, this.config.launchTimeoutMs)

    await client.initialize()
  }

  _attachClientEvents(client, gen) {
    const live = () => gen === this.generation

    client.on('qr', async (qr) => {
      if (!live()) return
      this._finishLaunchPhase()
      if (!this.allowQr) {
        // Background start and WhatsApp wants a QR → the saved login is no longer valid.
        return this._onNeedsQr(gen, 'Your WhatsApp login has expired. Scan the QR code again to reconnect.', true)
      }
      try {
        const dataUrl = await this.deps.toQrDataUrl(qr)
        if (!live()) return
        const first = this.state !== STATE.QR
        this.qrDataUrl = dataUrl
        if (first) {
          this.qrStartedAt = Date.now()
          this.lastPollAt = Math.max(this.lastPollAt, Date.now())
          await this._setState(STATE.QR, { lastError: null })
          this.deps.log.info(this.userId, 'QR_READY', 'QR code ready to scan')
        }
      } catch (err) {
        this.deps.log.error(this.userId, 'QR_RENDER_FAILED', err.message)
      }
    })

    client.on('authenticated', () => {
      if (!live()) return
      this._finishLaunchPhase()
      this.launchTimer = setTimeout(() => {
        this._onLaunchFailed(gen, new Error('WhatsApp accepted the QR scan but did not finish connecting'))
      }, this.config.launchTimeoutMs)
      this._setState(STATE.SYNCING, { lastError: null })
    })

    client.on('ready', () => {
      if (!live()) return
      this._markReady(client.info?.wid?.user)
    })

    client.on('auth_failure', (msg) => {
      if (!live()) return
      // The user is at the screen: throw away the invalid login and show a fresh QR right away.
      if (this.allowQr && this.qrRefreshes < 1) {
        this.qrRefreshes++
        return this.lock.run(async () => {
          if (gen !== this.generation) return
          this.deps.log.warn(this.userId, 'AUTH_FAILURE', `${msg} — starting over with a new QR code`)
          await this._teardown()
          await this.deps.profile.wipe(this.sessionId)
          await this._launch({ allowQr: true, reason: 'fresh login', retry: true })
        })
      }
      this._onNeedsQr(gen, `WhatsApp rejected the saved login (${msg}). Scan the QR code again.`, true)
    })

    client.on('disconnected', (reason) => {
      if (!live()) return
      const r = String(reason)
      this.deps.log.warn(this.userId, 'DISCONNECTED', r)
      if (LOGGED_OUT_REASONS.has(r)) {
        return this._onNeedsQr(gen, 'WhatsApp was logged out from your phone (Linked Devices). Scan the QR code again.', true)
      }
      this._onCrash(gen, `WhatsApp disconnected (${r})`)
    })
  }

  _markReady(phoneFromClient) {
    if (this.state === STATE.READY) return
    this._finishLaunchPhase()
    this.reconnectAttempts = 0
    this.healthFails = 0
    this.lastActivityAt = Date.now()
    const phone = phoneFromClient || this.phoneNumber
    this.deps.log.info(this.userId, 'READY', `Connected as +${phone || 'unknown'} in ${Math.round((Date.now() - (this.startedAt || Date.now())) / 1000)}s`)
    this._setState(STATE.READY, {
      phoneNumber: phone,
      lastConnectedAt: new Date(),
      lastError: null,
      autoStart: true,
      nextReconnectAt: null,
    })
    // Send whatever is pending right away (the manager hands this to the message sender).
    Promise.resolve(this.deps.onReady?.(this.userId)).catch(err => this.deps.log.error(this.userId, 'ON_READY_FAILED', err.message))
  }

  _finishLaunchPhase() {
    this.launchRetries = 0
    if (this.launchTimer) { clearTimeout(this.launchTimer); this.launchTimer = null }
  }

  _releaseSlot() {
    if (this.releaseLaunchSlot) {
      this.releaseLaunchSlot()
      this.releaseLaunchSlot = null
    }
  }

  async _teardown() {
    this.generation++ // any event from the old connection is ignored from now on
    this._finishLaunchPhase()
    const client = this.client
    this.client = null
    this.startedAt = null
    if (client) {
      await withTimeout(client.destroy(), 15000, 'disconnect').catch(() => {})
      this.deps.log.info(this.userId, 'CLOSED', 'WhatsApp connection closed')
    }
    this._releaseSlot() // only now can the next user's session start
  }

  // ── Failure handling ───────────────────────────────────────────────────────

  _onLaunchFailed(gen, err) {
    return this.lock.run(async () => {
      if (gen !== this.generation) return
      const msg = String(err?.message || err)
      if (TRANSIENT_LAUNCH.test(msg) && this.launchRetries < MAX_LAUNCH_RETRIES) {
        const attempt = ++this.launchRetries
        this.deps.log.warn(this.userId, 'LAUNCH_RETRY', `${msg} — retrying (${attempt}/${MAX_LAUNCH_RETRIES})`)
        const allowQr = this.allowQr
        await this._teardown()
        this.launchRetries = attempt // _teardown → _finishLaunchPhase resets it
        return this._launch({ allowQr, reason: `${this._launchReason || 'launch'} retry ${attempt}`, retry: true })
      }
      this.deps.log.error(this.userId, 'LAUNCH_FAILED', msg)
      await this._teardown()
      if (this.config.keepAlive && this.autoStart && this.hasSavedSession()) {
        await this._setState(STATE.DISCONNECTED, { lastError: `Could not connect to WhatsApp: ${msg}. Retrying automatically.` })
        this._scheduleReconnect()
      } else {
        await this._setState(this.hasSavedSession() ? STATE.DISCONNECTED : STATE.NEEDS_QR, { lastError: `Could not connect to WhatsApp: ${msg}` })
      }
    })
  }

  _onNeedsQr(gen, message, wipe) {
    return this.lock.run(async () => {
      if (gen !== this.generation) return
      this.deps.log.warn(this.userId, 'NEEDS_QR', message)
      this._clearReconnect()
      await this._teardown()
      if (wipe) await this.deps.profile.wipe(this.sessionId)
      await this._setState(STATE.NEEDS_QR, { lastError: message, autoStart: false })
    })
  }

  _onCrash(gen, message) {
    return this.lock.run(async () => {
      if (gen !== this.generation) return
      this.deps.log.warn(this.userId, 'CRASH', message)
      const wasUserQr = this.state === STATE.QR
      await this._teardown()
      if (!wasUserQr && this.config.keepAlive && this.autoStart && this.hasSavedSession()) {
        await this._setState(STATE.DISCONNECTED, { lastError: `${message}. Reconnecting automatically.` })
        this._scheduleReconnect()
      } else if (!wasUserQr && this.hasSavedSession()) {
        // On-demand mode: nothing to do now; the next send connects again.
        await this._setState(STATE.DISCONNECTED, { lastError: `${message}. It will reconnect automatically when a message needs to be sent.` })
      } else {
        await this._setState(this.hasSavedSession() ? STATE.DISCONNECTED : STATE.NEEDS_QR, { lastError: message })
      }
    })
  }

  _scheduleReconnect() {
    this._clearReconnect()
    const delays = this.config.reconnectDelaysMs
    const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)]
    this.reconnectAttempts++
    this.nextReconnectAt = Date.now() + delay
    this.deps.log.info(this.userId, 'RECONNECT_SCHEDULED', `Attempt ${this.reconnectAttempts} in ${Math.round(delay / 1000)}s`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.nextReconnectAt = null
      this.ensureRunning('reconnect').catch(() => {})
    }, delay)
    this.reconnectTimer.unref?.()
  }

  _clearReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.nextReconnectAt = null
  }

  // ── Health check (called by the manager's watchdog) ────────────────────────

  async healthCheck() {
    const gen = this.generation
    const now = Date.now()

    if (this.state === STATE.QR) {
      const idle = now - this.lastPollAt > this.config.qrIdleMs
      const tooLong = this.qrStartedAt && now - this.qrStartedAt > this.config.qrMaxMs
      if (idle || tooLong) {
        return this.lock.run(async () => {
          if (gen !== this.generation || this.state !== STATE.QR) return
          this.deps.log.info(this.userId, 'QR_EXPIRED', idle ? 'Nobody is viewing the QR page' : 'QR not scanned in time')
          await this._teardown()
          await this._setState(this.hasSavedSession() ? STATE.DISCONNECTED : STATE.NEEDS_QR, {
            lastError: 'QR code expired. Click Connect to get a new one.',
          })
        })
      }
      return
    }

    if (this.state !== STATE.READY || !this.client) return

    const waState = await withTimeout(Promise.resolve(this.client.getState()), 20000, 'health check').catch(() => null)
    if (gen !== this.generation) return
    if (waState === 'CONNECTED') {
      this.healthFails = 0
    } else {
      this.healthFails++
      this.deps.log.warn(this.userId, 'HEALTH_CHECK', `State ${waState} (${this.healthFails}/${this.config.watchdogFailLimit})`)
      if (this.healthFails >= this.config.watchdogFailLimit) {
        return this._onCrash(gen, `WhatsApp stopped responding (state: ${waState})`)
      }
    }

    await this.closeIfIdle()
  }

  // On-demand mode: disconnect once nothing has been sent for idleCloseMs.
  // The login stays on disk; the next message due connects again without a QR.
  closeIfIdle() {
    if (this.config.keepAlive) return
    const gen = this.generation
    return this.lock.run(async () => {
      if (gen !== this.generation || this.state !== STATE.READY || this.sendsInFlight > 0) return
      // Close almost immediately when another user is waiting for the slot.
      const idleLimit = this.deps.launchSlots.waiting > 0 ? 5000 : this.config.idleCloseMs
      if (Date.now() - this.lastActivityAt < idleLimit) return
      this.deps.log.info(this.userId, 'IDLE_CLOSE', 'Nothing left to send — disconnecting (login stays saved)')
      await this._teardown()
      await this._setState(STATE.DISCONNECTED, { lastError: null })
    })
  }

  // ── Sending ────────────────────────────────────────────────────────────────

  _unavailableError() {
    switch (this.state) {
      case STATE.STOPPED: return new WaUnavailableError('WhatsApp sending is paused.', 'stopped')
      case STATE.NEEDS_QR: return new WaUnavailableError('WhatsApp is not connected — scan the QR code on the WhatsApp page.', 'needs_qr')
      case STATE.QR: return new WaUnavailableError('WhatsApp is waiting for a QR scan.', 'needs_qr')
      default: return new WaUnavailableError('WhatsApp is not connected right now. The message will be retried.', 'not_connected')
    }
  }

  _resolveWaiters() {
    for (const w of this.readyWaiters) w.resolve()
    this.readyWaiters.clear()
  }

  _rejectWaiters(err) {
    for (const w of this.readyWaiters) w.reject(err)
    this.readyWaiters.clear()
  }

  waitUntilReady(timeoutMs) {
    if (this.state === STATE.READY && this.client) return Promise.resolve()
    if (![STATE.INITIALIZING, STATE.SYNCING].includes(this.state)) return Promise.reject(this._unavailableError())
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve: () => { clearTimeout(timer); resolve() },
        reject: (e) => { clearTimeout(timer); reject(e) },
      }
      const timer = setTimeout(() => {
        this.readyWaiters.delete(waiter)
        reject(new WaUnavailableError('WhatsApp is still connecting. The message will be retried.', 'starting'))
      }, timeoutMs)
      this.readyWaiters.add(waiter)
    })
  }

  // Can a message be sent without user action? (Used by the sender to skip users without connecting.)
  canSendInBackground() {
    if ([STATE.STOPPED, STATE.NEEDS_QR, STATE.QR].includes(this.state)) return false
    return this.isRunning() || this.hasSavedSession()
  }

  async send(targetNumber, text, mediaPath = null) {
    await this.hydrate()
    this.lastActivityAt = Date.now()
    if (!this.canSendInBackground()) throw this._unavailableError()
    this.sendsInFlight++
    try {
      if (!this._isStarting()) await this.ensureRunning('send')
      await this.waitUntilReady(this.config.sendWaitReadyMs)
      return await this.sendLock.run(() => this._doSend(targetNumber, text, mediaPath))
    } finally {
      this.sendsInFlight--
      this.lastActivityAt = Date.now()
    }
  }

  async _doSend(targetNumber, text, mediaPath) {
    const client = this.client
    const gen = this.generation
    if (!client || this.state !== STATE.READY) throw this._unavailableError()

    let num = String(targetNumber || '').replace(/\D/g, '')
    if (num.length === 10) num = '91' + num
    if (num.length < 11) throw new WaRecipientError(`Invalid mobile number: ${targetNumber}`)

    try {
      const numberId = await withTimeout(client.getNumberId(num), 30000, 'number lookup')
      if (!numberId) throw new WaRecipientError(`${num} is not registered on WhatsApp`)
      const chatId = numberId._serialized

      const media = this._resolveMedia(mediaPath)
      let result
      try {
        result = await withTimeout(client.sendMessage(chatId, text, { mediaPath: media }), this.config.sendTimeoutMs, 'send')
      } catch (err) {
        if (!media || CONNECTION_GONE.test(err?.message || '')) throw err
        this.deps.log.warn(this.userId, 'MEDIA_FAILED', `Sending text only: ${err.message}`)
        result = await withTimeout(client.sendMessage(chatId, text), this.config.sendTimeoutMs, 'send')
      }

      this.lastActivityAt = Date.now()
      this.deps.log.info(this.userId, 'MSG_SENT', `Sent to ${num}`)
      return { success: true, messageId: result?.id?._serialized || null }
    } catch (err) {
      if (err instanceof WaRecipientError) throw err
      const msg = String(err?.message || err)
      if (CONNECTION_GONE.test(msg)) {
        // The connection dropped mid-send: reconnect and keep the message pending.
        this._onCrash(gen, `Connection lost while sending: ${msg}`)
        throw new WaUnavailableError(`WhatsApp connection was interrupted (${msg}). The message will be retried.`, 'interrupted')
      }
      throw err
    }
  }

  // Attachments are stored relative to the backend folder (e.g. "uploads/policy.pdf").
  _resolveMedia(mediaPath) {
    if (!mediaPath) return null
    let full = mediaPath
    if (!path.isAbsolute(full)) {
      const clean = String(mediaPath).replace(/\\/g, '/').replace(/^\/+/, '')
      full = path.join(__dirname, '..', '..', clean)
    }
    if (!fs.existsSync(full)) {
      this.deps.log.warn(this.userId, 'MEDIA_MISSING', `Attachment not found: ${full}. Sending text only.`)
      return null
    }
    return full
  }
}

module.exports = { WhatsAppSession, STATE, Mutex }
