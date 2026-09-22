require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const vehicleRoutes = require('./routes/vehicleRoutes')
const fitnessRoutes = require('./routes/fitnessRoutes')
const taxRoutes = require('./routes/taxRoutes')
const pucRoutes = require('./routes/pucRoutes')
const gpsRoutes = require('./routes/gpsRoutes')
const insuranceRoutes = require('./routes/insuranceRoutes')
const permitRoutes = require('./routes/permitRoutes')
const rcRoutes = require('./routes/rcRoutes')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const ocrRoutes = require('./routes/ocrRoutes')
const uploadRoutes = require('./routes/uploadRoutes')
const whatsAppRoutes = require('./routes/whatsAppRoutes')
const whatsappService = require('./services/whatsappService')
const { initWhatsAppMessageSender } = require('./jobs/whatsappMessageSender')
const { initWhatsAppExpiryChecker } = require('./jobs/whatsappExpiryChecker')

const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transport'
const ALLOWED_ORIGINS = new Set([

  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://bimaone.in',
  'https://www.bimaone.in',
  'https://api.bimaone.in',
  'https://adm.bimaone.in',
])

app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '25mb' }))

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Vary', 'Origin')
  }
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Backend is running' })
})

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/vehicle', vehicleRoutes)
app.use('/api/fitness', fitnessRoutes)
app.use('/api/tax', taxRoutes)
app.use('/api/puc', pucRoutes)
app.use('/api/gps', gpsRoutes)
app.use('/api/insurance', insuranceRoutes)
app.use('/api/permit', permitRoutes)
app.use('/api/rc', rcRoutes)
app.use('/api/vehicle-info', require('./routes/vehicleInfoRoutes'))
app.use('/api/kyc', require('./routes/kycRoutes'))
app.use('/api/references', require('./routes/referenceRoutes'))
app.use('/api/imd', require('./routes/imdRoutes'))
app.use('/api/leads', require('./routes/leadRoutes'))
app.use('/api/ocr', ocrRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/whatsapp', whatsAppRoutes)
app.use('/api/wa', require('./routes/waRoutes'))
app.use('/api/calculator', require('./routes/calculatorRoutes'))
app.use('/api/insurance-companies', require('./routes/insuranceCompanyRoutes'))
app.use('/api/product-types', require('./routes/productTypeRoutes'))
app.use('/api/user-plans', require('./routes/userPlanRoutes'))
app.use('/api/referral', require('./routes/referralRoutes'))
app.use('/api/wallet', require('./routes/walletRoutes'))
const paymentRoutes = require('./routes/paymentRoutes')
app.use('/api/payment', paymentRoutes)
app.use('/api', paymentRoutes)
app.use('/api/admin-dashboard', require('./routes/adminDashboardRoutes'))
app.use('/api/admin-policies', require('./routes/adminPolicyRoutes'))

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ success: false, message: err.message || 'Internal server error' })
})

mongoose
  .connect(MONGODB_URI, {
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 30000,
    waitQueueTimeoutMS: 10000,
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 10000,
  })
  .then(async () => {
    console.log('MongoDB connected')

    await require('./controllers/productTypeController').seedDefaultProductTypes()

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })

    server.keepAliveTimeout = 65000
    server.headersTimeout = 70000

    // Per-agent WhatsApp (Baileys): connects only when there is something to send.
    whatsappService.start().catch((error) => console.error('[WHATSAPP] Startup failed:', error))
    initWhatsAppMessageSender()
    initWhatsAppExpiryChecker()

    // Close WhatsApp connections cleanly so saved logins stay valid.
    let shuttingDown = false
    const shutdown = async (signal) => {
      if (shuttingDown) return
      shuttingDown = true
      console.log(`${signal} received, shutting down…`)
      server.close()
      try { await whatsappService.shutdown() } catch (err) { console.error('WhatsApp shutdown error:', err) }
      await mongoose.disconnect().catch(() => {})
      process.exit(0)
    }
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('message', (msg) => { if (msg === 'shutdown') shutdown('shutdown') })
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error)
    process.exit(1)
  })
