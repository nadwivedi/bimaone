import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, IDVSection } from '../SharedFields'

const MiscDForm = ({
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
  imt23, setImt23,
  currentYear,
}) => (
  <div className='space-y-4'>
    <div className='rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5'>
      <p className='text-xs font-semibold text-slate-800'>Misc-D Class — OD Rate: 1.05% of IDV</p>
    </div>
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Vehicle Category</label>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
        {TARIFF.misc_d.subtypes.map(st => (
          <button key={st.id} onClick={() => setSubtype(st.id)}
            className={`rounded-lg border px-3 py-2.5 text-left transition flex justify-between items-center ${subtype === st.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
            <span className='text-sm font-semibold text-slate-900'>{st.label}</span>
            <span className='text-xs font-semibold text-blue-600'>TP: ₹{fmt(st.tp)}</span>
          </button>
        ))}
      </div>
    </div>
    <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      <ZoneSelector zone={zone} setZone={setZone} zones={['C', 'B', 'A']} />
      <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
      <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
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

export default MiscDForm
