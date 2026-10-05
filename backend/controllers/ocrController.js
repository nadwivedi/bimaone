const axios = require('axios')
const pdfParse = require('pdf-parse')
const InsuranceCompany = require('../models/InsuranceCompany')

/**
 * IFFCO Tokio PDFs have a combined line like:
 *   "COMPANY NAMEPolicy #:1-8H9WT9SUP400 Policy #N7964694"
 * where the FIRST Policy # is the Tax Invoice / internal ref and
 * the SECOND Policy # is the actual policy number.
 * This helper detects that pattern and returns the correct policy number.
 */
const extractIffcoTokioPolicyNumber = (rawText) => {
  if (!rawText) return null

  // Pattern: one line containing two "Policy #" occurrences
  // e.g. "...Policy #:1-8H9WT9SUP400 Policy #N7964694"
  // The actual policy number follows the LAST "Policy #" on that line.
  const lines = rawText.split('\n')
  for (const line of lines) {
    // Count occurrences of "Policy #" (case-insensitive)
    const matches = [...line.matchAll(/Policy\s*#\s*:?\s*([^\s]+)/gi)]
    if (matches.length >= 2) {
      // The last match is the actual policy number
      const actualPolicyNo = matches[matches.length - 1][1].trim()
      if (actualPolicyNo) {
        console.log('[IFFCO-Tokio] Detected dual Policy# line. Overriding policy number to:', actualPolicyNo)
        return actualPolicyNo
      }
    }
  }
  return null
}

/**
 * Some insurers (e.g. Go Digit) print a clean "ENDORSEMENT" invoice table:
 *   "Invoice Number Invoice Date Net Premium Igst Cgst Sgst Utgst Cess Gross Premium
 *    IA250592477 2026-04-11 1002.29 0.00 90.21 90.21 0.00 0.00 1182.71"
 * pdf-parse concatenates the row's numbers with no separators (each is a clean
 * 2-decimal amount, so they can be split unambiguously), while the OD/TP
 * breakdown table above it gets its labels and values scrambled out of order.
 * This table is unambiguous, so use it to correct netPremium/premium (gross)
 * when present, overriding whatever the AI guessed.
 */
/**
 * Bajaj Allianz PDFs render the premium breakdown as a two-column table
 * (OWN DAMAGE | LIABILITY) that pdf-parse flattens into a single stream.
 * The AI therefore ends up reading values like "Net Premium 714.00" and
 * incorrectly assigns 714 to both netPremium AND premium, missing the
 * unambiguous line "Final Premium Rs.843.00" that appears right below.
 *
 * This helper finds that "Final Premium Rs." label and returns the correct
 * gross premium value so we can override whatever the AI guessed.
 *
 * It also extracts the Net Premium (before GST) from the same block so we
 * can verify: Final Premium ≈ Net Premium × 1.18.
 */
const extractBajajFinalPremium = (rawText) => {
  if (!rawText) return null

  // Match: "Final Premium Rs.843.00" or "Final Premium Rs. 843" or "Final Premium Rs843.00"
  const finalMatch = rawText.match(/Final\s*Premium\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i)
  if (!finalMatch) return null

  const finalPremium = Number(finalMatch[1].replace(/,/g, ''))
  if (!finalPremium || isNaN(finalPremium)) return null

  // Also extract Net Premium from the same block for cross-validation
  // Bajaj prints: "Net Premium714.00" or "Net Premium 714.00"
  const netMatch = rawText.match(/Net\s*Premium\s*([\d,]+(?:\.\d{1,2})?)/i)
  const netPremium = netMatch ? Number(netMatch[1].replace(/,/g, '')) : null

  // Sanity check: Final Premium must be > Net Premium (GST pushes it up ~18%)
  if (netPremium != null && finalPremium <= netPremium) {
    console.log('[Bajaj] Final Premium not > Net Premium — skipping override:', finalPremium, 'vs', netPremium)
    return null
  }

  console.log('[Bajaj] Extracted Final Premium:', finalPremium, '| Net Premium:', netPremium)
  return { finalPremium, netPremium }
}

const extractNetGrossPremiumFromEndorsementTable = (rawText) => {
  if (!rawText) return null
  // Non-motor schedules (burglary, property) break the header over several lines and print
  // the gross with a thousands comma: "...2026-09-184446.380.00400.00400.000.000.005,246.38"
  const match = rawText.match(/Net\s*Premium\s*Igst\s*Cgst\s*Sgst\s*Utgst\s*Cess\s*Gross\s*Premium[\s\S]{0,80}?\d{4}-\d{2}-\d{2}((?:[\d,]+\.\d{2}){7})/i)
  if (!match) return null
  const numbers = (match[1].match(/[\d,]+\.\d{2}/g) || []).map(n => Number(n.replace(/,/g, '')))
  if (numbers.length !== 7) return null
  const [netPremium, igst, cgst, sgst, utgst, cess, grossPremium] = numbers
  const gstAmount = Math.round((igst + cgst + sgst + utgst + cess) * 100) / 100
  // The row must add up, otherwise the amounts were split wrongly
  if (!grossPremium || Math.abs(netPremium + gstAmount - grossPremium) > 1) return null
  return { netPremium, gstAmount, premium: grossPremium }
}

/**
 * Go Digit policy schedules print an OD/TP premium breakdown table where
 * pdf-parse scrambles the labels away from their values (columns get
 * flattened out of reading order), so the AI regularly grabs the wrong
 * number (e.g. picks the TP figure for OD, or vice-versa). However the
 * table always ends with one clean, unambiguous final summary row right
 * before the "Note:...total OD premium..." disclaimer:
 *   "(`) 288.29 96.10 714.00 Note:The above total OD premium is..."
 * which is always [Total OD Premium, NCB amount, Total Act/TP Premium] in
 * that fixed order. Cross-check against the known netPremium (OD + TP)
 * before trusting it, so a template change can't silently corrupt data.
 */
const extractDigitOdTpPremium = (rawText, knownNetPremium) => {
  if (!rawText) return null
  const match = rawText.match(/\(`\)\s*(\d+\.\d{2})\s*(\d+\.\d{2})\s*(\d+\.\d{2})\s*Note:\s*The above total OD premium/i)
  if (match) {
    const odPremium = Number(match[1])
    const tpPremium = Number(match[3])
    // doesn't reconcile with net premium, don't risk a bad override
    if (knownNetPremium == null || Math.abs(odPremium + tpPremium - knownNetPremium) <= 2) {
      return { odPremium, tpPremium }
    }
  }

  // Private car schedules (and some two-wheeler ones) don't end with that summary row, but
  // every Digit motor schedule prints Net Premium directly followed by Total Act Premium just
  // before the "Legal Liability to Employees" label:
  //   (`) / 7087.33 / 3466.00 / Legal Liability to Employees
  // The model tends to return Basic Third-Party Liability (3416) or to leave TP blank and
  // file the whole net premium under OD.
  const pair = rawText.match(/\(`\)\s*\n\s*(\d+\.\d{2})\s*\n\s*(\d+\.\d{2})\s*\n\s*Legal\s+Liability\s+to\s+Employees/i)
  if (!pair || knownNetPremium == null) return null
  const netPremium = Number(pair[1])
  const tpPremium = Number(pair[2])
  if (Math.abs(netPremium - knownNetPremium) > 1 || tpPremium > netPremium) return null
  const odPremium = Math.round((netPremium - tpPremium) * 100) / 100
  // the own-damage figure must itself be printed, otherwise the pair was misread
  if (odPremium > 0 && !textHasAmount(rawText, odPremium)) return null
  return { odPremium: odPremium > 0 ? odPremium : '', tpPremium: tpPremium > 0 ? tpPremium : '' }
}

/**
 * Go Digit PDFs print policy dates in a two-column table:
 *   Col 1: Own Damage Cover period  |  Col 2: Third Party Liability Cover period
 * pdf-parse flattens this into a sequence of 4 consecutive date strings:
 *   [OD From, TP From, OD To, TP To]
 * right after the "Period of Policy" header line.
 *
 * Problem: the same page also has a line like "D262115781 / 11042026" where
 * "11042026" is the policy issue date concatenated with the policy number.
 * The AI reads that as "11-04-2026" and uses it as validFrom instead of the
 * correct "12-Apr-2026" from the table.
 *
 * This helper extracts the 4 dates from the table in the correct column
 * order and returns them for use as an override in the post-processor.
 *
 * Format of dates in Go Digit PDFs: "12-Apr-2026", "11-Apr-2027" etc.
 * We normalise to DD-MM-YYYY for the stored fields.
 */
const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
}

const normaliseDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return null
  // Already DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-')
  }
  // DD-Mon-YYYY e.g. "12-Apr-2026"
  const m = dateStr.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})$/)
  if (m) {
    const mm = MONTH_MAP[m[2].toLowerCase()]
    if (!mm) return null
    return `${m[1].padStart(2, '0')}-${mm}-${m[3]}`
  }
  return null
}

const extractDigitPolicyDates = (rawText) => {
  if (!rawText) return null

  // Commercial vehicle schedules have a single period and print it as
  //   Period of Policy / D261093647 / 07042026 / ... / 09-Apr-2026 / 08-Apr-2027 /
  //   11:51:27 / 23:59:59 / 07-Apr-2026 (issue date) / 07-Apr-2026 (invoice date)
  // i.e. From, To, their two times, then the issue date. The model tends to take the issue
  // date as the start date because it is also embedded in the policy number.
  const DIGIT_DATE = '(\\d{1,2}-[A-Za-z]{3}-\\d{4})'
  const commercial = rawText.match(new RegExp(
    `Period\\s+of\\s+Policy\\s*\\n\\s*D\\d+\\s*\\/\\s*\\d+[\\s\\S]{0,80}?${DIGIT_DATE}\\s*\\n\\s*${DIGIT_DATE}\\s*\\n\\s*\\d{2}:\\d{2}:\\d{2}\\s*\\n\\s*\\d{2}:\\d{2}:\\d{2}\\s*\\n\\s*${DIGIT_DATE}`, 'i'
  ))
  if (commercial) {
    const result = {
      validFrom: normaliseDateDDMMYYYY(commercial[1]),
      validTo: normaliseDateDDMMYYYY(commercial[2]),
      issueDate: normaliseDateDDMMYYYY(commercial[3])
    }
    if (result.validFrom && result.validTo) {
      console.log('[GoDigit] Extracted policy dates from commercial Period-of-Policy block:', result)
      return result
    }
  }

  // Look for the block: "Period of Policy Own Damage Cover..." followed by
  // 4 date values in the format "DD-Mon-YYYY" within the next ~300 chars.
  // The column order is always: OD-From, TP-From, OD-To, TP-To
  const blockMatch = rawText.match(
    /Period\s+of\s+Policy[^\n]*(?:Own\s+Damage|OD)[^\n]*((?:\n[^\n]*)*)/i
  )

  // Go Digit private car and non-motor schedules have no such block; they glue each date to
  // its label and time instead:
  //   "From22-Sep-202600:00:00" ... "To21-Sep-202723:59:59"
  // (the first pair is the own-damage / main period). The model sometimes took the issue
  // date, printed just above, as the start date.
  if (!blockMatch && /Go\s*Digit/i.test(rawText)) {
    const DATE = '(\\d{1,2}-(?:[A-Za-z]{3}|\\d{2})-\\d{4})'
    const from = rawText.match(new RegExp(`\\bFrom\\s*${DATE}\\s*\\d{2}:\\d{2}:\\d{2}`))
    const to = rawText.match(new RegExp(`\\bTo\\s*${DATE}\\s*\\d{2}:\\d{2}:\\d{2}`))
    const validFrom = from && normaliseDateDDMMYYYY(from[1])
    const validTo = to && normaliseDateDDMMYYYY(to[1])
    if (validFrom && validTo) {
      console.log('[GoDigit] Extracted policy dates from From/To labels:', { validFrom, validTo })
      return { validFrom, validTo }
    }
  }
  if (!blockMatch) return null

  // Collect all DD-Mon-YYYY (or DD-MM-YYYY) dates from the block
  const block = blockMatch[0]
  const datePattern = /\b(\d{1,2}-(?:[A-Za-z]{3}|\d{2})-\d{4})\b/g
  const dates = []
  let m
  while ((m = datePattern.exec(block)) !== null) {
    const normalised = normaliseDateDDMMYYYY(m[1])
    if (normalised) dates.push(normalised)
    if (dates.length === 4) break
  }

  // We need at least 2 dates (From, To for OD) to be useful
  if (dates.length < 2) return null

  // Column order: [OD-From, TP-From, OD-To, TP-To]
  // If only 2 dates found it's a TP-only policy: [TP-From, TP-To]
  const result = {}
  if (dates.length >= 4) {
    result.validFrom = dates[0]   // OD From
    result.validTo = dates[2]   // OD To
    result.tpValidFrom = dates[1] // TP From
    result.tpValidTo = dates[3] // TP To
  } else if (dates.length === 3) {
    // OD-From, OD-To, TP-To (TP-From same as OD-From)
    result.validFrom = dates[0]
    result.validTo = dates[1]
    result.tpValidFrom = dates[0]
    result.tpValidTo = dates[2]
  } else {
    result.validFrom = dates[0]
    result.validTo = dates[1]
  }

  console.log('[GoDigit] Extracted policy dates from Period-of-Policy block:', result)
  return result
}

/**
 * HDFC ERGO policy schedules (especially Standalone OD / Two Wheeler OD Only)
 * display a breakdown table like:
 *   Own Damage Premium(a)(`)  Liability Premium(b)(`)
 *   Basic Own Damage: 577
 *   Total Premium (a+b) 935
 *   Integrated Tax 18% 168
 *   ...
 *   Net Own Damage Premium (a) 935
 *   Total Premium 1103
 *
 * For Standalone OD policies, Liability Premium (b) is blank/empty, but the AI
 * often mistakes "Integrated Tax 18% 168" as tpPremium! Also "Total Premium (a+b) 935"
 * is the netPremium (before 18% GST).
 *
 * This helper extracts the clean figures from HDFC ERGO policy text.
 */
const extractHdfcErgoPremiums = (rawText) => {
  if (!rawText) return null

  const isHdfc = /HDFC\s*ERGO/i.test(rawText)
  if (!isHdfc) return null

  const isStandaloneOd = /Standalone\s*OD/i.test(rawText) || /Own\s*Damage\s*Only/i.test(rawText)

  // 1. Net Own Damage Premium (a)
  const netOdMatch = rawText.match(/Net\s*Own\s*Damage\s*Premium\s*\(a\)[^\d]*(\d+(?:\.\d{1,2})?)/i)
  const odPremium = netOdMatch ? Number(netOdMatch[1]) : null

  // 2. Total Premium (a+b) -> Net Premium
  const totalNetMatch = rawText.match(/Total\s*(?:Package\s*)?Premium\s*\(a\+b\)[^\d]*(\d+(?:\.\d{1,2})?)/i)
  const netPremium = totalNetMatch ? Number(totalNetMatch[1]) : (odPremium ?? null)

  // 3. Gross Premium: "Total Premium\n1103"
  let grossPremium = null
  const grossMatch = rawText.match(/Net\s*Own\s*Damage\s*Premium[\s\S]{0,100}?Total\s*Premium[^\d]*(\d+(?:\.\d{1,2})?)/i)
    || rawText.match(/Total\s*Premium\s*\(a\+b\)[\s\S]{0,150}?Total\s*Premium[^\d]*(\d+(?:\.\d{1,2})?)/i)
  if (grossMatch) {
    grossPremium = Number(grossMatch[1])
  }

  // 4. TP Premium
  let tpPremium = ''
  if (!isStandaloneOd) {
    const liabMatch = rawText.match(/(?:Net|Total)\s*Liability\s*Premium\s*\(b\)[^\d]*(\d+(?:\.\d{1,2})?)/i)
    if (liabMatch) {
      tpPremium = Number(liabMatch[1])
    }
  }

  return {
    odPremium,
    tpPremium,
    netPremium,
    premium: grossPremium,
    isStandaloneOd
  }
}

/**
 * IFFCO Tokio PDFs (especially Standalone OD policies) print a Premium Bifurcation table
 * where numbers are concatenated in raw text:
 *   "Premium Bifurcation (Rs.) Section 1 (Rs.) Section 2 (Rs.) Premium/Taxable Value(Rs.) Total GST Net Premium Rs.(for 1 years)"
 *   "622.00174.00796.00143.28939.28"
 *
 * Here:
 * - Section 1 (OD Net): 622.00
 * - Section 2 (Addons): 174.00
 * - Premium/Taxable Value (Total Net OD): 796.00
 * - Total GST: 143.28
 * - Net Premium Rs. (Gross): 939.28
 *
 * For Standalone OD policies, Third Party details belong to a different insurer
 * (e.g. Shriram General Ins) and are for reference only.
 */
const extractIffcoTokioPremiums = (rawText) => {
  if (!rawText) return null

  const isIffco = /IFFCO\s*[-–]?\s*TOKIO/i.test(rawText)
  if (!isIffco) return null

  const isStandaloneOd = /Stand\s*Alone\s*OD/i.test(rawText)
    || /Standalone\s*OD/i.test(rawText)
    || /Own\s*Damage\s*Only/i.test(rawText)
    || /TP\s*Insurer\s*Name\s*:/i.test(rawText)

  const amounts = (str) => (str.match(/\d+\.\d{2}/g) || []).map(Number)
  const near = (x, y) => Math.abs(x - y) <= 1

  // The cover type is printed in the vehicle table, glued to the CC / IDV columns:
  // "5000Liability Only1", "-Package3462404", "998Package950000.00"
  const coverMatch = rawText.match(/(Liability\s*Only|Package)\s*[\d.]*\s*\n/i)
  let insuranceClass = null
  if (isStandaloneOd) insuranceClass = 'Standalone OD'
  else if (coverMatch) insuranceClass = /liability/i.test(coverMatch[1]) ? 'Third Party' : 'Comprehensive'

  // "Net (A)11482.00Net (B)44050.00" — own damage and third party subtotals
  const netAb = rawText.match(/Net\s*\(A\)\s*(\d+\.\d{2})\s*Net\s*\(B\)\s*(\d+\.\d{2})/i)
  const netB = netAb ? Number(netAb[2]) : null

  // The totals row is a run of 2-decimal amounts with no separators, ending in
  // [taxable value, total GST, invoice total]. Private car / bus schedules print it under
  // "Premium Bifurcation" / "Section 1 (Rs.)" with 2 or 3 section columns in front.
  let taxableValue = null, totalGst = null, grossVal = null
  const bifMatch = rawText.match(/(?:Premium\s*Bifurcation|Section\s*1\s*\(Rs\.\))[\s\S]{0,220}?\n\s*((?:\d+\.\d{2}){5,6})\s*\n/i)
  if (bifMatch) {
    const nums = amounts(bifMatch[1])
    const [taxable, gst, total] = nums.slice(-3)
    const sections = nums.slice(0, -3).reduce((sum, n) => sum + n, 0)
    if (near(sections, taxable) && near(taxable + gst, total)) {
      taxableValue = taxable
      totalGst = gst
      grossVal = total
    }
  }

  // Commercial vehicle schedules instead end the GST table with
  // "Total\n55532.002141.132141.1359814.26" = [taxable, CGST, SGST (or one IGST), total]
  if (grossVal == null) {
    const totalRow = rawText.match(/\n\s*Total\s*\n\s*((?:\d+\.\d{2}){3,5})\s*\n/i)
    if (totalRow) {
      const nums = amounts(totalRow[1])
      const taxable = nums[0]
      const total = nums[nums.length - 1]
      const gst = nums.slice(1, -1).reduce((sum, n) => sum + n, 0)
      if (near(taxable + gst, total)) {
        taxableValue = taxable
        totalGst = Math.round(gst * 100) / 100
        grossVal = total
      }
    }
  }

  // Own damage = everything taxable that is not third party (basic OD + add-on sections)
  let odPremium = null
  let tpPremium = null
  if (isStandaloneOd) {
    odPremium = taxableValue
    tpPremium = ''
  } else if (taxableValue != null && netB != null && netB <= taxableValue + 1) {
    const od = Math.round((taxableValue - netB) * 100) / 100
    odPremium = od > 0 ? od : ''
    tpPremium = netB > 0 ? netB : ''
  }

  return {
    isStandaloneOd,
    insuranceClass,
    odPremium,
    tpPremium,
    netPremium: taxableValue,
    gstAmount: totalGst,
    premium: grossVal
  }
}

/**
 * Indian vehicle registration numbers follow the pattern:
 *   <2-letter state code><2-digit district><1-3 letter series><4-digit number>
 * Total length after stripping hyphens/spaces: 9 or 10 characters.
 * Examples: CG04NS0396, MH12AB1234, DL1CAB1234
 *
 * If the AI returns a vehicleNumber that is clearly wrong (too long, looks like
 * Engine No or Chassis No concatenation), this helper scans the raw PDF text
 * for a valid Indian registration number and returns it.
 */
const INDIAN_REG_NO_PATTERN = /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b/g

// RTO state / union-territory codes. Without this check, text that merely has the same shape
// was accepted as a registration number — e.g. "To19-Sep-2027" on a burglary policy became
// vehicle number "TO19SEP2027".
const INDIAN_STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN', 'GA', 'GJ', 'HP', 'HR', 'JH', 'JK',
  'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'OR', 'PB', 'PY', 'RJ', 'SK',
  'TG', 'TN', 'TR', 'TS', 'UA', 'UK', 'UP', 'WB'
])

const isValidIndianVehicleNumber = (val) => {
  if (!val) return false
  const stripped = val.replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(stripped)) return true // Bharat (BH) series
  return /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(stripped) && INDIAN_STATE_CODES.has(stripped.slice(0, 2))
}

// A registration number is printed on its own or followed by the year of manufacture
// ("CG29AF32182023"). If the only place the value occurs runs straight on into more digits
// ("JK36EW2362624") it is the start of an engine / chassis number.
const isPrintedAsRegistration = (rawText, vehicleNumber) => {
  const parts = String(vehicleNumber || '').match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/)
  if (!parts || !rawText) return true
  const [, state, district, series, number] = parts
  return new RegExp(`${state}[\\s-]*${district}[\\s-]*${series}[\\s-]*${number}(?:(?:19|20)\\d{2})?(?!\\d)`, 'i').test(rawText)
}

// Fire, burglary, health etc. have no vehicle at all
// ("Registration No" alone is not enough — every schedule prints the insurer's IRDAI / GST one)
const isMotorPolicyText = (rawText) => /chassis|engine\s*no|vehicle\s*(?:registration|regn|no\b|number|details|idv)|registration\s*mark|regn\.?\s*number|\bIDV\b|insured'?s?\s*declared\s*value/i.test(rawText || '')

/**
 * Check if the document or extracted candidate indicates a NEW / Unregistered vehicle.
 * E.g. "Registration No. NEW", "NEW VEHICLE", "UNREGISTERED", "APPLIED FOR", "TO BE REGISTERED"
 */
const isNewVehicleRegistration = (rawText, val) => {
  if (val) {
    const clean = val.trim().toUpperCase().replace(/[\s.-]/g, '')
    if (clean.startsWith('NEW') || clean.includes('UNREGISTERED') || clean.includes('APPLIEDFOR') || clean.includes('NOTREGISTERED') || clean.includes('TOBEREGISTERED') || clean === 'TBR' || clean === 'NA' || clean === 'PROVISIONAL') {
      return true
    }
  }

  if (rawText) {
    const match = rawText.match(/(?:Registration\s*(?:Mark\s*(?:&|AND)?\s*Place|Mark|Number|No\.?)|Reg(?:istration)?\s*(?:Number|No\.?)|Vehicle\s*(?:Number|No\.?))\s*[:\-]?\s*(NEW|UNREGISTERED|APPLIED\s*FOR|NOT\s*REGISTERED|TO\s*BE\s*REGISTERED|T\.?B\.?R\.?|N\/?A|PROVISIONAL)(?![A-Za-z])/i)
    if (match) {
      return true
    }

    // Shriram / Universal Sompo / similar insurers:
    // pdf-parse concatenates table columns into single lines without spaces like:
    //   "NEW & RAIPURJK15EG5309259..." or "REGISTRATION NUMBERNEWPERIOD OF INSURANCE"
    const newPlaceMatch = rawText.match(/(?:^|\n)\s*NEW\s*&\s*[A-Z]{2,}/im)
    if (newPlaceMatch) {
      return true
    }

    const regNumNewConcatMatch = rawText.match(/REGISTRATION\s*(?:NUMBER|MARK|NO)?\s*[:\-]?\s*NEW/i)
    if (regNumNewConcatMatch) {
      return true
    }

    // Also catch "Registration Mark & Place ... NEW" style label-value on separate lines
    const regMarkPlaceMatch = rawText.match(/REGISTRATION\s*MARK\s*(?:&|AND)?\s*PLACE[\s\S]{0,200}?\bNEW\b/i)
    if (regMarkPlaceMatch) {
      return true
    }
  }

  return false
}

const extractValidIndianVehicleNumber = (rawText) => {
  if (!rawText) return null

  // If document indicates a NEW / Unregistered vehicle, return empty string
  if (isNewVehicleRegistration(rawText, null)) {
    console.log('[VehicleNo] Document indicates New/Unregistered vehicle. Returning empty vehicleNumber.')
    return ''
  }

  // 1. Try labeled matches: look for lines containing Registration keywords
  const labeledPattern = /(?:Registration\s*(?:Mark\s*&?\s*)?No\.?|Reg(?:istration)?\s*No\.?|Vehicle\s*No\.?)\s*[:\-]?\s*([A-Z]{2}[\s-]?\d{2}[\s-]?[A-Z]{1,3}[\s-]?\d{4})/gi
  const labeledMatch = rawText.match(labeledPattern)
  if (labeledMatch) {
    for (const m of labeledMatch) {
      const numMatch = m.match(/([A-Z]{2}[\s-]?\d{2}[\s-]?[A-Z]{1,3}[\s-]?\d{4})/i)
      if (numMatch) {
        const candidate = numMatch[1].replace(/[\s-]/g, '').toUpperCase()
        if (isValidIndianVehicleNumber(candidate)) {
          console.log('[VehicleNo] Extracted from label:', candidate)
          return candidate
        }
      }
    }
  }

  // 2. Fallback: scan all tokens in the text for Indian reg-no shaped strings
  //    Prefer shorter valid matches (9-10 chars) over concatenated junk
  const candidates = []
  let m
  const re = new RegExp(INDIAN_REG_NO_PATTERN.source, 'g')
  while ((m = re.exec(rawText.replace(/[\s-]/g, ' ').replace(/ /g, ''))) !== null) {
    // Run on original text lines to avoid cross-line concatenation
    if (isValidIndianVehicleNumber(m[1])) candidates.push(m[1])
  }

  // Also scan line by line to catch values concatenated with year (e.g. "CG04NS03962022")
  const lines = rawText.split('\n')
  for (const line of lines) {
    const stripped = line.replace(/[\s-]/g, '').toUpperCase()
    // Match Indian reg no possibly followed by 4-digit year. Any other trailing digits mean
    // this is the start of an engine / chassis number ("JK36EW2362624"), not a registration.
    const lineMatch = stripped.match(/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})((?:19|20)\d{2})?(?!\d)/)
    if (lineMatch && isValidIndianVehicleNumber(lineMatch[1])) {
      candidates.push(lineMatch[1])
    }
  }

  if (candidates.length > 0) {
    // Return the first valid unique candidate
    const unique = [...new Set(candidates)]
    console.log('[VehicleNo] Candidates found:', unique)
    return unique[0]
  }

  return null
}

/**
 * Extract the policy issue date directly from raw PDF text.
 * Searches for labels like "Invoice Date", "Issue Date", "Policy Issue Date",
 * "Date of Issue", "Receipt Date", "Collection Date", "Policy Date", "signed at ... on" etc.
 * Converts DD/MM/YYYY or YYYY-MM-DD or D-Mon-YYYY to DD-MM-YYYY.
 * Returns null if not found.
 */
const extractIssueDateFromRawText = (rawText) => {
  if (!rawText) return null

  // Normalize date: converts D/M/YYYY or DD/MM/YYYY -> DD-MM-YYYY
  //                 or YYYY-MM-DD -> DD-MM-YYYY
  //                 or D-Mon-YYYY -> DD-MM-YYYY
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
  const normalize = (d, m, y) => {
    let dd = String(d).padStart(2, '0')
    let mm
    if (/^\d+$/.test(String(m))) {
      mm = String(m).padStart(2, '0')
    } else {
      const mo = MONTHS[String(m).slice(0, 3).toLowerCase()]
      mm = mo ? String(mo).padStart(2, '0') : null
    }
    if (!mm) return null
    const yyyy = String(y)
    if (yyyy.length !== 4) return null
    return `${dd}-${mm}-${yyyy}`
  }

  // Labels to search for (in priority order)
  const LABEL_PATTERNS = [
    /(?:Invoice|GST\s+Invoice)\s*Date\s*[:\-]?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i,
    /(?:Receipt|Reciept|Collection|Payment)\s*Date\s*[:\-]?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i,
    /(?:Receipt|Reciept|Collection|Payment)\s*[\s\S]{0,30}?Date\s*[:\-]?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i,
    /(?:Policy\s+Issue|Issue|Date\s+of\s+(?:Issue|Issuance|Collection|Receipt))\s*Date\s*[:\-]?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i,
    /(?:Policy\s*Date|Issue\s*Date|Proposal\s*Date)\s*[:\-]?\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i,
    /signed\s+at\s+\S+\s+on\s+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i,
    /Vehicle\s+purchased\s+on\s+(?:dated\s*)?[:\-]?\s*(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/i,
  ]

  for (const pattern of LABEL_PATTERNS) {
    const m = rawText.match(pattern)
    if (m) {
      if (m[3] && m[3].length === 4) {
        const result = normalize(m[1], m[2], m[3])
        if (result) return result
      } else if (m[1] && m[1].length === 4) {
        const result = normalize(m[3], m[2], m[1])
        if (result) return result
      }
    }
  }

  return null
}

const HIGH_VALUE_KEYWORDS = [
  'registration no', 'vehicle no', 'engine number', 'chassis', 'make', 'model',
  'policy no', 'policy number', 'valid from', 'valid till', 'period of insurance',
  'premium', 'total premium', 'od premium', 'own damage premium', 'tp premium',
  'third party premium', 'liability premium', 'net premium', 'gross premium',
  'total od premium', 'total act premium', 'final premium', 'ncb',
  'insured', 'insured name', 'receipt', 'proposal',
  'certificate of insurance', 'policy schedule', 'fuel type', 'seating capacity',
  'mfg. year', 'manufacture year', 'date of registration', 'body type'
]

/**
 * Try to extract text from a PDF buffer using pdf-parse.
 * If pdf-parse fails (e.g. damaged xref/catalog), fall back to pdftotext
 * (Xpdf/Poppler command-line tool which handles damaged PDFs).
 * Returns { text, numpages } or throws if both fail.
 */
const parsePdfWithFallback = async (buffer) => {
  try {
    return await pdfParse(buffer)
  } catch (primaryErr) {
    console.warn('[PDF] pdf-parse failed (' + (primaryErr.message || primaryErr) + '), trying pdftotext fallback...')
    const { execFile } = require('child_process')
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    const tmpIn = path.join(os.tmpdir(), 'ocr_tmp_' + Date.now() + '.pdf')
    const tmpOut = path.join(os.tmpdir(), 'ocr_tmp_' + Date.now() + '.txt')
    try {
      fs.writeFileSync(tmpIn, buffer)
      await new Promise((resolve, reject) => {
        execFile('pdftotext', ['-layout', tmpIn, tmpOut], (err) => {
          if (err) reject(err); else resolve();
        })
      })
      const text = fs.readFileSync(tmpOut, 'utf8')
      return { text, numpages: (text.match(/\f/g) || []).length + 1 }
    } finally {
      try { fs.unlinkSync(tmpIn) } catch (_) { }
      try { fs.unlinkSync(tmpOut) } catch (_) { }
    }
  }
}

const extractRelevantPdfText = (fullText) => {
  let cleaned = fullText.replace(/[\u0900-\u097F]+/g, '').trim()

  const BOILERPLATE = [
    /Motor Vehicles? Act[^\n]{0,300}/gi,
    /Central Motor Vehicle[^\n]{0,250}/gi,
    /amended from time to time[^\n]{0,200}/gi,
    /Arbitration Clause[^\n]{0,200}/gi,
    /AVOIDANCE OF CERTAIN[^\n]{0,300}/gi,
    /RIGHT OF RECOVERY[^\n]{0,300}/gi,
    /Office of the Insurance Ombudsman[^\n]{0,400}/gi,
    /IN WITNESS WHEREOF[^\n]{0,400}/gi,
    /PersonsorClassofPersons[^\n]{0,400}/gi,
    /Usein connection[^\n]{0,400}/gi,
    /Thepolicydoesnot[^\n]{0,400}/gi,
    /IRDAI\/NL\/CIR[^\n]{0,300}/gi,
  ]
  for (const pattern of BOILERPLATE) cleaned = cleaned.replace(pattern, '')

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()

  const segments = cleaned.split(/(?:Page\s*(?:no\.?|number)?\s*[:\-]?\s*\d+\s*(?:of\s*\d+)?)/i)
    .filter(s => s.trim().length > 50)

  if (segments.length <= 1) {
    return cleaned.slice(0, 6000)
  }

  const scored = segments.map((seg, i) => {
    const lower = seg.toLowerCase()
    const score = HIGH_VALUE_KEYWORDS.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
    return { seg, score, i }
  })

  const topSegments = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .sort((a, b) => a.i - b.i)

  const result = topSegments.map(s => s.seg.trim()).join('\n\n---\n\n')

  return result.slice(0, 7000)
}

/**
 * Insurance policies run 5-15 pages but the model only gets ~7000 characters (Groq's
 * per-minute token limit). Taking the first N characters regularly cut off the premium / GST
 * table, which often sits after the vehicle and cover details. Instead, score every line by
 * how likely it carries a field we extract (premium, GST, policy number, period, vehicle,
 * insured name), keep the best-scoring line windows plus the document header, and return them
 * in their original order.
 */
// [pattern, weight] — totals and identity fields are few and vital, so they outweigh the long
// add-on / cover tables (mostly 0.00 rows) that would otherwise eat the whole budget.
const INSURANCE_LINE_WEIGHTS = [
  [/(?:net|gross|total|final|taxable)[^\n]{0,25}premium|premium[^\n]{0,25}(?:payable|total|paid|amount)|\b(?:c|s|i|ut|ug)gst\b|\bgst\b|goods\s*(?:and|&)\s*services?\s*tax|integrated tax|taxable value|invoice value|net\s*\([ab]\)|net payable|total amount|rounded off/i, 6],
  [/policy\s*(?:no|number|#)|certificate\s*no|policy\s*\/\s*certificate/i, 6],
  [/\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}/, 6],
  [/period\s*of\s*(?:insurance|policy|cover)|valid\s*(?:from|till|upto|to)|\bfrom\s*:|\bto\s*:|midnight|policy\s*(?:start|expiry|end)\s*date/i, 5],
  [/registration|regn\.?\s*n|reg\.?\s*no|vehicle\s*no/i, 4],
  [/issue\s*date|date\s*of\s*issue|issuance|invoice\s*(?:no|date)|receipt\s*date|policy\s*date/i, 4],
  [/insured|policy\s*holder|proposer|customer\s*name|\bname\b/i, 3],
  [/package|comprehensive|stand\s*alone|standalone|liability only|act only|third[\s-]*party|own damage|\btype of (?:policy|cover)|policy type/i, 2],
  [/premium|\btax\b|payable|stamp duty|\bncb\b|no claim|liability|\bmake\b|\bmodel\b/i, 2],
]
const AMOUNT_TOKEN = /\d[\d,]*\.\d{2}\b/
const NONZERO_AMOUNT = /[1-9][\d,]*\.\d{2}\b|\b0\.(?:0[1-9]|[1-9]\d)\b/
const DATE_TOKEN = /\b\d{1,2}[\/-](?:\d{1,2}|[A-Za-z]{3})[\/-]\d{2,4}\b/
const BARCODE_LINE = /^[A-Z]{25,}$/

const extractRelevantInsuranceText = (fullText, budget = 7000) => {
  let cleaned = (fullText || '').replace(/[\u0900-\u097F]+/g, '')
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
  if (cleaned.length <= budget) return cleaned

  // Drop exact repeats (page headers/footers printed on every page) but keep short value lines
  const seen = new Set()
  const lines = cleaned.split('\n').map(l => l.trim()).filter((l) => {
    if (!l || BARCODE_LINE.test(l)) return false
    if (l.length < 25) return true
    if (seen.has(l)) return false
    seen.add(l)
    return true
  })

  const score = lines.map((l) => {
    const hasAmount = AMOUNT_TOKEN.test(l)
    if (l.length > 200 && !hasAmount) return -1 // legal prose
    let s = 0
    for (const [pattern, weight] of INSURANCE_LINE_WEIGHTS) {
      if (pattern.test(l)) s += weight
    }
    if (hasAmount) s += NONZERO_AMOUNT.test(l) ? 2 : -2
    if (DATE_TOKEN.test(l)) s += 2
    if (s > 0 && l.length > 160) s -= 2
    return s
  })

  // Values are often printed a few lines away from their labels, so a line also earns
  // credit from its neighbours.
  const RADIUS = 4
  const density = lines.map((_, i) => {
    let d = 0
    for (let j = Math.max(0, i - RADIUS); j <= Math.min(lines.length - 1, i + RADIUS); j++) {
      if (score[j] > 0) d += score[j] / (1 + Math.abs(i - j))
    }
    return score[i] < 0 ? d - 6 : d
  })

  const keep = new Array(lines.length).fill(false)
  let used = 0
  const take = (i) => {
    if (keep[i]) return true
    const cost = Math.min(lines[i].length, 260) + 1
    if (used + cost > budget) return false
    keep[i] = true
    used += cost
    return true
  }

  // Header: insurer name, product title and usually the insured / policy number
  for (let i = 0; i < lines.length && used < Math.min(1200, budget); i++) take(i)

  const order = lines.map((_, i) => i).sort((a, b) => density[b] - density[a])
  for (const i of order) {
    if (density[i] <= 0) break
    if (!take(i) && used > budget - 40) break
  }

  const out = []
  let gap = false
  lines.forEach((l, i) => {
    if (!keep[i]) { gap = true; return }
    if (gap && out.length) out.push('...')
    gap = false
    out.push(l.length > 260 ? l.slice(0, 260) : l)
  })
  return out.join('\n')
}

/**
 * NIC's bilingual "Policy Schedule" layout prints every label and value on its own line:
 *   Schedule of Premium / - Own Damage / ... / Total / 13,517.00 / Legal Liability(`) / ... /
 *   /Total / 7,317.00            and on page 1:
 *   Premium / ` 20,834.00 / ... /CGST / ` 1,875.00 / ... //SGST/UTGST / ` 1,875.00 /
 *   /IGST / ` 0.00 / ... / Total Amount / ` 24,584.00
 * The model sees "Premium 20,834" near the Own Damage heading and files the whole net premium
 * under OD.
 */
const extractNationalInsuranceSchedulePremiums = (rawText) => {
  if (!rawText) return null
  if (!/National\s+Insurance/i.test(rawText)) return null

  // Labels are bilingual ("प्रीमियम Premium") — drop the Hindi so they start the line
  const text = rawText.replace(/[ऀ-ॿ]+/g, '').replace(/[ \t]+/g, ' ')
  const amount = (pattern) => {
    const m = text.match(pattern)
    if (!m) return null
    const n = Number(m[1].replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  const netPremium = amount(/\n\s*Premium\s*\n\s*`\s*([\d,]+\.\d{2})/)
  const premium = amount(/Total\s+Amount\s*\n\s*`\s*([\d,]+\.\d{2})/i)
  if (netPremium == null || premium == null || premium < netPremium) return null

  const gstAmount = ['\\/CGST', 'SGST\\/UTGST', '\\/IGST'].reduce((sum, label) => (
    sum + (amount(new RegExp(`${label}\\s*\\n\\s*\`\\s*([\\d,]+\\.\\d{2})`, 'i')) || 0)
  ), 0)
  const odTotal = amount(/\n\s*Total\s*\n\s*([\d,]+\.\d{2})\s*\n\s*Legal\s+Liability\s*\(/i)
  const tpTotal = amount(/\/\s*Total\s*\n\s*([\d,]+\.\d{2})/i)

  const result = { netPremium, premium }
  if (Math.abs(netPremium + gstAmount - premium) <= 2) result.gstAmount = Math.round(gstAmount * 100) / 100
  // Only trust the split when it adds up to the net premium
  if (Math.abs((odTotal || 0) + (tpTotal || 0) - netPremium) <= 1) {
    result.odPremium = odTotal || ''
    result.tpPremium = tpTotal || ''
    result.insuranceClass = odTotal && tpTotal ? 'Comprehensive' : (tpTotal ? 'Third Party' : 'Standalone OD')
  }
  console.log('[NIC] Extracted premiums from Policy Schedule layout:', result)
  return result
}

/**
 * National Insurance Company (NIC) PDFs use a two-column premium table
 * that pdf-parse cannot handle. This helper extracts:
 *   tpPremium:   TP Total (Rounded Off)
 *   odPremium:   OD Total (Rounded Off)  — empty for TP-only policies
 *   netPremium:  TOTAL PREMIUM (before GST)
 *   premium:     NET PAYABLE (after GST)
 *   insuranceClass: 'Third Party' | 'Comprehensive' | 'Standalone OD'
 * from the raw text.
 */
const extractNationalInsurancePremiums = (rawText) => {
  if (!rawText) return null
  if (!/National\s+Insurance/i.test(rawText)) return null

  // Helper: extract last monetary amount on a matched line
  const extractLastAmtOnLine = (pattern, text) => {
    const m = text.match(pattern)
    if (!m) return null
    const nums = m[0].match(/([\d,]+\.\d{2})/g)
    if (!nums) return null
    const n = parseFloat(nums[nums.length - 1].replace(/,/g, ''))
    return isNaN(n) ? null : n
  }

  // Determine policy class from document text
  const isLiabilityOnly = /Liability\s+Only|Third\s+Party\s+Only/i.test(rawText)
  const isStandaloneOd = /Standalone\s+OD|Own\s+Damage\s+Only/i.test(rawText)

  // Extract TP Total (Rounded Off) — last number on that line
  const tpTotal = extractLastAmtOnLine(/TP\s+Total\s*\(?Rounded\s*Off\)?[^\n]*/i, rawText)

  // Extract OD Total (Rounded Off) — last number on that line
  const odTotal = extractLastAmtOnLine(/OD\s+Total\s*\(?Rounded\s*Off\)?[^\n]*/i, rawText)

  // Extract TOTAL PREMIUM (net before GST) — last number on that line
  const netPremium = extractLastAmtOnLine(/TOTAL\s+PREMIUM[^\n]*/i, rawText)

  // Extract NET PAYABLE (gross after GST) — last number on that line
  const premium = extractLastAmtOnLine(/NET\s+PAYABLE[^\n]*/i, rawText)

  // For Liability Only: OD is empty, tpPremium = netPremium (TOTAL PREMIUM)
  // For Comprehensive: both OD and TP are present

  if (tpTotal == null && netPremium == null && odTotal == null) return null

  let insuranceClass = 'Comprehensive'
  if (isLiabilityOnly) insuranceClass = 'Third Party'
  else if (isStandaloneOd) insuranceClass = 'Standalone OD'

  const result = {
    insuranceClass,
    odPremium: odTotal,
    tpPremium: isLiabilityOnly ? netPremium : tpTotal,
    netPremium,
    premium,
  }
  console.log('[NIC] Extracted premiums:', result)
  return result
}

/**
 * Royal Sundaram PDFs are multi-page and pdf-parse's segment scoring often
 * selects marketing/info pages over the actual premium breakdown page.
 * This helper reads premiums directly from the raw text so they are never lost.
 *
 * Format in raw text (interleaved columns, read by pdf-parse):
 *   TOTAL OWN DAMAGE PREMIUM (A)\n11530
 *   NET PREMIUM (A + B)19477
 *   TOTAL LIABILITY PREMIUM (B)\n7947
 *   TOTAL PREMIUM PAYABLE\n22982.86   OR   Gross Premium22982.86
 */
const extractRoyalSundaramPremiums = (rawText) => {
  if (!rawText) return null
  if (!/Royal\s+Sundaram/i.test(rawText)) return null

  const parseAmt = (str) => {
    if (str == null) return null
    const n = parseFloat(String(str).replace(/,/g, '').trim())
    return isNaN(n) ? null : n
  }

  // Extract last number on line or first number on next line
  const extractAfterLabel = (pattern, text) => {
    const m = text.match(pattern)
    if (!m) return null
    // Try numbers on same line
    const sameLineNums = m[0].match(/([\d,]+\.?\d*)/g)
    if (sameLineNums && sameLineNums.length > 0) {
      const n = parseAmt(sameLineNums[sameLineNums.length - 1])
      if (n != null && n > 0) return n
    }
    return null
  }

  // TOTAL OWN DAMAGE PREMIUM (A) — value on next line
  let odPremium = null
  const odMatch = rawText.match(/TOTAL\s+OWN\s+DAMAGE\s+PREMIUM\s*\(?A\)?[^\n]*\n([^\n]+)/i)
  if (odMatch) odPremium = parseAmt(odMatch[1].match(/([\d,]+\.?\d*)/)?.[0])

  // TOTAL LIABILITY PREMIUM (B) — value on next line
  let tpPremium = null
  const tpMatch = rawText.match(/TOTAL\s+LIABILITY\s+PREMIUM\s*\(?B\)?[^\n]*\n([^\n]+)/i)
  if (tpMatch) tpPremium = parseAmt(tpMatch[1].match(/([\d,]+\.?\d*)/)?.[0])

  // NET PREMIUM (A + B) — value on same line concatenated
  let netPremium = null
  const netMatch = rawText.match(/NET\s+PREMIUM\s*\(?A\s*\+\s*B\)?([^\n]+)/i)
  if (netMatch) {
    const nums = netMatch[1].match(/([\d,]+\.?\d*)/g)
    if (nums) netPremium = parseAmt(nums[nums.length - 1])
  }

  // Gross Premium / TOTAL PREMIUM PAYABLE — value on same line or next line
  let premium = null
  const grossMatch = rawText.match(/(?:Gross\s+Premium|TOTAL\s+PREMIUM\s+PAYABLE)([^\n]*)(?:\n([^\n]*))?/i)
  if (grossMatch) {
    const sameLine = grossMatch[1].match(/([\d,]+\.\d{2})/g)
    if (sameLine) premium = parseAmt(sameLine[sameLine.length - 1])
    else if (grossMatch[2]) {
      const nextLine = grossMatch[2].match(/([\d,]+\.\d{2})/g)
      if (nextLine) premium = parseAmt(nextLine[0])
    }
  }

  if (odPremium == null && tpPremium == null && netPremium == null) return null

  const result = { odPremium, tpPremium, netPremium, premium }
  console.log('[RoyalSundaram] Extracted premiums:', result)
  return result
}

/**
 * Universal Sompo package schedules print two side-by-side premium columns that pdf-parse
 * merges, so "TOTAL OWN DAMAGE PREMIUM" / "TOTAL LIABILITY PREMIUM (B)" end up next to the
 * wrong numbers (basic OD before NCB, legal-liability add-on only). Three totals stay intact:
 *   NET LIABILITY PREMIUM (A+B) = II44442
 *   TOTAL PACKAGE PREMIUM (I+II)49679
 *   TOTAL POLICY PREMIUM\n52870
 * Own damage (incl. add-ons) is package minus liability; GST is policy minus package.
 */
const extractUniversalSompoPremiums = (rawText) => {
  if (!rawText) return null
  if (!/Universal\s+Sompo/i.test(rawText)) return null

  const amountAfter = (pattern) => {
    const m = rawText.match(pattern)
    return m ? Number(m[1]) : null
  }
  const tpPremium = amountAfter(/NET\s+LIABILITY\s+PREMIUM\s*\(A\+B\)\s*=\s*II\s*(\d+(?:\.\d{1,2})?)/i)
  const netPremium = amountAfter(/TOTAL\s+PACKAGE\s+PREMIUM\s*\(I\+II\)\s*(\d+(?:\.\d{1,2})?)/i)
  const premium = amountAfter(/TOTAL\s+POLICY\s+PREMIUM\s*(\d+(?:\.\d{1,2})?)/i)
  if (tpPremium == null || netPremium == null || premium == null) return null
  if (tpPremium > netPremium || premium <= netPremium || (premium - netPremium) / netPremium > 0.185) return null

  const result = {
    odPremium: Math.round((netPremium - tpPremium) * 100) / 100,
    tpPremium,
    netPremium,
    gstAmount: Math.round((premium - netPremium) * 100) / 100,
    premium
  }
  console.log('[UniversalSompo] Extracted premiums:', result)
  return result
}

/**
 * Oriental Insurance schedules print each table as a block of labels followed by a block of
 * values in the same order, e.g.
 *   B. LIABILITYA. OWN DAMAGE / ADD :BASIC TP COVER / BASIC TP TOTAL / ... / TP TOTAL /
 *   TOTAL PREMIUM / ADD :CGST / ADD :SGST / STAMP DUTY / TOTAL AMOUNT /
 *   7,267.00 / 7,267.00 / ... / 7,537.00 / 42,375.00 / 3,814.00 / 3,814.00 / 0.50 / 50,003.00
 * so a value can only be matched to its label by position. Values come before their labels on
 * page 1 too ("191401/31/2027/3992Policy No :N4617753Prev Policy No :"), which makes the model
 * return the PREVIOUS policy number, or the third-party insurer's policy number on a
 * Standalone OD policy.
 */
const extractOrientalDetails = (rawText) => {
  if (!rawText) return null
  if (!/Oriental\s+Insurance/i.test(rawText)) return null

  const result = {}

  const policyNo = rawText.match(/(\d{4,}\/\d{2}\/\d{4}\/\d+)\s*Policy\s*No\s*:/i)
  if (policyNo) result.policyNumber = policyNo[1]

  // The registration number can break across two lines: "CG 12 BH \n3682"
  const reg = rawText.match(/\n\s*([A-Z]{2})\s(\d{1,2})\s([A-Z]{1,3})\s*\n?\s*(\d{4})\s*\n/)
  if (reg && isValidIndianVehicleNumber(reg.slice(1).join(''))) result.vehicleNumber = reg.slice(1).join('')

  if (/STANDALONE\s+OWN\s+DAMAGE/i.test(rawText)) result.insuranceClass = 'Standalone OD'
  else if (/LIABILITY\s+ONLY\s+POLICY/i.test(rawText)) result.insuranceClass = 'Third Party'
  else if (/PACKAGE\s*\n?\s*POLICY/i.test(rawText)) result.insuranceClass = 'Comprehensive'

  const lines = rawText.split('\n').map(l => l.trim())
  const isValue = (l) => /^[\d,]+(?:\.\d{1,2})?$/.test(l)
  const startsLabel = (l) => /^(?:ADD\s*:|LESS\s*:|BASIC\s|TP TOTAL|OD TOTAL|MOTOR TOTAL|TOTAL\s|STAMP DUTY)/i.test(l)
  const end = lines.findIndex(l => /^TOTAL AMOUNT$/i.test(l))
  if (end > 0) {
    // Walk back to the section heading, collecting labels (wrapped labels continue on the next line)
    let start = end
    while (start > 0 && !/LIABILITY|^OWN DAMAGE$/i.test(lines[start - 1]) && end - start < 30) start--
    const labels = []
    for (let i = start; i <= end; i++) {
      if (startsLabel(lines[i])) labels.push(lines[i])
      else if (labels.length) labels[labels.length - 1] += ` ${lines[i]}`
    }
    const values = []
    for (let i = end + 1; i < lines.length && isValue(lines[i]); i++) values.push(Number(lines[i].replace(/,/g, '')))

    if (labels.length && labels.length === values.length) {
      const valueOf = (pattern) => {
        const i = labels.findIndex(l => pattern.test(l))
        return i >= 0 ? values[i] : null
      }
      const netPremium = valueOf(/^TOTAL PREMIUM/i)
      const premium = valueOf(/^TOTAL AMOUNT/i)
      const tpTotal = valueOf(/^TP TOTAL/i) || 0
      const stampDuty = valueOf(/^STAMP DUTY/i) || 0
      const gstAmount = labels.reduce((sum, l, i) => (/GST/i.test(l) ? sum + values[i] : sum), 0)
      if (netPremium && premium && Math.abs(netPremium + gstAmount + stampDuty - premium) <= 1 && tpTotal <= netPremium) {
        const od = Math.round((netPremium - tpTotal) * 100) / 100
        result.odPremium = od > 0 ? od : ''
        result.tpPremium = tpTotal > 0 ? tpTotal : ''
        result.netPremium = netPremium
        result.gstAmount = Math.round(gstAmount * 100) / 100
        result.premium = premium
      }
    }
  }

  // "Details of TP insurance" on a Standalone OD policy describes another insurer's policy
  if (result.insuranceClass === 'Standalone OD') {
    result.tpValidFrom = ''
    result.tpValidTo = ''
  }

  console.log('[Oriental] Extracted details:', result)
  return result
}

/**
 * Vehicle classes that are spelled out in the policy title. The model often falls back to
 * "Pvt. Car" or "GCV" for these.
 */
const detectProductFromText = (rawText) => {
  if (!rawText) return null
  if (/school\s*bus|carrying\s+school\s+(?:staff|children)/i.test(rawText)) return 'SCHOOL BUS'
  if (/MISC[A-Z]*\s*(?:and|&)\s*SPECIAL\s*TYPE|MISC[A-Z]*\s+CLASS\s*-?\s*D\b/i.test(rawText)) return 'Mis-D'
  const title = rawText.slice(0, 3000)
  if (/Contractor.?s\s+Plant\s+(?:and|&)\s+Machinery/i.test(title)) return 'CPM'
  if (/Burglary\s+Insurance/i.test(title)) return 'Burglary'
  if (!isMotorPolicyText(rawText)) return null

  // The schedule's title / "limitation as to use" names the class. Only trust it when a
  // single class is named near the top; mixed mentions are left to the model.
  const head = rawText.slice(0, 6000)
  const classes = {
    GCV: /goods\s+carrying|\bGCCV\b|\bGCV\b|public\s+carrier|goods\s+vehicle/i,
    PCV: /passenger\s+carrying|\bPCCV\b|\bPCV\b/i,
    'Two Wheeler': /two[\s-]*wheeler|motor\s*cycle|scooter/i,
    'Pvt. Car': /private\s+car|pvt\.?\s*car/i
  }
  const named = Object.keys(classes).filter(product => classes[product].test(head))
  return named.length === 1 ? named[0] : null
}

/**
 * The insured's name sits in a fixed spot on IFFCO Tokio and Go Digit schedules. Smaller
 * fallback models picked the intermediary / partner name printed a few lines away instead.
 */
const extractPolicyHolderFromText = (rawText) => {
  if (!rawText) return null
  let match = null
  if (/IFFCO\s*[-–]?\s*TOKIO/i.test(rawText)) {
    // "BARBRIK PROJECT LIMITEDPolicy #:1-7V0S7QLMP400 Policy #N7098802"
    match = rawText.match(/^[ \t]*([^\n]+?)[ \t]*Policy\s*#\s*:/m)
  } else if (/Go\s*Digit/i.test(rawText)) {
    // "Name / AISHNA CREATORS / Vehicle Registration No.CG04MN8533" (lines may be glued), or
    // "SHWETA AGRAWAL CG04MV2693 HYUNDAI SANTRO NEW 2026-09-30 2027-09-29 Digit Private Car Policy"
    match = rawText.match(/(?:^|\n)[ \t]*Name[ \t]*\n?[ \t]*([^\n]+?)[ \t]*\n?[ \t]*Vehicle Registration No/)
      || rawText.match(/(?:^|\n)[ \t]*([A-Z][^\n]*?)[ \t]+[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}[ \t]+[^\n]*?\d{4}-\d{2}-\d{2}[ \t]+\d{4}-\d{2}-\d{2}[ \t]+Digit/)
  }
  const name = match ? match[1].replace(/[\s.,]+$/, '').trim() : ''
  return name.length >= 3 ? name : null
}

/**
 * A long-term third-party cover (new vehicles: 1 year OD + 3 or 5 years TP) ends on the same
 * day and month as the own-damage cover, a few years later. Returns that end date when the
 * document prints one, e.g. validTo 09-02-2027 and "TO MIDNIGHT OF 09/02/2031" -> "09-02-2031".
 */
const findLongTermTpEndDate = (rawText, validTo) => {
  const parts = String(validTo || '').match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!rawText || !parts) return null
  const [, day, month, year] = parts
  const monthName = Object.keys(MONTH_MAP).find(name => MONTH_MAP[name] === month)
  const pattern = new RegExp(`(?<!\\d)${day}[\\/-](?:${month}|${monthName})[\\/-](20\\d{2})(?!\\d)`, 'gi')
  const years = [...rawText.matchAll(pattern)].map(m => Number(m[1])).filter(y => y > Number(year) && y <= Number(year) + 5)
  return years.length ? `${day}-${month}-${Math.max(...years)}` : null
}

// The policy-type dropdown (and the Insurance model's enum) only accept these values
const INSURANCE_CLASSES = ['Comprehensive', 'Third Party', 'Standalone OD', 'Bundle']

const normalizeInsuranceClass = (value) => {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return ''
  const exact = INSURANCE_CLASSES.find(c => c.toLowerCase() === v)
  if (exact) return exact
  if (/stand\s*alone|saod|own\s*damage/.test(v)) return 'Standalone OD'
  if (/third|liability|act\s*only|\btp\b/.test(v)) return 'Third Party'
  if (/package|comprehensive/.test(v)) return 'Comprehensive'
  if (/bundle/.test(v)) return 'Bundle'
  return ''
}

// Groq free-tier keys have a daily token/request limit. We keep a small pool
// of keys and rotate to the next one whenever the current key gets rate
// limited (HTTP 429 / rate_limit_exceeded), so OCR keeps working across the
// combined daily quota of all configured keys.
const GROQ_API_KEYS = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean)
let activeGroqKeyIndex = 0

const isRateLimitError = (err) => {
  const status = err.response?.status
  const code = err.response?.data?.error?.code
  return status === 429 || code === 'rate_limit_exceeded'
}

const isNetworkOrRateLimitError = (err) => {
  const errCode = err.code
  return isRateLimitError(err) || errCode === 'ECONNRESET' || errCode === 'ETIMEDOUT' || errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND' || errCode === 'EAI_AGAIN'
}

// Longest we make a user wait for a per-minute limit to reset before giving up on a model
const MAX_RATE_LIMIT_WAIT_MS = 30000

const withGroqKeyRotation = async (requestFn) => {
  let lastErr
  const maxAttempts = Math.max(GROQ_API_KEYS.length * 2, 4)
  let rateLimitedInARow = 0
  let shortestRetryAfterMs = Infinity
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = GROQ_API_KEYS[activeGroqKeyIndex]
    try {
      return await requestFn(key)
    } catch (err) {
      lastErr = err
      if (isNetworkOrRateLimitError(err)) {
        if (isRateLimitError(err) && GROQ_API_KEYS.length > 1) {
          console.warn(`Groq API key #${activeGroqKeyIndex + 1} hit its rate limit, switching to next key...`)
          activeGroqKeyIndex = (activeGroqKeyIndex + 1) % GROQ_API_KEYS.length
          const retryAfterMs = Number(err.response?.headers?.['retry-after']) * 1000
          if (retryAfterMs > 0) shortestRetryAfterMs = Math.min(shortestRetryAfterMs, retryAfterMs)
          rateLimitedInARow++
          // Every key is limited: the limits are per minute, so a short wait gets the best
          // model back — much better than dropping to a weaker model that misreads premiums.
          if (rateLimitedInARow % GROQ_API_KEYS.length === 0 && attempt < maxAttempts - 1 && shortestRetryAfterMs <= MAX_RATE_LIMIT_WAIT_MS) {
            console.warn(`All Groq keys rate limited, waiting ${Math.ceil(shortestRetryAfterMs / 1000)}s before retrying...`)
            await new Promise(r => setTimeout(r, shortestRetryAfterMs + 250))
            shortestRetryAfterMs = Infinity
          }
        } else {
          console.warn(`Groq API request encountered temporary network error (${err.code || err.message}), retrying (attempt ${attempt + 1}/${maxAttempts})...`)
          await new Promise(r => setTimeout(r, 1000))
        }
        continue
      }
      throw err
    }
  }
  throw lastErr
}

const GET_TEXT_MODELS = () => {
  const custom = process.env.GROQ_TEXT_MODEL
  const defaults = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']
  return [...new Set([custom, ...defaults].filter(Boolean))]
}

const GET_VISION_MODELS = () => {
  const custom = process.env.GROQ_VISION_MODEL
  const defaults = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']
  return [...new Set([custom, ...defaults].filter(Boolean))]
}

// gpt-oss models "think" before answering and that thinking is billed against
// max_completion_tokens. At the default effort a dense policy used the whole allowance on
// thinking and returned no JSON at all ("Failed to parse AI response").
const reasoningParams = (model) => (
  model.startsWith('openai/gpt-oss') ? { reasoning_effort: process.env.GROQ_REASONING_EFFORT || 'low' } : {}
)

const hasAnswer = (response) => Boolean(response?.data?.choices?.[0]?.message?.content?.trim())

const callGroqAPI = async (imageBase64, textPrompt, isPdf = false, backImageBase64 = null) => {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  if (isPdf) {
    const sanitizedText = imageBase64
      .replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
      .replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl').replace(/ﬅ/g, 'st')
      .replace(/\u0000/g, ' ')
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ')
      .replace(/[ \t]{3,}/g, '  ')
      .trim()

    const messages = [
      {
        role: 'system',
        content: 'You are a precise insurance document data extractor. Extract ONLY values that literally appear in the document text. Never guess or invent values. Output valid JSON only.'
      },
      {
        role: 'user',
        content: `<DOCUMENT>\n${sanitizedText}\n</DOCUMENT>\n\n${textPrompt}`
      }
    ]

    const textModels = GET_TEXT_MODELS()
    let lastError = null

    for (const model of textModels) {
      const makeRequest = (withFormat) => withGroqKeyRotation((key) => {
        const body = {
          model,
          messages,
          temperature: 0,
          max_completion_tokens: 2048,
          max_tokens: 2048,
          ...reasoningParams(model)
        }
        if (withFormat) body.response_format = { type: 'json_object' }
        return axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
        })
      })

      // A reply with no content (the model ran out of tokens while thinking) is a failure,
      // not a result — move on instead of handing the caller unparseable text.
      const answered = (response) => {
        if (hasAnswer(response)) return true
        console.warn(`Groq model ${model} returned an empty answer, trying next fallback model...`)
        lastError = new Error(`Empty response from ${model}`)
        return false
      }

      try {
        const response = await makeRequest(true)
        if (answered(response)) return response
      } catch (firstErr) {
        lastError = firstErr
        const errCode = firstErr.response?.data?.error?.code
        if (errCode === 'json_validate_failed') {
          console.warn(`Groq json_object mode failed for model ${model}, retrying in free-text mode...`)
          try {
            const response = await makeRequest(false)
            if (answered(response)) return response
          } catch (retryErr) {
            lastError = retryErr
          }
        } else if (errCode === 'model_not_found') {
          console.warn(`Groq model ${model} not found or decommissioned, trying next fallback model...`)
          continue
        } else {
          // If invalid_request_error, try free-text mode as fallback
          if (firstErr.response?.data?.error?.type === 'invalid_request_error' && errCode !== 'model_not_found') {
            try {
              const response = await makeRequest(false)
              if (answered(response)) return response
            } catch (retryErr) {
              lastError = retryErr
            }
          }
        }
      }
    }

    throw lastError
  }

  const formattedImage = imageBase64.startsWith('data:image')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`

  const contentArray = [
    { type: 'text', text: textPrompt },
    { type: 'image_url', image_url: { url: formattedImage } }
  ]

  if (backImageBase64) {
    const formattedBack = backImageBase64.startsWith('data:image')
      ? backImageBase64
      : `data:image/jpeg;base64,${backImageBase64}`
    contentArray.push({ type: 'image_url', image_url: { url: formattedBack } })
  }

  const visionModels = GET_VISION_MODELS()
  let lastVisionError = null

  for (const model of visionModels) {
    const makeVisionRequest = (withFormat) => withGroqKeyRotation((key) => {
      const body = {
        model,
        messages: [{ role: 'user', content: contentArray }],
        temperature: 0.1,
        max_completion_tokens: 2048,
        max_tokens: 2048
      }
      if (withFormat) body.response_format = { type: 'json_object' }
      return axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      })
    })

    try {
      return await makeVisionRequest(true)
    } catch (firstErr) {
      lastVisionError = firstErr
      const errCode = firstErr.response?.data?.error?.code
      if (errCode === 'json_validate_failed') {
        console.warn(`Groq json_object mode failed for vision model ${model}, retrying in free-text mode...`)
        try {
          return await makeVisionRequest(false)
        } catch (retryErr) {
          lastVisionError = retryErr
        }
      } else if (errCode === 'model_not_found') {
        console.warn(`Groq vision model ${model} not found or decommissioned, trying next fallback model...`)
        continue
      } else {
        if (firstErr.response?.data?.error?.type === 'invalid_request_error' && errCode !== 'model_not_found') {
          try {
            return await makeVisionRequest(false)
          } catch (retryErr) {
            lastVisionError = retryErr
          }
        }
      }
    }
  }

  throw lastVisionError
}

const processOcrRequest = async (req, res, promptText, jsonTemplate, postProcessor = null, textSelector = extractRelevantPdfText) => {
  try {
    const { imageBase64, backImageBase64 } = req.body

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'Document base64 string is required' })
    }

    let isPdf = false
    let payload = imageBase64

    if (imageBase64.startsWith('data:application/pdf')) {
      isPdf = true
      const base64Data = imageBase64.replace(/^data:application\/pdf;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const pdfData = await parsePdfWithFallback(buffer)
      const extractedText = textSelector(pdfData.text)

      if (extractedText.trim().length < 100) {
        console.warn('PDF appears to be scanned (image-only) — no text extracted. Pages:', pdfData.numpages)
        return res.status(422).json({
          success: false,
          message: 'This PDF appears to be a scanned image. Please convert it to a text-based PDF or upload a photo of the document instead.',
          isScannedPdf: true
        })
      }

      payload = extractedText
    }

    const fullPrompt = `${promptText}
Respond ONLY with a valid JSON object matching this structure exactly (use empty string "" if a field is not found):
${jsonTemplate}`

    const response = await callGroqAPI(payload, fullPrompt, isPdf, backImageBase64)
    const choiceMsg = response.data.choices?.[0]?.message
    let messageContent = choiceMsg?.content || choiceMsg?.reasoning || ''

    messageContent = messageContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

    let jsonStr = messageContent
    const fencedMatch = messageContent.match(/```(?:json)?\n([\s\S]*?)\n```/) || messageContent.match(/```(?:json)?([\s\S]*?)```/)
    if (fencedMatch) {
      jsonStr = fencedMatch[1].trim()
    } else {
      const objectMatch = messageContent.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        jsonStr = objectMatch[0]
      }
    }

    let extractedData = {}
    try {
      extractedData = JSON.parse(jsonStr)
    } catch (_parseError) {
      console.error('Failed to parse Groq response to JSON:', jsonStr)
      return res.status(500).json({
        success: false,
        message: 'Failed to parse AI response into valid format',
        rawResponse: messageContent,
      })
    }

    if (typeof extractedData.vehicleNumber === 'string') {
      extractedData.vehicleNumber = extractedData.vehicleNumber.replace(/[\s-]/g, '')
    }
    if (typeof extractedData.registrationNumber === 'string') {
      extractedData.registrationNumber = extractedData.registrationNumber.replace(/[\s-]/g, '')
    }

    if (extractedData.insuranceCompany) {
      const companies = await InsuranceCompany.find().select('name').lean();

      const cleanStr = (str) => {
        return (str || '')
          .trim()
          .replace(/[-\/]/g, ' ') // replace hyphens and slashes with space
          .replace(/[^a-zA-Z0-9\s]/g, '') // remove special characters
          .replace(/\s+/g, ' ') // collapse multiple spaces
          .toLowerCase();
      };

      const cleaned = cleanStr(extractedData.insuranceCompany);

      // 1. Exact substring match
      let match = companies.find(c => {
        const cCleaned = cleanStr(c.name);
        return cleaned.includes(cCleaned) || cCleaned.includes(cleaned);
      });

      // 2. Word-overlap scoring fallback
      if (!match) {
        const ocrWords = new Set(cleaned.split(/\s+/).filter(w => w.length > 2));
        const stopwords = new Set(['general', 'insurance', 'company', 'limited', 'ltd', 'services', 'co']);
        const filteredOcrWords = new Set([...ocrWords].filter(w => !stopwords.has(w)));

        let bestMatch = null;
        let bestScore = 0;

        for (const c of companies) {
          const cCleaned = cleanStr(c.name);
          const cWords = cCleaned.split(/\s+/).filter(w => w.length > 2);
          const filteredCWords = cWords.filter(w => !stopwords.has(w));

          if (filteredCWords.length === 0) continue;

          const overlap = filteredCWords.filter(w => filteredOcrWords.has(w)).length;
          const score = overlap / filteredCWords.length;
          if (overlap >= 1 && score > bestScore) {
            bestScore = score;
            bestMatch = c;
          }
        }
        match = bestMatch;
      }

      extractedData.insuranceCompany = match?.name || '';
    }

    // Run any caller-supplied post-processor (e.g. IFFCO Tokio policy# correction)
    if (typeof postProcessor === 'function') {
      extractedData = postProcessor(extractedData) || extractedData
    }

    return res.json({
      success: true,
      data: extractedData,
    })
  } catch (error) {
    console.error('OCR Error:', error.response?.data || error.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to extract document data',
      error: error.response?.data || error.message,
    })
  }
}

const rcOcr = async (req, res) => {
  const prompt = 'Extract the details from this vehicle registration certificate (RC).'
  const template = `{
  "registrationNumber": "",
  "dateOfRegistration": "",
  "chassisNumber": "",
  "engineNumber": "",
  "ownerName": "",
  "sonWifeDaughterOf": "",
  "address": "",
  "makerName": "",
  "makerModel": "",
  "colour": "",
  "seatingCapacity": "",
  "vehicleType": "",
  "ladenWeight": "",
  "unladenWeight": "",
  "manufactureYear": "",
  "vehicleCategory": "",
  "numberOfCylinders": "",
  "cubicCapacity": "",
  "fuelType": "",
  "bodyType": "",
  "wheelBase": ""
}`
  return processOcrRequest(req, res, prompt, template)
}

const taxOcr = async (req, res) => {
  const prompt = 'Extract the details from this vehicle tax receipt/document. DO NOT extract or pick up the tax amount, fine, or total paid. Leave them blank.'
  const template = `{
  "vehicleNumber": "",
  "ownerName": "",
  "taxFrom": "",
  "taxTo": ""
}`
  return processOcrRequest(req, res, prompt, template)
}

const fitnessOcr = async (req, res) => {
  const prompt = 'Extract the details from this vehicle fitness certificate/document. DO NOT extract or pick up the tax amount, fine, or total paid. Leave them blank.'
  const template = `{
  "vehicleNumber": "",
  "ownerName": "",
  "validFrom": "",
  "validTo": ""
}`
  return processOcrRequest(req, res, prompt, template)
}

const pucOcr = async (req, res) => {
  const prompt = 'Extract the details from this vehicle PUC certificate/document. Extract vehicle number, owner name, valid from date, and valid to date only.'
  const template = `{
  "vehicleNumber": "",
  "ownerName": "",
  "validFrom": "",
  "validTo": ""
}`
  return processOcrRequest(req, res, prompt, template)
}

const gpsOcr = async (req, res) => {
  const prompt = 'Extract the details from this vehicle GPS or VLTD fitment certificate/document. Extract vehicle number, owner name, valid from date, and valid to date only. Map "VLTD Fitment Date" to "validFrom". Map "Valid Upto" or "Valid Up to" to "validTo". Preserve the actual date value even when it appears in formats like "03 Apr 2026" or "Mon Apr 03 06:09:38 UTC 2028". Do not invent dates.'
  const template = `{
  "vehicleNumber": "",
  "ownerName": "",
  "validFrom": "",
  "validTo": ""
}`
  return processOcrRequest(req, res, prompt, template)
}

const toAmount = (value) => {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * GST is the one premium figure that can always be cross-checked: net + GST = gross.
 * The model sometimes returns only half of it (CGST without SGST), the rate (18) or nothing.
 * When net and gross are both known and the GST does not tie up, use gross - net instead.
 * A printed GST that already ties up is kept as is, paise included.
 */
const reconcileGstAmount = (data) => {
  const net = toAmount(data.netPremium)
  const gross = toAmount(data.premium)
  const gst = toAmount(data.gstAmount)
  if (!net || !gross || gross <= net) return
  if (gst != null && Math.abs(net + gst - gross) <= Math.max(2, gross * 0.002)) return
  const implied = Math.round((gross - net) * 100) / 100
  // Insurance GST never exceeds 18%; a bigger gap means net or gross is wrong, not the GST
  if (implied / net > 0.185) return
  console.log('[GST] Reconciling gstAmount:', data.gstAmount, '->', implied)
  data.gstAmount = implied
}

// True when the amount is printed somewhere in the document ("4389", "4,389.00", "1526.8"...)
const textHasAmount = (rawText, amount) => {
  if (!rawText || !(amount > 0)) return false
  const [whole, paise = ''] = (Math.round(amount * 100) / 100).toFixed(2).split('.')
  const digits = whole.split('').map((d, i) => ((whole.length - i) % 3 === 0 && i > 0 ? `,?${d}` : d)).join('')
  const decimals = paise === '00' ? '(?:\\.0{1,2})?' : `\\.${paise.replace(/0$/, '0?')}`
  return new RegExp(`(?<![\\d.,])${digits}${decimals}(?![\\d])`).test(rawText)
}

/**
 * OD + TP must add up to net premium. When they don't, one of the two is usually an
 * intermediate figure (basic OD before add-ons, basic TP before PA / legal liability).
 * If replacing exactly one of them with (net - the other) gives an amount that is actually
 * printed in the document, that printed amount is the real total — use it.
 */
const reconcileOdTpPremium = (data, rawText) => {
  const net = toAmount(data.netPremium)
  const gross = toAmount(data.premium)
  const od = toAmount(data.odPremium)
  const tp = toAmount(data.tpPremium)
  if (!net || !od || !tp) return
  if (gross && gross < net) return // net itself is suspect
  if (Math.abs(od + tp - net) <= 2) return
  const impliedTp = Math.round((net - od) * 100) / 100
  const impliedOd = Math.round((net - tp) * 100) / 100
  const tpPrinted = impliedTp > 0 && textHasAmount(rawText, impliedTp)
  const odPrinted = impliedOd > 0 && textHasAmount(rawText, impliedOd)
  if (tpPrinted && !odPrinted) {
    console.log('[OD/TP] Reconciling tpPremium:', data.tpPremium, '->', impliedTp)
    data.tpPremium = impliedTp
  } else if (odPrinted && !tpPrinted) {
    console.log('[OD/TP] Reconciling odPremium:', data.odPremium, '->', impliedOd)
    data.odPremium = impliedOd
  }
}

/**
 * Some schedules never use the words "Net Premium" (e.g. "Gross Premium 2,173.80 / Goods and
 * Service Tax 391.28 / Total Premium 2,565.00"), so the model leaves it blank. When the total
 * and the GST are known, the pre-tax premium is the amount printed in the document that sits
 * within a rupee of (total - GST) — the total is usually rounded, so the exact difference is
 * rarely what is printed.
 */
const fillNetPremiumFromText = (data, rawText) => {
  if (toAmount(data.netPremium) || !rawText) return
  const gross = toAmount(data.premium)
  const gst = toAmount(data.gstAmount)
  if (!gross || !gst || gst >= gross || gst / (gross - gst) > 0.185) return
  const target = gross - gst
  let best = null
  for (const m of rawText.matchAll(/(?<![\d.,])(\d[\d,]*\.\d{2})(?!\d)/g)) {
    const n = Number(m[1].replace(/,/g, ''))
    if (Math.abs(n - target) <= 1 && (best == null || Math.abs(n - target) < Math.abs(best - target))) best = n
  }
  if (best == null) return
  console.log('[Net] Filling netPremium from printed amount:', best)
  data.netPremium = best
}

/**
 * Long policy numbers are where the model's copying slips: on a repeat run of the same PDF it
 * returned 2302205720828603000 for a policy printed as 2302 2057 7082 8603 000. A policy
 * number must exist in the document, so if the model's value is not printed but exactly one
 * printed string differs from it by a character or two, that printed string is the number.
 */
const verifyPolicyNumberAgainstText = (data, rawText) => {
  const squash = (s) => String(s || '').replace(/\s+/g, '').toUpperCase()
  const candidate = squash(data.policyNumber)
  if (candidate.length < 8 || !rawText) return
  const text = squash(rawText)
  if (text.includes(candidate)) return

  let best = null
  let bestDistance = 3
  let tie = false
  for (let i = 0; i + candidate.length <= text.length; i++) {
    let distance = 0
    for (let j = 0; j < candidate.length && distance < 3; j++) {
      if (text[i + j] !== candidate[j]) distance++
    }
    if (distance >= 3) continue
    const found = text.slice(i, i + candidate.length)
    if (distance < bestDistance) {
      best = found
      bestDistance = distance
      tie = false
    } else if (distance === bestDistance && found !== best) {
      tie = true
    }
  }
  if (!best || tie) return
  console.log('[PolicyNo] Not printed in document, correcting:', data.policyNumber, '->', best)
  data.policyNumber = best
}

/**
 * Policy type, third-party period and the OD / TP premium split all describe the same thing,
 * and the model does not always keep them in step (it returned "Bundle" for ordinary package
 * policies, the vehicle type as the policy type, TP dates on one run and not the next).
 * Make them agree. `rawText` is null for photos / scanned documents, where only the checks
 * that need no document text are applied.
 */
const normalizeCoverDetails = (data, rawText) => {
  data.insuranceClass = normalizeInsuranceClass(data.insuranceClass)
  const od = toAmount(data.odPremium)
  const tp = toAmount(data.tpPremium)
  const isMotorPdf = Boolean(rawText) && isMotorPolicyText(rawText)

  // The premium split says which covers were bought
  if (isMotorPdf && od && tp && data.insuranceClass !== 'Bundle') data.insuranceClass = 'Comprehensive'
  if (isMotorPdf && tp && !od) data.insuranceClass = 'Third Party'

  if (data.insuranceClass === 'Standalone OD') {
    data.tpValidFrom = ''
    data.tpValidTo = ''
  } else if (isMotorPdf && tp && data.validFrom && data.validTo) {
    // Third-party cover runs with the policy unless the document prints a longer TP term
    const longTermEnd = findLongTermTpEndDate(rawText, data.validTo)
    data.tpValidFrom = data.validFrom
    data.tpValidTo = longTermEnd || data.validTo
    if (longTermEnd && od) data.insuranceClass = 'Bundle'
  }

  // A third-party period needs both ends; a lone end date is the main period read twice
  if (data.tpValidTo && !data.tpValidFrom) data.tpValidFrom = data.validFrom || ''
  if (data.tpValidFrom && !data.tpValidTo) data.tpValidFrom = ''
  // OD and TP cover end on the same day; only the year differs on long-term TP. A TP end
  // date in the same year but a different day is a misread digit (scanned documents).
  if (data.tpValidTo && data.validTo && data.tpValidFrom === data.validFrom
    && data.tpValidTo !== data.validTo && data.tpValidTo.slice(-4) === data.validTo.slice(-4)) {
    data.tpValidTo = data.validTo
  }

  // "Bundle" means a longer third-party term than own-damage term (new vehicles). Without
  // that, a policy with both OD and TP is an ordinary Comprehensive policy.
  if (data.insuranceClass === 'Bundle') {
    const yearOf = (d) => Number(String(d || '').slice(-4)) || null
    const odEnd = yearOf(data.validTo)
    const tpEnd = yearOf(data.tpValidTo)
    if (!odEnd || !tpEnd || tpEnd <= odEnd) data.insuranceClass = 'Comprehensive'
  }
}

const insuranceOcr = async (req, res) => {
  const prompt = `Extract fields from this vehicle insurance policy document.
- vehicleNumber: the vehicle registration number — EXACTLY 9 or 10 characters after removing hyphens/spaces (format: 2 state letters + 2 district digits + 1-3 series letters + 4 digits, e.g. MH12AB1234, DL01CA9999). Remove hyphens/spaces. Do NOT return engine numbers, chassis numbers, or any value longer than 10 characters. CRITICAL: If the document says "NEW" / "UNREGISTERED" / "APPLIED FOR" / "NOT REGISTERED" / "TO BE REGISTERED" or if the vehicle is new and has no registration mark yet, leave vehicleNumber as empty string "". Do NOT pick up engine numbers or chassis numbers as vehicleNumber!
- policyNumber: the OFFICIAL policy number issued by the insurer. IMPORTANT: Some documents (e.g. IFFCO Tokio) show TWO "Policy #" values on the same line — the first is an internal transaction/invoice reference (often starts with "1-" or looks like "1-XXXXXXXX"), and the SECOND is the actual policy number. Always use the LAST/SECOND "Policy #" value as the policyNumber. The "Tax Invoice No" field is NOT the policy number. It is also NOT the "Previous Policy No" / expiring policy number, and on a Standalone OD policy it is NOT the third-party insurer's policy number listed under "Details of TP insurance" — always the number of THIS policy. CRITICAL for Go Digit policies: Go Digit prints the real policy number in the format "D[9 digits] / [DDMMYYYY]" (e.g. "D282367063 / 28072026") — use the FULL string including the " / DDMMYYYY" part as policyNumber. Go Digit also shows an Invoice Number starting with "IA" (e.g. "IA278149378") — this is NOT the policy number, NEVER use the IA-prefixed number as policyNumber.
- policyHolderName: primary insured person/company name
- validFrom / validTo: the main policy period (Own Damage section if present, otherwise overall policy period). DD-MM-YYYY format.
- tpValidFrom / tpValidTo: the Third Party / Act Liability cover period. Many long-term two-wheeler/private-car policies have a separate, longer TP validity period than the OD period (e.g. OD valid for 1 year but TP valid for 5 years) — look for a distinct "Third Party" or "Liability" or "Act" section with its own "Period of Insurance" / "From" / "To" dates. If the document has only one policy period (no separate TP period), leave tpValidFrom/tpValidTo as empty strings. DD-MM-YYYY format.
- issueDate: the date the policy document was issued or receipt date. Look for "Policy Issue Date", "Date of Issue", "Invoice Date", "Receipt Date", "Reciept Date", "Collection Date", "Proposal Date", "Policy Date", "Issue Date". Format: DD-MM-YYYY.
- odPremium: numeric value of the "Total OD Premium" (own damage), the FINAL own-damage figure AFTER NCB discount is applied. IMPORTANT: many policies (e.g. Digit, ICICI Lombard) show a table with an intermediate "Own Damage Premium" subtotal (before NCB discount) plus a separate "NCB (xx%)" deduction line, and then a "Total OD Premium" line which is the final figure (Own Damage Premium minus NCB) — you MUST use the "Total OD Premium" value, NOT the intermediate "Own Damage Premium" subtotal. Add-on covers (Zero / Nil Depreciation, Return to Invoice, Engine Protect, Consumables, IMT-23, RSA etc.) belong to own damage: if the document shows them separately ("Total Add on Premium", "Net Own Damage Premium (A+C)", "Section 2"), INCLUDE them, so that odPremium + tpPremium = netPremium. Do NOT use the Final/Gross Premium value here even if it appears near this section. Empty string if the policy has no OD component (Third Party only policy).
- tpPremium: numeric value of the "Total Act Premium" / "Total Liability Premium" / "Total TP Premium" — the final total of the Liability/Act premium section (Basic Third-Party Liability + Legal Liability add-ons + PA cover add-ons, if any). If the document has no separate add-ons, this equals "Basic Third-Party Liability"; otherwise it is the TOTAL line, which is larger than the basic figure (e.g. basic 3416 + legal liability 50 = 3466 → use 3466). Do NOT use the Final/Gross Premium value here. When the policy has both an own-damage and a liability section, fill BOTH odPremium and tpPremium — never put the whole net premium under one of them. CRITICAL: If the document is a "Standalone OD" / "Own Damage Only" policy, or if Liability Premium is 0 or blank, leave tpPremium as empty string "". NEVER put GST/Tax (such as 18% tax = 168) as tpPremium!
- netPremium: the premium BEFORE GST/taxes — labeled "Net Premium", "Total Premium (a+b)", "Total Package Premium", "Taxable Value", or simply "Premium" / "Gross Premium" when a GST line and a larger total follow it. This is odPremium + tpPremium. It is a DISTINCT, smaller number than the Final/Gross Premium — do not confuse the two.
- premium: numeric value of the Gross Premium — labeled "Final Premium" or "Gross Premium", the LARGEST of the four premium figures, equal to Net Premium + GST/CGST+SGST/IGST (roughly netPremium × 1.18). Return the exact decimal value including paise/cents if present (e.g., 1182.71). Do not omit the decimal or round. If only one premium figure exists on the document (no OD/TP/Net split), put that value here as premium and leave odPremium/tpPremium/netPremium empty.
- gstAmount: numeric TOTAL GST / tax amount charged on this policy. If the document lists the tax in parts, ADD them: CGST + SGST (+ UGST/UTGST) or IGST, plus Cess if any. It may also be a single line labeled "GST", "IGST", "Integrated Tax", "Goods & Services Tax", "Total GST", "Total Tax" or "Service Tax". It is the amount in rupees, NOT the percentage (never return 18, 9, 12 or 5 just because the rate is printed), and NOT a GSTIN / GST registration number. It equals premium minus netPremium. Return the exact decimal value including paise if present. Empty string if the document shows no tax amount.
- SELF-CHECK before answering: odPremium + tpPremium should be close to netPremium (within a few rupees, allowing for small add-ons), and netPremium should be meaningfully smaller than premium (premium ≈ netPremium × 1.18 for 18% GST), and netPremium + gstAmount should equal premium. If your extracted values don't satisfy this, re-examine the document for the correct "Total OD Premium" / "Total Act Premium" / "Net Premium" / "Final Premium" labels rather than reusing the same number for multiple fields.
- insuranceCompany: full insurer name as it appears (e.g. "HDFC ERGO", "National Insurance Company Limited")
- insuranceClass: exactly one of "Comprehensive", "Third Party", "Standalone OD", "Bundle", or "". "Package" / "Comprehensive" policy (own damage + third party for the same period) = "Comprehensive". "Liability Only" / "Act Only" = "Third Party". "Standalone OD" / "Own Damage Only" = "Standalone OD". "Bundle" ONLY when the third-party period is LONGER than the own-damage period (new vehicle: 1 year OD + 3 or 5 years TP). Use "" for policies that do not insure a vehicle (fire, burglary, property, health...). Never put the vehicle type here.
- product: type of insured vehicle/policy. Look for phrases like "Private Car", "Motor Cycle", "Two Wheeler", "Fire", "Marine", "Health" etc. in the document, and map to EXACTLY one of these values (return the value on the left, verbatim): "Pvt. Car" (private car / motor car), "Two Wheeler" (motorcycle/scooter/bike/two-wheeler), "GCV" (goods carrying vehicle/truck/commercial goods vehicle/"GCCV"), "GCV-3W" (3-wheeler goods vehicle), "PCV" (passenger carrying vehicle/bus/"PCCV"), "PCV-3W" (3-wheeler passenger/auto rickshaw), "Taxi", "Mis-D" ("Miscellaneous and Special Type of Vehicles" / "Misc Class D": cranes, excavators, tractors, mobile plant), "Health", "Life", "Fire", "Burglary", "WC" (workmen's compensation), "CPM", "Travel", "Marine", "GPA" (group personal accident), "GMC" (group mediclaim), "CAR", "IAR", "EAR", "SCHOOL BUS" (a bus used to carry school children/staff — prefer this over PCV/GCV), "LIABILITY", "SECURITY BOND". If none match, return empty string.
- Use empty string "" for any absent field`;
  const template = `{"vehicleNumber":"","policyNumber":"","policyHolderName":"","validFrom":"","validTo":"","tpValidFrom":"","tpValidTo":"","issueDate":"","odPremium":"","tpPremium":"","netPremium":"","gstAmount":"","premium":"","insuranceCompany":"","insuranceClass":"","product":""}`;

  // Store raw PDF text for post-processing override (IFFCO Tokio and similar)
  req._rawPdfText = null
  if (req.body.imageBase64?.startsWith('data:application/pdf')) {
    try {
      const base64Data = req.body.imageBase64.replace(/^data:application\/pdf;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const pdfData = await parsePdfWithFallback(buffer)
      req._rawPdfText = pdfData.text
    } catch (_) { /* ignore, will fall back to AI result */ }
  }

  return processOcrRequest(req, res, prompt, template, (extractedData) => {
    if (req._rawPdfText) {
      // 1. Fix IFFCO Tokio dual-Policy# line — pick the actual (last) policy number
      const correctedPolicyNo = extractIffcoTokioPolicyNumber(req._rawPdfText)
      if (correctedPolicyNo) {
        extractedData.policyNumber = correctedPolicyNo
      }

      // 1b. Fix Go Digit policy number — Go Digit PDFs print the real policy number
      //     (D-prefix + 9 digits) concatenated with the issue date as:
      //       "D282367063 / 28072026"
      //     pdf-parse includes this line verbatim, but the AI often grabs the
      //     Invoice Number (IA-prefix, e.g. IA278149378) instead of the real policy number.
      //     We scan the raw text for the "D[digits] / [8-digit date]" pattern and override.
      if (/go.?digit/i.test(req._rawPdfText) || /\bD\d{9}\s*\/\s*\d{8}\b/.test(req._rawPdfText)) {
        const digitPolicyMatch = req._rawPdfText.match(/\b(D\d{7,12}\s*\/\s*\d{6,8})\b/)
        if (digitPolicyMatch) {
          const realPolicyNo = digitPolicyMatch[1].trim()
          if (realPolicyNo !== extractedData.policyNumber) {
            console.log('[GoDigit] Overriding policyNumber:', extractedData.policyNumber, '->', realPolicyNo)
            extractedData.policyNumber = realPolicyNo
          }
        }
      }
      // 2. Fix vehicle number — Indian reg nos are 9-10 chars.
      //    If document indicates a NEW / Unregistered vehicle, set to "".
      //    Otherwise if the AI returned something clearly wrong (too long or invalid pattern),
      //    scan the raw PDF text for the correct registration number.
      const currentVehicle = (extractedData.vehicleNumber || '').replace(/[\s-]/g, '')
      if (!isMotorPolicyText(req._rawPdfText)) {
        if (!isValidIndianVehicleNumber(currentVehicle)) extractedData.vehicleNumber = ''
      } else if (isNewVehicleRegistration(req._rawPdfText, currentVehicle)) {
        console.log('[VehicleNo] New/Unregistered vehicle detected. Setting vehicleNumber to empty string.')
        extractedData.vehicleNumber = ''
      } else if (!isValidIndianVehicleNumber(currentVehicle)) {
        const correctedVehicleNo = extractValidIndianVehicleNumber(req._rawPdfText)
        if (correctedVehicleNo !== null && correctedVehicleNo !== undefined) {
          console.log('[VehicleNo] Overriding', currentVehicle, '->', correctedVehicleNo)
          extractedData.vehicleNumber = correctedVehicleNo
        }
      } else if (!isPrintedAsRegistration(req._rawPdfText, currentVehicle.toUpperCase())) {
        console.log('[VehicleNo] Value is part of an engine/chassis number, clearing:', currentVehicle)
        extractedData.vehicleNumber = ''
      }

      // 3. Fix Net Premium / Gross Premium using the clean ENDORSEMENT invoice
      //    table (Go Digit and similar) — this table is unambiguous, unlike
      //    the OD/TP breakdown table which pdf-parse often scrambles.
      const endorsementPremiums = extractNetGrossPremiumFromEndorsementTable(req._rawPdfText)
      if (endorsementPremiums) {
        console.log('[Premium] Overriding netPremium/premium from ENDORSEMENT table:', endorsementPremiums)
        extractedData.netPremium = endorsementPremiums.netPremium
        extractedData.gstAmount = endorsementPremiums.gstAmount
        extractedData.premium = endorsementPremiums.premium
      }

      // 4. Fix OD/TP premium split for Go Digit-style scrambled breakdown tables
      const knownNetPremium = endorsementPremiums?.netPremium ?? (extractedData.netPremium ? Number(extractedData.netPremium) : null)
      const digitOdTp = extractDigitOdTpPremium(req._rawPdfText, knownNetPremium)
      if (digitOdTp) {
        console.log('[Premium] Overriding odPremium/tpPremium from Go Digit summary row:', digitOdTp)
        extractedData.odPremium = digitOdTp.odPremium
        extractedData.tpPremium = digitOdTp.tpPremium
      }

      // 5. Fix Gross Premium for Bajaj Allianz policies.
      //    Bajaj's two-column layout (OD|Liability) causes pdf-parse to
      //    interleave the columns, making the AI pick up the Net Premium
      //    value as the Gross Premium. We override "premium" with the
      //    unambiguous "Final Premium Rs.XXX" line extracted directly.
      //    Only apply this when the ENDORSEMENT table correction hasn't
      //    already fixed it (to avoid double-overriding).
      if (!endorsementPremiums) {
        const bajajPremiums = extractBajajFinalPremium(req._rawPdfText)
        if (bajajPremiums) {
          const currentPremium = extractedData.premium ? Number(extractedData.premium) : null
          // Only override if the AI got the gross premium wrong (same as net, or clearly off)
          const aiGotWrongGross = currentPremium == null ||
            currentPremium === bajajPremiums.netPremium ||
            (bajajPremiums.netPremium != null && Math.abs(currentPremium - bajajPremiums.netPremium) < 2)
          if (aiGotWrongGross) {
            console.log('[Bajaj] Overriding premium:', currentPremium, '->', bajajPremiums.finalPremium)
            extractedData.premium = bajajPremiums.finalPremium
          }
          // Also correct netPremium if the AI left it blank or set it to the gross value
          if (bajajPremiums.netPremium != null) {
            const currentNet = extractedData.netPremium ? Number(extractedData.netPremium) : null
            const netIsWrong = currentNet == null ||
              Math.abs(currentNet - bajajPremiums.finalPremium) < 2 // AI set net = gross
            if (netIsWrong) {
              console.log('[Bajaj] Overriding netPremium:', currentNet, '->', bajajPremiums.netPremium)
              extractedData.netPremium = bajajPremiums.netPremium
            }
          }
        }
      }

      // 6. Fix policy dates for Go Digit PDFs.
      //    Go Digit flattens a two-column date table (OD | TP) into 4
      //    consecutive date strings: [OD-From, TP-From, OD-To, TP-To].
      //    The page also contains a line like "D262115781 / 11042026"
      //    (policy number + issue date concatenated) which the AI mistakes
      //    for the validFrom date ("11-04-2026") instead of the correct
      //    "12-04-2026" that comes from the Period-of-Policy table.
      //    We extract dates directly from the Period-of-Policy block and
      //    override only when the AI's value differs from the table value.
      const digitDates = extractDigitPolicyDates(req._rawPdfText)
      if (digitDates) {
        // Override validFrom if it differs from what the table says
        if (digitDates.validFrom && digitDates.validFrom !== extractedData.validFrom) {
          console.log('[GoDigit] Overriding validFrom:', extractedData.validFrom, '->', digitDates.validFrom)
          extractedData.validFrom = digitDates.validFrom
        }
        if (digitDates.validTo && digitDates.validTo !== extractedData.validTo) {
          console.log('[GoDigit] Overriding validTo:', extractedData.validTo, '->', digitDates.validTo)
          extractedData.validTo = digitDates.validTo
        }
        if (digitDates.tpValidFrom && digitDates.tpValidFrom !== extractedData.tpValidFrom) {
          console.log('[GoDigit] Overriding tpValidFrom:', extractedData.tpValidFrom, '->', digitDates.tpValidFrom)
          extractedData.tpValidFrom = digitDates.tpValidFrom
        }
        if (digitDates.tpValidTo && digitDates.tpValidTo !== extractedData.tpValidTo) {
          console.log('[GoDigit] Overriding tpValidTo:', extractedData.tpValidTo, '->', digitDates.tpValidTo)
          extractedData.tpValidTo = digitDates.tpValidTo
        }
        if (digitDates.issueDate) extractedData.issueDate = digitDates.issueDate
      }

      // 7. Fix premiums for HDFC ERGO policies (especially Standalone OD)
      const hdfcPremiums = extractHdfcErgoPremiums(req._rawPdfText)
      if (hdfcPremiums) {
        if (hdfcPremiums.isStandaloneOd) {
          extractedData.tpPremium = ''
          extractedData.tpValidFrom = ''
          extractedData.tpValidTo = ''
          if (!extractedData.insuranceClass || extractedData.insuranceClass === 'Comprehensive') {
            extractedData.insuranceClass = 'Standalone OD'
          }
        }
        if (hdfcPremiums.odPremium != null) extractedData.odPremium = hdfcPremiums.odPremium
        if (hdfcPremiums.tpPremium !== null && hdfcPremiums.tpPremium !== undefined) extractedData.tpPremium = hdfcPremiums.tpPremium
        if (hdfcPremiums.netPremium != null) extractedData.netPremium = hdfcPremiums.netPremium
        if (hdfcPremiums.premium != null) extractedData.premium = hdfcPremiums.premium
      }

      // 8. General tax misclassification guard:
      // If tpPremium is present, and premium (gross) and (netPremium or odPremium) exist:
      // Tax = premium - netPremium. If tpPremium matches Tax (e.g. tpPremium == 168 and premium - netPremium == 168),
      // or if odPremium == netPremium and odPremium + tpPremium == premium (gross),
      // then tpPremium is actually the GST/Tax figure! Clear tpPremium = '' and set netPremium = odPremium.
      if (extractedData.tpPremium && extractedData.premium && (extractedData.netPremium || extractedData.odPremium)) {
        const gross = Number(extractedData.premium)
        const tp = Number(extractedData.tpPremium)
        const od = extractedData.odPremium ? Number(extractedData.odPremium) : null
        const net = extractedData.netPremium ? Number(extractedData.netPremium) : od

        if (gross && tp && net && gross > net) {
          const tax = Math.round(gross - net)
          if (Math.abs(tp - tax) <= 2 || (od != null && Math.abs(od - net) <= 2 && Math.abs(od + tp - gross) <= 2)) {
            console.log('[TaxGuard] tpPremium', tp, 'matches Tax (gross - net =', tax, '). Clearing misclassified tpPremium.')
            extractedData.tpPremium = ''
            if (od != null) extractedData.netPremium = od
          }
        }
      }

      // 9. Fix premiums and reference TP dates for IFFCO Tokio
      const iffcoPremiums = extractIffcoTokioPremiums(req._rawPdfText)
      if (iffcoPremiums) {
        if (iffcoPremiums.isStandaloneOd) {
          extractedData.tpValidFrom = ''
          extractedData.tpValidTo = ''
        }
        if (iffcoPremiums.insuranceClass) extractedData.insuranceClass = iffcoPremiums.insuranceClass
        if (iffcoPremiums.odPremium != null) extractedData.odPremium = iffcoPremiums.odPremium
        if (iffcoPremiums.tpPremium != null) extractedData.tpPremium = iffcoPremiums.tpPremium
        if (iffcoPremiums.netPremium != null) extractedData.netPremium = iffcoPremiums.netPremium
        if (iffcoPremiums.gstAmount != null) extractedData.gstAmount = iffcoPremiums.gstAmount
        if (iffcoPremiums.premium != null) extractedData.premium = iffcoPremiums.premium
      }

      // 10. General Guard for External Reference TP policies across ALL insurers:
      // If TP Insurer Name is present and refers to a DIFFERENT insurer than current insurer,
      // clear tpValidFrom, tpValidTo, and tpPremium!
      const tpInsurerMatch = req._rawPdfText.match(/TP\s*Insurer\s*Name\s*:\s*([^\n]+)/i)
        || req._rawPdfText.match(/Third\s*Party\s*Insurer\s*:\s*([^\n]+)/i)
      if (tpInsurerMatch) {
        const tpInsurer = tpInsurerMatch[1].trim().toLowerCase()
        const currentComp = (extractedData.insuranceCompany || '').toLowerCase()
        const cleanTp = tpInsurer.replace(/[^a-z0-9]/g, '')
        const cleanCur = currentComp.replace(/[^a-z0-9]/g, '')
        if (cleanTp && cleanCur && !cleanTp.includes(cleanCur) && !cleanCur.includes(cleanTp)) {
          console.log('[ExternalTPGuard] Reference TP policy from external insurer (' + tpInsurerMatch[1].trim() + '). Clearing TP dates & TP premium.')
          extractedData.tpValidFrom = ''
          extractedData.tpValidTo = ''
          extractedData.tpPremium = ''
          if (!extractedData.insuranceClass || extractedData.insuranceClass === 'Comprehensive') {
            extractedData.insuranceClass = 'Standalone OD'
          }
        }
      }

      // 11. Fix premiums and class for National Insurance Company (NIC) policies.
      //     NIC PDFs often have a two-column premium table that pdf-parse
      //     scrambles. We extract directly from the raw text.
      const nicSchedule = extractNationalInsuranceSchedulePremiums(req._rawPdfText)
      if (nicSchedule) Object.assign(extractedData, nicSchedule)
      const nicPremiums = nicSchedule ? null : extractNationalInsurancePremiums(req._rawPdfText)
      if (nicPremiums) {
        extractedData.insuranceClass = nicPremiums.insuranceClass
        if (nicPremiums.odPremium != null) extractedData.odPremium = String(nicPremiums.odPremium)
        else extractedData.odPremium = ''
        if (nicPremiums.tpPremium != null) extractedData.tpPremium = String(nicPremiums.tpPremium)
        if (nicPremiums.netPremium != null) extractedData.netPremium = String(nicPremiums.netPremium)
        if (nicPremiums.premium != null) extractedData.premium = String(nicPremiums.premium)
        // For Third Party only policies, clear OD dates
        if (nicPremiums.insuranceClass === 'Third Party') {
          extractedData.tpValidFrom = extractedData.tpValidFrom || extractedData.validFrom
          extractedData.tpValidTo = extractedData.tpValidTo || extractedData.validTo
        }
      }

      // 12. Fix premiums for Royal Sundaram policies.
      //     Royal Sundaram PDFs are multi-page; the segment scorer often
      //     selects marketing/info pages and the AI never sees the premium
      //     breakdown. We extract OD/TP/Net/Gross directly from raw text.
      const rsPremiums = extractRoyalSundaramPremiums(req._rawPdfText)
      if (rsPremiums) {
        if (rsPremiums.odPremium != null) extractedData.odPremium = String(rsPremiums.odPremium)
        if (rsPremiums.tpPremium != null) extractedData.tpPremium = String(rsPremiums.tpPremium)
        if (rsPremiums.netPremium != null) extractedData.netPremium = String(rsPremiums.netPremium)
        if (rsPremiums.premium != null) extractedData.premium = String(rsPremiums.premium)
      }

      // 12b. Fix premiums for Universal Sompo package policies (merged two-column table)
      const usgiPremiums = extractUniversalSompoPremiums(req._rawPdfText)
      if (usgiPremiums) {
        extractedData.odPremium = usgiPremiums.odPremium
        extractedData.tpPremium = usgiPremiums.tpPremium
        extractedData.netPremium = usgiPremiums.netPremium
        extractedData.gstAmount = usgiPremiums.gstAmount
        extractedData.premium = usgiPremiums.premium
      }

      // 12c. Fix Oriental Insurance policies (labels and values printed in separate blocks)
      const orientalDetails = extractOrientalDetails(req._rawPdfText)
      if (orientalDetails) Object.assign(extractedData, orientalDetails)

      // 12c-2. The policy number must be one that is actually printed in the document.
      //        HDFC ERGO prints its 19 digits in groups ("2302 2057 7082 8603 000") — store
      //        them joined so the same policy always gets the same number.
      verifyPolicyNumberAgainstText(extractedData, req._rawPdfText)
      if (/^\d{4} \d{4} \d{4} \d{4} \d{3}$/.test(String(extractedData.policyNumber || '').trim())) {
        extractedData.policyNumber = extractedData.policyNumber.replace(/\s+/g, '')
      }

      // 12d. Vehicle class named in the policy title, and the insured's name where the
      //      schedule prints it in a fixed position
      const detectedProduct = detectProductFromText(req._rawPdfText)
      if (detectedProduct) extractedData.product = detectedProduct
      const printedHolder = extractPolicyHolderFromText(req._rawPdfText)
      if (printedHolder) extractedData.policyHolderName = printedHolder

      // 12e. Policies with no vehicle (fire, burglary, property...) have no OD / TP split.
      //      Neither does a standalone "Compulsory Personal Accident Cover for Owner-Driver"
      //      policy, although it mentions the vehicle's engine and chassis.
      const isStandalonePaCover = /Compulsory\s+Personal\s+Accident\s+Cover\s+for\s+Owner/i.test(req._rawPdfText.slice(0, 3000))
      if (isStandalonePaCover) extractedData.product = ''
      if (!isMotorPolicyText(req._rawPdfText) || isStandalonePaCover) {
        extractedData.odPremium = ''
        extractedData.tpPremium = ''
        extractedData.tpValidFrom = ''
        extractedData.tpValidTo = ''
        extractedData.insuranceClass = ''
      }

      // 13. Fix issueDate — AI sometimes hallucinates today's date or picks
      //     the wrong date (e.g. policy start instead of issue date).
      //     We read "Invoice Date", "Issue Date", "Policy Issue Date" etc.
      //     directly from the raw PDF text and override only when the raw
      //     text clearly provides a value.
      const rawIssueDate = extractIssueDateFromRawText(req._rawPdfText)
      if (rawIssueDate && rawIssueDate !== extractedData.issueDate) {
        console.log('[IssueDate] Overriding issueDate:', extractedData.issueDate, '->', rawIssueDate)
        extractedData.issueDate = rawIssueDate
      }
    }

    // A zero OD / TP premium means the policy has no such component — leave the field blank
    for (const key of ['odPremium', 'tpPremium']) {
      if (toAmount(extractedData[key]) === 0) extractedData[key] = ''
    }
    if (req._rawPdfText) fillNetPremiumFromText(extractedData, req._rawPdfText)
    reconcileGstAmount(extractedData)
    if (req._rawPdfText) reconcileOdTpPremium(extractedData, req._rawPdfText)

    normalizeCoverDetails(extractedData, req._rawPdfText)
    return extractedData
  }, extractRelevantInsuranceText)
}

module.exports = {
  rcOcr,
  taxOcr,
  fitnessOcr,
  pucOcr,
  gpsOcr,
  insuranceOcr,
}
