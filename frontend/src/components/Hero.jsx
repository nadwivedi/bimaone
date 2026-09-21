import { Link } from 'react-router-dom'

const Hero = () => {
  return (
    <section className='relative pt-16 pb-10 md:pt-20 md:pb-14 px-4 md:px-8 overflow-hidden'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#e0f2fe,_#ffffff_60%)] pointer-events-none' />
      <div className='relative max-w-4xl mx-auto text-center'>
        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-4'>
          <span className='h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse' />
          India's #1 Insurance Agent Software
        </div>
        <h1 className='text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight'>
          What is{' '}
          <span className='bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>BimaOne</span>
          ?
        </h1>
        <p className='text-base md:text-lg text-slate-500 mt-4 max-w-3xl mx-auto leading-relaxed'>
          A powerful software built for insurance agents to digitalize their workflow — track policies, 
          manage encrypted client documents, monitor renewals, analyze profits, and grow your business. 
          No more paper clutter, missed follow-ups, or lost files.
        </p>
        <div className='flex flex-col sm:flex-row items-center justify-center gap-3 mt-8'>
          <Link
            to='/login'
            className='w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95'
          >
            Get Started Free
            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M13 7l5 5m0 0l-5 5m5-5H6' />
            </svg>
          </Link>
          <Link
            to='/contact-us'
            className='w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95'
          >
            Talk to Us
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Hero
