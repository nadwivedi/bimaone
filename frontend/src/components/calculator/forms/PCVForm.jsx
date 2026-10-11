import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, IDVSection } from '../SharedFields'

const PCVForm = ({
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
  geoExtent, setGeoExtent,
  cngKit, setCngKit,
  imt23, setImt23,
  currentYear,
}) => {
  const isElectricSubtype = subtype === 'e_school_bus' || subtype === 'e_other_bus'

  return (
    <div className='space-y-4'>
      <div className='rounded-lg bg-green-50 border border-green-200 px-3 py-2.5'>
        <p className='text-xs font-semibold text-green-800'>BUS & MAXI ≥4W & {'>'}6 Psgr (C2) — TP = Base + (Psgr × Seat Rate)</p>
      </div>
      <div>
        <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Bus Sub-Type</label>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
          {[['school_bus', 'e_school_bus'], ['other_bus', 'e_other_bus']].map(pair =>
            pair.map(id => {
              const st = TARIFF.pcv.subtypes.find(s => s.id === id)
              return (
                <button key={st.id} onClick={() => setSubtype(st.id)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition flex justify-between items-center ${subtype === st.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                  <div>
                    <span className='text-sm font-semibold text-slate-900'>{st.label}</span>
                    <p className='mt-0.5 text-xs text-slate-500'>Base ₹{fmt(st.tpBase)} + ₹{fmt(st.tpPerPsgr)}/psgr</p>
                  </div>
                  {st.isElectric && <span className='text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold'>EV</span>}
                </button>
              )
            })
          )}
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
          <label className='mb-1.5 block text-xs font-semibold text-slate-600'>No. of Passengers (Seating Capacity)</label>
          <input type='number' value={passengers} onChange={e => setPassengers(e.target.value)} placeholder='e.g. 36' min={0}
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
          <p className='mt-1 text-[11px] text-slate-500'>Add OD: ≤18 / 19–36 / 37–60 / {'>'}60 Psgr</p>
        </div>
        <div>
          <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Geographical Ext (₹)</label>
          <select
            value={geoExtent}
            onChange={e => setGeoExtent(e.target.value)}
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
          >
            <option value="0">₹0 – Not Applicable</option>
            <option value="400">₹400 – Extend Coverage</option>
          </select>
        </div>
        {!isElectricSubtype && (
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
        <div>
          <label className='mb-1.5 block text-xs font-semibold text-slate-600'>IMT 23 Cover</label>
          <select
            value={imt23}
            onChange={e => setImt23(e.target.value)}
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer'
          >
            <option value="no">No</option>
            <option value="yes">Yes (+15% OD)</option>
          </select>
        </div>
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

export default PCVForm
