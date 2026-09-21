const express = require('express')
const Lead = require('../models/Lead')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth)

const OPEN_STATUSES = ['new', 'in_progress', 'call_back', 'not_connected', 'waiting_quotation', 'quotation_sent', 'follow_up']
const CLOSED_STATUSES = ['converted', 'lost']
const ALL_STATUSES = [...OPEN_STATUSES.filter((st) => st !== 'follow_up'), ...CLOSED_STATUSES]
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// The client sends its local date so "today" matches the agent's calendar, not the server's.
const resolveToday = (value) => (DATE_RE.test(value || '') ? value : new Date().toISOString().slice(0, 10))
const cleanDate = (value) => (DATE_RE.test(value || '') ? value : '')
const cleanTime = (value) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? value : '')

const bucketFilter = (bucket, today) => {
  switch (bucket) {
    case 'today':
      return { status: { $in: OPEN_STATUSES }, nextFollowUpDate: today }
    case 'overdue':
      return { status: { $in: OPEN_STATUSES }, nextFollowUpDate: { $ne: '', $lt: today } }
    case 'upcoming':
      return { status: { $in: OPEN_STATUSES }, nextFollowUpDate: { $gt: today } }
    case 'new':
      return { status: 'new' }
    case 'converted':
      return { status: 'converted' }
    case 'lost':
      return { status: 'lost' }
    case 'open':
      return { status: { $in: OPEN_STATUSES } }
    default:
      return {}
  }
}

const BUCKETS = ['today', 'overdue', 'new', 'upcoming', 'open', 'converted', 'lost', 'all']
const LEAD_TYPES = ['Motor', 'Health', 'Life', 'Other']

const pickLeadFields = (body) => {
  const premium = body.expectedPremium === '' || body.expectedPremium == null ? null : Number(body.expectedPremium)
  const hasExistingPolicy = body.hasExistingPolicy === true || body.hasExistingPolicy === 'true'
  return {
    name: (body.name || '').trim(),
    mobile: (body.mobile || '').trim(),
    email: (body.email || '').trim(),
    city: (body.city || '').trim(),
    vehicleNumber: (body.vehicleNumber || '').trim(),
    insuranceType: (body.insuranceType || 'Motor').trim(),
    hasExistingPolicy,
    currentInsurer: hasExistingPolicy ? (body.currentInsurer || '').trim() : '',
    policyExpiryDate: hasExistingPolicy ? cleanDate(body.policyExpiryDate) : '',
    expectedPremium: Number.isFinite(premium) ? premium : null,
    source: (body.source || '').trim(),
    priority: ['hot', 'warm', 'cold'].includes(body.priority) ? body.priority : 'warm',
    notes: (body.notes || '').trim(),
    nextFollowUpDate: cleanDate(body.nextFollowUpDate),
    nextFollowUpTime: cleanDate(body.nextFollowUpDate) ? cleanTime(body.nextFollowUpTime) : '',
  }
}

router.get('/', async (req, res) => {
  try {
    const today = resolveToday(req.query.today)
    const bucket = BUCKETS.includes(req.query.bucket) ? req.query.bucket : 'today'

    // Type / priority / source / search narrow both the list and the tab counts.
    const base = { userId: req.user._id }
    if (LEAD_TYPES.includes(req.query.type)) base.insuranceType = req.query.type
    if (['hot', 'warm', 'cold'].includes(req.query.priority)) base.priority = req.query.priority
    if (req.query.source) base.source = String(req.query.source)
    // Created-date range: the client sends ISO timestamps for its local start/end of day.
    const createdFrom = req.query.createdFrom ? new Date(req.query.createdFrom) : null
    const createdTo = req.query.createdTo ? new Date(req.query.createdTo) : null
    if ((createdFrom && !isNaN(createdFrom)) || (createdTo && !isNaN(createdTo))) {
      base.createdAt = {}
      if (createdFrom && !isNaN(createdFrom)) base.createdAt.$gte = createdFrom
      if (createdTo && !isNaN(createdTo)) base.createdAt.$lte = createdTo
    }
    const search = (req.query.search || '').trim()
    if (search) {
      const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
      base.$or = [{ name: rx }, { mobile: rx }, { vehicleNumber: rx }, { city: rx }]
    }

    // Status narrows only the list (it would otherwise zero out the other tabs).
    const conditions = [bucketFilter(bucket, today)]
    if (ALL_STATUSES.includes(req.query.status)) {
      conditions.push(req.query.status === 'in_progress'
        ? { status: { $in: ['in_progress', 'follow_up'] } }
        : { status: req.query.status })
    }
    const filter = { ...base, $and: conditions }

    let sort = { nextFollowUpDate: 1, nextFollowUpTime: 1, createdAt: -1 }
    if (bucket === 'new') sort = { createdAt: -1 }
    if (bucket === 'converted' || bucket === 'lost') sort = { statusChangedAt: -1, updatedAt: -1 }

    const [leads, ...counts] = await Promise.all([
      Lead.find(filter).sort(sort).limit(1000).lean(),
      ...BUCKETS.map((b) => Lead.countDocuments({ ...base, ...bucketFilter(b, today) })),
    ])

    res.json({
      success: true,
      data: leads,
      counts: Object.fromEntries(BUCKETS.map((b, i) => [b, counts[i]])),
    })
  } catch (error) {
    console.error('Error fetching leads:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch leads' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' })
    res.json({ success: true, data: lead })
  } catch (error) {
    console.error('Error fetching lead:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch lead' })
  }
})

router.post('/', async (req, res) => {
  try {
    const fields = pickLeadFields(req.body)
    if (!fields.name) return res.status(400).json({ success: false, message: 'Lead name is required' })
    const status = ALL_STATUSES.includes(req.body.status) ? req.body.status : 'new'
    const closed = CLOSED_STATUSES.includes(status)
    const lead = await Lead.create({
      ...fields,
      ...(closed ? { nextFollowUpDate: '', nextFollowUpTime: '' } : {}),
      userId: req.user._id,
      status,
      statusChangedAt: status === 'new' ? null : new Date(),
    })
    res.status(201).json({ success: true, data: lead })
  } catch (error) {
    console.error('Error creating lead:', error)
    res.status(500).json({ success: false, message: 'Failed to create lead' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const fields = pickLeadFields(req.body)
    if (!fields.name) return res.status(400).json({ success: false, message: 'Lead name is required' })
    const existing = await Lead.findOne({ _id: req.params.id, userId: req.user._id })
    if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' })

    Object.assign(existing, fields)
    if (ALL_STATUSES.includes(req.body.status) && req.body.status !== existing.status) {
      existing.status = req.body.status
      existing.statusChangedAt = new Date()
    }
    if (CLOSED_STATUSES.includes(existing.status)) {
      existing.nextFollowUpDate = ''
      existing.nextFollowUpTime = ''
    }
    await existing.save()
    res.json({ success: true, data: existing })
  } catch (error) {
    console.error('Error updating lead:', error)
    res.status(500).json({ success: false, message: 'Failed to update lead' })
  }
})

// Log a follow-up call/visit and schedule the next one.
router.post('/:id/follow-ups', async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id })
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' })

    const date = cleanDate(req.body.date) || resolveToday(req.body.today)
    const newStatus = ALL_STATUSES.includes(req.body.status) ? req.body.status : null
    const closing = newStatus && CLOSED_STATUSES.includes(newStatus)
    const nextFollowUpDate = closing ? '' : cleanDate(req.body.nextFollowUpDate)
    const nextFollowUpTime = nextFollowUpDate ? cleanTime(req.body.nextFollowUpTime) : ''

    lead.followUps.push({
      date,
      note: (req.body.note || '').trim(),
      outcome: (req.body.outcome || '').trim(),
      nextFollowUpDate,
      nextFollowUpTime,
    })
    lead.nextFollowUpDate = nextFollowUpDate
    lead.nextFollowUpTime = nextFollowUpTime
    const targetStatus = newStatus || (lead.status === 'new' || lead.status === 'follow_up' ? 'in_progress' : lead.status)
    if (targetStatus !== lead.status) {
      lead.status = targetStatus
      lead.statusChangedAt = new Date()
    }
    if (targetStatus === 'lost' && req.body.lostReason) lead.lostReason = req.body.lostReason.trim()
    if (targetStatus !== 'lost') lead.lostReason = ''
    await lead.save()
    res.json({ success: true, data: lead })
  } catch (error) {
    console.error('Error logging follow-up:', error)
    res.status(500).json({ success: false, message: 'Failed to log follow-up' })
  }
})

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, lostReason } = req.body
    if (!ALL_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }
    const update = { status, statusChangedAt: new Date() }
    if (status === 'lost') update.lostReason = (lostReason || '').trim()
    if (status === 'converted' || status === 'lost') {
      update.nextFollowUpDate = ''
      update.nextFollowUpTime = ''
    }
    if (status !== 'lost') update.lostReason = ''

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: update },
      { new: true }
    )
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' })
    res.json({ success: true, data: lead })
  } catch (error) {
    console.error('Error updating lead status:', error)
    res.status(500).json({ success: false, message: 'Failed to update lead status' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await Lead.deleteOne({ _id: req.params.id, userId: req.user._id })
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Lead not found' })
    res.json({ success: true, message: 'Lead deleted' })
  } catch (error) {
    console.error('Error deleting lead:', error)
    res.status(500).json({ success: false, message: 'Failed to delete lead' })
  }
})

module.exports = router
