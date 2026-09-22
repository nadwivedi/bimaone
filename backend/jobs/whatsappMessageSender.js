const cron = require('node-cron')
const WhatsAppSetting = require('../models/WhatsAppSetting')
const MessageLog = require('../models/MessageLog')
const whatsappService = require('../services/whatsappService')
const { WaUnavailableError, WaRecipientError } = require('../services/whatsappService')
const waLog = require('../utils/whatsappLogger')

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const SEND_WINDOW_START_HOUR = 7   // 7 AM IST
const SEND_WINDOW_END_HOUR = 21    // 9 PM IST
const MAX_ATTEMPTS = 3             // for unexpected errors (not "WhatsApp offline", which never counts)
const RETRY_DELAY_MS = 10 * 60 * 1000

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
// Gap between two messages, randomised so the account doesn't look like a bot.
const humanDelay = () => sleep(process.env.WA_SEND_GAP_MS ? Number(process.env.WA_SEND_GAP_MS) : 4000 + Math.floor(Math.random() * 5000))

// Start of the current IST day / hour, as UTC Date objects (for MongoDB queries).
function istBoundaries(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  const dayStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS)
  const hourStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), ist.getUTCHours()) - IST_OFFSET_MS)
  return { hourIST: ist.getUTCHours(), dayStart, hourStart }
}

// One run per user at a time. Controllers call this right after queueing a message while the
// cron may already be running for the same user — without this, both runs read the same
// pending rows and the customer gets the message twice.
const runningUsers = new Map()

const processPendingMessagesForUser = async (userId) => {
  const uid = userId.toString()
  const running = runningUsers.get(uid)
  if (running) {
    running.rerun = true
    return
  }
  const entry = { rerun: false }
  runningUsers.set(uid, entry)
  try {
    do {
      entry.rerun = false
      await sendPendingForUser(uid)
    } while (entry.rerun)
  } catch (error) {
    console.error(`[WHATSAPP-SENDER:${uid}] Error in message sender:`, error)
    waLog.error(uid, 'SENDER_ERROR', error.message)
  } finally {
    runningUsers.delete(uid)
  }
}

async function sendPendingForUser(uid) {
  const { hourIST, dayStart, hourStart } = istBoundaries()
  if (hourIST < SEND_WINDOW_START_HOUR || hourIST >= SEND_WINDOW_END_HOUR) {
    return waLog.cronUserSkip(uid, `Outside IST sending window (hour: ${hourIST})`)
  }

  // Don't connect when nothing can be sent (paused, logged out, never connected).
  // Messages stay pending and go out once the user reconnects.
  const { ok, reason } = await whatsappService.canSend(uid)
  if (!ok) return waLog.cronUserSkip(uid, `WhatsApp not available (${reason}) — messages stay pending`)

  // Messages that failed today because WhatsApp was offline (older builds marked them failed)
  // get one more chance — one per (document, alert).
  const failedToday = await MessageLog.find({
    userId: uid,
    status: 'failed',
    createdAt: { $gte: dayStart },
    errorReason: { $regex: /not initialized|paused|State: null|State: undefined|not ready|will retry|connection lost|not connected/i }
  }).sort({ createdAt: -1 })
  const resetKeys = new Set()
  for (const f of failedToday) {
    const key = f.documentId ? `${f.documentId}:${f.alertKey || ''}` : String(f._id)
    if (resetKeys.has(key)) continue
    resetKeys.add(key)
    f.status = 'pending'
    f.errorReason = null
    f.scheduledFor = new Date()
    await f.save()
  }

  const setting = await WhatsAppSetting.findOne({ userId: uid })
  const maxPerDay = setting?.maxMessagesPerDay ?? 30
  const maxPerHour = setting?.maxMessagesPerHour ?? 6

  const sentToday = await MessageLog.countDocuments({ userId: uid, status: 'sent', sentAt: { $gte: dayStart } })
  if (sentToday >= maxPerDay) return waLog.cronUserSkip(uid, `Daily limit reached (${sentToday}/${maxPerDay})`)
  const sentThisHour = await MessageLog.countDocuments({ userId: uid, status: 'sent', sentAt: { $gte: hourStart } })
  if (sentThisHour >= maxPerHour) return waLog.cronUserSkip(uid, `Hourly limit reached (${sentThisHour}/${maxPerHour})`)

  const quota = Math.min(maxPerDay - sentToday, maxPerHour - sentThisHour)
  const pending = await MessageLog.find({
    userId: uid,
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  }).sort({ scheduledFor: 1 })
  if (pending.length === 0) return

  // One message per (document, alert): cancel duplicates.
  const seen = new Set()
  const batch = []
  for (const p of pending) {
    const key = p.documentId ? `${p.documentId}:${p.alertKey || ''}` : String(p._id)
    if (seen.has(key)) {
      p.status = 'failed'
      p.errorReason = 'Duplicate pending alert cancelled'
      await p.save()
      continue
    }
    seen.add(key)
    if (batch.length < quota) batch.push(p)
  }
  if (batch.length === 0) return

  waLog.cronUserQueued(uid, batch.length)

  for (let i = 0; i < batch.length; i++) {
    const msg = batch[i]
    try {
      const result = await whatsappService.sendWhatsAppMessage(uid, msg.targetNumber, msg.messageBody, msg.mediaPath)
      msg.status = 'sent'
      msg.sentAt = new Date()
      msg.whatsappMessageId = result.messageId
      msg.errorReason = null
      await msg.save()
    } catch (err) {
      if (err instanceof WaUnavailableError) {
        // WhatsApp is offline/restarting: keep this and the rest pending, try again next run.
        msg.errorReason = err.message
        await msg.save()
        waLog.cronUserSkip(uid, `Stopped batch: ${err.message}`)
        return
      }
      msg.attempts = (msg.attempts || 0) + 1
      msg.errorReason = err.message
      if (err instanceof WaRecipientError || msg.attempts >= MAX_ATTEMPTS) {
        msg.status = 'failed'
      } else {
        msg.scheduledFor = new Date(Date.now() + RETRY_DELAY_MS)
      }
      await msg.save()
      waLog.messageFailed(uid, msg.targetNumber, err instanceof Error ? err : null)
    }
    if (i < batch.length - 1) await humanDelay()
  }
}

const processAllPendingMessages = async () => {
  try {
    const userIds = await MessageLog.distinct('userId', {
      status: 'pending',
      scheduledFor: { $lte: new Date() }
    })
    if (userIds.length === 0) return
    waLog.cronStart(userIds.length)
    // Users are independent (each has its own connection), so they are processed in parallel.
    await Promise.allSettled(userIds.map(id => processPendingMessagesForUser(id)))
  } catch (err) {
    console.error('[WHATSAPP-SENDER] Global process error:', err)
    waLog.error('', 'CRON_GLOBAL_ERR', 'processAllPendingMessages threw an error', err instanceof Error ? err : null)
  }
}

// As soon as WhatsApp connects (QR scan or background start), send what is pending. In on-demand
// mode the browser is then closed once it has been idle for a minute.
whatsappService.setReadyHandler(async (userId) => {
  await processPendingMessagesForUser(userId)
  // Quick close if another user is queued, otherwise after the normal idle time.
  setTimeout(() => whatsappService.closeIfIdle(userId), 6000).unref?.()
  setTimeout(() => whatsappService.closeIfIdle(userId), whatsappService.config.idleCloseMs + 1000).unref?.()
})

const initWhatsAppMessageSender = () => {
  cron.schedule('*/5 * * * *', () => {
    processAllPendingMessages()
  })
  console.log('[CRON] WhatsApp Message Sender initiated (runs every 5 minutes)')
}

module.exports = {
  initWhatsAppMessageSender,
  processPendingMessagesForUser,
  processAllPendingMessages,
  istBoundaries
}
