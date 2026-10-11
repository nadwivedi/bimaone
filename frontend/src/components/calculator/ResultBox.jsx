import { useState, useEffect } from 'react'
import axios from 'axios'
import { FaFileLines } from 'react-icons/fa6'
import { fmt, fmtD } from './helpers'
import PdfPreviewModal from './PdfPreviewModal'
import UpgradePopup from '../UpgradePopup'
import { useAuth } from '../../context/AuthContext'
import useCurrentPlan from '../../hooks/useCurrentPlan'
import { getInsuranceCompanies, subscribeInsuranceCompanies } from '../../utils/insuranceCompanyCache'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const Group = ({ title, dot, rows, totalLabel, total }) => (
  <div className='px-3 py-3 sm:px-4'>
    <p className='mb-2 flex items-center gap-2 text-[12px] font-bold text-slate-900 sm:text-xs'>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {title}
    </p>
    <div className='space-y-1.5'>
      {rows.map(([label, value, kind], i) => (
        <div key={i} className={`flex items-baseline justify-between gap-3 text-[11px] sm:text-xs ${kind === 'strong' ? 'border-t border-dashed border-slate-200 pt-1.5' : ''}`}>
          <span className={kind === 'strong' ? 'font-semibold text-slate-700' : 'text-slate-500'}>{label}</span>
          <span className={`shrink-0 tabular-nums ${kind === 'minus' ? 'font-medium text-emerald-600' : kind === 'strong' ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{value}</span>
        </div>
      ))}
    </div>
    <div className='mt-2 flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2 text-[13px] sm:text-sm'>
      <span className='font-semibold text-slate-700'>{totalLabel}</span>
      <span className='font-bold tabular-nums text-slate-900'>₹{fmtD(total)}</span>
    </div>
  </div>
)

const ResultBox = ({
  result,
  policyType, vehicleType, isElectric, cc, kwPower, idv, ncb, odDiscount,
  zone, vehicleAge, manufacturingYear, selectedCategory, gstEnabled, subtype,
  gvw, bundleOdTerm, bundleTpTerm,
}) => {
  const [showQuotationModal, setShowQuotationModal] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [generatedQuoteId, setGeneratedQuoteId] = useState('')
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleVariant, setVehicleVariant] = useState('')
  const [modalStep, setModalStep] = useState(1)
  const { user } = useAuth()
  const { features } = useCurrentPlan()
  const canQuotation = features.personalisedQuotation === true
  const [insuranceCompanies, setInsuranceCompanies] = useState([])
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)

  useEffect(() => {
    getInsuranceCompanies(API_URL).then(data => setInsuranceCompanies(data || []))
    const unsub = subscribeInsuranceCompanies(data => setInsuranceCompanies(data || []))
    return () => unsub()
  }, [])

  if (!result) return null

  const showOD = policyType !== 'tp'
  const showTP = policyType !== 'od'
  const isBundle = policyType === 'bundle'
  const odTerm = isBundle ? (parseInt(bundleOdTerm) || 1) : (showOD ? 1 : '—')
  const tpTerm = isBundle ? (parseInt(bundleTpTerm) || 1) : (showTP ? 1 : '—')

  const effectiveIdv = result.depreciatedIdv || (parseFloat(idv) || 0)
  const odBase = showOD ? effectiveIdv * (result.odRate / 100) : 0

  const isAddonField = f => f.section === 'addon' || (!f.section && f.section !== 'od' && f.section !== 'tp')
  const dynamicTpTotal = (result.dynamicCustomFields || []).filter(f => f.section === 'tp').reduce((sum, f) => sum + f.amount, 0)

  const odRows = [
    ['Final IDV (after depreciation)', `₹${fmtD(effectiveIdv)}`],
    [vehicleType === 'pcv' ? 'Vehicle Basic OD' : `Basic OD @ ${result.odRate}%`, `₹${fmtD(odBase)}`],
    ...(vehicleType === 'gcv' && result.details?.gcvExtraUnits > 0 ? [['Extra Weight > 12000 Premium', `₹${fmtD(result.details.gcvExtraPremium)}`]] : []),
    ...(result.geoExtentAmount > 0 ? [['Geographical Extent', `₹${fmtD(result.geoExtentAmount)}`]] : []),
    ...(result.cngKitOdAmount > 0 ? [['CNG/LPG Kit', `₹${fmtD(result.cngKitOdAmount)}`]] : []),
    ...(result.imt23Amount > 0 ? [['IMT 23 Loading (15%)', `₹${fmtD(result.imt23Amount)}`]] : []),
    ...(vehicleType === 'pcv' && result.addODVal > 0 ? [['Add. OD (Passenger Capacity)', `₹${fmtD(result.addODVal)}`]] : []),
    ...(result.dynamicCustomFields || []).filter(f => f.section === 'od').map(f => [f.label, `₹${fmtD(f.amount)}`]),
    ['OD before discounts', `₹${fmtD(result.odBeforeDiscount)}`, 'strong'],
    ...((result.odDiscountVal || 0) > 0 ? [[`OD Discount (${result.odDiscountVal}%)`, `− ₹${fmtD(result.odDiscountAmount)}`, 'minus']] : []),
    ...(ncb > 0 ? [[`NCB (${ncb}%)`, `− ₹${fmtD(result.ncbAmount)}`, 'minus']] : []),
    ...(result.loadingAmount > 0 ? [[`Loading @ ${result.loadingDiscount}%`, `+ ₹${fmtD(result.loadingAmount)}`]] : []),
  ]

  const tpRows = [
    [isBundle ? (vehicleType === 'two_wheeler' ? '5-Year TP Premium' : '3-Year TP Premium') : '1-Year TP Premium', `₹${fmtD(result.tpPremium + result.restrictedTPPDDiscount)}`],
    ...(result.restrictedTPPDDiscount > 0 ? [['Restricted TPPD Discount', `− ₹${fmtD(result.restrictedTPPDDiscount)}`, 'minus']] : []),
    ...(result.llPdAmount > 0 ? [['LL to Paid Driver', `₹${fmtD(result.llPdAmount)}`]] : []),
    ...(result.paOdAmount > 0 ? [['PA to Owner Driver', `₹${fmtD(result.paOdAmount)}`]] : []),
    ...(result.llEmployeeAmount > 0 ? [['LL to Employee', `₹${fmtD(result.llEmployeeAmount)}`]] : []),
    ...(result.paUnnamedAmount > 0 ? [['PA to Unnamed Passenger', `₹${fmtD(result.paUnnamedAmount)}`]] : []),
    ...(result.geoExtentTPAmount > 0 && (vehicleType === 'gcv' || vehicleType === 'pcv') ? [['Geographical Extent (TP)', `₹${fmtD(result.geoExtentTPAmount)}`]] : []),
    ...(result.cngKitTpAmount > 0 ? [['CNG/LPG Kit (TP)', `₹${fmtD(result.cngKitTpAmount)}`]] : []),
    ...(result.dynamicCustomFields || []).filter(f => f.section === 'tp').map(f => [f.label, `₹${fmtD(f.amount)}`]),
  ]
  const tpTotal = result.tpPremium + (result.geoExtentTPAmount || 0) + (result.cngKitTpAmount || 0) + result.llPdAmount + result.paOdAmount + result.llEmployeeAmount + result.paUnnamedAmount + dynamicTpTotal

  const addonRows = [
    ...(result.zeroDepAmount > 0 ? [['Zero Depreciation', `₹${fmtD(result.zeroDepAmount)}`]] : []),
    ...(result.tyreCoverAmount > 0 ? [['Other Addons (Rate)', `₹${fmtD(result.tyreCoverAmount)}`]] : []),
    ...(result.rsaAmount > 0 ? [['Roadside Assistance', `₹${fmtD(result.rsaAmount)}`]] : []),
    ...(result.otherAddonAmount > 0 ? [['Other Addon', `₹${fmtD(result.otherAddonAmount)}`]] : []),
    ...(result.dynamicCustomFields || []).filter(isAddonField).map(f => [f.label, `₹${fmtD(f.amount)}`]),
  ]
  const addonTotal = result.zeroDepAmount + result.tyreCoverAmount + result.rsaAmount + result.otherAddonAmount + (result.dynamicCustomFields || []).filter(isAddonField).reduce((sum, f) => sum + f.amount, 0)

  const premiumBeforeGst = result.odPremium + result.loadingAmount + tpTotal + addonTotal
  const policyLabel = policyType === 'od' ? 'Own Damage' : policyType === 'tp' ? 'Third Party' : policyType === 'comprehensive' ? 'Comprehensive' : 'Bundle'

  const shareQuotation = () => {
    const quoteId = `BBQ-${Math.floor(100000 + Math.random() * 900000)}`
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const policyLabel = policyType === 'od' ? 'Own Damage Only' : policyType === 'tp' ? 'Third Party Only' : policyType === 'comprehensive' ? 'Comprehensive' : (vehicleType === 'two_wheeler' ? '1Yr OD + 5Yr TP Bundle' : '1Yr OD + 3Yr TP Bundle')
    const vehicleSpec = isElectric ? `${kwPower || 0} KW (Electric)` : `${cc || 0} CC`

    const netPremium = result.odPremium + result.tpPremium + (result.geoExtentTPAmount || 0) + (result.cngKitTpAmount || 0) + result.llPdAmount + result.paOdAmount + result.llEmployeeAmount + result.rsaAmount + result.otherAddonAmount + result.paUnnamedAmount + result.zeroDepAmount + result.tyreCoverAmount + (result.loadingAmount || 0)
    const exactTotal = netPremium + result.gst

    const tpL = isBundle ? (vehicleType === 'two_wheeler' ? '5Yr TP' : '3Yr TP') : '1Yr TP'
    const tpBefore = result.tpPremium + result.restrictedTPPDDiscount
    const odItems = showOD ? `
      <tr><td style='padding:4px 8px;color:#64748b'>Final IDV (after depreciation)</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(effectiveIdv)}</td></tr>
      <tr><td style='padding:4px 8px;color:#64748b'>${vehicleType === 'pcv' ? 'Vehicle Basic OD' : `Basic OD Premium (@ ${result.odRate}%)`}</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(odBase)}</td></tr>
      ${vehicleType === 'gcv' && result.details?.gcvExtraUnits > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Extra Weight > 12000 Premium</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.details.gcvExtraPremium)}</td></tr>` : ''}
      ${result.geoExtentAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Geographical Extent</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.geoExtentAmount)}</td></tr>` : ''}
      ${result.cngKitOdAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>CNG/LPG Kit</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.cngKitOdAmount)}</td></tr>` : ''}
      ${result.imt23Amount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>IMT 23 Loading (15% of sum)</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.imt23Amount)}</td></tr>` : ''}
      ${vehicleType === 'pcv' && result.addODVal > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Add. OD (Passenger Capacity)</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.addODVal)}</td></tr>` : ''}
      ${(result.dynamicCustomFields || []).filter(f => f.section === 'od').map(f => `<tr><td style='padding:4px 8px;color:#64748b'>${f.label}</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(f.amount)}</td></tr>`).join('')}
      <tr style='background:#fef3c7'><td style='padding:6px 8px;font-weight:800;color:#92400e'>Final OD before discounts</td><td style='text-align:right;padding:6px 8px;font-weight:800;color:#92400e'>₹${fmtD(result.odBeforeDiscount)}</td></tr>
      ${result.odDiscountVal > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>OD Discount (${result.odDiscountVal}%)</td><td style='text-align:right;padding:4px 8px;font-weight:700;color:#dc2626'>- ₹${fmtD(result.odDiscountAmount)}</td></tr>` : ''}
      ${ncb > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>NCB Discount (${ncb}%)</td><td style='text-align:right;padding:4px 8px;font-weight:700;color:#16a34a'>- ₹${fmtD(result.ncbAmount)}</td></tr>` : ''}
      ${result.loadingAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Loading Discount @ ${result.loadingDiscount}%</td><td style='text-align:right;padding:4px 8px;font-weight:700'>+ ₹${fmtD(result.loadingAmount)}</td></tr>` : ''}
      <tr style='background:#f1f5f9'><td style='padding:6px 8px;font-weight:800'>Final OD Premium</td><td style='text-align:right;padding:6px 8px;font-weight:800;color:#2563eb'>₹${fmtD(result.odPremium + result.loadingAmount)}</td></tr>
    ` : ''

    const tpItems = showTP ? `
      <tr><td style='padding:4px 8px;color:#64748b'>${tpL} Premium</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(tpBefore)}</td></tr>
      ${result.restrictedTPPDDiscount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Restricted TPPD Discount</td><td style='text-align:right;padding:4px 8px;font-weight:700;color:#16a34a'>- ₹${fmtD(result.restrictedTPPDDiscount)}</td></tr>` : ''}
      ${result.llPdAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>LL to Paid Driver</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.llPdAmount)}</td></tr>` : ''}
      ${result.llEmployeeAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>LL to Employee (other than Paid Driver)</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.llEmployeeAmount)}</td></tr>` : ''}
      ${result.paOdAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>PA to Owner Driver</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.paOdAmount)}</td></tr>` : ''}
      ${result.paUnnamedAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>PA to Unnamed Passenger</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.paUnnamedAmount)}</td></tr>` : ''}
      ${result.geoExtentTPAmount > 0 && (vehicleType === 'gcv' || vehicleType === 'pcv') ? `<tr><td style='padding:4px 8px;color:#64748b'>Geographical Extent (TP)</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.geoExtentTPAmount)}</td></tr>` : ''}
      ${result.cngKitTpAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>CNG/LPG Kit (TP)</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.cngKitTpAmount)}</td></tr>` : ''}
      ${(result.dynamicCustomFields || []).filter(f => f.section === 'tp').map(f => `<tr><td style='padding:4px 8px;color:#64748b'>${f.label}</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(f.amount)}</td></tr>`).join('')}
    ` : ''

    const addonItems = `
      ${result.rsaAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Roadside Assistance</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.rsaAmount)}</td></tr>` : ''}
      ${result.otherAddonAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Other Addon Coverage</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.otherAddonAmount)}</td></tr>` : ''}
      ${result.zeroDepAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Zero Depreciation</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.zeroDepAmount)}</td></tr>` : ''}
      ${result.tyreCoverAmount > 0 ? `<tr><td style='padding:4px 8px;color:#64748b'>Other Addons (Rate)</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.tyreCoverAmount)}</td></tr>` : ''}
      ${(result.dynamicCustomFields || []).filter(f => f.section === 'addon' || (!f.section && f.section !== 'od' && f.section !== 'tp')).map(f => `<tr><td style='padding:4px 8px;color:#64748b'>${f.label}</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(f.amount)}</td></tr>`).join('')}
    `



    const ageLabel = vehicleAge === 'upto_5' ? '1 – 5 Yrs' : vehicleAge === '5_to_7' ? '6 – 7 Yrs' : 'Above 7 Yrs'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation ${quoteId} – BIMAONE</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; padding: 20px; }
          .container { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 24px; box-shadow: 0 20px 60px -20px rgba(0,0,0,0.15); overflow: hidden; }
          .header { background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 24px 28px 20px; color: #fff; }
          .header h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
          .header p { font-size: 12px; opacity: 0.8; margin-top: 2px; }
          .header .badge { display: inline-block; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 12px; font-size: 10px; font-weight: 700; margin-top: 8px; }
          .section { padding: 16px 24px; }
          .section-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
          .vehicle-details { display: flex; flex-wrap: wrap; gap: 12px; background: #f8fafc; border-radius: 14px; padding: 14px 18px; }
          .vehicle-details span { font-size: 13px; color: #334155; }
          .vehicle-details strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .total-row td { font-weight: 800; border-top: 2px solid #e2e8f0; padding-top: 8px; }
          .grand-total { background: linear-gradient(135deg, #2563eb, #4f46e5); color: #fff; }
          .grand-total td { padding: 12px 8px; font-size: 15px; font-weight: 900; }
          .footer { text-align: center; padding: 16px 24px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          @media print { body { background: #fff; padding: 0; } .container { box-shadow: none; border-radius: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class='container'>
          <div class='header'>
            <h1>🏷️ Insurance Quotation</h1>
            <p>BIMAONE — Indian Motor Tariff Rates (WEF 1st June 2022)</p>
            <div class='badge'>${quoteId}  |  ${dateStr}</div>
          </div>
          <div class='section'>
            <div class='section-title'>Vehicle Details</div>
            <div class='vehicle-details'>
              <span>🚗 <strong>${selectedCategory ? selectedCategory.label : 'N/A'}</strong></span>
              <span>⚙️ <strong>${vehicleSpec}</strong></span>
              <span>📍 <strong>Zone ${zone}</strong></span>
              <span>📅 <strong>${ageLabel}</strong></span>
              ${manufacturingYear ? `<span>🏭 Mfg: <strong>${manufacturingYear}</strong></span>` : ''}
            </div>
          </div>
          <div class='section'>
            <div class='section-title'>Premium Breakup</div>
            <table>
              ${odItems}
              ${tpItems}
              ${addonItems}
              <tr><td style='padding:6px 8px;font-weight:700;color:#64748b'>Premium Before GST</td><td style='text-align:right;padding:6px 8px;font-weight:700'>₹${fmtD(netPremium)}</td></tr>
              ${result.gstTpRate === 5 ? `
                <tr><td style='padding:4px 8px;color:#64748b'>GST on TP @ 5%</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.gstTp)}</td></tr>
                <tr><td style='padding:4px 8px;color:#64748b'>GST on Other @ 18%</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.gstNonTp)}</td></tr>
              ` : `<tr><td style='padding:4px 8px;color:#64748b'>GST (${gstEnabled ? '18%' : '0%'})</td><td style='text-align:right;padding:4px 8px;font-weight:700'>₹${fmtD(result.gst)}</td></tr>`}
            </table>
            <table style='margin-top:12px'>
              <tr class='grand-total'><td>💰 Total Payable Premium</td><td style='text-align:right'>₹${fmtD(exactTotal)}</td></tr>
            </table>
          </div>
          <div class='footer'>
            <p>Indicative as per IMT. Premiums may vary based on insurer loading, add-ons & discounts.</p>
            <p style='margin-top:4px'>Ref: IRDAI website irdai.gov.in</p>
          </div>
        </div>
        <div class='no-print' style='text-align:center;margin-top:20px'>
          <button onclick='window.print()' style='background:#2563eb;color:#fff;border:none;border-radius:12px;padding:10px 24px;font-size:13px;font-weight:700;cursor:pointer'>🖨️ Print Quotation</button>
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 500); }
        <\/script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const generateQuotationPdf = async (insuranceCompany) => {
    setPdfLoading(true)
    setShowQuotationModal(true)
    setPdfUrl('')
    const quoteId = `BBQ-${Math.floor(100000 + Math.random() * 900000)}`
    setGeneratedQuoteId(quoteId)
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const vehicleSpec = vehicleType === 'gcv' && gvw
      ? `GVW ${gvw} kg`
      : isElectric
        ? `${kwPower || 0} KW (Electric)`
        : `${cc || 0} CC (Petrol/Diesel/CNG)`

    const policyLabel = policyType === 'od' ? 'Own Damage Only' :
                        policyType === 'tp' ? 'Third Party Only' :
                        policyType === 'comprehensive' ? 'Comprehensive Cover' :
                        (vehicleType === 'two_wheeler' ? '1-Year OD + 5-Year TP Bundle' : '1-Year OD + 3-Year TP Bundle')

    const tpLabel = isBundle
      ? (vehicleType === 'two_wheeler' ? '5-Year TP Premium' : '3-Year TP Premium')
      : '1-Year TP Premium'

    const effectiveIdvForPdf = result.depreciatedIdv || (parseFloat(idv) || 0)
    const odBaseVal = showOD ? effectiveIdvForPdf * (result.odRate / 100) : 0

    const tableRows = []

    if (showOD) {
      tableRows.push({ desc: vehicleType === 'pcv' ? 'Vehicle Basic OD' : 'Basic Own Damage (OD) Premium', rate: `${result.odRate}%`, amount: odBaseVal })
      if (vehicleType === 'gcv' && result.details?.gcvExtraUnits > 0) tableRows.push({ desc: 'Extra Weight > 12000 Premium', rate: '-', amount: result.details.gcvExtraPremium })
      if (result.geoExtentAmount > 0) tableRows.push({ desc: 'Geographical Extent', rate: '-', amount: result.geoExtentAmount })
      if (result.cngKitOdAmount > 0) tableRows.push({ desc: 'CNG/LPG Kit', rate: '5%', amount: result.cngKitOdAmount })
      if (result.imt23Amount > 0) tableRows.push({ desc: 'IMT 23 Loading (15% of sum)', rate: '15%', amount: result.imt23Amount })
      if (vehicleType === 'pcv' && result.addODVal > 0) tableRows.push({ desc: 'Add. OD (Passenger Capacity)', rate: '-', amount: result.addODVal })
      tableRows.push(...(result.dynamicCustomFields || []).filter(f => f.section === 'od').map(f => ({ desc: f.label, rate: '-', amount: f.amount })))
      tableRows.push({ desc: 'Final OD before discounts', rate: '-', amount: result.odBeforeDiscount, type: 'subtotal' })
      if (result.odDiscountVal > 0) tableRows.push({ desc: 'Insurer OD Discount', rate: `-${result.odDiscountVal}%`, amount: -(result.odDiscountAmount || 0), type: 'discount' })
      if (ncb > 0) tableRows.push({ desc: 'No Claim Bonus (NCB) Discount', rate: `-${ncb}%`, amount: -(result.ncbAmount || 0), type: 'discount' })
      if (result.loadingAmount > 0) tableRows.push({ desc: `Loading Discount @ ${result.loadingDiscount}%`, rate: `${result.loadingDiscount}%`, amount: result.loadingAmount })
      tableRows.push({ desc: 'Final OD Premium', rate: '-', amount: result.odPremium + result.loadingAmount, type: 'total' })
    }

    if (showTP) {
      tableRows.push({ desc: `Third Party Liability (TP) Premium (${tpLabel})`, rate: '-', amount: result.tpPremium + result.restrictedTPPDDiscount })
      if (result.restrictedTPPDDiscount > 0) tableRows.push({ desc: 'Restricted TPPD Discount', rate: '-', amount: -result.restrictedTPPDDiscount, type: 'discount' })
      if (result.llPdAmount > 0) tableRows.push({ desc: 'Legal Liability to Paid Driver', rate: '-', amount: result.llPdAmount })
      if (result.paOdAmount > 0) tableRows.push({ desc: 'Personal Accident to Owner Driver', rate: '-', amount: result.paOdAmount })
      if (result.llEmployeeAmount > 0) tableRows.push({ desc: 'Legal Liability to Employee (other than Paid Driver)', rate: '-', amount: result.llEmployeeAmount })
      if (result.paUnnamedAmount > 0) tableRows.push({ desc: 'PA to Unnamed Passenger', rate: '-', amount: result.paUnnamedAmount })
      if (result.geoExtentTPAmount > 0 && (vehicleType === 'gcv' || vehicleType === 'pcv')) tableRows.push({ desc: 'Geographical Extent (TP)', rate: '-', amount: result.geoExtentTPAmount })
      if (result.cngKitTpAmount > 0) tableRows.push({ desc: 'CNG/LPG Kit (TP)', rate: '-', amount: result.cngKitTpAmount })
      tableRows.push(...(result.dynamicCustomFields || []).filter(f => f.section === 'tp').map(f => ({ desc: f.label, rate: '-', amount: f.amount })))
    }

    if (result.rsaAmount > 0) tableRows.push({ desc: 'Roadside Assistance (RSA)', rate: '-', amount: result.rsaAmount })
    if (result.otherAddonAmount > 0) tableRows.push({ desc: 'Other Addon Coverage', rate: '-', amount: result.otherAddonAmount })
    if (result.zeroDepAmount > 0) tableRows.push({ desc: 'Zero Depreciation', rate: '-', amount: result.zeroDepAmount })
    if (result.tyreCoverAmount > 0) tableRows.push({ desc: 'Other Addons (Rate)', rate: '-', amount: result.tyreCoverAmount })
    tableRows.push(...(result.dynamicCustomFields || []).filter(f => f.section === 'addon' || (!f.section && f.section !== 'od' && f.section !== 'tp')).map(f => ({ desc: f.label, rate: '-', amount: f.amount })))



    const netPremiumVal = premiumBeforeGst

    tableRows.push({ desc: 'Premium Before Taxes', rate: '-', amount: netPremiumVal, type: 'total' })

    if (result.gstTpRate === 5) {
      tableRows.push({ desc: 'GST on Third Party Premium @ 5%', rate: '5%', amount: result.gstTp, type: 'gst-header' })
      tableRows.push({ desc: 'GST on Other Components @ 18%', rate: '18%', amount: result.gstNonTp, type: 'gst-header' })
    } else {
      tableRows.push({ desc: `Goods and Services Tax (GST ${gstEnabled ? '18%' : '0%'})`, rate: gstEnabled ? '18%' : '0%', amount: result.gst, type: 'gst-header' })
    }

    const exactTotalVal = netPremiumVal + result.gst

    try {
      const response = await axios.post(`${API_URL}/api/calculator/generate-pdf`, {
        quoteId,
        date: dateStr,
        vehicleCategory: selectedCategory ? selectedCategory.label : 'N/A',
        vehicleSpec,
        vehicleSubtype: subtype ? undefined : undefined,
        zone: `Zone ${zone}`,
        vehicleAge: vehicleAge === 'upto_5' ? '1 – 5 Yrs' : vehicleAge === '5_to_7' ? '6 – 7 Yrs' : 'Above 7 Yrs',
        mfgYear: manufacturingYear || undefined,
        policyType: policyLabel,
        customerName,
        vehicleNo,
        vehicleMake,
        vehicleModel,
        vehicleVariant,
        odTerm,
        tpTerm,
        idv: parseFloat(idv) || 0,
        ncb,
        odDiscount: result.odDiscountVal,
        producerName: user?.name || 'BimaOne Agent',
        producerContact: user?.mobile || 'N/A',
        producerEmail: user?.email || 'N/A',
        businessName: user?.businessName || '',
        businessAddress: user?.address || '',
        businessServices: user?.modeOfBusiness || [],
        businessPicture: canQuotation ? (user?.picture || '') : '',
        insuranceCompany: insuranceCompany?.name || '',
        insuranceCompanyId: insuranceCompany?._id || null,
        premiums: {
          odRate: result.odRate,
          odBase: odBaseVal,
          ncbAmount: result.ncbAmount || 0,
          odDiscountAmount: result.odDiscountAmount || 0,
          finalOd: result.odPremium,
          tp: result.tpPremium,
          llPd: result.llPdAmount,
          paOd: result.paOdAmount,
          llEmployee: result.llEmployeeAmount,
          paUnnamed: result.paUnnamedAmount,
          rsa: result.rsaAmount,
          otherAddon: result.otherAddonAmount,
          geoExtent: result.geoExtentAmount,
          cngKitOdAmount: result.cngKitOdAmount,
          cngKitTpAmount: result.cngKitTpAmount,
          imt23: result.imt23Amount,
          zeroDep: result.zeroDepAmount,
          tyreCover: result.tyreCoverAmount,
          restrictedTPPD: result.restrictedTPPDDiscount,
          loadingDiscount: result.loadingDiscount,
          loadingAmount: result.loadingAmount,
          depreciation: result.depreciation,
          depreciatedIdv: result.depreciatedIdv,
          gcvExtraUnits: result.details?.gcvExtraUnits || 0,
          gcvExtraPremium: result.details?.gcvExtraPremium || 0,
          addODVal: result.addODVal || 0,
        },
        gst: {
          enabled: gstEnabled,
          hasSplitGst: result.gstTpRate === 5,
          tpRate: result.gstTpRate,
          gstTp: result.gstTp,
          gstNonTp: result.gstNonTp,
          totalGst: result.gst,
        },
        netPremium: netPremiumVal,
        totalPayable: exactTotalVal,
        tableRows,
      }, { withCredentials: true })

      if (response.data.success && response.data.url) {
        setPdfUrl(response.data.url)
        setPdfLoading(false)
      } else {
        setPdfLoading(false)
        alert('Failed to generate PDF. Please try again.')
      }
    } catch (error) {
      console.error('PDF generation error:', error)
      setPdfLoading(false)
      if (error.response?.status === 403) {
        setShowUpgradePopup(true)
        return
      }
      alert('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
      {/* Total */}
      <div className='bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-3 py-3 text-white sm:px-4 sm:py-4'>
        <p className='text-[11px] font-medium text-slate-300 sm:text-xs'>Total Payable Premium</p>
        <p className='mt-0.5 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl'>₹{fmt(result.totalPremium)}</p>
        <p className='mt-1 text-[11px] text-slate-300 sm:text-xs'>
          {policyLabel} · {gstEnabled ? (result.gstTpRate === 5 ? 'incl. 5% + 18% GST' : 'incl. 18% GST') : 'excl. GST'}
        </p>
      </div>

      {/* Breakup */}
      <div className='divide-y divide-slate-100'>
        {showOD && (
          <Group title='Own Damage' dot='bg-blue-500' rows={odRows} totalLabel='OD Premium' total={result.odPremium + result.loadingAmount} />
        )}
        {showTP && (
          <Group title='Third Party & Liability' dot='bg-rose-500' rows={tpRows} totalLabel='TP & Liability' total={tpTotal} />
        )}
        {addonRows.length > 0 && (
          <Group title='Add-on Covers' dot='bg-amber-500' rows={addonRows} totalLabel='Add-ons' total={addonTotal} />
        )}

        <div className='space-y-1.5 px-3 py-3 text-[11px] sm:px-4 sm:text-xs'>
          <div className='flex justify-between'>
            <span className='text-slate-500'>Premium before GST</span>
            <span className='font-medium tabular-nums text-slate-800'>₹{fmtD(premiumBeforeGst)}</span>
          </div>
          {result.gstTpRate === 5 ? (
            <>
              <div className='flex justify-between'>
                <span className='text-slate-500'>GST on TP @ 5%</span>
                <span className='font-medium tabular-nums text-slate-800'>₹{fmtD(result.gstTp)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-500'>GST on Other @ 18%</span>
                <span className='font-medium tabular-nums text-slate-800'>₹{fmtD(result.gstNonTp)}</span>
              </div>
            </>
          ) : (
            <div className='flex justify-between'>
              <span className='text-slate-500'>GST {gstEnabled ? '(18%)' : '(0%)'}</span>
              <span className='font-medium tabular-nums text-slate-800'>₹{fmtD(result.gst)}</span>
            </div>
          )}
          <div className='flex justify-between border-t border-slate-200 pt-2 text-[13px] sm:text-sm'>
            <span className='font-bold text-slate-900'>Total Payable</span>
            <span className='font-bold tabular-nums text-blue-700'>₹{fmt(result.totalPremium)}</span>
          </div>
        </div>
      </div>

      <div className='border-t border-slate-200 bg-gray-50 p-3 sm:p-4'>
        <button
          onClick={() => {
            setShowCompanyModal(true); setModalStep(1); setDropdownOpen(false); setSearchQuery('')
          }}
          className='flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 py-2.5 text-[13px] font-semibold sm:py-3 sm:text-sm text-white shadow-sm transition hover:from-blue-800 hover:to-blue-700 active:scale-[0.98]'
        >
          <FaFileLines className='h-4 w-4' />
          Preview Quotation
        </button>
      </div>

      {/* Insurance Company Selection Modal */}
      {showCompanyModal && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='relative w-full max-w-md rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]'>
            
            {/* Fixed Header */}
            <div className='p-6 pb-4 border-b border-slate-100'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100'>
                  <svg className='h-5 w-5 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
                  </svg>
                </div>
                <div>
                  <h3 className='text-base font-black text-slate-800'>Quotation Details</h3>
                  <p className='text-xs font-medium text-slate-400'>Step {modalStep} of 2</p>
                </div>
              </div>
            </div>

            {/* Step 1: Customer & Vehicle Details */}
            {modalStep === 1 && (
              <div className='p-6 overflow-y-auto flex-1 space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='mb-1 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500'>Customer Name</label>
                    <input type='text' value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder='e.g. Rajesh Kumar'
                      className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300' />
                  </div>
                  <div>
                    <label className='mb-1 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500'>Vehicle No</label>
                    <input type='text' value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder='e.g. MH01AB1234'
                      className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300' />
                  </div>
                  <div>
                    <label className='mb-1 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500'>Make</label>
                    <input type='text' value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder='e.g. Maruti'
                      className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300' />
                  </div>
                  <div>
                    <label className='mb-1 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500'>Model</label>
                    <input type='text' value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder='e.g. Swift'
                      className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300' />
                  </div>
                  <div>
                    <label className='mb-1 block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500'>Variant</label>
                    <input type='text' value={vehicleVariant} onChange={e => setVehicleVariant(e.target.value)} placeholder='e.g. VXi'
                      className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300' />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Insurance Company */}
            {modalStep === 2 && (
              <div className='p-6 overflow-y-auto flex-1 space-y-4'>
                <div className='space-y-2'>
                  <button
                    type='button'
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className='w-full flex items-center justify-between rounded-xl border-2 border-slate-200 p-3 text-sm font-bold text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white transition-all'
                  >
                    <span className={selectedCompany?.name ? 'text-slate-800' : 'text-slate-400'}>{selectedCompany?.name || '-- Select Insurance Company --'}</span>
                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className='border-2 border-slate-200 rounded-xl bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-2 duration-150'>
                      <div className='p-2 border-b border-slate-100'>
                        <div className='flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2'>
                          <svg className='h-4 w-4 text-slate-400 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                          </svg>
                          <input
                            type='text'
                            placeholder='Search company...'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400'
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className='overflow-y-auto' style={{ maxHeight: '200px' }}>
                        {insuranceCompanies
                          .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((c) => (
                            <button
                              key={c._id}
                              type='button'
                              onClick={() => { setSelectedCompany(c); setDropdownOpen(false); setSearchQuery('') }}
                              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-b border-slate-50 last:border-b-0 ${
                                selectedCompany?._id === c._id
                                  ? 'bg-blue-50 text-blue-700 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {c.name}
                            </button>
                          ))}
                        {insuranceCompanies.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                          <p className='px-4 py-8 text-sm text-slate-400 text-center'>No companies found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fixed Bottom Buttons */}
            <div className='p-4 sm:p-6 pt-3 sm:pt-4 border-t border-slate-100'>
              <div className='flex gap-2 sm:gap-3'>
                {modalStep === 1 ? (
                  <>
                    <button
                      onClick={() => { setShowCompanyModal(false); setModalStep(1); setSelectedCompany(''); setDropdownOpen(false); setSearchQuery(''); setCustomerName(''); setVehicleNo(''); setVehicleMake(''); setVehicleModel(''); setVehicleVariant('') }}
                      className='flex-1 rounded-xl border-2 border-slate-200 py-2 sm:py-3 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setModalStep(2)}
                      className='flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2 sm:py-3 text-xs sm:text-sm font-black text-white uppercase tracking-wider hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]'
                    >
                      Next
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setModalStep(1)}
                      className='flex-1 rounded-xl border-2 border-slate-200 py-2 sm:py-3 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]'
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedCompany?.name) {
                          alert('Please select an insurance company.')
                          return
                        }
                        setShowCompanyModal(false)
                        setModalStep(1)
                        generateQuotationPdf(selectedCompany)
                      }}
                      className='flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2 sm:py-3 text-xs sm:text-sm font-black text-white uppercase tracking-wider hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]'
                    >
                      Generate Quotation
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Quotation Loading Modal */}
      {showQuotationModal && pdfLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'>
          <div className='relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl'>
            <div className='flex flex-col items-center justify-center py-10 gap-4'>
              <div className='h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600' />
              <p className='text-sm font-bold text-slate-500'>Generating Quotation…</p>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Preview Modal */}
      <PdfPreviewModal
        isOpen={showQuotationModal && !pdfLoading && !!pdfUrl}
        onClose={() => {
          setShowQuotationModal(false)
          setPdfUrl('')
        }}
        pdfUrl={pdfUrl}
        quoteId={generatedQuoteId}
        API_URL={API_URL}
      />

      {/* Upgrade Popup */}
      <UpgradePopup
        isOpen={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        message='Personalised branding (your logo with producer name) on quotations is available on the Plus plan. Upgrade to add your logo to quotation PDFs.'
      />
    </div>
  )
}

export default ResultBox
