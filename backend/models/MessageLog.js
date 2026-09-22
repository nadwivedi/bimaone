const mongoose = require('mongoose')

// One WhatsApp message to a client: queued by the expiry scan (or a test send) and delivered by the sender job.
const messageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, index: true },
  documentType: {
    type: String,
    enum: ['Insurance', 'Tax', 'Puc', 'Gps', 'Fitness', 'Test'],
    required: true,
  },
  vehicleNumber: { type: String, trim: true },
  targetNumber: { type: String, required: true, trim: true },
  ownerName: { type: String, trim: true },
  messageBody: { type: String, required: true },
  mediaPath: { type: String, trim: true },
  // Identifies which reminder of which expiry cycle this is, e.g. "12-03-2026:before-7".
  alertKey: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
  scheduledFor: { type: Date, required: true },
  sentAt: { type: Date },
  errorReason: { type: String },
  // Failed attempts with an unexpected error (WhatsApp being offline doesn't count)
  attempts: { type: Number, default: 0 },
  whatsappMessageId: { type: String },
}, { timestamps: true })

messageLogSchema.index({ status: 1, scheduledFor: 1 })
messageLogSchema.index({ userId: 1, status: 1, sentAt: 1 })
messageLogSchema.index({ userId: 1, createdAt: -1 })
messageLogSchema.index(
  { userId: 1, documentId: 1, documentType: 1, alertKey: 1 },
  { unique: true, partialFilterExpression: { alertKey: { $type: 'string' } } }
)

module.exports = mongoose.model('MessageLog', messageLogSchema)
