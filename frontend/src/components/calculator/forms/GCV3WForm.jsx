import { FaGasPump, FaBolt } from 'react-icons/fa6'
import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, IDVSection } from '../SharedFields'

const GCV3WForm = ({
  subtype, setSubtype,
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
  cngKit, setCngKit,
  imt23, setImt23,
  currentYear,
}) => {
  const handleFuelToggle = (electric) => {
    setIsElectric(electric)
    setSubtype(electric ? 'erickshaw_gcv' : 'public')
  }

  const petrolTP = TARIFF.gcv_3w.subtypes.find(st => st.id === 'public').tp
  const electricTP = TARIFF.gcv_3w.subtypes.find(st => st.id === 'erickshaw_gcv').tp

  return (
    <div className='space-y-4'>
      <div>
        <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Fuel Type</label>
        <div className='grid grid-cols-2 gap-2'>
          <button onClick={() => handleFuelToggle(false)} className={`rounded-lg border p-3 text-left transition ${!isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
            <p className='text-sm font-semibold text-slate-900'>
              <FaGasPump className='inline-block h-4 w-4 mr-1 -mt-0.5 text-amber-500' />
              Petrol / Diesel / CNG
            </p>
            <p className='text-xs font-semibold text-blue-600'>TP: ₹{fmt(petrolTP)}</p>
          </button>
          <button onClick={() => handleFuelToggle(true)} className={`rounded-lg border p-3 text-left transition ${isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
            <p className='text-sm font-semibold text-slate-900'>
              <FaBolt className='inline-block h-4 w-4 mr-1 -mt-0.5 text-yellow-500' />
              Electric
            </p>
            <p className='text-xs font-semibold text-blue-600'>TP: ₹{fmt(electricTP)}</p>
          </button>
        </div>
      </div>
      <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B', 'C']} />
        <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
        <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
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
}

export default GCV3WForm
