const express = require('express')
const { rcOcr, taxOcr, fitnessOcr, pucOcr, gpsOcr, insuranceOcr } = require('../controllers/ocrController')
const { requireAuth } = require('../middleware/auth')
const { planEnforcer, incrementUsage } = require('../middleware/planEnforcer')
const UserPlan = require('../models/UserPlan')
const { getPlan } = require('../utils/planConfig')
const { ensureCurrentCycle, activePlanExpiryFilter } = require('../utils/planCycle')

const router = express.Router()

router.use(requireAuth)

const aiGate = [planEnforcer('ai'), incrementUsage('ai')]

/**
 * GET /api/ocr/check-limit
 * Returns the user's current AI OCR usage vs. their plan limit.
 * Does NOT consume any quota — safe to call before uploading.
 */
router.get('/check-limit', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id
    if (!userId) {
      return res.json({ success: true, canUse: true, used: 0, limit: 0 })
    }

    const activePlan = await UserPlan.findOne({
      userId,
      status: 'active',
      ...activePlanExpiryFilter(),
    })

    if (!activePlan) {
      return res.status(403).json({
        success: false,
        canUse: false,
        message: 'No active subscription plan found. Please contact admin.',
      })
    }

    await ensureCurrentCycle(activePlan)

    const plan = getPlan(activePlan.planKey)
    const limit = plan?.features?.aiDocuments || 0
    const used = activePlan.usage?.aiDocumentsUsed || 0
    if (plan?.features?.aiUpload === false) {
      return res.json({ success: true, canUse: false, used, limit: 0, message: 'AI upload is not available on your plan.' })
    }
    const canUse = limit <= 0 || used < limit

    return res.json({ success: true, canUse, used, limit })
  } catch (err) {
    console.error('check-limit error:', err)
    // On error, allow the request through — the actual OCR endpoint will enforce the limit
    return res.json({ success: true, canUse: true, used: 0, limit: 0 })
  }
})

router.post('/rc', ...aiGate, rcOcr)
router.post('/tax', ...aiGate, taxOcr)
router.post('/fitness', ...aiGate, fitnessOcr)
router.post('/puc', ...aiGate, pucOcr)
router.post('/gps', ...aiGate, gpsOcr)
router.post('/insurance', ...aiGate, insuranceOcr)

module.exports = router
