import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, SubtypeList, NumberField, YesNoField } from '../SharedFields'

const PCV3WForm = ({
  subtype, setSubtype,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  coverageType, setCoverageType,
  passengers, setPassengers,
  cngKit, setCngKit,
  currentYear,
}) => {
  const isElectric3W = (subtype || '').startsWith('erickshaw_')

  return (
    <div className='space-y-4'>
      <SubtypeList
        label='3W PCV Sub-Type'
        value={subtype}
        onChange={setSubtype}
        items={TARIFF.pcv_3w.subtypes.map(st => ({ id: st.id, title: st.label, meta: `Base ₹${fmt(st.tpBase)} + ₹${fmt(st.tpPerPsgr)}/psgr` }))}
      />
      <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B', 'C']} />
        <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
        <NumberField label='Passengers' value={passengers} onChange={setPassengers} placeholder='e.g. 3' min={0} />
        {!isElectric3W && <YesNoField label='CNG/LPG Kit' value={cngKit} onChange={setCngKit} yesLabel='Yes (+₹60 TP, +5% OD)' />}
        <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
      </div>
    </div>
  )
}

export default PCV3WForm
