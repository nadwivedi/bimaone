import { FaGasPump, FaBolt } from 'react-icons/fa6'
import { PolicyTypeSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, IDVSection } from '../SharedFields'

const TwoWheelerForm = ({
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
  policyType, setPolicyType,
  bundleOdTerm, setBundleOdTerm, bundleTpTerm, setBundleTpTerm,
  vehicleType,
  currentYear,
}) => (
  <div className='space-y-4'>
    <div>
      <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Vehicle Type</label>
      <div className='grid grid-cols-2 gap-2'>
        <button onClick={() => setIsElectric(false)} className={`rounded-lg border p-3 text-left transition ${!isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
          <p className='text-sm font-semibold text-slate-900'>
            <FaGasPump className='inline-block h-4 w-4 mr-1 -mt-0.5 text-amber-500' />
            Petrol / CNG
          </p>
          <p className='mt-0.5 text-xs text-slate-500'>ICE Vehicle</p>
        </button>
        <button onClick={() => setIsElectric(true)} className={`rounded-lg border p-3 text-left transition ${isElectric ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
          <p className='text-sm font-semibold text-slate-900'>
            <FaBolt className='inline-block h-4 w-4 mr-1 -mt-0.5 text-yellow-500' />
            Electric
          </p>
          <p className='mt-0.5 text-xs text-slate-500'>EV / E-Scooter</p>
        </button>
      </div>
    </div>

    {!isElectric ? (
      <>
        <PolicyTypeSelector policyType={policyType} setPolicyType={setPolicyType} vehicleType={vehicleType} bundleOdTerm={bundleOdTerm} setBundleOdTerm={setBundleOdTerm} bundleTpTerm={bundleTpTerm} setBundleTpTerm={setBundleTpTerm} />
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
          <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B']} />
          <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
          <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
          <div>
            <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Engine CC</label>
            <input type='number' value={cc} onChange={e => setCc(e.target.value)} placeholder='e.g. 125'
              className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
            <p className='mt-1 text-[11px] text-slate-500'>≤75 / 76–150 / 151–350 / {'>'}350 CC</p>
          </div>
        </div>
        <IDVSection
          idv={idv} setIdv={setIdv}
          depreciation={depreciation} setDepreciation={setDepreciation}
          ncb={ncb} setNcb={setNcb}
          odDiscount={odDiscount} setOdDiscount={setOdDiscount}
          loadingDiscount={loadingDiscount} setLoadingDiscount={setLoadingDiscount}
          showNcb={policyType !== 'tp'}
          showOdDiscount={policyType !== 'tp'}
        />
      </>
    ) : (
      <>
        <PolicyTypeSelector policyType={policyType} setPolicyType={setPolicyType} vehicleType={vehicleType} bundleOdTerm={bundleOdTerm} setBundleOdTerm={setBundleOdTerm} bundleTpTerm={bundleTpTerm} setBundleTpTerm={setBundleTpTerm} />
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
          <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B']} />
          <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
          <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
          <div>
            <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Motor Power (KW)</label>
            <input type='number' value={kwPower} onChange={e => setKwPower(e.target.value)} placeholder='e.g. 5'
              className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400' />
            <p className='mt-1 text-[11px] text-slate-500'>Brackets: &lt;3 / 3–7 / 7–16 / {'>'}16 KW</p>
          </div>
        </div>
        <IDVSection
          idv={idv} setIdv={setIdv}
          depreciation={depreciation} setDepreciation={setDepreciation}
          ncb={ncb} setNcb={setNcb}
          odDiscount={odDiscount} setOdDiscount={setOdDiscount}
          loadingDiscount={loadingDiscount} setLoadingDiscount={setLoadingDiscount}
          showNcb={policyType !== 'tp'}
          showOdDiscount={policyType !== 'tp'}
        />
      </>
    )}
  </div>
)

export default TwoWheelerForm
