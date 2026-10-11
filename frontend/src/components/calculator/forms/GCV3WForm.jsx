import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, FuelToggle, YesNoField } from '../SharedFields'

const GCV3WForm = ({
  setSubtype,
  isElectric, setIsElectric,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
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
      <FuelToggle isElectric={isElectric} onChange={handleFuelToggle} iceSub={`TP ₹${fmt(petrolTP)}`} evSub={`TP ₹${fmt(electricTP)}`} />
      <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B', 'C']} />
        <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
        {!isElectric && <YesNoField label='CNG/LPG Kit' value={cngKit} onChange={setCngKit} yesLabel='Yes (+₹60 TP, +5% OD)' />}
        {!isElectric && <YesNoField label='IMT 23 Cover' value={imt23} onChange={setImt23} yesLabel='Yes (+15% OD)' />}
        <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
      </div>
    </div>
  )
}

export default GCV3WForm
