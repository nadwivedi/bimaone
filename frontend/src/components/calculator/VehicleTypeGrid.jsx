import VEHICLE_CATEGORIES from './vehicleCategories'

const VehicleTypeGrid = ({ handleVehicleSelect }) => (
  <section className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5'>
    <h2 className='text-sm font-bold text-slate-900'>Select vehicle type</h2>
    <p className='mb-4 text-xs text-slate-500'>Choose the class of vehicle to calculate its premium</p>
    <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
      {VEHICLE_CATEGORIES.map(v => (
        <button
          key={v.id}
          onClick={() => handleVehicleSelect(v.id)}
          className='group flex flex-col items-center rounded-xl border border-slate-200 bg-white px-3 pb-3 pt-2 text-center transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md active:scale-[0.98]'
        >
          {v.image
            ? <img src={v.image} alt={v.label} className='h-24 w-24 object-contain sm:h-28 sm:w-28 md:h-32 md:w-32' />
            : <span className='flex h-24 items-center justify-center'>{v.icon}</span>}
          <h3 className='mt-1 text-sm font-semibold text-slate-900'>{v.label}</h3>
          <p className='mt-0.5 text-xs text-slate-500'>{v.desc}</p>
        </button>
      ))}
    </div>
  </section>
)

export default VehicleTypeGrid
