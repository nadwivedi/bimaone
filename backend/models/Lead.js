const mongoose = require('mongoose')

// Dates are stored as 'YYYY-MM-DD' strings so "today / overdue / upcoming" can be
// compared as plain strings against the user's local date, with no timezone drift.
const FollowUpSchema = new mongoose.Schema({
  date: { type: String, required: true },
  note: { type: String, trim: true, default: '' },
  outcome: { type: String, trim: true, default: '' },
  nextFollowUpDate: { type: String, default: '' },
  nextFollowUpTime: { type: String, default: '' },
}, { timestamps: true })

const LeadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: { type: String, trim: true, required: true },
  mobile: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  city: { type: String, trim: true, default: '' },
  vehicleNumber: { type: String, trim: true, uppercase: true, default: '' },
  insuranceType: { type: String, trim: true, default: 'Motor' },
  hasExistingPolicy: { type: Boolean, default: false },
  currentInsurer: { type: String, trim: true, default: '' },
  policyExpiryDate: { type: String, default: '' },
  expectedPremium: { type: Number, default: null },
  source: { type: String, trim: true, default: '' },
  priority: { type: String, enum: ['hot', 'warm', 'cold'], default: 'warm' },
  notes: { type: String, trim: true, default: '' },
  status: {
    type: String,
    // 'follow_up' is kept only so leads created before the detailed statuses still validate.
    enum: ['new', 'in_progress', 'call_back', 'not_connected', 'waiting_quotation', 'quotation_sent', 'lost', 'converted', 'follow_up'],
    default: 'new',
    index: true
  },
  nextFollowUpDate: { type: String, default: '', index: true },
  // Optional 'HH:MM' (24h); empty means any time that day.
  nextFollowUpTime: { type: String, default: '' },
  lostReason: { type: String, trim: true, default: '' },
  statusChangedAt: { type: Date, default: null },
  followUps: { type: [FollowUpSchema], default: [] },
}, {
  timestamps: true
})

LeadSchema.index({ userId: 1, status: 1, nextFollowUpDate: 1 })

module.exports = mongoose.model('Lead', LeadSchema)
