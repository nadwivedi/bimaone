const mongoose = require('mongoose')

const vehicleSearchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    ownerName: {
      type: String,
      trim: true,
      default: ''
    },
    mobileNo: {
      type: String,
      trim: true,
      default: ''
    },

    makerModel: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      trim: true,
      default: 'ACTIVE'
    },
    registeredAt: {
      type: String,
      trim: true,
      default: ''
    },
    insuranceUpto: {
      type: String,
      trim: true,
      default: ''
    },
    fitnessUpto: {
      type: String,
      trim: true,
      default: ''
    },
    taxUpto: {
      type: String,
      trim: true,
      default: ''
    },
    pucUpto: {
      type: String,
      trim: true,
      default: ''
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    searchCount: {
      type: Number,
      default: 1
    },
    lastSearchedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
)

// Compound index to quickly find/upsert user + vehicle
vehicleSearchHistorySchema.index({ userId: 1, vehicleNumber: 1 })
vehicleSearchHistorySchema.index({ userId: 1, lastSearchedAt: -1 })

module.exports = mongoose.model('VehicleSearchHistory', vehicleSearchHistorySchema)
