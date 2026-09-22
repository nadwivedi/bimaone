const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const { withTimeout } = require('./errors')
const { useMongoAuthState, sentMessageStore } = require('./mongoAuthState')

// Baileys talks to WhatsApp's servers over one WebSocket, the same protocol WhatsApp Web uses,
// without a browser. This adapter exposes the small client interface WhatsAppSession relies on:
//   events:  qr(qr), authenticated(), ready(), auth_failure(msg), disconnected(reason)
//   methods: initialize(), destroy(), logout(), getState(), getNumberId(num), sendMessage(jid, text, opts)

// Baileys is an ES module; load it once from this CommonJS backend.
let baileysPromise = null
const loadBaileys = () => (baileysPromise ||= import('@whiskeysockets/baileys'))

// Baileys logs through pino; we keep it silent and log important events ourselves.
const silentLogger = {
  level: 'silent',
  child() { return silentLogger },
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
}

// Baileys docs: don't fetch the newest WhatsApp Web version on every connect; the version bundled
// with the library (one or two behind) is the compatible one. Only if WhatsApp rejects it as
// outdated (405) do we fetch the current version, cached for 6 hours.
let latestVersion = { version: null, fetchedAt: 0 }
async function fetchCurrentWaVersion(baileys) {
  if (latestVersion.version && Date.now() - latestVersion.fetchedAt < 6 * 3600 * 1000) return latestVersion.version
  try {
    const res = await withTimeout(baileys.fetchLatestWaWebVersion({}), 10000, 'version fetch')
    if (res?.version) latestVersion = { version: res.version, fetchedAt: Date.now() }
  } catch (_) {}
  return latestVersion.version
}

// Retry counters must survive reconnects (Baileys docs), so they live outside the socket.
const retryCaches = new Map()
function retryCounterCache(sessionId) {
  let cache = retryCaches.get(sessionId)
  if (!cache) {
    const map = new Map()
    cache = {
      get: (k) => map.get(k),
      set: (k, v) => { map.set(k, v); if (map.size > 1000) map.delete(map.keys().next().value) },
      del: (k) => map.delete(k),
      flushAll: () => map.clear(),
    }
    retryCaches.set(sessionId, cache)
  }
  return cache
}

const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const DOC_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
}

class BaileysClient extends EventEmitter {
  constructor({ sessionId }) {
    super()
    this.sessionId = sessionId
    this.sock = null
    this.socketGen = 0
    this.closing = false
    this.isOpen = false
    this.everOpened = false
    this.qrShown = false
    this.authenticatedEmitted = false
    this.info = null
    this._pendingSave = Promise.resolve()
    this._init = null
  }

  // Resolves once a QR code is shown or the connection is open; rejects if the connection
  // fails before either (the session then retries or reports the error).
  async initialize() {
    this.closing = false
    this.baileys = await loadBaileys()
    const { state, saveCreds } = await useMongoAuthState(this.sessionId, this.baileys)
    this.authState = state
    this._saveCreds = saveCreds
    this.sent = sentMessageStore(this.sessionId, this.baileys)
    this.version = undefined // bundled version first (see fetchCurrentWaVersion)
    if (this.closing) throw new Error('Connection closed before start')

    return new Promise((resolve, reject) => {
      this._init = {
        settled: false,
        resolve: () => { if (!this._init.settled) { this._init.settled = true; resolve() } },
        reject: (e) => { if (!this._init.settled) { this._init.settled = true; reject(e) } },
      }
      this._connect()
    })
  }

  _connect() {
    const b = this.baileys
    const gen = ++this.socketGen
    const sock = b.makeWASocket({
      auth: {
        creds: this.authState.creds,
        keys: b.makeCacheableSignalKeyStore(this.authState.keys, silentLogger),
      },
      ...(this.version ? { version: this.version } : {}),
      logger: silentLogger,
      browser: b.Browsers.ubuntu('Chrome'),
      // Low memory/CPU: we only send messages, so skip chat history, and don't decrypt
      // group, broadcast, status or channel traffic at all.
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      shouldIgnoreJid: (jid) => b.isJidGroup(jid) || b.isJidBroadcast(jid) || b.isJidStatusBroadcast(jid) || b.isJidNewsletter(jid),
      markOnlineOnConnect: false, // keep phone notifications working
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      // Answer re-send requests for messages we sent (avoids "Waiting for this message").
      getMessage: (key) => this.sent.get(key),
      msgRetryCounterCache: retryCounterCache(this.sessionId),
    })
    this.sock = sock

    sock.ev.on('creds.update', () => {
      this._pendingSave = this._pendingSave.then(() => this._saveCreds()).catch(() => {})
    })

    sock.ev.on('connection.update', (update) => {
      if (gen !== this.socketGen) return
      const { connection, qr, lastDisconnect } = update

      if (qr) {
        this.qrShown = true
        this.emit('qr', qr)
        this._init?.resolve()
      }

      if (connection === 'open') {
        this.isOpen = true
        this.everOpened = true
        const me = sock.user?.id ? b.jidDecode(sock.user.id) : null
        this.info = { wid: { user: me?.user || null } }
        if (this.qrShown && !this.authenticatedEmitted) {
          this.authenticatedEmitted = true
          this.emit('authenticated')
        }
        this.emit('ready')
        this._init?.resolve()
      }

      if (connection === 'close') {
        this.isOpen = false
        if (this.closing) return
        this._onClose(lastDisconnect?.error)
      }
    })
  }

  _onClose(error) {
    const R = this.baileys.DisconnectReason
    const code = error?.output?.statusCode
    const detail = `${code || 'no code'}${error?.message ? `: ${error.message}` : ''}`

    // WhatsApp rejected the bundled client version as outdated: retry once with the current one.
    if (code === 405 && !this.everOpened && !this.versionUpgraded) {
      this.versionUpgraded = true
      return fetchCurrentWaVersion(this.baileys).then((v) => {
        if (this.closing) return
        if (v) this.version = v
        this._connect()
      })
    }

    // After a QR scan WhatsApp always asks the client to reconnect with the new credentials.
    if (code === R.restartRequired) {
      if (!this.authenticatedEmitted) {
        this.authenticatedEmitted = true
        this.emit('authenticated')
      }
      return this._connect()
    }

    // QR codes ran out without a scan: open a new socket to keep showing fresh codes.
    // (The session decides how long a QR screen may stay open.)
    if (code === R.timedOut && this.qrShown && !this.everOpened) return this._connect()

    // The saved login is no longer valid.
    if (code === R.loggedOut || code === R.badSession || code === R.multideviceMismatch || code === R.forbidden) {
      if (this.everOpened && code === R.loggedOut) this.emit('disconnected', 'LOGOUT')
      else this.emit('auth_failure', detail)
      return this._init?.resolve()
    }

    const err = new Error(`WhatsApp connection closed (${detail})`)
    if (this._init && !this._init.settled) return this._init.reject(err)
    this.emit('disconnected', code === R.connectionReplaced ? 'CONFLICT' : `CLOSED (${detail})`)
  }

  getState() {
    return this.isOpen && this.sock?.ws?.isOpen ? 'CONNECTED' : null
  }

  async getNumberId(number) {
    const digits = String(number).replace(/\D/g, '')
    const [result] = (await this.sock.onWhatsApp(digits)) || []
    return result?.exists ? { _serialized: result.jid } : null
  }

  async sendMessage(jid, text, { mediaPath } = {}) {
    let content = { text }
    if (mediaPath) {
      const ext = path.extname(mediaPath).toLowerCase()
      const data = fs.readFileSync(mediaPath)
      content = IMAGE_TYPES[ext]
        ? { image: data, mimetype: IMAGE_TYPES[ext], caption: text }
        : { document: data, mimetype: DOC_TYPES[ext] || 'application/octet-stream', fileName: path.basename(mediaPath), caption: text }
    }
    const msg = await this.sock.sendMessage(jid, content)
    await this.sent.save(msg)
    return { id: { _serialized: msg?.key?.id || null } }
  }

  // Unlink this device from the phone.
  async logout() {
    if (this.sock) await this.sock.logout()
  }

  // Close the connection; credentials written so far are flushed to disk first.
  async destroy() {
    this.closing = true
    this.socketGen++
    const sock = this.sock
    this.sock = null
    this.isOpen = false
    this._init?.reject(new Error('Connection closed'))
    if (sock) {
      try { sock.ev.removeAllListeners('connection.update') } catch (_) {}
      try { sock.end(undefined) } catch (_) {}
    }
    await this._pendingSave
  }
}

module.exports = { BaileysClient, loadBaileys }
