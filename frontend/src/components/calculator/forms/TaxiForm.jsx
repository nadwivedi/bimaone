import { FaGasPump, FaBolt } from 'react-icons/fa6'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, IDVSection } from '../SharedFields'

const TaxiForm = ({
  isElectric, setIsElectric,
  cc, setCc,
  kwPower, setKwPower,
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
}) => (
  <div className='space-y-4'>
    <div className='rounded-lg bg-red-50 border border-red-200 px-3 py-2.5'>
      <p className='text-xs font-semibold text-red-800'>Taxi 4W ≤6 Psgr (C1 A) — TP = Base + (Psgr × Per-Seat Rate)</p>
    </div>
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Fuel Type</label>
      <div className='grid grid-cols-2 gap-2'>
        <button onClick={() => setIsElectric(false)} className={`rounded-lg border p-3 text-left transition ${!isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
          <p className='text-sm font-semibold text-slate-900'>
            <FaGasPump className='inline-block h-4 w-4 mr-1 -mt-0.5 text-amber-500' />
            Petrol / CNG / Diesel
          </p>
        </button>
        <button onClick={() => setIsElectric(true)} className={`rounded-lg border p-3 text-left transition ${isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
          <p className='text-sm font-semibold text-slate-900'>
            <FaBolt className='inline-block h-4 w-4 mr-1 -mt-0.5 text-yellow-500' />
            Electric Taxi
          </p>
        </button>
      </div>
    </div>
    <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B']} />
      <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
      <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
    </div>
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      {!isElectric ? (
        <div>
          <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Engine CC</label>
          <input type='number' value={cc} onChange={e => setCc(e.target.value)} placeholder='e.g. 1200'
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
          <p className='mt-1 text-[11px] text-slate-500'>≤1000 / 1001–1500 / {'>'}1500 CC</p>
        </div>
      ) : (
        <div>
          <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Motor Power (KW)</label>
          <input type='number' value={kwPower} onChange={e => setKwPower(e.target.value)} placeholder='e.g. 40'
            className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
          <p className='mt-1 text-[11px] text-slate-500'>&lt;30 / 30–65 / {'>'}65 KW</p>
        </div>
      )}
      <div>
        <label className='mb-1.5 block text-xs font-semibold text-slate-600'>No. of Passengers (excl. driver)</label>
        <input type='number' value={passengers} onChange={e => setPassengers(e.target.value)} placeholder='e.g. 4' min={0} max={6}
          className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
      </div>
      {!isElectric && (
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

export default TaxiForm
