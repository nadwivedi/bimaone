import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, FuelToggle, NumberField, YesNoField, TariffNote } from '../SharedFields'

const TaxiForm = ({
  isElectric, setIsElectric,
  cc, setCc,
  kwPower, setKwPower,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  coverageType, setCoverageType,
  passengers, setPassengers,
  cngKit, setCngKit,
  currentYear,
}) => (
  <div className='space-y-4'>
    <TariffNote>Taxi 4W ≤6 passengers (C1 A) · TP = base + passengers × per-seat rate</TariffNote>
    <FuelToggle isElectric={isElectric} onChange={setIsElectric} />
    <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B']} />
      <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
      {!isElectric
        ? <NumberField label='Engine CC' value={cc} onChange={setCc} placeholder='e.g. 1200' hint='≤1000 / 1001–1500 / >1500 CC' />
        : <NumberField label='Motor Power (KW)' value={kwPower} onChange={setKwPower} placeholder='e.g. 40' hint='<30 / 30–65 / >65 KW' />}
      <NumberField label='Passengers (excl. driver)' value={passengers} onChange={setPassengers} placeholder='e.g. 4' min={0} max={6} />
      {!isElectric && <YesNoField label='CNG/LPG Kit' value={cngKit} onChange={setCngKit} yesLabel='Yes (+₹60 TP, +5% OD)' />}
      <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
    </div>
  </div>
)

export default TaxiForm
