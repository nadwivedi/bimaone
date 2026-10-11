import VEHICLE_CATEGORIES from './vehicleCategories'
import FormSection from './FormSection'

const VehicleTypeGrid = ({ handleVehicleSelect }) => (
  <FormSection step={1} tone='blue' title='Choose Vehicle Type' subtitle='Select the class of vehicle to calculate its premium'>
    <div className='grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4'>
      {VEHICLE_CATEGORIES.map(v => (
        <button
          key={v.id}
          onClick={() => handleVehicleSelect(v.id)}
          className='group flex flex-col items-center rounded-xl border border-slate-200 bg-white p-2 text-center transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md active:scale-[0.98] sm:px-3 sm:pb-3'
        >
          {v.image
            ? <img src={v.image} alt={v.label} className='h-20 w-20 object-contain sm:h-28 sm:w-28 md:h-32 md:w-32' />
            : <span className='flex h-20 items-center justify-center sm:h-28'>{v.icon}</span>}
          <h3 className='mt-1 text-[13px] font-semibold text-[#0f1f4b] sm:text-sm'>{v.label}</h3>
          <p className='mt-0.5 text-[11px] leading-tight text-slate-500 sm:text-xs'>{v.desc}</p>
        </button>
      ))}
    </div>
  </FormSection>
)

export default VehicleTypeGrid
