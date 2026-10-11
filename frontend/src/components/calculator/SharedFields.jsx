import { useState } from 'react'
import {
  TbGasStation, TbBolt, TbInfoCircle, TbMapPin, TbHourglass, TbCalendar, TbAward, TbDiscount,
  TbTrendingUp, TbTrendingDown, TbFileCertificate, TbShield, TbCalendarTime, TbCurrencyRupee, TbCategory,
} from 'react-icons/tb'
import { LABEL, LABEL_ICON, FIELD, SELECT, HINT } from './styles'
import { fmt } from './helpers'

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }

/* ---------- generic building blocks ---------- */

export const FieldLabel = ({ icon: Icon, children, as: Tag = 'label' }) => (
  <Tag className={LABEL}>
    {Icon && <Icon className={LABEL_ICON} />}
    <span className='truncate'>{children}</span>
  </Tag>
)

export const NumberField = ({ label, icon, hint, value, onChange, placeholder, ...rest }) => (
  <div>
    <FieldLabel icon={icon}>{label}</FieldLabel>
    <input type='number' inputMode='decimal' value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={FIELD} {...rest} />
    {hint && <p className={HINT}>{hint}</p>}
  </div>
)

export const YesNoField = ({ label, icon, value, onChange, yesLabel = 'Yes' }) => (
  <div>
    <FieldLabel icon={icon}>{label}</FieldLabel>
    <select value={value} onChange={e => onChange(e.target.value)} className={SELECT}>
      <option value='no'>No</option>
      <option value='yes'>{yesLabel}</option>
    </select>
  </div>
)

/** Outlined toggle for 2–4 choices. options: [{ value, label, icon?, sub? }] */
export const Segmented = ({ label, icon, options, value, onChange, cols, hint }) => (
  <div>
    {label && <FieldLabel icon={icon} as='p'>{label}</FieldLabel>}
    <div className={`grid gap-1 rounded-lg border border-slate-200 bg-white p-1 ${cols || COLS[options.length]}`}>
      {options.map(o => {
        const active = value === o.value
        return (
          <button
            key={String(o.value)}
            type='button'
            onClick={() => onChange(o.value)}
            className={`flex min-w-0 flex-col items-center justify-center rounded-md px-2 py-1.5 transition ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <span className='flex max-w-full items-center gap-1.5 truncate text-[12px] font-medium sm:text-[13px]'>
              {o.icon}
              {o.label}
            </span>
            {o.sub && <span className={`text-[10px] sm:text-[11px] ${active ? 'text-blue-600' : 'text-slate-400'}`}>{o.sub}</span>}
          </button>
        )
      })}
    </div>
    {hint && <p className={HINT}>{hint}</p>}
  </div>
)

export const FuelToggle = ({ isElectric, onChange, iceLabel = 'Petrol / Diesel / CNG', evLabel = 'Electric', iceSub, evSub }) => (
  <Segmented
    label='Fuel Type'
    icon={TbGasStation}
    value={isElectric}
    onChange={onChange}
    options={[
      { value: false, label: iceLabel, sub: iceSub, icon: <TbGasStation className='h-3.5 w-3.5 shrink-0 text-amber-500' /> },
      { value: true, label: evLabel, sub: evSub, icon: <TbBolt className='h-3.5 w-3.5 shrink-0 text-yellow-500' /> },
    ]}
  />
)

/** Radio-style list for sub-types that carry a tariff note. items: [{ id, title, meta?, aside?, badge? }] */
export const SubtypeList = ({ label, icon = TbCategory, items, value, onChange }) => (
  <div>
    <FieldLabel icon={icon} as='p'>{label}</FieldLabel>
    <div className='grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2'>
      {items.map(it => {
        const active = value === it.id
        return (
          <button
            key={it.id}
            type='button'
            onClick={() => onChange(it.id)}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition ${active ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <span className='flex min-w-0 items-center gap-2.5'>
              <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${active ? 'border-blue-600 bg-blue-600 ring-2 ring-inset ring-white' : 'border-slate-300'}`} />
              <span className='min-w-0'>
                <span className='block truncate text-[13px] font-medium text-slate-900 sm:text-sm'>{it.title}</span>
                {it.meta && <span className='block text-[11px] text-slate-500'>{it.meta}</span>}
              </span>
            </span>
            {it.badge && <span className='shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700'>{it.badge}</span>}
            {it.aside && <span className='shrink-0 text-[11px] font-semibold text-blue-600'>{it.aside}</span>}
          </button>
        )
      })}
    </div>
  </div>
)

/** Soft blue info strip. */
export const TariffNote = ({ children }) => (
  <p className='flex items-start gap-2 rounded-lg bg-blue-50/70 px-3 py-2 text-[11px] leading-snug text-slate-600 sm:text-xs'>
    <TbInfoCircle className='mt-px h-4 w-4 shrink-0 text-blue-600' />
    <span>{children}</span>
  </p>
)

/** Small popup used by the "Other" option of preset dropdowns. */
export const CustomValueModal = ({ title, placeholder, onApply, onClose }) => {
  const [value, setValue] = useState('')
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
      <div className='mx-4 w-80 overflow-hidden rounded-xl bg-white shadow-xl'>
        <div className='p-4'>
          <p className='mb-2 text-sm font-semibold text-slate-800'>{title}</p>
          <input type='number' inputMode='decimal' value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className={FIELD} autoFocus />
        </div>
        <div className='flex justify-end gap-2 bg-gray-50 px-4 py-3'>
          <button type='button' onClick={onClose} className='rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100'>Cancel</button>
          <button
            type='button'
            onClick={() => { if (value !== '') onApply(value); onClose() }}
            className='rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-800 hover:to-blue-700'
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

/** Dropdown of preset values with an "Other" entry that opens CustomValueModal. */
export const PresetSelect = ({ label, icon, value, onChange, presets, format = v => v, modalTitle, modalPlaceholder }) => {
  const [showModal, setShowModal] = useState(false)
  const current = value === undefined || value === null ? '' : String(value)
  const isCustom = current !== '' && !presets.map(p => String(p.value)).includes(current)
  return (
    <div>
      <FieldLabel icon={icon}>{label}</FieldLabel>
      <select
        value={current}
        onChange={e => e.target.value === 'custom' ? setShowModal(true) : onChange(e.target.value)}
        className={SELECT}
      >
        {presets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        {isCustom && <option value={current}>{format(current)}</option>}
        <option value='custom'>Other…</option>
      </select>
      {showModal && <CustomValueModal title={modalTitle} placeholder={modalPlaceholder} onApply={onChange} onClose={() => setShowModal(false)} />}
    </div>
  )
}

const pct = list => list.map(v => ({ value: v, label: `${v || 0}%` }))

/* ---------- calculator fields ---------- */

export const ZoneSelector = ({ zone, setZone, zones = ['A', 'B'] }) => (
  <div>
    <FieldLabel icon={TbMapPin}>RTO Zone</FieldLabel>
    <select value={zone} onChange={e => setZone(e.target.value)} className={SELECT}>
      <option value='' disabled>Select zone</option>
      {zones.map(z => <option key={z} value={z}>Zone {z}</option>)}
    </select>
    {zones.includes('A') && <p className={HINT}>A: Ahmedabad, Bengaluru, Hyderabad, Mumbai, Delhi, Pune</p>}
  </div>
)

export const AgeSelector = ({ vehicleAge, setVehicleAge }) => (
  <div>
    <FieldLabel icon={TbHourglass}>Vehicle Age</FieldLabel>
    <select value={vehicleAge} onChange={e => setVehicleAge(e.target.value)} className={SELECT}>
      <option value='' disabled>Select age</option>
      <option value='upto_5'>1 – 5 Yrs</option>
      <option value='5_to_7'>6 – 7 Yrs</option>
      <option value='above_7'>Above 7 Yrs</option>
    </select>
  </div>
)

export const ManufacturingYearInput = ({ manufacturingYear, setManufacturingYear, currentYear }) => (
  <NumberField label='Year of Manufacture' icon={TbCalendar} value={manufacturingYear} onChange={setManufacturingYear} placeholder={`e.g. ${currentYear - 3}`} min={1990} max={currentYear} />
)

export const NCBSelector = ({ ncb, setNcb }) => (
  <PresetSelect
    label='No Claim Bonus (NCB)'
    icon={TbAward}
    value={ncb ?? 0}
    onChange={v => setNcb(Number(v))}
    presets={pct([0, 20, 25, 35, 45, 50])}
    format={v => `${v}%`}
    modalTitle='Enter NCB %'
    modalPlaceholder='e.g. 30'
  />
)

export const ODDiscountInput = ({ odDiscount, setOdDiscount }) => (
  <div>
    <FieldLabel icon={TbDiscount}>OD Discount (%)</FieldLabel>
    <input
      type='text'
      inputMode='numeric'
      value={odDiscount}
      onChange={e => { const val = e.target.value; if (val === '' || /^\d+$/.test(val)) setOdDiscount(val) }}
      placeholder='e.g. 25'
      className={FIELD}
    />
  </div>
)

export const LoadingDiscountInput = ({ loadingDiscount, setLoadingDiscount }) => (
  <PresetSelect
    label='Loading (%)'
    icon={TbTrendingUp}
    value={loadingDiscount || ''}
    onChange={setLoadingDiscount}
    presets={pct(['', '5', '10', '15', '20', '25', '30'])}
    format={v => `${v}%`}
    modalTitle='Enter Loading %'
    modalPlaceholder='e.g. 8'
  />
)

export const DepreciationInput = ({ depreciation, setDepreciation }) => (
  <PresetSelect
    label='Depreciation'
    icon={TbTrendingDown}
    value={depreciation || ''}
    onChange={setDepreciation}
    presets={pct(['', '5', '10', '15', '20', '25', '30', '40', '50'])}
    format={v => `${v}%`}
    modalTitle='Enter Depreciation %'
    modalPlaceholder='e.g. 12'
  />
)

const POLICIES = [
  { value: 'od', label: 'OD Only', desc: 'Covers damage to own vehicle only' },
  { value: 'tp', label: 'TP Only', desc: 'Mandatory third-party liability only' },
  { value: 'comprehensive', label: 'Comprehensive', desc: 'Own damage + third party (1 year)' },
  { value: 'bundle', label: 'Bundle', desc: 'Long-term third party with own damage' },
]

export const PolicyTypeSelector = ({ policyType, setPolicyType, vehicleType, bundleOdTerm, setBundleOdTerm, bundleTpTerm, setBundleTpTerm }) => {
  const is2W = vehicleType === 'two_wheeler'
  return (
    <div className='space-y-3'>
      <Segmented
        label='Policy Type'
        icon={TbFileCertificate}
        options={POLICIES}
        value={policyType}
        onChange={setPolicyType}
        cols='grid-cols-2 sm:grid-cols-4'
        hint={POLICIES.find(p => p.value === policyType)?.desc}
      />
      {policyType === 'bundle' && (
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <FieldLabel icon={TbCalendarTime}>OD Term</FieldLabel>
            <select value={bundleOdTerm} onChange={e => setBundleOdTerm(e.target.value)} className={SELECT}>
              {(is2W ? [1, 5] : [1, 3]).map(n => <option key={n} value={n}>{n} Year{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel icon={TbCalendarTime}>TP Term</FieldLabel>
            <select value={bundleTpTerm} onChange={e => setBundleTpTerm(e.target.value)} className={SELECT}>
              {(is2W ? [5] : [3]).map(n => <option key={n} value={n}>{n} Years</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export const CoverageSelector = ({ coverageType, setCoverageType }) => (
  <Segmented
    label='Class of Insurance'
    icon={TbShield}
    value={coverageType}
    onChange={setCoverageType}
    options={[
      { value: 'comprehensive', label: 'Comprehensive' },
      { value: 'tp', label: 'Third Party Only' },
    ]}
  />
)

const lakhText = (n) => {
  if (n >= 10000000) return `${+(n / 10000000).toFixed(2)} crore`
  if (n >= 100000) return `${+(n / 100000).toFixed(2)} lakh`
  return ''
}

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
}) => {
  const idvVal = parseFloat(idv) || 0
  const depVal = parseFloat(depreciation) || 0
  const finalIdv = Math.round(idvVal * (1 - depVal / 100))
  return (
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      <div className='col-span-2 md:col-span-1'>
        <FieldLabel icon={TbCurrencyRupee}>IDV (Insured Declared Value)</FieldLabel>
        <input type='number' inputMode='decimal' value={idv} onChange={e => setIdv(e.target.value)} placeholder='e.g. 500000' className={FIELD} />
        {idvVal > 0 && (
          <p className={HINT}>
            ₹{fmt(idvVal)}{lakhText(idvVal) && ` · ${lakhText(idvVal)}`}
            {depVal > 0 && <span className='font-semibold text-emerald-600'> · Final ₹{fmt(finalIdv)}</span>}
          </p>
        )}
      </div>
      <DepreciationInput depreciation={depreciation} setDepreciation={setDepreciation} />
      {showNcb && <NCBSelector ncb={ncb} setNcb={setNcb} />}
      {showOdDiscount && <ODDiscountInput odDiscount={odDiscount} setOdDiscount={setOdDiscount} />}
      <LoadingDiscountInput loadingDiscount={loadingDiscount} setLoadingDiscount={setLoadingDiscount} />
    </div>
  )
}
