import { useState, useEffect } from 'react'

export const ChevronDown = () => (
  <svg className='pointer-events-none h-4 w-4 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
  </svg>
)

export const IDVInput = ({ idv, setIdv }) => (
  <div>
    <label className='mb-1.5 block text-xs font-semibold text-slate-600'>IDV (₹)</label>
    <input
      type='number'
      value={idv}
      onChange={e => setIdv(e.target.value)}
      placeholder='e.g. 500000'
      className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
    />
  </div>
)

export const ODDiscountInput = ({ odDiscount, setOdDiscount }) => (
  <div>
    <label className='mb-1.5 block text-xs font-semibold text-slate-600'>OD Discount (%)</label>
    <input
      type='text'
      inputMode='numeric'
      value={odDiscount}
      onChange={e => {
        const val = e.target.value
        if (val === '' || /^\d+$/.test(val)) {
          setOdDiscount(val)
        }
      }}
      placeholder='e.g. 25'
      className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
    />
  </div>
)

export const ZoneSelector = ({ zone, setZone, zones = ['A', 'B'] }) => (
  <div>
    <label className='mb-1.5 block text-xs font-semibold text-slate-600'>RTO Zone</label>
    <div className='relative'>
      <select
        value={zone}
        onChange={e => setZone(e.target.value)}
        className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
      >
        <option value='' disabled>Select Zone</option>
        {zones.map(z => (
          <option key={z} value={z}>Zone {z}</option>
        ))}
      </select>
    </div>
    {zones.includes('A') && (
      <p className='mt-1 text-[11px] text-slate-500'>
        Zone A: Ahmedabad, Bengaluru, Hyderabad, Mumbai, Delhi, Pune
      </p>
    )}
  </div>
)

export const AgeSelector = ({ vehicleAge, setVehicleAge }) => (
  <div>
    <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Vehicle Age</label>
    <div className='relative'>
      <select
        value={vehicleAge}
        onChange={e => setVehicleAge(e.target.value)}
        className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
      >
        <option value='' disabled>Select Age</option>
        <option value='upto_5'>1 – 5 Yrs</option>
        <option value='5_to_7'>6 – 7 Yrs</option>
        <option value='above_7'>Above 7 Yrs</option>
      </select>
    </div>
  </div>
)

export const ManufacturingYearInput = ({ manufacturingYear, setManufacturingYear, currentYear }) => (
  <div>
    <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Year of Manufacture</label>
    <input
      type='number'
      value={manufacturingYear}
      onChange={e => setManufacturingYear(e.target.value)}
      placeholder='e.g. 2020'
      min={1990}
      max={currentYear}
      className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
    />
  </div>
)

export const NCBSelector = ({ ncb, setNcb }) => {
  const [showModal, setShowModal] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const presets = [0, 20, 25, 35, 45, 50]
  const isCustom = ncb !== 0 && ncb !== '' && !presets.includes(Number(ncb))

  const handleSelect = (e) => {
    if (e.target.value === 'custom') {
      setTempValue('')
      setShowModal(true)
      return
    }
    setNcb(Number(e.target.value))
  }

  const handleConfirm = () => {
    if (tempValue !== '') setNcb(Number(tempValue))
    setShowModal(false)
  }

  return (
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>No Claim Bonus (NCB)</label>
      <div className='relative'>
        <select
          value={isCustom ? ncb : (ncb ?? 0)}
          onChange={handleSelect}
          className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
        >
          <option value={0}>0%</option>
          <option value={20}>20%</option>
          <option value={25}>25%</option>
          <option value={35}>35%</option>
          <option value={45}>45%</option>
          <option value={50}>50%</option>
          {isCustom && <option value={ncb}>{ncb}%</option>}
          <option value='custom'>Other</option>
        </select>
      </div>

      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in'>
          <div className='mx-4 w-80 rounded-xl bg-white p-5 shadow-xl'>
            <p className='mb-3 text-sm font-semibold text-slate-800'>Enter NCB %</p>
            <input
              type='number'
              value={tempValue}
              onChange={e => setTempValue(e.target.value)}
              placeholder='e.g. 30'
              min={0}
              max={100}
              className='mb-4 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
              autoFocus
            />
            <div className='flex justify-end gap-2'>
              <button onClick={() => setShowModal(false)} className='rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100'>Cancel</button>
              <button onClick={handleConfirm} className='rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-800 hover:to-blue-700'>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const PolicyTypeSelector = ({ policyType, setPolicyType, vehicleType, bundleOdTerm, setBundleOdTerm, bundleTpTerm, setBundleTpTerm }) => {
  const is2W = vehicleType === 'two_wheeler'
  const showBundleOpts = policyType === 'bundle'
  const policies = [
    { id: 'od', label: 'Own Damage (OD)', desc: 'Damages to your own vehicle' },
    { id: 'tp', label: 'Third Party (TP)', desc: 'Mandatory third party liability' },
    { id: 'comprehensive', label: 'Comprehensive', desc: 'Own Damage + Third Party' },
    { id: 'bundle', label: 'Bundle Policy', desc: 'OD + Third Party' },
  ]
  return (
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Policy Type</label>
      <div className='grid gap-2 grid-cols-2 sm:grid-cols-4'>
        {policies.map(p => (
          <button
            key={p.id}
            onClick={() => setPolicyType(p.id)}
            className={`rounded-lg border p-3 text-left transition ${policyType === p.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}
          >
            <p className='text-sm font-semibold text-slate-900'>{p.label}</p>
            <p className='mt-0.5 text-xs text-slate-500 leading-tight'>{p.desc}</p>
          </button>
        ))}
      </div>
      {showBundleOpts && (
        <div className='mt-2 flex gap-3'>
          <div className='flex-1'>
            <label className='mb-1.5 block text-xs font-semibold text-slate-600'>OD Term</label>
            <select value={bundleOdTerm} onChange={e => setBundleOdTerm(e.target.value)}
              className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'>
              {(is2W ? [1,5] : [1,3]).map(n => <option key={n} value={n}>{n} Year{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className='flex-1'>
            <label className='mb-1.5 block text-xs font-semibold text-slate-600'>TP Term</label>
            <select value={bundleTpTerm} onChange={e => setBundleTpTerm(e.target.value)}
              className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'>
              {(is2W ? [5] : [3]).map(n => <option key={n} value={n}>{n} Year{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export const LoadingDiscountInput = ({ loadingDiscount, setLoadingDiscount }) => {
  const [showModal, setShowModal] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const presets = ['', '5', '10', '15', '20', '25', '30']
  const isCustom = loadingDiscount && !presets.includes(String(loadingDiscount))

  const handleSelect = (e) => {
    if (e.target.value === 'custom') {
      setTempValue('')
      setShowModal(true)
      return
    }
    setLoadingDiscount(e.target.value)
  }

  const handleConfirm = () => {
    if (tempValue !== '') setLoadingDiscount(tempValue)
    setShowModal(false)
  }

  return (
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Loading (%)</label>
      <select
        value={isCustom ? loadingDiscount : (loadingDiscount || '')}
        onChange={handleSelect}
        className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
      >
        <option value=''>0%</option>
        <option value='5'>5%</option>
        <option value='10'>10%</option>
        <option value='15'>15%</option>
        <option value='20'>20%</option>
        <option value='25'>25%</option>
        <option value='30'>30%</option>
        {isCustom && <option value={loadingDiscount}>{loadingDiscount}%</option>}
        <option value='custom'>Other</option>
      </select>

      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in'>
          <div className='mx-4 w-80 rounded-xl bg-white p-5 shadow-xl'>
            <p className='mb-3 text-sm font-semibold text-slate-800'>Enter Loading %</p>
            <input
              type='number'
              value={tempValue}
              onChange={e => setTempValue(e.target.value)}
              placeholder='e.g. 8'
              className='mb-4 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
              autoFocus
            />
            <div className='flex justify-end gap-2'>
              <button onClick={() => setShowModal(false)} className='rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100'>Cancel</button>
              <button onClick={handleConfirm} className='rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-800 hover:to-blue-700'>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const DepreciationInput = ({ depreciation, setDepreciation }) => {
  const [showModal, setShowModal] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const presets = ['', '5', '10', '15', '20', '25', '30', '40', '50']
  const isCustom = depreciation && !presets.includes(String(depreciation))

  const handleSelect = (e) => {
    if (e.target.value === 'custom') {
      setTempValue('')
      setShowModal(true)
      return
    }
    setDepreciation(e.target.value)
  }

  const handleConfirm = () => {
    if (tempValue !== '') setDepreciation(tempValue)
    setShowModal(false)
  }

  return (
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Depreciation</label>
      <select
        value={isCustom ? depreciation : (depreciation || '')}
        onChange={handleSelect}
        className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
      >
        <option value=''>0%</option>
        <option value='5'>5%</option>
        <option value='10'>10%</option>
        <option value='15'>15%</option>
        <option value='20'>20%</option>
        <option value='25'>25%</option>
        <option value='30'>30%</option>
        <option value='40'>40%</option>
        <option value='50'>50%</option>
        {isCustom && <option value={depreciation}>{depreciation}%</option>}
        <option value='custom'>Other</option>
      </select>

      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in'>
          <div className='mx-4 w-80 rounded-xl bg-white p-5 shadow-xl'>
            <p className='mb-3 text-sm font-semibold text-slate-800'>Enter Depreciation %</p>
            <input
              type='number'
              value={tempValue}
              onChange={e => setTempValue(e.target.value)}
              placeholder='e.g. 12'
              className='mb-4 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400'
              autoFocus
            />
            <div className='flex justify-end gap-2'>
              <button onClick={() => setShowModal(false)} className='rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100'>Cancel</button>
              <button onClick={handleConfirm} className='rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-800 hover:to-blue-700'>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const CoverageSelector = ({ coverageType, setCoverageType }) => (
  <div>
    <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Class of Insurance</label>
    <div className='grid gap-2 grid-cols-2'>
      {[['comprehensive', 'Comprehensive', 'OD + Third Party'], ['tp', 'Third Party Only', 'Mandatory Only']].map(([val, title, sub]) => (
        <button
          key={val}
          onClick={() => setCoverageType(val)}
          className={`rounded-lg border p-3 text-left transition ${coverageType === val ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}
        >
          <p className='text-sm font-semibold text-slate-900'>{title}</p>
          <p className='mt-0.5 text-xs text-slate-500'>{sub}</p>
        </button>
      ))}
    </div>
  </div>
)

/**
 * IDVSection – IDV | Depreciation | NCB | OD Discount | Loading
 * showNcb / showOdDiscount – pass false to hide (e.g. TP-only policy)
 */
export const IDVSection = ({
  idv, setIdv,
  depreciation, setDepreciation,
  ncb, setNcb,
  odDiscount, setOdDiscount,
  loadingDiscount, setLoadingDiscount,
  showNcb = true,
  showOdDiscount = true,
}) => (
  <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
    <div className='col-span-2 md:col-span-1'>
      <IDVInput idv={idv} setIdv={setIdv} />
      {idv && depreciation && (
        <p className='mt-1 text-xs font-semibold text-emerald-600'>
          Final IDV: ₹{Math.round(parseFloat(idv) * (1 - parseFloat(depreciation) / 100)).toLocaleString('en-IN')}
        </p>
      )}
    </div>
    <DepreciationInput depreciation={depreciation} setDepreciation={setDepreciation} />
    {showNcb && <NCBSelector ncb={ncb} setNcb={setNcb} />}
    {showOdDiscount && <ODDiscountInput odDiscount={odDiscount} setOdDiscount={setOdDiscount} />}
    <LoadingDiscountInput loadingDiscount={loadingDiscount} setLoadingDiscount={setLoadingDiscount} />
  </div>
)
