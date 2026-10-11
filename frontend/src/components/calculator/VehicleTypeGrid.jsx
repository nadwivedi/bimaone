import VEHICLE_CATEGORIES from './vehicleCategories'

const VehicleTypeGrid = ({ handleVehicleSelect }) => (
  <section className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 md:p-5'>
    <h2 className='text-[13px] font-bold text-slate-900 sm:text-sm'>Select vehicle type</h2>
    <p className='mb-3 text-[11px] text-slate-500 sm:mb-4 sm:text-xs'>Choose the class of vehicle to calculate its premium</p>
    <div className='grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4'>
      {VEHICLE_CATEGORIES.map(v => (
        <button
          key={v.id}
          onClick={() => handleVehicleSelect(v.id)}
          className='group flex flex-col items-center rounded-xl border border-slate-200 bg-white p-2 text-center sm:px-3 sm:pb-3 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md active:scale-[0.98]'
        >
          {v.image
            ? <img src={v.image} alt={v.label} className='h-20 w-20 object-contain sm:h-28 sm:w-28 md:h-32 md:w-32' />
            : <span className='flex h-20 items-center justify-center sm:h-28'>{v.icon}</span>}
          <h3 className='mt-1 text-[13px] font-semibold text-slate-900 sm:text-sm'>{v.label}</h3>
          <p className='mt-0.5 text-[11px] leading-tight text-slate-500 sm:text-xs'>{v.desc}</p>
        </button>
      ))}
    </div>
  </section>
)

export default VehicleTypeGrid
