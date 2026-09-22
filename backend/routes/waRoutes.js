const express = require('express')
const mongoose = require('mongoose')
const { requireAuth } = require('../middleware/auth')
const whatsappService = require('../services/whatsappService')
const MessageLog = require('../models/MessageLog')
const WhatsAppSetting = require('../models/WhatsAppSetting')
const { normalizeAlertSettings } = require('../utils/whatsappAlertSettings')
const { istBoundaries, processPendingMessagesForUser } = require('../jobs/whatsappMessageSender')
const { checkUserAndQueueAlerts } = require('../jobs/whatsappExpiryChecker')

// Each agent connects their own WhatsApp and sees only their own messages.
const router = express.Router()
router.use(requireAuth)

const uid = (req) => String(req.user._id)
const fail = (res, err, code = 500) => res.status(code).json({ success: false, message: err.message || String(err) })

// ── Connection ────────────────────────────────────────────────────────────────

// The WhatsApp page polls with ?watch=1, which keeps a QR code alive while it is on screen.
router.get('/status', async (req, res) => {
  try {
    const userId = uid(req)
    const status = await whatsappService.getStatus(userId, { watching: req.query.watch === '1' })
    const { dayStart } = istBoundaries()
    const [pending, failed, sentToday] = await Promise.all([
      MessageLog.countDocuments({ userId, status: 'pending' }),
      MessageLog.countDocuments({ userId, status: 'failed' }),
      MessageLog.countDocuments({ userId, status: 'sent', sentAt: { $gte: dayStart } }),
    ])
    res.json({ success: true, data: { ...status, counts: { pending, failed, sentToday } } })
  } catch (err) { fail(res, err) }
})

const action = (fn, message) => async (req, res) => {
  try {
    await fn(uid(req))
    res.json({ success: true, message })
  } catch (err) { fail(res, err) }
}

router.post('/connect', action((id) => whatsappService.connect(id), 'Connecting to WhatsApp…'))
router.post('/stop', action((id) => whatsappService.stop(id), 'WhatsApp paused. Messages will wait until you resume.'))
router.post('/cancel', action((id) => whatsappService.cancel(id), 'Connection cancelled.'))
router.post('/logout', action((id) => whatsappService.logout(id), 'WhatsApp disconnected from this account.'))
router.post('/renew-qr', action((id) => whatsappService.renewQr(id), 'Getting a new QR code…'))

// ── Actions ───────────────────────────────────────────────────────────────────

// Scan documents now and start sending whatever is due (sending continues in the background).
router.post('/scan', async (req, res) => {
  try {
    const userId = uid(req)
    const queued = await checkUserAndQueueAlerts(userId)
    processPendingMessagesForUser(userId)
    res.json({ success: true, message: queued ? `${queued} reminder(s) queued. Sending has started.` : 'No new reminders are due today.', queued })
  } catch (err) { fail(res, err) }
})

// Send one message right away (e.g. to your own number) to confirm everything works.
router.post('/test', async (req, res) => {
  const userId = uid(req)
  const number = String(req.body?.number || '').replace(/\D/g, '')
  if (number.length < 10) return fail(res, new Error('Enter a valid 10-digit mobile number'), 400)
  const text = String(req.body?.text || '').trim() || `✅ Test message from BimaOne.\nYour WhatsApp reminders are working.`
  const log = await MessageLog.create({
    userId, documentType: 'Test', targetNumber: number, ownerName: 'Test message', messageBody: text, status: 'pending', scheduledFor: new Date(),
  })
  try {
    const result = await whatsappService.sendWhatsAppMessage(userId, number, text)
    await MessageLog.updateOne({ _id: log._id }, { $set: { status: 'sent', sentAt: new Date(), whatsappMessageId: result.messageId, errorReason: null } })
    res.json({ success: true, message: 'Test message sent.' })
  } catch (err) {
    const unavailable = err instanceof whatsappService.WaUnavailableError
    await MessageLog.updateOne({ _id: log._id }, { $set: { status: unavailable ? 'pending' : 'failed', errorReason: err.message } })
    fail(res, err, unavailable ? 409 : err instanceof whatsappService.WaRecipientError ? 400 : 500)
  }
})

// ── Message log ───────────────────────────────────────────────────────────────

router.get('/logs', async (req, res) => {
  try {
    const userId = uid(req)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const filter = { userId }
    if (['pending', 'sent', 'failed'].includes(req.query.status)) filter.status = req.query.status
    const q = String(req.query.search || '').trim()
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ ownerName: rx }, { targetNumber: rx }, { vehicleNumber: rx }]
    }
    const [logs, total, byStatus] = await Promise.all([
      MessageLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      MessageLog.countDocuments(filter),
      MessageLog.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(userId) } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ])
    const counts = { pending: 0, sent: 0, failed: 0 }
    byStatus.forEach((s) => { counts[s._id] = s.n })
    res.json({ success: true, data: { logs, page, totalPages: Math.max(1, Math.ceil(total / limit)), total, counts } })
  } catch (err) { fail(res, err) }
})

router.post('/logs/:id/retry', async (req, res) => {
  try {
    const userId = uid(req)
    const log = await MessageLog.findOneAndUpdate(
      { _id: req.params.id, userId, status: { $ne: 'sent' } },
      { $set: { status: 'pending', scheduledFor: new Date(), attempts: 0, errorReason: null } },
      { returnDocument: 'after' }
    )
    if (!log) return fail(res, new Error('Message not found'), 404)
    processPendingMessagesForUser(userId)
    res.json({ success: true, message: 'Message queued again.' })
  } catch (err) { fail(res, err) }
})

router.delete('/logs/:id', async (req, res) => {
  try {
    const result = await MessageLog.deleteOne({ _id: req.params.id, userId: uid(req) })
    if (!result.deletedCount) return fail(res, new Error('Message not found'), 404)
    res.json({ success: true, message: 'Message deleted.' })
  } catch (err) { fail(res, err) }
})

// ── Settings ──────────────────────────────────────────────────────────────────

const settingResponse = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc
  const normalized = normalizeAlertSettings(obj)
  return { ...obj, alertRules: normalized.alertRules, services: normalized.services }
}

router.get('/settings', async (req, res) => {
  try {
    const setting = await WhatsAppSetting.findOneAndUpdate(
      { userId: uid(req) }, { $setOnInsert: { userId: uid(req) } }, { upsert: true, returnDocument: 'after' }
    )
    res.json({ success: true, data: settingResponse(setting) })
  } catch (err) { fail(res, err) }
})

router.put('/settings', async (req, res) => {
  try {
    const b = req.body || {}
    const setting = (await WhatsAppSetting.findOne({ userId: uid(req) })) || new WhatsAppSetting({ userId: uid(req) })
    if (typeof b.automationEnabled === 'boolean') setting.automationEnabled = b.automationEnabled
    if (['english', 'hindi', 'both'].includes(b.messageLanguage)) setting.messageLanguage = b.messageLanguage
    if (b.maxMessagesPerDay !== undefined) setting.maxMessagesPerDay = Math.min(200, Math.max(1, Number(b.maxMessagesPerDay) || 30))
    if (b.maxMessagesPerHour !== undefined) setting.maxMessagesPerHour = Math.min(60, Math.max(1, Number(b.maxMessagesPerHour) || 6))
    if (b.alertRules && typeof b.alertRules === 'object') {
      setting.alertRules = normalizeAlertSettings({ alertRules: b.alertRules }).alertRules
      setting.markModified('alertRules')
    }
    await setting.save()
    res.json({ success: true, data: settingResponse(setting), message: 'Settings saved.' })
  } catch (err) { fail(res, err) }
})

module.exports = router
