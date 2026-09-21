const PDFDocument = require('pdfkit')
const QRCode = require('qrcode')
const path = require('path')

const EMBLEM_PATH = path.join(__dirname, '..', 'assets', 'satyamev.png')

const STATES = {
  AN: 'Andaman & Nicobar', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar',
  CG: 'Chhattisgarh', CH: 'Chandigarh', DD: 'Daman & Diu', DL: 'Delhi', DN: 'Dadra & Nagar Haveli',
  GA: 'Goa', GJ: 'Gujarat', HP: 'Himachal Pradesh', HR: 'Haryana', JH: 'Jharkhand',
  JK: 'Jammu & Kashmir', KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep',
  MH: 'Maharashtra', ML: 'Meghalaya', MN: 'Manipur', MP: 'Madhya Pradesh', MZ: 'Mizoram',
  NL: 'Nagaland', OD: 'Odisha', OR: 'Odisha', PB: 'Punjab', PY: 'Puducherry', RJ: 'Rajasthan',
  SK: 'Sikkim', TN: 'Tamil Nadu', TR: 'Tripura', TS: 'Telangana', UK: 'Uttarakhand',
  UP: 'Uttar Pradesh', WB: 'West Bengal'
}

const val = (v) => {
  if (v === undefined || v === null) return ''
  const s = String(v).trim()
  return s.toUpperCase() === 'NA' ? '' : s
}

const monthYear = (dateStr) => {
  const s = val(dateStr)
  if (!s) return ''
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
  }
  const m = s.match(/(\d{1,2})[-/](\d{4})$/)
  return m ? `${m[1].padStart(2, '0')}-${m[2]}` : ''
}

const BLUE = '#29a9e0'
const ORANGE = '#f7941d'

function roundedCard(doc, x, y, w, h) {
  doc.save()
  doc.roundedRect(x, y, w, h, 6).fill('#9aa5ad')
  const grad = doc.linearGradient(x, y, x, y + h)
  grad.stop(0, '#dcecf4').stop(0.5, '#f4f9fc').stop(1, '#c4dcea')
  doc.roundedRect(x + 1.5, y + 1.5, w - 3, h - 3, 5).fill(grad)
  doc.roundedRect(x + 1.5, y + 1.5, w - 3, h - 3, 5).lineWidth(0.6).stroke('#6b7a85')
  doc.restore()
}

function badge(doc, cx, cy, r, color, text) {
  doc.save()
  doc.circle(cx, cy, r).fillAndStroke(color, '#1f3b4d')
  doc.fillColor('#111').font('Helvetica-Bold').fontSize(6.5)
  doc.text(text, cx - r, cy - 3.2, { width: r * 2, align: 'center', lineBreak: false })
  doc.restore()
}

function label(doc, text, x, y, opts = {}) {
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(opts.size || 6.5)
    .text(text, x, y, { lineBreak: false })
}

function value(doc, text, x, y, opts = {}) {
  doc.fillColor('#222').font('Helvetica').fontSize(opts.size || 6.5)
    .text(text || '', x, y, { width: opts.width, lineBreak: opts.width ? true : false })
}

function verticalText(doc, text, cx, cy, font = 'Helvetica', size = 6) {
  doc.save()
  doc.translate(cx, cy).rotate(90)
  doc.fillColor('#222').font(font).fontSize(size)
  const w = doc.widthOfString(text)
  doc.text(text, -w / 2, -size / 2, { lineBreak: false })
  doc.restore()
}

/**
 * Generate an RC (Registration Certificate) card style PDF buffer from Vahan data.
 */
async function generateRcCardPDF(d = {}) {
  const regNo = val(d.REGN_NO)
  const stateCode = (val(d.STATE_CD) || regNo.slice(0, 2)).toUpperCase().slice(0, 2)
  const stateName = STATES[stateCode] || val(d.STATE_NAME) || stateCode

  const qrPayload = [
    `Regn No: ${regNo}`,
    `Owner: ${val(d.OWNER_NAME)}`,
    `Chassis: ${val(d.CHASI_NO)}`,
    `Engine: ${val(d.ENG_NO)}`,
    `Maker: ${val(d.MAKER_DESC)}`,
    `Model: ${val(d.MAKER_MODEL)}`,
    `Regn Date: ${val(d.REGN_DT)}`,
    `Valid Upto: ${val(d.REGN_UPTO)}`
  ].join('\n')
  const qrBuf = await QRCode.toBuffer(qrPayload, { margin: 0, width: 300, errorCorrectionLevel: 'M' })

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `RC ${regNo}` } })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = 272
    const H = 172
    const gap = 12
    const y = 40
    const x1 = (595.28 - (W * 2 + gap)) / 2
    const x2 = x1 + W + gap

    // ================= FRONT CARD =================
    roundedCard(doc, x1, y, W, H)

    // Satyamev Jayate emblem
    try {
      doc.image(EMBLEM_PATH, x1 + 14, y + 8, { height: 46 })
    } catch (e) {
      // emblem is optional; skip if the file is missing
    }

    doc.fillColor('#000').font('Helvetica-Bold').fontSize(7.3)
      .text('Indian Union Vehicle Registration Certificate', x1 + 62, y + 11, { lineBreak: false })
    doc.text(`Issued by Government of ${stateName}`, x1 + 62, y + 21, { lineBreak: false })
    badge(doc, x1 + W - 42, y + 19, 7.5, BLUE, 'NT')
    badge(doc, x1 + W - 24, y + 19, 7.5, ORANGE, stateCode)

    const cx = x1 + 62
    let cy = y + 38
    label(doc, 'Regn. No', cx, cy)
    label(doc, 'Date of Regn.', cx + 46, cy)
    label(doc, 'Regn. Validity', cx + 96, cy)
    label(doc, 'Owner', cx + 152, cy)
    label(doc, 'Serial', cx + 152, cy + 8)
    doc.circle(cx + 182, cy + 9, 5.5).lineWidth(0.8).stroke('#000')
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(7)
      .text(val(d.OWNER_SERIAL_NO) || '1', cx + 176.5, cy + 6.5, { width: 11, align: 'center', lineBreak: false })
    cy += 8
    value(doc, regNo, cx, cy)
    value(doc, val(d.REGN_DT), cx + 46, cy)
    value(doc, val(d.REGN_UPTO), cx + 96, cy)

    cy += 10
    label(doc, 'Chassis Number', cx, cy)
    value(doc, val(d.CHASI_NO), cx, cy + 8)
    cy += 20
    label(doc, 'Engine / Motor Number', cx, cy)
    value(doc, val(d.ENG_NO), cx, cy + 8)
    cy += 20
    label(doc, 'Owner Name', cx, cy)
    value(doc, val(d.OWNER_NAME), cx, cy + 8)
    cy += 20
    label(doc, 'Son / Daughter / Wife of', cx, cy)
    doc.font('Helvetica-Bold').fontSize(4.5).text(' (In case of Individual Owner)', cx + 84, cy + 1.5, { lineBreak: false })
    value(doc, val(d.F_NAME), cx, cy + 8)
    cy += 20
    label(doc, 'Address', cx, cy)
    value(doc, val(d.PERMANENT_ADDRESS) || val(d.PRESENT_ADDRESS), cx, cy + 8, { width: W - 62 - 26 })

    label(doc, 'Fuel', x1 + 8, y + 96)
    value(doc, val(d.FUEL_DESC), x1 + 8, y + 104, { width: 50 })
    label(doc, 'Emission Norms', x1 + 8, y + 120)
    value(doc, val(d.FUEL_NORMS), x1 + 8, y + 128, { width: 58, size: 5.8 })

    verticalText(doc, `Card Issue Date (${monthYear(d.REGN_DT)})`, x1 + W - 10, y + 95)

    // ================= BACK CARD =================
    roundedCard(doc, x2, y, W, H)

    badge(doc, x2 + 15, y + 17, 7.5, BLUE, 'NT')
    badge(doc, x2 + 33, y + 17, 7.5, ORANGE, stateCode)
    label(doc, `VEHICLE CLASS : ${val(d.VEHICLE_CLASS)}`, x2 + 50, y + 14, { size: 7 })

    label(doc, 'Regn. Number', x2 + 8, y + 33)
    label(doc, regNo, x2 + 8, y + 41)
    doc.image(qrBuf, x2 + 8, y + 50, { width: 62, height: 62 })
    label(doc, 'Month - Year of Mfg.', x2 + 8, y + 119)
    value(doc, val(d.MANU_MONTH_YR), x2 + 8, y + 127)
    label(doc, 'No of Cylinders :', x2 + 8, y + 140, { size: 6.5 })
    value(doc, val(d.NO_CYL || d.NO_OF_CYL || d.NO_CYLINDERS), x2 + 66, y + 140)

    const bx = x2 + 78
    label(doc, 'Maker:', bx, y + 33)
    value(doc, val(d.MAKER_DESC), bx, y + 41, { width: 170 })
    label(doc, 'Model:', bx, y + 53)
    value(doc, val(d.MAKER_MODEL), bx, y + 61, { width: 170 })
    label(doc, 'Color:', bx, y + 73)
    label(doc, '/ Body Type', bx + 62, y + 73)
    value(doc, val(d.COLOR), bx, y + 81, { width: 60 })
    value(doc, val(d.BODY_TYPE_DESC) || val(d.VEHICLE_CLASS), bx + 62, y + 81, { width: 100 })
    label(doc, 'Seating (in all) Capacity', bx, y + 93)
    value(doc, val(d.SEATING_CAPACITY), bx, y + 101)
    label(doc, 'Unladen Weight (Kg)', bx, y + 113)
    value(doc, val(d.UNLADEN_WEIGHT), bx, y + 121)
    label(doc, 'Cubic Cap. / Horse Power (BHP/Kw) / Wheel Base(mm)', bx, y + 133, { size: 5.3 })
    value(doc, val(d.CUBIC_CAPACITY), bx, y + 141)
    value(doc, val(d.HORSE_POWER || d.HP), bx + 40, y + 141)
    value(doc, val(d.WHEELBASE || d.WHEEL_BASE), bx + 100, y + 141)
    label(doc, 'Financier', bx, y + 152)
    label(doc, 'Registration Authority', bx + 90, y + 152, { size: 6 })
    value(doc, val(d.FINANCER_DETAILS), bx, y + 160, { width: 88 })
    value(doc, val(d.REGISTERED_AT), bx + 90, y + 160, { width: 90 })

    verticalText(doc, 'Form : 23A', x2 + W - 10, y + 40, 'Helvetica-Bold', 6.5)

    doc.end()
  })
}

module.exports = { generateRcCardPDF }
