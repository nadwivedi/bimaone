import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, SubtypeList, TariffNote } from '../SharedFields'

const MiscDForm = ({
  subtype, setSubtype,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  coverageType, setCoverageType,
  currentYear,
}) => (
  <div className='space-y-4'>
    <TariffNote>Misc-D class · OD rate 1.05% of IDV</TariffNote>
    <SubtypeList
      label='Vehicle Category'
      value={subtype}
      onChange={setSubtype}
      items={TARIFF.misc_d.subtypes.map(st => ({ id: st.id, title: st.label, aside: `TP ₹${fmt(st.tp)}` }))}
    />
    <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      <ZoneSelector zone={zone} setZone={setZone} zones={['C', 'B', 'A']} />
      <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
      <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
    </div>
  </div>
)

export default MiscDForm
