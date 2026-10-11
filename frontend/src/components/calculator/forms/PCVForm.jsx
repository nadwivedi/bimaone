import { TbGasStation, TbTool, TbUsers, TbWorld, TbBus } from 'react-icons/tb'
import TARIFF from '../tariffData'
import { fmt } from '../helpers'
import { CoverageSelector, ZoneSelector, ManufacturingYearInput, AgeSelector, SubtypeList, NumberField, YesNoField, TariffNote, FieldLabel } from '../SharedFields'
import { SELECT } from '../styles'

const BUS_ORDER = ['school_bus', 'e_school_bus', 'other_bus', 'e_other_bus']

const PCVForm = ({
  subtype, setSubtype,
  zone, setZone,
  manufacturingYear, setManufacturingYear,
  vehicleAge, setVehicleAge,
  coverageType, setCoverageType,
  passengers, setPassengers,
  geoExtent, setGeoExtent,
  cngKit, setCngKit,
  imt23, setImt23,
  currentYear,
}) => {
  const isElectricSubtype = subtype === 'e_school_bus' || subtype === 'e_other_bus'

  return (
    <div className='space-y-4'>
      <TariffNote>Bus &amp; Maxi ≥4W &amp; &gt;6 passengers (C2) · TP = base + passengers × seat rate</TariffNote>
      <SubtypeList
        label='Bus Sub-Type' icon={TbBus}
        value={subtype}
        onChange={setSubtype}
        items={BUS_ORDER.map(id => {
          const st = TARIFF.pcv.subtypes.find(s => s.id === id)
          return { id: st.id, title: st.label, meta: `Base ₹${fmt(st.tpBase)} + ₹${fmt(st.tpPerPsgr)}/psgr`, badge: st.isElectric ? 'EV' : null }
        })}
      />
      <CoverageSelector coverageType={coverageType} setCoverageType={setCoverageType} />
      <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
        <ZoneSelector zone={zone} setZone={setZone} zones={['A', 'B', 'C']} />
        <AgeSelector vehicleAge={vehicleAge} setVehicleAge={setVehicleAge} />
        <NumberField label='Seating Capacity' icon={TbUsers} value={passengers} onChange={setPassengers} placeholder='e.g. 36' min={0} hint='Add. OD: ≤18 / 19–36 / 37–60 / >60' />
        <div>
          <FieldLabel icon={TbWorld}>Geographical Extension</FieldLabel>
          <select value={geoExtent} onChange={e => setGeoExtent(e.target.value)} className={SELECT}>
            <option value='0'>Not applicable</option>
            <option value='400'>₹400 – Extend</option>
          </select>
        </div>
        {!isElectricSubtype && <YesNoField label='CNG/LPG Kit' icon={TbGasStation} value={cngKit} onChange={setCngKit} yesLabel='Yes (+₹60 TP, +5% OD)' />}
        <YesNoField label='IMT 23 Cover' icon={TbTool} value={imt23} onChange={setImt23} yesLabel='Yes (+15% OD)' />
        <ManufacturingYearInput manufacturingYear={manufacturingYear} setManufacturingYear={setManufacturingYear} currentYear={currentYear} />
      </div>
    </div>
  )
}

export default PCVForm
