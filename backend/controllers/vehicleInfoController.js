const axios = require('axios')
const VehicleSearchHistory = require('../models/VehicleSearchHistory')
const { generateRcCardPDF } = require('../utils/rcCardGenerator')

const cleanVehicleNo = (vno) => String(vno || '').replace(/[\s-]/g, '').toUpperCase()

const sendPdf = async (res, data) => {
  const pdf = await generateRcCardPDF(data)
  const fname = `RC-${String(data.REGN_NO).replace(/[^A-Za-z0-9]/g, '')}.pdf`
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`)
  return res.send(pdf)
}

// GET /api/vehicle-info/lookup?vno=... -> live RC details from RTO API, saved to user's history
const lookupVehicle = async (req, res) => {
  try {
    const cleanVno = cleanVehicleNo(req.query.vno || req.body?.vno)
    if (cleanVno.length < 4) {
      return res.status(400).json({ success: false, message: 'Please enter a valid vehicle registration number.' })
    }

    const apiUrl = process.env.VEHICLE_INFO_API_URL
    const apiKey = process.env.VEHICLE_INFO_API_KEY
    if (!apiUrl || !apiKey) {
      return res.status(500).json({ success: false, message: 'RC details service is not configured.' })
    }

    const response = await axios.get(apiUrl, {
      params: { key: apiKey, vno: cleanVno },
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/plain, */*',
      },
    })

    let data = response.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        return res.status(404).json({ success: false, message: data || 'No vehicle information found for this registration number.' })
      }
    }

    if (!data || data.error || data.status === 'error' || data.status === false) {
      return res.status(404).json({
        success: false,
        message: data?.message || data?.error || 'Vehicle details not found. Please check registration number.',
      })
    }

    let record = null
    try {
      record = await VehicleSearchHistory.findOneAndUpdate(
        { userId: req.user._id, vehicleNumber: cleanVno },
        {
          $set: {
            ownerName: data.OWNER_NAME || '',
            mobileNo: data.MOBILE_NO || '',
            makerModel: `${data.MAKER_DESC || ''} ${data.MAKER_MODEL || ''}`.trim(),
            status: data.STATUS || 'ACTIVE',
            registeredAt: data.REGISTERED_AT || '',
            insuranceUpto: data.INSURANCE_UPTO || '',
            fitnessUpto: data.FIT_UPTO || '',
            taxUpto: data.TAX_UPTO || '',
            pucUpto: data.PUCC_UPTO || data.PUC_UPTO || '',
            rawResponse: data,
            lastSearchedAt: new Date(),
          },
          $inc: { searchCount: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    } catch (dbErr) {
      console.error('Failed to save vehicle search history:', dbErr.message)
    }

    return res.json({
      success: true,
      message: 'Vehicle details fetched successfully',
      data,
      historyMeta: record
        ? { _id: record._id, vehicleNumber: record.vehicleNumber, lastSearchedAt: record.lastSearchedAt, searchCount: record.searchCount }
        : null,
    })
  } catch (error) {
    console.error('Error fetching vehicle details:', error?.response?.data || error.message)
    const status = error.response?.status === 404 ? 404 : 500
    return res.status(status).json({
      success: false,
      message: error.response?.data?.message || error.response?.data?.error || 'Failed to fetch vehicle details from RTO server',
    })
  }
}

// GET /api/vehicle-info/history?page=&limit=&search= -> paginated saved searches (no API call)
const getSearchHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
    const search = String(req.query.search || '').trim()

    const query = { userId: req.user._id }
    if (search) {
      const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escape(search), 'i')
      const vnoRegex = new RegExp(escape(cleanVehicleNo(search)), 'i')
      query.$or = [
        { vehicleNumber: vnoRegex },
        { ownerName: regex },
        { mobileNo: regex },
        { makerModel: regex },
        { registeredAt: regex },
      ]
    }

    const [total, records] = await Promise.all([
      VehicleSearchHistory.countDocuments(query),
      VehicleSearchHistory.find(query)
        .select('-rawResponse')
        .sort({ lastSearchedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    return res.json({
      success: true,
      data: records,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    })
  } catch (error) {
    console.error('Error fetching vehicle search history:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch vehicle search history' })
  }
}

// GET /api/vehicle-info/history/:id -> saved RC details (no API call)
const getHistoryById = async (req, res) => {
  try {
    const record = await VehicleSearchHistory.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!record || !record.rawResponse) {
      return res.status(404).json({ success: false, message: 'Search history record not found' })
    }

    return res.json({
      success: true,
      data: record.rawResponse,
      historyMeta: {
        _id: record._id,
        vehicleNumber: record.vehicleNumber,
        lastSearchedAt: record.lastSearchedAt || record.updatedAt,
        searchCount: record.searchCount,
      },
    })
  } catch (error) {
    console.error('Error fetching search history by id:', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch history details' })
  }
}

// DELETE /api/vehicle-info/history/:id
const deleteHistoryItem = async (req, res) => {
  try {
    const result = await VehicleSearchHistory.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!result) {
      return res.status(404).json({ success: false, message: 'Record not found or already deleted' })
    }
    return res.json({ success: true, message: 'Search record deleted successfully' })
  } catch (error) {
    console.error('Error deleting search history item:', error)
    return res.status(500).json({ success: false, message: 'Failed to delete search record' })
  }
}

// POST /api/vehicle-info/rc-pdf { data } -> RC card style PDF (no API call)
const downloadRcPdf = async (req, res) => {
  try {
    const data = req.body?.data
    if (!data || typeof data !== 'object' || !data.REGN_NO) {
      return res.status(400).json({ success: false, message: 'Vehicle data is required' })
    }
    return await sendPdf(res, data)
  } catch (error) {
    console.error('Error generating RC PDF:', error)
    return res.status(500).json({ success: false, message: 'Failed to generate RC PDF' })
  }
}

// GET /api/vehicle-info/history/:id/rc-pdf -> RC card PDF from saved record (no API call)
const downloadHistoryRcPdf = async (req, res) => {
  try {
    const record = await VehicleSearchHistory.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!record || !record.rawResponse) {
      return res.status(404).json({ success: false, message: 'Search history record not found' })
    }
    return await sendPdf(res, { REGN_NO: record.vehicleNumber, ...record.rawResponse })
  } catch (error) {
    console.error('Error generating history RC PDF:', error)
    return res.status(500).json({ success: false, message: 'Failed to generate RC PDF' })
  }
}

module.exports = {
  lookupVehicle,
  getSearchHistory,
  getHistoryById,
  deleteHistoryItem,
  downloadRcPdf,
  downloadHistoryRcPdf,
}
