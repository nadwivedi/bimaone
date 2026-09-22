const mongoose = require('mongoose')

const permitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vehicleNumber: {
    type: String,
    ref: 'VehicleRegistration',
    required: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true
  },
  permitDocument: {
    type: String,
    trim: true
  },
  validFrom: {
    type: String,
    required: true
  },
  validTo: {
    type: String,
    required: true
  },
  totalFee: {
    type: Number,
    default: 0
  },
  paid: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },

  // Renewal status
  isRenewed: {
    type: Boolean,
    default: false
  },
  renewalStatus: {
    type: String,
    enum: ['pending', 'renewed', 'lost', 'opportunity'],
    default: 'pending'
  },
  renewalStatusChangedAt: {
    type: Date
  },

  // WhatsApp message tracking
  whatsappMessageCount: {
    type: Number,
    default: 0
  },
  lastWhatsappSentAt: {
    type: Date
  },
  lastWhatsappReminderFor: {
    type: String,
    trim: true
  },
  whatsappReminderStages: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
})

// Optimized indexes
permitSchema.index({ vehicleNumber: 1 })
permitSchema.index({ validTo: 1 })
permitSchema.index({ createdAt: -1 })

const Permit = mongoose.models.Permit || mongoose.model('Permit', permitSchema)

module.exports = Permit
