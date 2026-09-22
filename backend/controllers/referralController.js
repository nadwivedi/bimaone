const User = require('../models/User')
const Referral = require('../models/Referral')

const getReferralInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (!user.referralCode) {
      return res.status(400).json({ success: false, message: 'Referral code not assigned yet' })
    }

    const totalReferrals = await Referral.countDocuments({ referrer: user._id, status: 'completed' })

    const earningsAgg = await Referral.aggregate([
      { $match: { referrer: user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$rewardAmount' } } }
    ])
    const totalEarnings = earningsAgg.length > 0 ? earningsAgg[0].total : 0

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        totalReferrals,
        totalEarnings,
        shareLink: `${process.env.MAIN_APP_URL || 'https://bimaone.in'}/login?ref=${user.referralCode}`
      }
    })
  } catch (error) {
    console.error('Referral info error:', error)
    res.status(500).json({ success: false, message: 'Failed to get referral info' })
  }
}

const getReferrals = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const skip = (page - 1) * limit

    const [referrals, total] = await Promise.all([
      Referral.find({ referrer: req.user._id })
        .populate('referredUser', 'name email picture createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Referral.countDocuments({ referrer: req.user._id })
    ])

    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Referrals list error:', error)
    res.status(500).json({ success: false, message: 'Failed to get referrals list' })
  }
}

const listAllReferrals = async (_req, res) => {
  try {
    const referrals = await Referral.find({})
      .populate('referrer', 'name mobile')
      .populate('referredUser', 'name mobile')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ success: true, data: referrals })
  } catch (error) {
    console.error('Admin referrals list error:', error)
    res.status(500).json({ success: false, message: 'Failed to get referrals list' })
  }
}

module.exports = { getReferralInfo, getReferrals, listAllReferrals }
