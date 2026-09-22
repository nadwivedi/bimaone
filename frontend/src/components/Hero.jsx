import { Link } from 'react-router-dom'
import Icon from './Icon'

const Hero = () => (
  <section className='relative overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] text-white'>
    <div className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl' />
    <div className='pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl' />

    <div className='relative mx-auto max-w-3xl px-4 pb-20 pt-10 text-center md:px-8 md:pb-24 md:pt-14'>
      <span className='inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>
        <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
        Trusted by insurance agents since 2020
      </span>
      <h1 className='mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl'>
        Insurance agent software to{' '}
        <span className='bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent'>never miss a renewal</span>
      </h1>
      <p className='mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-lg'>
        BimaOne is the insurance management software that keeps every policy, client document and renewal in one place — with AI upload and WhatsApp reminders.
      </p>

      <div className='mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row'>
        <Link
          to='/login'
          className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-blue-50 sm:w-auto'
        >
          Get Started Free
          <Icon name='arrow' className='h-4 w-4' />
        </Link>
        <Link
          to='/features'
          className='inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/10 sm:w-auto'
        >
          See All Features
        </Link>
      </div>

      <ul className='mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-slate-300 md:text-sm'>
        {['Free plan available', 'No credit card', 'Works on mobile'].map((t) => (
          <li key={t} className='flex items-center gap-1.5'>
            <Icon name='check' className='h-4 w-4 text-emerald-400' strokeWidth={2.5} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  </section>
)

export default Hero
