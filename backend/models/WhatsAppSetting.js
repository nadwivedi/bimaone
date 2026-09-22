const mongoose = require('mongoose')

// Per-agent WhatsApp automation settings.
const whatsappSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Master switch: when off, nothing new is queued (already queued messages stay pending).
  automationEnabled: { type: Boolean, default: true },
  alertRules: { type: mongoose.Schema.Types.Mixed, default: {} },
  messageLanguage: { type: String, enum: ['english', 'hindi', 'both'], default: 'english' },
  // Sending limits keep the WhatsApp number from being flagged as spam.
  maxMessagesPerDay: { type: Number, default: 30, min: 1, max: 200 },
  maxMessagesPerHour: { type: Number, default: 6, min: 1, max: 60 },
}, { timestamps: true })

module.exports = mongoose.model('WhatsAppSetting', whatsappSettingSchema)
