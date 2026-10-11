import { TbEngine, TbBolt, TbGasStation } from 'react-icons/tb'
import { PolicyTypeSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, FuelToggle, NumberField, YesNoField } from '../SharedFields'

const PrivateCarForm = ({
  isElectric, setIsElectric,
  cc, setCc,
  kwPower, setKwPower,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  policyType, setPolicyType,
  bundleOdTerm, setBundleOdTerm, bundleTpTerm, setBundleTpTerm,
  cngKit, setCngKit,
  vehicleType,
  currentYear,
}) => {
  const ccVal = parseFloat(cc)
  return (
    <div className='space-y-4'>
      <FuelToggle isElectric={isElectric} onChange={setIsElectric} />
      <PolicyTypeSelector policyType={policyType} setPolicyType={setPolicyType} vehicleType={vehicleType} bundleOdTerm={bundleOdTerm} setBundleOdTerm={setBundleOdTerm} bundleTpTerm={bundleTpTerm} setBundleTpTerm={setBundleTpTerm} />
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B']} />
        <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
        {!isElectric ? (
          <NumberField
            label='Engine Capacity (CC)' icon={TbEngine}
            value={cc}
            onChange={setCc}
            placeholder='e.g. 1200'
            min={0}
            hint={!isNaN(ccVal) && cc ? `${ccVal <= 1000 ? '≤1000' : ccVal <= 1500 ? '1001–1500' : '>1500'} CC bracket` : '≤1000 / 1001–1500 / >1500'}
          />
        ) : (
          <NumberField label='Motor Power (KW)' icon={TbBolt} value={kwPower} onChange={setKwPower} placeholder='e.g. 45' hint='<30 / 30–65 / >65 KW' />
        )}
        {!isElectric && <YesNoField label='CNG/LPG Kit' icon={TbGasStation} value={cngKit} onChange={setCngKit} yesLabel='Yes (+₹60 TP, +5% OD)' />}
        <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
      </div>
    </div>
  )
}

export default PrivateCarForm
