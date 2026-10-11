import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, IDVSection } from '../SharedFields'

const PCV3WForm = ({
  subtype, setSubtype,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  idv, setIdv,
  ncb, setNcb,
  odDiscount, setOdDiscount,
  loadingDiscount, setLoadingDiscount,
  depreciation, setDepreciation,
  coverageType, setCoverageType,
  passengers, setPassengers,
  cngKit, setCngKit,
  currentYear,
}) => {
  const isElectric3W = (subtype || '').startsWith('erickshaw_')

  return (
    <div className='space-y-4'>
      <div>
        <label className='mb-1.5 block text-xs font-semibold text-slate-600'>3W PCV Sub-Type</label>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
          {TARIFF.pcv_3w.subtypes.map(st => (
            <button key={st.id} onClick={() => setSubtype(st.id)}
              className={`rounded-lg border px-3 py-2.5 text-left transition flex justify-between items-center ${subtype === st.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
              <div>
                <span className='text-sm font-semibold text-slate-900'>{st.label}</span>
                <p className='mt-0.5 text-xs text-slate-500'>Base ₹{fmt(st.tpBase)} + ₹{fmt(st.tpPerPsgr)}/psgr</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B', 'C']} />
        <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
        <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
      </div>
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        <div>
          <label className='mb-1.5 block text-xs font-semibold text-slate-600'>No. of Passengers</label>
          <input type='number' value={passengers} onChange={e => setPassengers(e.target.value)} placeholder='e.g. 3' min={0}
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
        </div>
        {!isElectric3W && (
          <div>
            <label className='mb-1.5 block text-xs font-semibold text-slate-600'>CNG/LPG Kit</label>
            <select
              value={cngKit}
              onChange={e => setCngKit(e.target.value)}
              className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
            >
              <option value="no">No</option>
              <option value="yes">Yes (+₹60 TP, +5% OD)</option>
            </select>
          </div>
        )}
      </div>
      <IDVSection
        idv={idv} setIdv={setIdv}
        depreciation={depreciation} setDepreciation={setDepreciation}
        ncb={ncb} setNcb={setNcb}
        odDiscount={odDiscount} setOdDiscount={setOdDiscount}
        loadingDiscount={loadingDiscount} setLoadingDiscount={setLoadingDiscount}
      />
    </div>
  )
}

export default PCV3WForm
