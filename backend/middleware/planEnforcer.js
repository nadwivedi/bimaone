const UserPlan = require('../models/UserPlan')
const Vehicle = require('../models/Vehicle')
const { getPlan } = require('../utils/planConfig')
const { ensureCurrentCycle, activePlanExpiryFilter } = require('../utils/planCycle')

const planEnforcer = (docType = 'manual') => {
  return async (req, res, next) => {
    try {
      const userId = req.userId || req.user?._id
      if (!userId) {
        return next()
      }

      const activePlan = await UserPlan.findOne({
        userId,
        status: 'active',
        ...activePlanExpiryFilter(),
      })

      if (!activePlan) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription plan found. Please contact admin.',
        })
      }

      await ensureCurrentCycle(activePlan)

      const plan = getPlan(activePlan.planKey)
      const usage = activePlan.usage || { aiDocumentsUsed: 0, manualDocumentsUsed: 0 }

      if (docType === 'ai') {
        if (plan?.features?.aiUpload === false) {
          return res.status(403).json({
            success: false,
            message: 'AI upload is not available on your plan. Please upgrade.',
          })
        }
        const limit = plan?.features?.aiDocuments || 0
        if (limit > 0 && usage.aiDocumentsUsed >= limit) {
          return res.status(403).json({
            success: false,
            message: `AI document limit reached (${limit}/month). Please upgrade your plan.`,
          })
        }
      } else if (docType === 'client') {
        const limit = plan?.features?.clientLimit || 0
        if (limit > 0) {
          const clientCount = await Vehicle.countDocuments({ userId })
          if (clientCount >= limit) {
            return res.status(403).json({
              success: false,
              message: `Client limit reached (${limit}). Please upgrade your plan.`,
            })
          }
        }
      } else {
        const limit = plan?.features?.manualDocuments || 0
        if (limit > 0 && usage.manualDocumentsUsed >= limit) {
          return res.status(403).json({
            success: false,
            message: `Manual document limit reached (${limit}/month). Please upgrade your plan.`,
          })
        }
      }

      req.userPlan = activePlan
      next()
    } catch (error) {
      console.error('Plan enforcer error:', error)
      next()
    }
  }
}

const planFeatureEnforcer = (featureKey) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId || req.user?._id
      if (!userId) {
        return next()
      }

      const activePlan = await UserPlan.findOne({
        userId,
        status: 'active',
        ...activePlanExpiryFilter(),
      })

      if (!activePlan) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription plan found. Please contact admin.',
        })
      }

      await ensureCurrentCycle(activePlan)

      const plan = getPlan(activePlan.planKey)
      if (!plan?.features?.[featureKey]) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not available on your current plan. Please upgrade.',
        })
      }

      req.userPlan = activePlan
      next()
    } catch (error) {
      console.error('Plan feature enforcer error:', error)
      next()
    }
  }
}

const incrementUsage = (docType = 'manual') => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = async function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success) {
        try {
          const userId = req.userId || req.user?._id
          if (userId && req.userPlan && (docType === 'ai' || docType === 'manual')) {
            const field = docType === 'ai' ? 'usage.aiDocumentsUsed' : 'usage.manualDocumentsUsed'
            await UserPlan.updateOne(
              { _id: req.userPlan._id },
              { $inc: { [field]: 1 } }
            )
          }
        } catch (err) {
          console.error('Error incrementing usage:', err)
        }
      }

      return originalJson(body)
    }

    next()
  }
}

// Wraps a manual-document middleware (planEnforcer('manual') or incrementUsage('manual'))
// so it's skipped when the record was already created from AI-extracted data —
// that usage was already counted against the 'ai' quota at OCR time.
const skipIfViaAI = (middleware) => (req, res, next) => {
  if (req.body?.viaAI) return next()
  return middleware(req, res, next)
}

module.exports = { planEnforcer, planFeatureEnforcer, incrementUsage, skipIfViaAI }
