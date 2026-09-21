const PDFDocument = require('pdfkit')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const UserPlan = require('../models/UserPlan')
const { getPlan } = require('../utils/planConfig')
const { activePlanExpiryFilter } = require('../utils/planCycle')

const QUOTATIONS_DIR = path.join(__dirname, '..', 'uploads', 'quotations')

if (!fs.existsSync(QUOTATIONS_DIR)) {
  fs.mkdirSync(QUOTATIONS_DIR, { recursive: true })
}

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return 'Rs. 0.00'
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

async function resolveImageBuffer(picture) {
  if (!picture || typeof picture !== 'string') return null
  try {
    if (picture.startsWith('data:')) {
      const base64 = picture.split(',')[1] || ''
      return Buffer.from(base64, 'base64')
    }
    if (picture.startsWith('http://') || picture.startsWith('https://')) {
      const response = await axios.get(picture, { responseType: 'arraybuffer', timeout: 8000 })
      return Buffer.from(response.data)
    }
    if (picture.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', 'uploads', picture.replace('/uploads/', ''))
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath)
    }
  } catch (error) {
    console.error('Error resolving business picture:', error.message)
  }
  return null
}

// Logo branding on quotations is a paid feature (Plus/Pro). Free users still
// get the quotation PDF, but without the business logo.
async function userHasQuotationBranding(userId) {
  if (!userId) return false
  try {
    const activePlan = await UserPlan.findOne({
      userId,
      status: 'active',
      ...activePlanExpiryFilter(),
    }).lean()
    const plan = getPlan(activePlan?.planKey)
    return plan?.features?.personalisedQuotation === true
  } catch (error) {
    console.error('Error checking quotation branding:', error.message)
    return false
  }
}


const generatePdf = async (req, res) => {
  try {
    const data = req.body

    const quoteId = data.quoteId || `BBQ-${Math.floor(100000 + Math.random() * 900000)}`
    const dateStr = data.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const producerName = data.producerName || 'BimaOne Agent'
    const producerContact = data.producerContact || 'N/A'
    const producerEmail = data.producerEmail || 'N/A'
    const insuranceCompany = data.insuranceCompany || 'BIMAONE'
    const insuranceCompanyId = data.insuranceCompanyId || null
    const canBrand = await userHasQuotationBranding(req.user?._id || req.userId)
    const businessPictureBuffer = canBrand ? await resolveImageBuffer(data.businessPicture) : null

    // Compute policy dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setFullYear(startDate.getFullYear() + 1)
    endDate.setDate(endDate.getDate() - 1)
    const periodStr = `${startDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} to ${endDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const filename = `${quoteId.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
    const filePath = path.join(QUOTATIONS_DIR, filename)

    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    const logoPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'bimalogo.png')

    // ══════════════════════════════════════════════════════════════════════
    // PAGE 1 — Quotation
    // ══════════════════════════════════════════════════════════════════════
    const pageWidth = doc.page.width - 80 // 515 pt printable area width
    let y = 40

    // ── Header Block ────────────────────────────────────────────────────────
    // Light header with a blue bottom accent line
    doc.rect(40, y, pageWidth, 70).fillColor('#ffffff').fill()
    doc.rect(40, y, pageWidth, 70).strokeColor('#e2e8f0').lineWidth(1).stroke()
    doc.rect(40, y + 68, pageWidth, 3).fillColor('#003afd').fill()

    // Logo image (left side)
    const logoSize = 28
    if (require('fs').existsSync(logoPath)) {
      doc.image(logoPath, 52, y + 12, { height: logoSize, fit: [logoSize, logoSize] })
    }

    // Brand Name: "Bima" (dark/black) + "One" (blue #003afd) — left aligned
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('Bima', 80, y + 16, { continued: true })
    doc.fillColor('#003afd').text('One', { continued: false })

    // Tagline
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text('All your policies. One smart place.', 80, y + 34)

    // Insurance Company Name — centered across the full header width
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(insuranceCompany, 40, y + 50, { align: 'center', width: pageWidth })

    // Quote ID & Date on Right Side
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text(`Quote ID: ${quoteId}`, 360, y + 18, { align: 'right', width: 145 })
    doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(`Date: ${dateStr}`, 360, y + 33, { align: 'right', width: 145 })

    y += 82

    // Quote Subtitle
    const categoryUpper = (data.vehicleCategory || 'MOTOR').toUpperCase()
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text(`${categoryUpper} INSURANCE QUOTATION`, 40, y)
    
    y += 22

    // Customer name on top
    if (data.customerName) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text(`Hi ${data.customerName},`, 40, y)
      y += 16
    }

    // Build make/model/variant string
    const mmv = [data.vehicleMake, data.vehicleModel, data.vehicleVariant].filter(Boolean).join(' ')
    const vehicleNo = data.vehicleNo || ''
    const premiums = data.premiums || {}

    // ── Vehicle Details Grid ───────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('Vehicle & Quotation Details', 40, y)
    y += 15

    const gridH = 78
    const colW = pageWidth / 4

    doc.rect(40, y, pageWidth, gridH).fillColor('#f8fafc').fill()
    doc.rect(40, y, pageWidth, gridH).strokeColor('#cbd5e1').lineWidth(1).stroke()

    for (let i = 1; i < 4; i++) {
      doc.moveTo(40 + colW * i, y).lineTo(40 + colW * i, y + gridH).strokeColor('#cbd5e1').stroke()
    }
    for (let i = 1; i < 3; i++) {
      doc.moveTo(40, y + 26 * i).lineTo(40 + pageWidth, y + 26 * i).strokeColor('#cbd5e1').stroke()
    }

    const drawGridCell = (colIdx, rowIdx, label, val) => {
      const cx = 40 + colIdx * colW
      const cy = y + rowIdx * 26
      doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(label, cx + 8, cy + 5)
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(val, cx + 8, cy + 13, { width: colW - 16, height: 11, ellipsis: true })
    }

    drawGridCell(0, 0, vehicleNo ? 'VEHICLE NO' : 'VEHICLE MAKE/MODEL', vehicleNo || mmv || data.vehicleCategory || 'N/A')
    drawGridCell(1, 0, 'ZONE', data.zone || 'N/A')
    drawGridCell(2, 0, 'YEAR OF MANUFACTURE', data.mfgYear || 'N/A')
    drawGridCell(3, 0, 'VEHICLE TYPE', data.policyType || 'N/A')

    drawGridCell(0, 1, vehicleNo ? (mmv ? 'MAKE/MODEL/VARIANT' : 'REGISTRATION NO / SPEC') : 'REGISTRATION NO / SPEC', vehicleNo ? (mmv || data.vehicleSpec || 'N/A') : (data.vehicleSpec || 'N/A'))
    drawGridCell(1, 1, 'VEHICLE AGE', data.vehicleAge || 'N/A')
    const hasDepreciation = premiums.depreciation > 0
    if (hasDepreciation) {
      drawGridCell(2, 1, 'FINAL IDV', fmt(premiums.depreciatedIdv || data.idv))
    } else {
      drawGridCell(2, 1, 'IDV OF THE VEHICLE', fmt(data.idv))
    }
    drawGridCell(3, 1, 'NCB / OD / DEPR%', `${data.ncb || 0}% / ${data.odDiscount || 0}% / ${premiums.depreciation || 0}%`)

    drawGridCell(0, 2, 'OD TERM (IN YEARS)', data.odTerm != null ? String(data.odTerm) : '—')
    drawGridCell(1, 2, 'TP TERM (IN YEARS)', data.tpTerm != null ? String(data.tpTerm) : '—')

    y += gridH + 20

    // ── Two-Column Premium Breakup Table ──────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('Premium Calculation Breakup', 40, y)
    y += 15

    const colWidth = (pageWidth - 15) / 2 // 250 pt per column
    const tableY = y

    // Build side-by-side items
    const odRows = []
    if (premiums.odBase > 0) {
      odRows.push(['Vehicle Basic Rate', `${premiums.odRate}%`])
      odRows.push([categoryUpper === 'PCV' ? 'Vehicle Basic OD' : 'Basic OD Premium', fmt(premiums.odBase)])
      const odDiscAmt = premiums.odDiscountAmount || 0
      if (odDiscAmt > 0) {
        odRows.push(['Discount on OD Premium', `-${fmt(odDiscAmt)}`])
      }
      const ncbDisc = premiums.ncbAmount || 0
      if (ncbDisc > 0) {
        odRows.push(['No Claim Bonus (NCB)', `-${fmt(ncbDisc)}`])
      }
      if (premiums.imt23 > 0) {
        odRows.push(['IMT 23 Loading', fmt(premiums.imt23)])
      }
      if (premiums.geoExtent > 0 && (categoryUpper === 'GCV' || categoryUpper === 'PCV')) {
        odRows.push(['Geographical Extent', fmt(premiums.geoExtent)])
      }
      if (premiums.cngKitOdAmount > 0) {
        odRows.push(['CNG/LPG Kit', fmt(premiums.cngKitOdAmount)])
      }
      if (premiums.gcvExtraUnits > 0) {
        odRows.push([`Extra Weight > 12000 Premium`, fmt(premiums.gcvExtraPremium)])
      }
      if (premiums.loadingAmount > 0) {
        odRows.push([`Loading Discount @ ${premiums.loadingDiscount}%`, fmt(premiums.loadingAmount)])
      }
    }
    const finalOD = (premiums.finalOd || 0) + (premiums.loadingAmount || 0)

    const addonRows = [
      ['Zero Depreciation', fmt(premiums.zeroDep || 0)],
      ['Roadside Assistance (RSA)', fmt(premiums.rsa || 0)],
      ['Other Addon Coverage', fmt(premiums.otherAddon || 0)]
    ]
    const finalAddon = (premiums.zeroDep || 0) + (premiums.rsa || 0) + (premiums.otherAddon || 0)

    const tpRows = []
    if (premiums.tp > 0) {
      tpRows.push(['Liability Premium (TP)', fmt(premiums.tp + premiums.restrictedTPPD)])
      if (premiums.restrictedTPPD > 0) {
        tpRows.push(['Restricted TPPD Discount', `-${fmt(premiums.restrictedTPPD)}`])
      }
      tpRows.push(['PA to Owner Driver', fmt(premiums.paOd || 0)])
      if (premiums.llPd > 0) tpRows.push(['LL to Paid Driver', fmt(premiums.llPd)])
      if (premiums.llEmployee > 0) tpRows.push(['LL to Employee', fmt(premiums.llEmployee)])
      if (premiums.paUnnamed > 0) tpRows.push(['PA to Unnamed Passenger', fmt(premiums.paUnnamed)])
      if (premiums.cngKitTpAmount > 0) tpRows.push(['CNG/LPG Kit (TP)', fmt(premiums.cngKitTpAmount)])
    }
    const finalTP = (premiums.tp || 0) + (premiums.llPd || 0) + (premiums.paOd || 0) + (premiums.llEmployee || 0) + (premiums.paUnnamed || 0) + (premiums.cngKitTpAmount || 0)

    const drawBreakupColumn = (x, startY, title, rows, minRows = 5) => {
      let cy = startY
      
      // Column Header
      doc.rect(x, cy, colWidth, 18).fillColor('#f1f5f9').fill()
      doc.rect(x, cy, colWidth, 18).strokeColor('#cbd5e1').stroke()
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e3a8a').text(title, x + 8, cy + 5)
      
      cy += 18
      const rowH = 16

      // Empty states or padded table rows
      const totalRowsToDraw = Math.max(rows.length, minRows)
      for (let i = 0; i < totalRowsToDraw; i++) {
        doc.rect(x, cy, colWidth, rowH).strokeColor('#f1f5f9').stroke()
        if (rows[i]) {
          const [lbl, val] = rows[i]
          doc.fontSize(8).font('Helvetica').fillColor('#334155').text(lbl, x + 8, cy + 4)
          doc.font('Helvetica-Bold').fillColor('#0f172a').text(val, x + colWidth - 85, cy + 4, { align: 'right', width: 77 })
        }
        cy += rowH
      }

      return cy
    }

    const drawSubtotalBox = (x, yCoord, label, totalVal) => {
      doc.rect(x, yCoord, colWidth, 20).fillColor('#eff6ff').fill()
      doc.rect(x, yCoord, colWidth, 20).strokeColor('#bfdbfe').stroke()
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e40af').text(label, x + 8, yCoord + 6)
      doc.text(fmt(totalVal), x + colWidth - 85, yCoord + 6, { align: 'right', width: 77 })
    }

    const odRowsEndY = drawBreakupColumn(40, tableY, 'Own Damage Premium (A) Rupees', odRows, 11)
    
    // Addon column
    const addonRowsEndY = drawBreakupColumn(40 + colWidth + 15, tableY, 'Addon Coverage (B) Rupees', addonRows, 3)
    drawSubtotalBox(40 + colWidth + 15, addonRowsEndY, 'Total Addon Premium (B)', finalAddon)
    const addonSubtotalEndY = addonRowsEndY + 20

    // Liability column
    const tpRowsEndY = drawBreakupColumn(40 + colWidth + 15, addonSubtotalEndY + 12, 'Liability Premium (C) Rupees', tpRows, 4)

    // Align OD and TP subtotals on the same line
    const finalSubtotalY = Math.max(odRowsEndY, tpRowsEndY)
    drawSubtotalBox(40, finalSubtotalY, 'Net Own Damage Premium (A)', finalOD)
    drawSubtotalBox(40 + colWidth + 15, finalSubtotalY, 'Total Liability Premium (C)', finalTP)

    y = finalSubtotalY + 20 + 18

    // ── Totals Section ─────────────────────────────────────────────────────
    const gstData = data.gst || {}
    const hasSplitGst = gstData.hasSplitGst
    const totalsBoxH = hasSplitGst ? 66 : 56

    doc.rect(40, y, pageWidth, totalsBoxH).fillColor('#f8fafc').fill()
    doc.rect(40, y, pageWidth, totalsBoxH).strokeColor('#cbd5e1').stroke()

    const drawTotalRow = (label, value, isBold = false, offset = 4) => {
      doc.fontSize(isBold ? 9.5 : 8.5).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(isBold ? '#1e3a8a' : '#334155')
      doc.text(label, 50, y + offset)
      doc.text(value, 360, y + offset, { align: 'right', width: 145 })
    }

    const netPrem = data.netPremium || (finalOD + finalAddon + finalTP)

    drawTotalRow('Premium before GST (A+B+C)', fmt(Math.round(netPrem), 0), false, 6)

    if (hasSplitGst) {
      drawTotalRow('GST on TP @ 5%', fmt(Math.round(gstData.gstTp || 0), 0), false, 20)
      drawTotalRow('GST on Other @ 18%', fmt(Math.round(gstData.gstNonTp || 0), 0), false, 32)
      doc.moveTo(50, y + 44).lineTo(40 + pageWidth - 10, y + 44).strokeColor('#cbd5e1').stroke()
      drawTotalRow('Final Premium (Payable)', fmt(Math.round(data.totalPayable), 0), true, 50)
    } else {
      const gstLabel = `GST (${gstData.enabled ? '18%' : '0%'})`
      drawTotalRow(gstLabel, fmt(Math.round(gstData.totalGst || 0), 0), false, 22)
      doc.moveTo(50, y + 36).lineTo(40 + pageWidth - 10, y + 36).strokeColor('#cbd5e1').stroke()
      drawTotalRow('Final Premium (Payable)', fmt(Math.round(data.totalPayable), 0), true, 41)
    }

    y += totalsBoxH + 16

    // ── Instructions & Documents ──────────────────────────────────────────
    const bottomW = (pageWidth - 15) / 2

    // Left Column: Payment & Docs
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569').text(`Kindly pay cheque/DD in favour of ${insuranceCompany}.`, 40, y, { width: bottomW, lineBreak: true })
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e3a8a').text('Documents Required:-', 40, y + 22, { width: bottomW })
    doc.fontSize(7).font('Helvetica').fillColor('#475569').text('1. Previous Policy Copy\n2. RC Copy', 40, y + 36, { width: bottomW })

    // Right Column: Notes & Validity
    doc.fontSize(6.5).font('Helvetica').fillColor('#dc2626')
      .text('Note : In case of any claim, NCB will be revised and hence Quotation is Subject to Change.', 40 + bottomW + 15, y, { width: bottomW })
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569')
      .text(`Quote Validity: This Quote is valid for 7 days from date of generation.`, 40 + bottomW + 15, y + 26, { width: bottomW })

    y += 55

    // ── Producer Info Box ─────────────────────────────────────────────────
    const producerBoxH = businessPictureBuffer ? 50 : 42
    doc.rect(40, y, pageWidth, producerBoxH).fillColor('#f1f5f9').fill()
    doc.rect(40, y, pageWidth, producerBoxH).strokeColor('#cbd5e1').stroke()

    const drawProducerCol = (colIdx, label, val) => {
      const cx = 40 + colIdx * (pageWidth / 3)
      const colWidth = (pageWidth / 3) - 16
      if (colIdx === 0 && businessPictureBuffer) {
        const logoSize = 28
        try {
          doc.image(businessPictureBuffer, cx + 8, y + (producerBoxH - logoSize) / 2, { fit: [logoSize, logoSize], align: 'center', valign: 'center' })
        } catch (error) {
          console.error('Error drawing business picture:', error.message)
        }
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text(label, cx + 8 + logoSize + 6, y + 10)
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(val, cx + 8 + logoSize + 6, y + 23, { width: colWidth - logoSize - 6, ellipsis: true })
      } else {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569').text(label, cx + 8, y + 10)
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text(val, cx + 8, y + 23, { width: colWidth, ellipsis: true })
      }
    }

    drawProducerCol(0, 'Producer Name', producerName)
    drawProducerCol(1, 'Producer Contact', producerContact)
    drawProducerCol(2, 'Producer Email', producerEmail)

    // Footer signature
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text('Insurance is subject matter of the solicitation.', 40, y + producerBoxH + 8, { align: 'center', width: pageWidth })

    // ── Finalize ───────────────────────────────────────────────────────────
    doc.end()

    stream.on('finish', () => {
      const pdfUrl = `/uploads/quotations/${filename}`
      res.json({ success: true, url: pdfUrl, filename, insuranceCompanyId })
    })

    stream.on('error', (err) => {
      console.error('PDF stream error:', err)
      res.status(500).json({ success: false, message: 'Failed to generate PDF' })
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = { generatePdf }
