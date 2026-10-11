import { TbGasStation, TbTool, TbWeight, TbWorld } from 'react-icons/tb'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, FuelToggle, NumberField, YesNoField, TariffNote, FieldLabel } from '../SharedFields'
import { SELECT } from '../styles'

const GCVForm = ({
  isElectric, setIsElectric,
  gvw, setGvw,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  coverageType, setCoverageType,
  geoExtent, setGeoExtent,
  cngKit, setCngKit,
  imt23, setImt23,
  currentYear,
}) => (
  <div className='space-y-4'>
    <TariffNote>Public carrier other than 3W (A1) · TP by GVW · extra ₹27 per 100 kg above 12,000 kg</TariffNote>
    <FuelToggle isElectric={isElectric} onChange={setIsElectric} iceLabel='Diesel' />
    <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
    <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
      <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B', 'C']} />
      <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
      <NumberField label='Gross Vehicle Weight (kg)' icon={TbWeight} value={gvw} onChange={setGvw} placeholder='e.g. 8000' hint='≤7.5k / 7.5–12k / 12–20k / 20–40k / >40k' />
      <div>
        <FieldLabel icon={TbWorld}>Geographical Extension</FieldLabel>
        <select value={geoExtent} onChange={e => setGeoExtent(e.target.value)} className={SELECT}>
          <option value='0'>Not applicable</option>
          <option value='400'>₹400 – Extend</option>
        </select>
      </div>
      {!isElectric && <YesNoField label='CNG/LPG Kit' icon={TbGasStation} value={cngKit} onChange={setCngKit} yesLabel='Yes (+₹60 TP, +5% OD)' />}
      {!isElectric && <YesNoField label='IMT 23 Cover' icon={TbTool} value={imt23} onChange={setImt23} yesLabel='Yes (+15% OD)' />}
      <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
    </div>
  </div>
)

export default GCVForm
