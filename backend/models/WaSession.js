const mongoose = require('mongoose')

const waSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  sessionId: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    // authenticated = connected and ready to send
    enum: ['disconnected', 'initializing', 'qr_ready', 'syncing', 'authenticated', 'needs_qr', 'stopped', 'auth_failure'],
    default: 'disconnected'
  },
  qrCodeDataUrl: {
    type: String,
    default: null
  },
  phoneNumber: {
    type: String,
    default: null
  },
  lastConnectedAt: {
    type: Date
  },
  lastError: {
    type: String,
    default: null
  },
  isStopped: {
    type: Boolean,
    default: false
  },
  // Restore this session automatically after a server restart or browser crash
  autoStart: {
    type: Boolean
  },
  // Connection engine that created the saved login ('baileys'); older records were browser-based
  engine: {
    type: String
  },
  initStage: {
    type: String,
    enum: ['waiting', 'connecting', 'launching_browser', 'loading_wweb', null],
    default: null
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('WaSession', waSessionSchema)
