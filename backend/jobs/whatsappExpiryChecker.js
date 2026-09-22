const cron = require('node-cron')
const WhatsAppSetting = require('../models/WhatsAppSetting')
const MessageLog = require('../models/MessageLog')
const Insurance = require('../models/Insurance')
const Tax = require('../models/Tax')
const Puc = require('../models/Puc')
const Fitness = require('../models/Fitness')
const Gps = require('../models/Gps')
const User = require('../models/User')
const { normalizeAlertSettings } = require('../utils/whatsappAlertSettings')
const waLog = require('../utils/whatsappLogger')

// Documents that can trigger a reminder to the client's mobile number.
const SOURCES = [
  { key: 'insurance', name: 'Insurance Policy', documentType: 'Insurance', model: Insurance, dateField: 'validTo', ownerField: 'policyHolderName' },
  { key: 'tax', name: 'Road Tax', documentType: 'Tax', model: Tax, dateField: 'taxTo', ownerField: 'ownerName' },
  { key: 'puc', name: 'PUC Certificate', documentType: 'Puc', model: Puc, dateField: 'validTo', ownerField: 'ownerName' },
  { key: 'fitness', name: 'Fitness Certificate', documentType: 'Fitness', model: Fitness, dateField: 'validTo', ownerField: 'ownerName' },
  { key: 'gps', name: 'GPS', documentType: 'Gps', model: Gps, dateField: 'validTo', ownerField: 'ownerName' },
]

// Dates are stored as DD-MM-YYYY (older records may be YYYY-MM-DD).
const parseDocDate = (value) => {
  if (!value) return null
  const parts = String(value).trim().split(/[-/]/)
  if (parts.length !== 3) return null
  const yearFirst = parts[0].length === 4
  const year = Number(yearFirst ? parts[0] : parts[2])
  const month = Number(parts[1]) - 1
  const day = Number(yearFirst ? parts[2] : parts[0])
  const date = new Date(year, month, day)
  return Number.isNaN(date.getTime()) ? null : date
}

// Picks the reminder that applies today. Before expiry the smallest matching threshold wins, so
// "7 days before" and "1 day before" are two separate reminders with their own keys.
const getAlertForDay = (diffDays, rule) => {
  const beforeDays = [...(rule.beforeDays || [])].sort((a, b) => a - b)
  const afterDays = [...(rule.afterDays || [])].sort((a, b) => a - b)
  if (diffDays > 0) {
    for (const threshold of beforeDays) {
      if (diffDays <= threshold) {
        return { type: 'upcoming', key: `before-${threshold}`, label: `expires in ${diffDays} day${diffDays === 1 ? '' : 's'}` }
      }
    }
  }
  if (diffDays === 0 && rule.sendOnExpiryDay) return { type: 'today', key: 'today-0', label: 'expires today' }
  if (diffDays < 0 && rule.sendAfterExpiry) {
    const daysPast = -diffDays
    for (const threshold of afterDays) {
      if (daysPast <= threshold) {
        return { type: 'expired', key: `after-${threshold}`, label: `expired ${daysPast} day${daysPast === 1 ? '' : 's'} ago` }
      }
    }
  }
  return null
}

const footerFor = ({ signature, phone, address }) => {
  let footer = `\n\n────────────────\n*${signature}*`
  if (phone) footer += `\n📞 ${phone}`
  if (address) footer += `\n📍 ${address}`
  return footer
}

const englishMessage = ({ alert, name, serviceName, vehicleNo, expiryDate, agent }) => {
  const head = `Dear ${name || 'Customer'},\n\n📄 *${serviceName}* · 🚗 *${vehicleNo}*`
  const footer = footerFor(agent)
  if (alert.type === 'upcoming') return `${head}\n📅 Expires on *${expiryDate}* _(${alert.label})_\n\n⚠️ Please renew on time to avoid penalties and gaps in cover.${footer}`
  if (alert.type === 'today') return `${head}\n🔴 *Expires TODAY* · *${expiryDate}*\n\n⚠️ Please renew today to avoid fines.${footer}`
  return `${head}\n❌ Expired on *${expiryDate}* _(${alert.label})_\n\n⚠️ Please renew immediately to avoid heavy fines.${footer}`
}

const hindiMessage = ({ alert, name, serviceName, vehicleNo, expiryDate, agent }) => {
  const head = `प्रिय ${name || 'ग्राहक'},\n\n📄 *${serviceName}* · 🚗 *${vehicleNo}*`
  const footer = footerFor(agent)
  if (alert.type === 'upcoming') return `${head}\n📅 *${expiryDate}* को समाप्त होगा _(${alert.label})_\n\n⚠️ कृपया जुर्माने से बचने के लिए समय पर नवीनीकरण करवाएं।${footer}`
  if (alert.type === 'today') return `${head}\n🔴 *आज समाप्त हो रहा है* · *${expiryDate}*\n\n⚠️ कृपया आज ही नवीनीकरण करवाएं।${footer}`
  return `${head}\n❌ *${expiryDate}* को समाप्त हो चुका है _(${alert.label})_\n\n⚠️ कृपया भारी जुर्माने से बचने के लिए तुरंत नवीनीकरण करवाएं।${footer}`
}

const applyCustomTemplate = (template, v) => template
  .replace(/\{name\}/g, v.name || 'Customer')
  .replace(/\{serviceName\}/g, v.serviceName)
  .replace(/\{vehicleNo\}/g, v.vehicleNo)
  .replace(/\{expiryDate\}/g, v.expiryDate)
  .replace(/\{alertLabel\}/g, v.alert.label)
  .replace(/\{signature\}/g, v.agent.signature)
  .replace(/\{phone\}/g, v.agent.phone || '')
  .replace(/\{address\}/g, v.agent.address || '')

const buildMessage = (v, { customMessage, language }) => {
  if (customMessage && customMessage.trim()) return applyCustomTemplate(customMessage, v)
  if (language === 'hindi') return hindiMessage(v)
  if (language === 'both') return `${englishMessage(v)}\n\n${hindiMessage(v)}`
  return englishMessage(v)
}

// Scans documents and queues due reminders. Returns how many new messages were queued.
const checkUserAndQueueAlerts = async (specificUserId = null) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let queued = 0

  const settingCache = new Map()
  const agentCache = new Map()
  const settingFor = async (uid) => {
    if (!settingCache.has(uid)) {
      const doc = await WhatsAppSetting.findOne({ userId: uid }).lean()
      settingCache.set(uid, { ...normalizeAlertSettings(doc || {}), automationEnabled: doc?.automationEnabled !== false, messageLanguage: doc?.messageLanguage || 'english' })
    }
    return settingCache.get(uid)
  }
  const agentFor = async (uid) => {
    if (!agentCache.has(uid)) {
      const u = await User.findById(uid).select('name businessName mobile address').lean()
      agentCache.set(uid, {
        signature: u?.businessName?.trim() || u?.name?.trim() || 'Your Insurance Advisor',
        phone: u?.mobile ? `+91 ${u.mobile}` : '',
        address: typeof u?.address === 'string' ? u.address.trim() : '',
      })
    }
    return agentCache.get(uid)
  }

  for (const source of SOURCES) {
    const baseQuery = specificUserId ? { userId: specificUserId } : { userId: { $exists: true, $ne: null } }
    const docs = await source.model.find({
      ...baseQuery,
      mobileNumber: { $exists: true, $nin: [null, ''] },
      renewalStatus: { $nin: ['renewed', 'lost'] },
    }).select(`userId vehicleNumber mobileNumber ${source.dateField} ${source.ownerField}`).lean()
    if (!docs.length) continue

    // A vehicle renewed as a new record must not get reminders for the old one.
    const latestExpiry = new Map()
    const all = await source.model.find(baseQuery).select(`userId vehicleNumber ${source.dateField}`).lean()
    for (const r of all) {
      const d = parseDocDate(r[source.dateField])
      if (!d || !r.userId || !r.vehicleNumber) continue
      const k = `${r.userId}:${r.vehicleNumber}`
      if (!latestExpiry.has(k) || latestExpiry.get(k) < d.getTime()) latestExpiry.set(k, d.getTime())
    }

    for (const doc of docs) {
      const uid = String(doc.userId)
      const setting = await settingFor(uid)
      if (!setting.automationEnabled) continue
      const rule = setting.alertRules[source.key]
      if (!rule?.enabled) continue

      const expiry = parseDocDate(doc[source.dateField])
      if (!expiry) continue
      if (doc.vehicleNumber && latestExpiry.get(`${uid}:${doc.vehicleNumber}`) > expiry.getTime()) continue

      const diffDays = Math.round((expiry.getTime() - today.getTime()) / 86400000)
      const alert = getAlertForDay(diffDays, rule)
      if (!alert) continue

      // Include the expiry date so a document renewed in place gets reminders again next cycle.
      const alertKey = `${doc[source.dateField]}:${alert.key}`
      const exists = await MessageLog.exists({ userId: uid, documentId: doc._id, documentType: source.documentType, alertKey })
      if (exists) continue

      const agent = await agentFor(uid)
      const vars = {
        alert,
        name: doc[source.ownerField] || '',
        serviceName: source.name,
        vehicleNo: doc.vehicleNumber || 'your vehicle',
        expiryDate: doc[source.dateField],
        agent,
      }
      try {
        await MessageLog.create({
          userId: uid,
          documentId: doc._id,
          documentType: source.documentType,
          vehicleNumber: doc.vehicleNumber || '',
          targetNumber: String(doc.mobileNumber).trim(),
          ownerName: doc[source.ownerField] || '',
          messageBody: buildMessage(vars, { customMessage: rule.customMessage, language: setting.messageLanguage }),
          alertKey,
          status: 'pending',
          scheduledFor: new Date(),
        })
        queued++
      } catch (err) {
        if (err.code !== 11000) throw err
      }
    }
  }

  waLog.info(specificUserId ? String(specificUserId) : '', 'EXPIRY_SCAN', `${queued} reminder(s) queued`)
  return queued
}

const initWhatsAppExpiryChecker = () => {
  // 9:00 AM IST daily; the sender then delivers within the 7 AM – 9 PM window.
  cron.schedule('0 9 * * *', () => {
    checkUserAndQueueAlerts(null).catch((err) => waLog.error('', 'EXPIRY_SCAN_FAILED', err.message, err))
  }, { timezone: 'Asia/Kolkata' })
  console.log('[CRON] WhatsApp expiry checker scheduled (09:00 IST daily)')
}

module.exports = { initWhatsAppExpiryChecker, checkUserAndQueueAlerts, getAlertForDay, parseDocDate }
