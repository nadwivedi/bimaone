const mongoose = require('mongoose')

// WhatsApp (Baileys) login data: one document per credential / Signal key, per session.
// Values are BufferJSON-encoded strings. Treat as secret (equivalent to a private key).
const waAuthKeySchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  key: { type: String, required: true }, // 'creds' or '<type>-<id>'
  value: { type: String, required: true },
}, { timestamps: true })

waAuthKeySchema.index({ sessionId: 1, key: 1 }, { unique: true })

module.exports = mongoose.model('WaAuthKey', waAuthKeySchema)
