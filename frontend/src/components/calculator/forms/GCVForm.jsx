import { FaGasPump, FaBolt } from 'react-icons/fa6'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, IDVSection } from '../SharedFields'

const GCVForm = ({
  isElectric, setIsElectric,
  gvw, setGvw,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  idv, setIdv,
  ncb, setNcb,
  odDiscount, setOdDiscount,
  loadingDiscount, setLoadingDiscount,
  depreciation, setDepreciation,
  coverageType, setCoverageType,
  geoExtent, setGeoExtent,
  cngKit, setCngKit,
  imt23, setImt23,
  currentYear,
}) => (
  <div className='space-y-4'>
    <div className='rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5'>
      <p className='text-xs font-semibold text-amber-800'>GCV – Public Carriers Other Than 3W (A1)</p>
      <p className='mt-0.5 text-xs text-amber-700'>Zone A/B/C | GVW based TP | Extra ₹27/100 Kg above 12,000 Kg</p>
    </div>
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Fuel Type</label>
      <div className='grid grid-cols-2 gap-2'>
        <button onClick={() => setIsElectric(false)} className={`rounded-lg border p-3 text-left transition ${!isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
          <p className='text-sm font-semibold text-slate-900'>
            <FaGasPump className='inline-block h-4 w-4 mr-1 -mt-0.5 text-amber-500' />
            Diesel GCV
          </p>
        </button>
        <button onClick={() => setIsElectric(true)} className={`rounded-lg border p-3 text-left transition ${isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
          <p className='text-sm font-semibold text-slate-900'>
            <FaBolt className='inline-block h-4 w-4 mr-1 -mt-0.5 text-yellow-500' />
            Electric GCV
          </p>
        </button>
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
        <label className='mb-1.5 block text-xs font-semibold text-slate-600'>GVW (Gross Vehicle Weight in Kg)</label>
        <input type='number' value={gvw} onChange={e => setGvw(e.target.value)} placeholder='e.g. 8000'
          className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
        <p className='mt-1 text-[11px] text-slate-500'>≤7500 / 7501–12000 / 12001–20000 / 20001–40000 / {'>'}40000</p>
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
      {!isElectric && (
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

export default GCVForm
