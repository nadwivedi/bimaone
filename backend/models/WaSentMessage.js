const mongoose = require('mongoose')

// Copies of messages we sent, so WhatsApp re-send requests ("Waiting for this message" on the
// customer's phone) can be answered even after a reconnect. Kept for 14 days.
const waSentMessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  msgId: { type: String, required: true },
  message: { type: String, required: true }, // BufferJSON-encoded proto message
  createdAt: { type: Date, default: Date.now, expires: 14 * 24 * 3600 },
})

waSentMessageSchema.index({ sessionId: 1, msgId: 1 }, { unique: true })

module.exports = mongoose.model('WaSentMessage', waSentMessageSchema)
