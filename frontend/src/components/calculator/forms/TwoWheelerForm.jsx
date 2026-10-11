import { TbEngine, TbBolt } from 'react-icons/tb'
import { PolicyTypeSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, FuelToggle, NumberField } from '../SharedFields'

const TwoWheelerForm = ({
  isElectric, setIsElectric,
  cc, setCc,
  kwPower, setKwPower,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  policyType, setPolicyType,
  bundleOdTerm, setBundleOdTerm, bundleTpTerm, setBundleTpTerm,
  vehicleType,
  currentYear,
}) => (
  <div className='space-y-4'>
    <FuelToggle isElectric={isElectric} onChange={setIsElectric} iceLabel='Petrol / CNG' />
    <PolicyTypeSelector policyType={policyType} setPolicyType={setPolicyType} vehicleType={vehicleType} bundleOdTerm={bundleOdTerm} setBundleOdTerm={setBundleOdTerm} bundleTpTerm={bundleTpTerm} setBundleTpTerm={setBundleTpTerm} />
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B']} />
      <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
      {!isElectric
        ? <NumberField label='Engine Capacity (CC)' icon={TbEngine} value={cc} onChange={setCc} placeholder='e.g. 125' hint='≤75 / 76–150 / 151–350 / >350 CC' />
        : <NumberField label='Motor Power (KW)' icon={TbBolt} value={kwPower} onChange={setKwPower} placeholder='e.g. 5' hint='<3 / 3–7 / 7–16 / >16 KW' />}
      <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
    </div>
  </div>
)

export default TwoWheelerForm
