import { useState, useEffect } from 'react'
import {
  TbArrowLeft, TbCalculator, TbShieldCheck, TbPuzzle, TbTruck, TbCirclePlus,
  TbSteeringWheel, TbUserShield, TbUsers, TbShieldHalf, TbBriefcase, TbAdjustmentsHorizontal,
} from 'react-icons/tb'
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
import FormSection from '../components/calculator/FormSection'
import SummaryPanel, { EmptyEstimate } from '../components/calculator/SummaryPanel'
import { ShieldHero } from '../components/calculator/Illustrations'
import { IDVSection, NumberField, PresetSelect, FieldLabel, TariffNote } from '../components/calculator/SharedFields'
import { FIELD, SELECT } from '../components/calculator/styles'

const LL_PD_PRESETS = ['0', '50', '100', '150', '200', '250', '300'].map(v => ({ value: v, label: `₹${v}` }))

/** Add-on cover card: icon + title, with the rate/amount input underneath. */
const AddonCard = ({ icon: Icon, title, sub, suffix, value, onChange, placeholder }) => {
  const active = value !== '' && value !== '0' && value !== undefined
  return (
    <div className={`rounded-xl border bg-white p-2.5 transition sm:p-3 ${active ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}>
      <div className='flex items-center gap-2 sm:gap-2.5'>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
          <Icon className='h-[18px] w-[18px] sm:h-5 sm:w-5' />
        </span>
        <div className='min-w-0'>
          <p className='text-[12px] font-semibold leading-tight text-slate-800 sm:text-[13px]'>{title}</p>
          <p className='truncate text-[10px] text-slate-500 sm:text-[11px]'>{sub}</p>
        </div>
      </div>
      <div className='relative mt-2'>
        <input type='number' inputMode='decimal' min={0} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${FIELD} pr-8`} />
        <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400'>{suffix}</span>
      </div>
    </div>
  )
}

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
    setPaOwnerDriver('')
    setLlToEmployee('')
    setRsa('')
    setGeoExtent('0')
    setCngKit('no')
    setImt23('no')
    setZeroDep('')
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
        <FieldLabel icon={TbAdjustmentsHorizontal}>{displayLabel}</FieldLabel>
        {field.fieldType === 'percent_of_od' ? (
          <select
            value={customFieldValues[field.id] || 'no'}
            onChange={e => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            className={SELECT}
          >
            <option value="no">No</option>
            <option value="yes">{yesOptionText}</option>
          </select>
        ) : (
          <input
            type='number'
            inputMode='decimal'
            value={customFieldValues[field.id] ?? ''}
            onChange={e => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={`e.g. ${field.rate || 0}`}
            className={FIELD}
          />
        )}
      </div>
    )
  }

  // Section numbers follow whichever sections are visible for the chosen policy
  let sectionNo = 2
  const addonStep = !isTpOnly ? ++sectionNo : null
  const liabilityStep = !isOdOnly ? ++sectionNo : null
  const addonCustomFields = activeCustomFields.filter(f => f.section === 'addon' || (!f.section && f.section !== 'tp' && f.section !== 'od'))

  return (
    <div className='min-h-screen bg-[#f4f7fd]'>
      <main className='w-full space-y-3 px-3 pt-3 pb-8 sm:space-y-4 sm:pt-4 lg:px-6 lg:pt-5'>
        {/* Header */}
        <section className='relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-5 sm:py-4 md:px-6'>
          <div className='pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-50 blur-2xl' />
          <div className='relative flex items-center gap-3 sm:gap-4'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-4 ring-blue-50/60 sm:h-16 sm:w-16'>
              <TbCalculator className='h-5 w-5 sm:h-8 sm:w-8' />
            </span>
            <div className='min-w-0 flex-1'>
              <h1 className='text-[17px] font-bold leading-tight text-[#0f1f4b] sm:text-2xl'>Insurance Premium Calculator</h1>
              <p className='mt-0.5 text-[11px] leading-snug text-slate-500 sm:mt-1 sm:text-sm'>
                Get an instant premium estimate as per Indian Motor Tariff. Fill in a few details to see the full breakup.
              </p>
            </div>
            <ShieldHero className='hidden h-24 w-auto shrink-0 sm:block lg:h-28' />
          </div>
        </section>

        <div className='grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_360px]'>
          <div className='space-y-3 sm:space-y-4'>
            {step === 1 && <VehicleTypeGrid handleVehicleSelect={handleVehicleSelect} />}

            {step === 2 && selectedCategory && (
              <>
                <FormSection
                  step={1}
                  tone='blue'
                  title='Vehicle Details'
                  subtitle='Fuel, policy type, zone and vehicle specs'
                  action={(
                    <button
                      onClick={() => { setStep(1); setResult(null) }}
                      className='flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white py-1 pl-1 pr-2 text-left shadow-sm transition hover:border-blue-400 sm:gap-2 sm:pr-3'
                      title='Change vehicle'
                    >
                      {selectedCategory.image
                        ? <img src={selectedCategory.image} alt='' className='h-7 w-7 rounded-md object-contain sm:h-8 sm:w-8' />
                        : <span className='flex h-7 w-7 items-center justify-center'>{selectedCategory.icon}</span>}
                      <span className='hidden text-xs font-semibold text-[#0f1f4b] sm:block'>{selectedCategory.label}</span>
                      <span className='flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 sm:text-xs'>
                        <TbArrowLeft className='h-3 w-3' />Change
                      </span>
                    </button>
                  )}
                >
                  {renderForm()}

                  {/* OD Section Custom Fields */}
                  {activeCustomFields.filter(f => f.section === 'od').length > 0 && (
                    <div className='mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 md:grid-cols-3'>
                      {activeCustomFields.filter(f => f.section === 'od').map(renderDynamicFieldInput)}
                    </div>
                  )}
                </FormSection>

                <FormSection step={2} tone='violet' title='IDV & Discounts' subtitle='Insured value, depreciation, NCB and loading'>
                  <IDVSection
                    idv={idv} setIdv={setIdv}
                    depreciation={depreciation} setDepreciation={setDepreciation}
                    ncb={ncb} setNcb={setNcb}
                    odDiscount={odDiscount} setOdDiscount={setOdDiscount}
                    loadingDiscount={loadingDiscount} setLoadingDiscount={setLoadingDiscount}
                    showNcb={!isTpOnly}
                    showOdDiscount={!isTpOnly}
                  />
                </FormSection>

                {!isTpOnly && (
                  <FormSection step={addonStep} tone='emerald' title='Add-on Covers' subtitle='Optional — enhance the policy with extra protection'>
                    <div className='grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4'>
                      <AddonCard icon={TbShieldCheck} title='Zero Depreciation' sub='Rate on IDV' suffix='%' value={zeroDep} onChange={setZeroDep} placeholder='e.g. 0.2' />
                      <AddonCard icon={TbPuzzle} title='Other Add-ons' sub='Rate on IDV' suffix='%' value={tyreCover} onChange={setTyreCover} placeholder='e.g. 0.1' />
                      <AddonCard icon={TbTruck} title='Roadside Assistance' sub='24/7 support' suffix='₹' value={rsa} onChange={setRsa} placeholder='e.g. 250' />
                      <AddonCard icon={TbCirclePlus} title='Other Add-on' sub='Fixed amount' suffix='₹' value={otherAddon} onChange={setOtherAddon} placeholder='e.g. 500' />
                    </div>
                    {addonCustomFields.length > 0 && (
                      <div className='mt-3 grid grid-cols-2 gap-3 md:grid-cols-3'>
                        {addonCustomFields.map(renderDynamicFieldInput)}
                      </div>
                    )}
                  </FormSection>
                )}

                {!isOdOnly && (
                  <FormSection step={liabilityStep} tone='amber' title='Third Party & Liability' subtitle='Legal liability and personal accident covers'>
                    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
                      <PresetSelect
                        label='LL to Paid Driver'
                        icon={TbSteeringWheel}
                        value={llPaidDriver || '0'}
                        onChange={setLlPaidDriver}
                        presets={LL_PD_PRESETS}
                        format={v => `₹${v}`}
                        modalTitle='Enter LL to Paid Driver (₹)'
                        modalPlaceholder='e.g. 75'
                      />
                      <NumberField label='PA to Owner Driver (₹)' icon={TbUserShield} value={paOwnerDriver} onChange={setPaOwnerDriver} placeholder='e.g. 320' />
                      {(vehicleType === 'private_car' || vehicleType === 'two_wheeler') && (
                        <NumberField label='PA Unnamed Passenger (₹)' icon={TbUsers} value={paUnnamedPassenger} onChange={setPaUnnamedPassenger} placeholder='e.g. 25' />
                      )}
                      <div>
                        <FieldLabel icon={TbShieldHalf}>Restricted TPPD</FieldLabel>
                        <select value={restrictedTPPD} onChange={e => setRestrictedTPPD(e.target.value)} className={SELECT}>
                          <option value="no">No</option>
                          <option value="yes">Yes ({vehicleType === 'gcv' ? '₹200' : vehicleType === 'gcv_3w' ? '₹150' : vehicleType === 'private_car' ? '₹100' : '₹50'}/yr off)</option>
                        </select>
                      </div>
                      {vehicleType !== 'private_car' && vehicleType !== 'two_wheeler' && (
                        <NumberField label='LL to Employee (₹)' icon={TbBriefcase} value={llToEmployee} onChange={setLlToEmployee} placeholder='e.g. 50' />
                      )}

                      {/* Third Party (TP) Section Custom Fields */}
                      {activeCustomFields.filter(f => f.section === 'tp').map(renderDynamicFieldInput)}
                    </div>
                  </FormSection>
                )}
              </>
            )}

            <TariffNote>The premium is indicative and may vary based on insurer loading, add-ons and discounts. Ref: irdai.gov.in</TariffNote>
          </div>

          {/* Premium summary – sticky on desktop */}
          <div className={`lg:sticky lg:top-4 ${step === 1 ? 'hidden lg:block' : ''}`}>
            <SummaryPanel hasResult={!!result}>
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
              ) : <EmptyEstimate />}
            </SummaryPanel>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PremiumCalculator
