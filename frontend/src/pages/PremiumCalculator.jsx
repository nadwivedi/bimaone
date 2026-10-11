import { useState, useEffect } from 'react'
import { FaArrowLeft, FaCalculator, FaClipboardList, FaPuzzlePiece, FaShieldHalved, FaTriangleExclamation } from 'react-icons/fa6'
import VEHICLE_CATEGORIES from '../components/calculator/vehicleCategories'
import VehicleTypeGrid from '../components/calculator/VehicleTypeGrid'
import PrivateCarForm from '../components/calculator/forms/PrivateCarForm'
import TwoWheelerForm from '../components/calculator/forms/TwoWheelerForm'
import GCVForm from '../components/calculator/forms/GCVForm'
import GCV3WForm from '../components/calculator/forms/GCV3WForm'
import TaxiForm from '../components/calculator/forms/TaxiForm'
import PCVForm from '../components/calculator/forms/PCVForm'
import PCV3WForm from '../components/calculator/forms/PCV3WForm'
import MiscDForm from '../components/calculator/forms/MiscDForm'
import ResultBox from '../components/calculator/ResultBox'
import CALCULATORS from '../components/calculator/calculations'
import {
  NCBSelector, ODDiscountInput,
} from '../components/calculator/SharedFields'

const LABEL = 'mb-1.5 block text-xs font-semibold text-slate-600'
const FIELD = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'

const SECTION_TONES = {
  blue: { head: 'from-blue-50 to-indigo-50 border-blue-100', icon: 'bg-blue-600' },
  amber: { head: 'from-amber-50 to-yellow-50 border-amber-100', icon: 'bg-amber-500' },
  rose: { head: 'from-rose-50 to-pink-50 border-rose-100', icon: 'bg-rose-500' },
}

const FormSection = ({ icon: Icon, tone, title, subtitle, children }) => (
  <section className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
    <div className={`flex items-center gap-3 border-b bg-gradient-to-r px-4 py-3 ${SECTION_TONES[tone].head}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${SECTION_TONES[tone].icon}`}>
        <Icon className='h-3.5 w-3.5' />
      </span>
      <div>
        <h2 className='text-sm font-bold text-slate-900'>{title}</h2>
        <p className='text-xs text-slate-500'>{subtitle}</p>
      </div>
    </div>
    <div className='p-4'>{children}</div>
  </section>
)

const PremiumCalculator = () => {
  const [step, setStep] = useState(1)
  const [vehicleType, setVehicleType] = useState(null)
  const [result, setResult] = useState(null)
  const [allConfigs, setAllConfigs] = useState({})

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
        const res = await fetch(`${backendUrl}/api/calculator/config`)
        const data = await res.json()
        if (data.success && data.configs) {
          setAllConfigs(data.configs)
        }
      } catch (err) {
        console.error('Failed to fetch backend calculator config:', err)
      }
    }
    fetchConfigs()
  }, [])


  const [zone, setZone] = useState('')
  const [vehicleAge, setVehicleAge] = useState('')
  const [idv, setIdv] = useState('')
  const [ncb, setNcb] = useState(0)
  const [coverageType, setCoverageType] = useState('comprehensive')
  const [policyType, setPolicyType] = useState('comprehensive')
  const [bundleOdTerm, setBundleOdTerm] = useState('1')
  const [bundleTpTerm, setBundleTpTerm] = useState('3')
  const [odDiscount, setOdDiscount] = useState('')

  const [cc, setCc] = useState('')
  const [kwPower, setKwPower] = useState('')
  const [isElectric, setIsElectric] = useState(false)
  const [gvw, setGvw] = useState('')
  const [passengers, setPassengers] = useState('')
  const [subtype, setSubtype] = useState('')
  const [policyTerm, setPolicyTerm] = useState('1yr')
  const [manufacturingYear, setManufacturingYear] = useState('')
  const [llPaidDriver, setLlPaidDriver] = useState('')
  const [showLlPdModal, setShowLlPdModal] = useState(false)
  const [llPdTempValue, setLlPdTempValue] = useState('')
  const [paOwnerDriver, setPaOwnerDriver] = useState('')
  const [llToEmployee, setLlToEmployee] = useState('')
  const [rsa, setRsa] = useState('')
  const [geoExtent, setGeoExtent] = useState('0')
  const [cngKit, setCngKit] = useState('no')
  const [imt23, setImt23] = useState('no')
  const [restrictedTPPD, setRestrictedTPPD] = useState('no')
  const [zeroDep, setZeroDep] = useState('')
  const [tyreCover, setTyreCover] = useState('')
  const [otherAddon, setOtherAddon] = useState('')
  const [paUnnamedPassenger, setPaUnnamedPassenger] = useState('')
  const [loadingDiscount, setLoadingDiscount] = useState('')
  const [depreciation, setDepreciation] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState({})

  const activeCustomFields = (allConfigs[vehicleType]?.customFields || []).filter(f => f.isActive !== false && f.id !== 'restricted_tppd' && !(vehicleType === 'pcv' && f.id === 'imt23'))



  const isPrivateOr2W = vehicleType === 'private_car' || vehicleType === 'two_wheeler'
  const isOdOnly = policyType === 'od'
  const isTpOnly = isPrivateOr2W ? policyType === 'tp' : coverageType === 'tp'
  const selectedCategory = VEHICLE_CATEGORIES.find(v => v.id === vehicleType)
  const currentYear = new Date().getFullYear()

  const resetForm = () => {
    setResult(null)
    setCc('')
    setKwPower('')
    setIsElectric(false)
    setGvw('')
    setPassengers('')
    setSubtype('')
    setIdv('')
    setNcb(0)
    setZone('')
    setVehicleAge('')
    setCoverageType('comprehensive')
    setPolicyType('comprehensive')
    setOdDiscount('')
    setPolicyTerm('1yr')
    setManufacturingYear('')
    setLlPaidDriver('')
    setShowLlPdModal(false)
    setPaOwnerDriver('')
    setLlToEmployee('')
    setRsa('')
    setGeoExtent('0')
    setCngKit('no')
    setImt23('no')
    setZeroDep('0')
    setOtherAddon('')
    setPaUnnamedPassenger('')
    setLoadingDiscount('')
    setDepreciation('')
    setRestrictedTPPD('no')
    setTyreCover('')
    setBundleOdTerm('1')
    setBundleTpTerm(vehicleType === 'two_wheeler' ? '5' : '3')
  }

  const handleVehicleSelect = (id) => {
    setVehicleType(id)
    resetForm()
    const defaults = { gcv_3w: 'public', pcv: 'school_bus', pcv_3w: 'c1b', misc_d: 'other', taxi: null }
    if (defaults[id] !== undefined) setSubtype(defaults[id] || '')
    if (id === 'two_wheeler') {
      setBundleTpTerm('5')
      setBundleOdTerm('1')
    } else {
      setBundleTpTerm('3')
    }
    setStep(2)
  }

  const calculatePremium = () => {
    if (!zone || !vehicleAge) return setResult(null)
    const idvVal = parseFloat(idv) || 0
    const depreciationPercent = parseFloat(depreciation) || 0
    const depreciatedIdv = idvVal * (1 - depreciationPercent / 100)
    const ccVal = parseFloat(cc) || 0
    const gvwVal = parseFloat(gvw) || 0
    const passengerVal = parseInt(passengers) || 0
    const kwVal = parseFloat(kwPower) || 0

    const vehicleConfig = allConfigs[vehicleType] || null
    const imt23Rate = 15 // IMT 23 is always 15% of OD as per Indian Motor Tariff

    const calcFn = CALCULATORS[vehicleType]
    let { tpPremium = 0, odRate = 0, details = {} } = calcFn ? calcFn({
      isElectric, kwVal, ccVal, gvwVal, passengerVal,
      policyType, policyTerm, bundleTpTerm,
      vehicleAge, zone, subtype,
    }, vehicleConfig) : {}

    let odPremium = 0
    let imt23Amount = 0
    let odBeforeDiscount = 0
    let ncbAmount = 0
    let odDiscountAmount = 0
    const odDiscountVal = parseFloat(odDiscount) || 0
    const geoExtentAmount = parseFloat(geoExtent) || 0

    const isElectricSubtype = subtype === 'e_school_bus' || subtype === 'e_other_bus'
    let cngKitOdAmount = 0
    let cngKitTpAmount = 0

    // Process dynamic custom fields added from admin
    let dynamicOdAmount = 0
    let dynamicAddonAmount = 0
    let dynamicTpAmount = 0
    const dynamicCustomFieldsResult = []

    activeCustomFields.forEach(field => {
      const userVal = customFieldValues[field.id]
      let amount = 0
      const basicOd = depreciatedIdv * (odRate / 100)
      const extras = (vehicleType === 'gcv' ? (details?.gcvExtraPremium || 0) : 0) + (vehicleType === 'pcv' ? (details?.addOD || 0) : 0) + geoExtentAmount
      const imtBase = basicOd + extras

      if (field.fieldType === 'percent_of_od') {
        const isSelected = userVal === 'yes' || (userVal !== undefined && userVal !== 'no' && userVal !== '' && userVal !== '0')
        if (isSelected) {
          const ratePct = (userVal !== 'yes' && !isNaN(parseFloat(userVal))) ? parseFloat(userVal) : (field.rate || 0)
          amount = imtBase * (ratePct / 100)
        }
      } else if (field.fieldType === 'percent_of_idv') {
        const isSelected = userVal === 'yes' || (userVal !== undefined && userVal !== '' && userVal !== '0')
        if (isSelected) {
          const ratePct = (userVal !== 'yes' && !isNaN(parseFloat(userVal))) ? parseFloat(userVal) : (field.rate || 0)
          amount = depreciatedIdv * (ratePct / 100)
        }
      } else if (field.fieldType === 'fixed_amount') {
        const isSelected = userVal === 'yes' || (userVal !== undefined && userVal !== '' && userVal !== '0')
        if (isSelected) {
          amount = (userVal !== 'yes' && !isNaN(parseFloat(userVal))) ? parseFloat(userVal) : (field.rate || 0)
        }
      }

      if (amount > 0 || (userVal === 'yes' || (userVal !== undefined && userVal !== 'no' && userVal !== '' && userVal !== '0'))) {
        if (amount > 0) {
          dynamicCustomFieldsResult.push({
            id: field.id,
            label: field.label,
            amount,
            section: field.section || 'addon',
          })

          if (field.section === 'od') {
            dynamicOdAmount += amount
          } else if (field.section === 'tp') {
            dynamicTpAmount += amount
          } else {
            dynamicAddonAmount += amount
          }
        }

        // Check if this custom field also has a TP addition configured
        if (field.hasTpAddition) {
          let tpAddVal = 0
          if (field.tpType === 'percent_of_tp') {
            tpAddVal = tpPremium * ((field.tpRate || 0) / 100)
          } else {
            tpAddVal = Number(field.tpRate) || 0
          }

          if (tpAddVal > 0) {
            dynamicTpAmount += tpAddVal
            dynamicCustomFieldsResult.push({
              id: `${field.id}_tp`,
              label: `${field.label} (TP Addition)`,
              amount: tpAddVal,
              section: 'tp',
            })
          }
        }
      }
    })


    if (vehicleType === 'private_car' || vehicleType === 'two_wheeler') {
      if (policyType !== 'tp' && idvVal > 0) {
        const basicOd = depreciatedIdv * (odRate / 100)
        cngKitOdAmount = (vehicleType === 'private_car' && !isElectric && cngKit === 'yes') ? basicOd * 0.05 : 0
        const extras = (vehicleType === 'gcv' ? (details?.gcvExtraPremium || 0) : 0) + geoExtentAmount + cngKitOdAmount
        const imtBase = basicOd + extras
        imt23Amount = imt23 === 'yes' ? imtBase * (imt23Rate / 100) : 0
        const bundleMul = policyType === 'bundle' ? (parseInt(bundleOdTerm) || 1) : 1
        odBeforeDiscount = (imtBase + imt23Amount + dynamicOdAmount) * bundleMul
        odDiscountAmount = odBeforeDiscount * (odDiscountVal / 100)
        ncbAmount = (odBeforeDiscount - odDiscountAmount) * (ncb / 100)
        odPremium = odBeforeDiscount - odDiscountAmount - ncbAmount
      }
      if (policyType === 'od') tpPremium = 0
    } else {
      if (coverageType === 'comprehensive' && idvVal > 0) {
        const basicOd = depreciatedIdv * (odRate / 100)
        const isPcv3wElectric = (subtype || '').startsWith('erickshaw_')
        const isCngCommVehicle = (vehicleType === 'pcv' && !isElectricSubtype) ||
                                (vehicleType === 'taxi' && !isElectric) ||
                                (vehicleType === 'gcv' && !isElectric) ||
                                (vehicleType === 'gcv_3w' && !isElectric) ||
                                (vehicleType === 'pcv_3w' && !isPcv3wElectric)
        const pcvAddOd = vehicleType === 'pcv' ? (details?.addOD || 0) : 0
        const pcvBasicTotal = vehicleType === 'pcv' ? (basicOd + pcvAddOd) : basicOd
        cngKitOdAmount = isCngCommVehicle && cngKit === 'yes' ? pcvBasicTotal * 0.05 : 0
        const gcvExtra = vehicleType === 'gcv' ? (details?.gcvExtraPremium || 0) : 0
        // IMT23 base for PCV (Bus): Vehicle Basic OD + Geo Ext + CNG Kit (excludes Add. OD per tariff)
        // IMT23 base for all others: basicOd + all extras
        const imtBase = vehicleType === 'pcv'
          ? basicOd + geoExtentAmount + cngKitOdAmount
          : basicOd + gcvExtra + geoExtentAmount + cngKitOdAmount
        imt23Amount = imt23 === 'yes' ? imtBase * (imt23Rate / 100) : 0
        // Full OD total includes Add. OD (passenger capacity) for PCV on top of imtBase
        odBeforeDiscount = imtBase + imt23Amount + pcvAddOd + dynamicOdAmount
        odDiscountAmount = odBeforeDiscount * (odDiscountVal / 100)
        ncbAmount = (odBeforeDiscount - odDiscountAmount) * (ncb / 100)
        odPremium = odBeforeDiscount - odDiscountAmount - ncbAmount
      }
      if (coverageType === 'tp') odPremium = 0
    }

    const isPcv3wElectric = (subtype || '').startsWith('erickshaw_')
    const isCngVehicle = (vehicleType === 'pcv' && !isElectricSubtype) ||
                         (vehicleType === 'private_car' && !isElectric) ||
                         (vehicleType === 'taxi' && !isElectric) ||
                         (vehicleType === 'gcv' && !isElectric) ||
                         (vehicleType === 'gcv_3w' && !isElectric) ||
                         (vehicleType === 'pcv_3w' && !isPcv3wElectric)
    cngKitTpAmount = (isCngVehicle && cngKit === 'yes' && coverageType !== 'od' && policyType !== 'od') ? 60 : 0

    const llPdAmount = parseFloat(llPaidDriver) || 0
    const paOdAmount = parseFloat(paOwnerDriver) || 0
    const llEmployeeAmount = parseFloat(llToEmployee) || 0
    const rsaAmount = parseFloat(rsa) || 0
    const otherAddonAmount = parseFloat(otherAddon) || 0
    const paUnnamedAmount = parseFloat(paUnnamedPassenger) || 0
    const zeroDepAmount = zeroDep !== '' && zeroDep !== '0' ? (parseFloat(zeroDep) / 100) * depreciatedIdv : 0
    const tyreCoverAmount = tyreCover !== '' && tyreCover !== '0' ? (parseFloat(tyreCover) / 100) * depreciatedIdv : 0
    let restrictedTPPDDiscount = 0
    if (restrictedTPPD === 'yes') {
      const tpYears = policyType === 'bundle' ? (parseInt(bundleTpTerm) || 1) : 1
      const defaultRestrictedVal = vehicleType === 'gcv' ? 200 : vehicleType === 'gcv_3w' ? 150 : vehicleType === 'private_car' ? 100 : 50
      const restrictedRate = vehicleConfig?.tpRates?.restrictedTPPDDiscount ?? defaultRestrictedVal
      restrictedTPPDDiscount = Math.min(tpPremium, restrictedRate * tpYears)
    }
    tpPremium -= restrictedTPPDDiscount

    const geoExtentTPAmount = ((vehicleType === 'gcv' || vehicleType === 'pcv') && geoExtentAmount > 0) ? 100 : 0

    const loadingDiscountPercent = parseFloat(loadingDiscount) || 0
    const netPremiumBeforeLoading = odPremium + tpPremium + dynamicTpAmount + dynamicAddonAmount + geoExtentTPAmount + cngKitTpAmount + llPdAmount + paOdAmount + llEmployeeAmount + rsaAmount + otherAddonAmount + paUnnamedAmount + zeroDepAmount + tyreCoverAmount
    const loadingAmount = netPremiumBeforeLoading * (loadingDiscountPercent / 100)
    const netPremium = netPremiumBeforeLoading + loadingAmount

    let gst = 0
    let gstTp = 0
    let gstNonTp = 0
    let gstTpRate = vehicleConfig?.gstTpRate ?? (vehicleType === 'gcv' || vehicleType === 'gcv_3w' ? 5 : 18)
    let gstNonTpRate = vehicleConfig?.gstRate ?? 18
    const isGCV = vehicleType === 'gcv' || vehicleType === 'gcv_3w' || gstTpRate !== gstNonTpRate
    if (isGCV) {
      gstTp = tpPremium * (gstTpRate / 100)
      gstNonTp = (netPremium - tpPremium) * (gstNonTpRate / 100)
      gst = gstTp + gstNonTp
    } else {
      gst = netPremium * (gstNonTpRate / 100)
    }
    const totalPremium = netPremium + gst


    setResult({
      odPremium, odBeforeDiscount, tpPremium, llPdAmount, paOdAmount, llEmployeeAmount,
      rsaAmount, otherAddonAmount, paUnnamedAmount, geoExtentAmount, geoExtentTPAmount,
      cngKitOdAmount, cngKitTpAmount, cngKit,
      imt23Amount, zeroDepAmount, tyreCoverAmount, restrictedTPPDDiscount,
      loadingAmount, loadingDiscount: loadingDiscountPercent,
      depreciation: depreciationPercent, depreciatedIdv,
      gst, gstTp, gstNonTp, gstTpRate, gstNonTpRate, totalPremium: Math.round(totalPremium),
      odRate, details, odDiscountVal, odDiscountAmount, ncbAmount,
      addODVal: details?.addOD || 0,
      dynamicCustomFields: dynamicCustomFieldsResult,
    })
  }

  useEffect(() => {
    if (vehicleType) calculatePremium()
  }, [vehicleType, zone, vehicleAge, idv, ncb, odDiscount, coverageType, policyType, bundleOdTerm, bundleTpTerm, cc, kwPower, isElectric, gvw, passengers, subtype, policyTerm, llPaidDriver, paOwnerDriver, llToEmployee, geoExtent, cngKit, imt23, restrictedTPPD, zeroDep, tyreCover, rsa, otherAddon, paUnnamedPassenger, loadingDiscount, depreciation, customFieldValues])


  const formProps = {
    zone, setZone, vehicleAge, setVehicleAge, idv, setIdv,
    ncb, setNcb, odDiscount, setOdDiscount,
    coverageType, setCoverageType, policyType, setPolicyType, bundleOdTerm, setBundleOdTerm, bundleTpTerm, setBundleTpTerm,
    isElectric, setIsElectric, cc, setCc, kwPower, setKwPower,
    gvw, setGvw, passengers, setPassengers,
    subtype, setSubtype,
    manufacturingYear, setManufacturingYear,
    geoExtent, setGeoExtent, cngKit, setCngKit, imt23, setImt23,
    loadingDiscount, setLoadingDiscount,
    depreciation, setDepreciation,
    vehicleType, currentYear,
  }

  const renderForm = () => {
    switch (vehicleType) {
      case 'private_car': return <PrivateCarForm {...formProps} />
      case 'two_wheeler': return <TwoWheelerForm {...formProps} />
      case 'gcv': return <GCVForm {...formProps} />
      case 'gcv_3w': return <GCV3WForm {...formProps} />
      case 'taxi': return <TaxiForm {...formProps} />
      case 'pcv': return <PCVForm {...formProps} />
      case 'pcv_3w': return <PCV3WForm {...formProps} />
      case 'misc_d': return <MiscDForm {...formProps} />
      default: return null
    }
  }

  const renderDynamicFieldInput = (field) => {
    const isImt23 = field.id === 'imt23' || field.label.toLowerCase().includes('imt')
    const displayLabel = isImt23
      ? field.label
      : `${field.label} ${field.fieldType === 'percent_of_od' ? `(${field.rate}% OD)` : field.fieldType === 'percent_of_idv' ? `(${field.rate}% IDV)` : `(₹)`}`
    const yesOptionText = isImt23 ? 'Yes' : `Yes (${field.rate}% of OD)`

    return (
      <div key={field.id}>
        <label className={LABEL}>{displayLabel}</label>
        {field.fieldType === 'percent_of_od' ? (
          <select
            value={customFieldValues[field.id] || 'no'}
            onChange={e => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
          >
            <option value="no">No</option>
            <option value="yes">{yesOptionText}</option>
          </select>
        ) : (
          <input
            type='number'
            value={customFieldValues[field.id] ?? ''}
            onChange={e => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={`e.g. ${field.rate || 0}`}
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
          />
        )}
      </div>
    )
  }


  return (
    <>
      <div className='min-h-screen bg-slate-50'>
        <main className='w-full space-y-4 px-3 pt-4 pb-8 lg:px-6 lg:pt-5'>
          {/* Header */}
          <section className='overflow-hidden rounded-2xl bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 py-4 text-white shadow-sm md:px-6 md:py-5'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex min-w-0 items-center gap-3'>
                <span className='flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-1 ring-white/20'>
                  {step === 2 && selectedCategory?.image
                    ? <img src={selectedCategory.image} alt='' className='h-10 w-10 object-contain' />
                    : <FaCalculator className='h-5 w-5 text-blue-200' />}
                </span>
                <div className='min-w-0'>
                  <h1 className='truncate text-lg font-bold md:text-xl'>
                    {step === 2 && selectedCategory ? selectedCategory.label : 'Premium Calculator'}
                  </h1>
                  <p className='truncate text-xs text-slate-300 md:text-sm'>
                    {step === 2 && selectedCategory ? selectedCategory.desc : 'Indian Motor Tariff rates · WEF 1 June 2022'}
                  </p>
                </div>
              </div>
              {step === 2 && (
                <button
                  onClick={() => { setStep(1); setResult(null) }}
                  className='flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20'
                >
                  <FaArrowLeft className='h-3.5 w-3.5' />
                  <span className='hidden sm:inline'>Change vehicle</span>
                  <span className='sm:hidden'>Change</span>
                </button>
              )}
            </div>
          </section>

          {step === 1 && <VehicleTypeGrid handleVehicleSelect={handleVehicleSelect} />}

          {step === 2 && selectedCategory && (
            <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start'>
              <div className='space-y-4'>
                <FormSection icon={FaClipboardList} tone='blue' title='Vehicle & Policy' subtitle='Vehicle details, IDV and discounts'>
                  {renderForm()}

                  {/* OD Section Custom Fields */}
                  {activeCustomFields.filter(f => f.section === 'od').length > 0 && (
                    <div className='mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 md:grid-cols-3'>
                      {activeCustomFields.filter(f => f.section === 'od').map(renderDynamicFieldInput)}
                    </div>
                  )}
                </FormSection>

                {!isTpOnly && (
                  <FormSection icon={FaPuzzlePiece} tone='amber' title='Add-on Covers' subtitle='Optional — leave blank if not needed'>
                    <div className='grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4'>
                      <div>
                        <label className={LABEL}>Zero Depreciation (%)</label>
                        <input type='number' value={zeroDep} onChange={e => setZeroDep(e.target.value)} placeholder='e.g. 20' min={0} max={100} className={FIELD} />
                      </div>
                      <div>
                        <label className={LABEL}>Other Addons (Rate %)</label>
                        <input type='number' value={tyreCover} onChange={e => setTyreCover(e.target.value)} placeholder='e.g. 2' min={0} max={100} className={FIELD} />
                      </div>
                      <div>
                        <label className={LABEL}>Roadside Assistance (₹)</label>
                        <input type='number' value={rsa} onChange={e => setRsa(e.target.value)} placeholder='e.g. 250' className={FIELD} />
                      </div>
                      <div>
                        <label className={LABEL}>Other Addon (₹)</label>
                        <input type='number' value={otherAddon} onChange={e => setOtherAddon(e.target.value)} placeholder='e.g. 500' className={FIELD} />
                      </div>

                      {/* Addon Section Custom Fields */}
                      {activeCustomFields.filter(f => f.section === 'addon' || (!f.section && f.section !== 'tp' && f.section !== 'od')).map(renderDynamicFieldInput)}
                    </div>
                  </FormSection>
                )}

                {!isOdOnly && (
                  <FormSection icon={FaShieldHalved} tone='rose' title='Third Party & Liability' subtitle='Legal liability and personal accident covers'>
                    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
                      <div>
                        <label className={LABEL}>LL to Paid Driver (₹)</label>
                        <select
                          value={llPaidDriver && !['0', '50', '100', '150', '200', '250', '300'].includes(llPaidDriver) ? llPaidDriver : (llPaidDriver || '0')}
                          onChange={e => {
                            if (e.target.value === 'custom') { setLlPdTempValue(''); setShowLlPdModal(true); return }
                            setLlPaidDriver(e.target.value)
                          }}
                          className={`${FIELD} cursor-pointer`}>
                          <option value='0'>0</option>
                          <option value='50'>50</option>
                          <option value='100'>100</option>
                          <option value='150'>150</option>
                          <option value='200'>200</option>
                          <option value='250'>250</option>
                          <option value='300'>300</option>
                          {llPaidDriver && !['0', '50', '100', '150', '200', '250', '300'].includes(llPaidDriver) && <option value={llPaidDriver}>₹{llPaidDriver}</option>}
                          <option value='custom'>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>PA to Owner Driver (₹)</label>
                        <input type='number' value={paOwnerDriver} onChange={e => setPaOwnerDriver(e.target.value)} placeholder='e.g. 100' className={FIELD} />
                      </div>
                      {(vehicleType === 'private_car' || vehicleType === 'two_wheeler') && (
                        <div>
                          <label className={LABEL}>PA to Unnamed Passenger (₹)</label>
                          <input type='number' value={paUnnamedPassenger} onChange={e => setPaUnnamedPassenger(e.target.value)} placeholder='e.g. 25' className={FIELD} />
                        </div>
                      )}
                      <div>
                        <label className={LABEL}>Restricted TPPD</label>
                        <select value={restrictedTPPD} onChange={e => setRestrictedTPPD(e.target.value)} className={`${FIELD} cursor-pointer`}>
                          <option value="no">No</option>
                          <option value="yes">Yes ({vehicleType === 'gcv' ? '₹200' : vehicleType === 'gcv_3w' ? '₹150' : vehicleType === 'private_car' ? '₹100' : '₹50'}/yr discount)</option>
                        </select>
                      </div>
                      {vehicleType !== 'private_car' && vehicleType !== 'two_wheeler' && (
                        <div>
                          <label className={LABEL}>LL to Employee (₹)</label>
                          <input type='number' value={llToEmployee} onChange={e => setLlToEmployee(e.target.value)} placeholder='e.g. 50' className={FIELD} />
                        </div>
                      )}

                      {/* Third Party (TP) Section Custom Fields */}
                      {activeCustomFields.filter(f => f.section === 'tp').map(renderDynamicFieldInput)}
                    </div>
                  </FormSection>
                )}
              </div>

              {/* Premium summary – sticky on desktop */}
              <div className='lg:sticky lg:top-4'>
                {result ? (
                  <ResultBox
                    result={result}
                    policyType={policyType}
                    vehicleType={vehicleType}
                    isElectric={isElectric}
                    cc={cc}
                    kwPower={kwPower}
                    idv={idv}
                    ncb={ncb}
                    odDiscount={odDiscount}
                    zone={zone}
                    vehicleAge={vehicleAge}
                    manufacturingYear={manufacturingYear}
                    selectedCategory={selectedCategory}
                    subtype={subtype}
                    gvw={gvw}
                    gstEnabled={true}
                    bundleOdTerm={bundleOdTerm}
                    bundleTpTerm={bundleTpTerm}
                  />
                ) : (
                  <div className='rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center'>
                    <span className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600'>
                      <FaCalculator className='h-5 w-5' />
                    </span>
                    <p className='mt-3 text-sm font-semibold text-slate-800'>Your premium will appear here</p>
                    <p className='mt-1 text-xs text-slate-500'>Select the RTO zone and vehicle age to start.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className='flex items-start justify-center gap-1.5 px-2 text-center text-xs text-slate-500'>
            <FaTriangleExclamation className='mt-0.5 h-3 w-3 shrink-0 text-amber-500' />
            For indicative purposes only. Premiums may vary based on insurer loading, add-ons &amp; discounts. Ref: irdai.gov.in
          </p>
        </main>
      </div>

      {showLlPdModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in'>
          <div className='mx-4 w-80 rounded-xl bg-white p-5 shadow-xl'>
            <p className='mb-3 text-sm font-semibold text-slate-800'>Enter LL to Paid Driver (₹)</p>
            <input
              type='number'
              value={llPdTempValue}
              onChange={e => setLlPdTempValue(e.target.value)}
              placeholder='e.g. 75'
              className='mb-4 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
              autoFocus
            />
            <div className='flex justify-end gap-2'>
              <button onClick={() => setShowLlPdModal(false)} className='rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100'>Cancel</button>
              <button onClick={() => { if (llPdTempValue !== '') setLlPaidDriver(llPdTempValue); setShowLlPdModal(false) }} className='rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-800 hover:to-blue-700'>Apply</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PremiumCalculator
