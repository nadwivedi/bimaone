import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className='fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 md:px-8'>
      <Link to='/' className='flex items-center gap-1.5'>
        <img src='/bimalogo.png' alt='BimaOne' className='h-[50px] w-auto' />
        <div className='flex flex-col'>
          <span className='text-[20px] font-bold leading-none' style={{ fontFamily: "'Poppins', sans-serif" }}>
            <span className='text-slate-800'>Bima</span><span style={{ color: '#003afd' }}>One</span>
          </span>
          <span className='mt-0.5 text-[6px] font-medium tracking-wide' style={{ color: '#0c1f48', fontFamily: "'Inter', sans-serif" }}>All your policies. One smart place.</span>
        </div>
      </Link>
      <div className='flex items-center gap-3'>
        <Link
          to='/pricing'
          className='hidden sm:inline-flex text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors'
        >
          Pricing
        </Link>
        <Link
          to='/contact-us'
          className='hidden sm:inline-flex text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors'
        >
          Contact
        </Link>
        <Link
          to='/login'
          className='inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95'
        >
          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' />
          </svg>
          Login
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
