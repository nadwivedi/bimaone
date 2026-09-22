const QRCode = require('qrcode')
const config = require('./config')
const { profile } = require('./mongoAuthState')
const { WhatsAppManager } = require('./WhatsAppManager')
const { WaUnavailableError, WaRecipientError } = require('./errors')
const { STATE } = require('./WhatsAppSession')
const createClient = require('./createClient')
const WaSession = require('../../models/WaSession')
const waLog = require('../../utils/whatsappLogger')

const store = {
  load: (userId) => WaSession.findOne({ userId }).lean(),
  list: () => WaSession.find({}).lean(),
  save: (userId, data) => WaSession.updateOne({ userId }, { $set: data }, { upsert: true }),
}

const manager = new WhatsAppManager({
  config,
  store,
  profile,
  createClient,
  log: waLog,
  toQrDataUrl: (qr) => QRCode.toDataURL(qr, { width: 300, margin: 1 }),
})

module.exports = manager
module.exports.WaUnavailableError = WaUnavailableError
module.exports.WaRecipientError = WaRecipientError
module.exports.STATE = STATE
module.exports.config = config
