const express = require('express')
const controller = require('../controllers/vehicleInfoController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth)

router.get('/lookup', controller.lookupVehicle)
router.post('/rc-pdf', controller.downloadRcPdf)
router.get('/history', controller.getSearchHistory)
router.get('/history/:id', controller.getHistoryById)
router.get('/history/:id/rc-pdf', controller.downloadHistoryRcPdf)
router.delete('/history/:id', controller.deleteHistoryItem)

module.exports = router
