import { Link } from 'react-router-dom'
import Icon from './Icon'

const previewStats = [
  { label: 'Active', value: '1,248', tone: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-600', icon: 'check' },
  { label: 'Expiring', value: '36', tone: 'from-amber-50 to-orange-50 border-amber-200 text-amber-700', dot: 'bg-amber-500', icon: 'clock' },
  { label: 'Expired', value: '12', tone: 'from-rose-50 to-pink-50 border-rose-200 text-rose-700', dot: 'bg-rose-600', icon: 'refresh' },
]

const previewRows = [
  { name: 'Rahul Sharma', plate: 'CG04AB1234', due: 'Expiring (in 3d)', cls: 'text-amber-600' },
  { name: 'Priya Verma', plate: 'CG07KL5521', due: 'Expiring (in 6d)', cls: 'text-amber-600' },
  { name: 'Ajay Singh', plate: 'CG10MN7788', due: 'Expired (2d ago)', cls: 'text-rose-600' },
]

const Hero = () => (
  <section className='relative overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] text-white'>
    <div className='pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl' />
    <div className='pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl' />

    <div className='relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-24 pt-12 md:px-8 md:pb-32 md:pt-20 lg:grid-cols-2 lg:gap-12'>
      <div className='text-center lg:text-left'>
        <span className='inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>
          <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
          Insurance agent software · since 2020
        </span>
        <h1 className='mt-5 text-3xl font-bold leading-tight tracking-tight md:text-5xl'>
          Never miss a renewal.{' '}
          <span className='bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent'>Grow your insurance business.</span>
        </h1>
        <p className='mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg lg:mx-0'>
          BimaOne keeps every policy, client document and renewal date in one place — with AI upload and automatic WhatsApp reminders.
        </p>

        <div className='mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start'>
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

        <ul className='mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-300 lg:justify-start'>
          {['Free plan available', 'No credit card', 'Works on mobile'].map((t) => (
            <li key={t} className='flex items-center gap-1.5'>
              <Icon name='check' className='h-4 w-4 text-emerald-400' strokeWidth={2.5} />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Product preview in the app's own style */}
      <div className='relative mx-auto w-full max-w-md lg:max-w-none'>
        <div className='overflow-hidden rounded-2xl bg-slate-50 shadow-2xl shadow-black/40 ring-1 ring-white/10'>
          <div className='flex items-center justify-between bg-white px-4 py-3 ring-1 ring-slate-200'>
            <img src='/bimaone%20logo.png' alt='' className='h-7 w-auto' />
            <span className='rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700'>Dashboard</span>
          </div>
          <div className='space-y-3 p-3 md:p-4'>
            <div className='grid grid-cols-3 gap-2'>
              {previewStats.map((s) => (
                <div key={s.label} className={`rounded-xl border-2 bg-gradient-to-r p-2.5 ${s.tone}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${s.dot}`}>
                    <Icon name={s.icon} className='h-3.5 w-3.5' strokeWidth={2.5} />
                  </span>
                  <p className='mt-1.5 text-lg font-bold leading-none'>{s.value}</p>
                  <p className='text-[10px] font-semibold text-slate-600'>{s.label}</p>
                </div>
              ))}
            </div>
            <div className='overflow-hidden rounded-xl bg-white ring-1 ring-slate-200'>
              <p className='bg-gradient-to-r from-slate-50 to-blue-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500'>Expiring soon</p>
              <ul className='divide-y divide-slate-100'>
                {previewRows.map((r) => (
                  <li key={r.plate} className='flex items-center justify-between gap-2 px-3 py-2.5'>
                    <div className='min-w-0'>
                      <p className='truncate text-xs font-semibold text-slate-800'>{r.name}</p>
                      <span className='mt-0.5 inline-block rounded border-2 border-slate-800 bg-amber-300 px-1 font-mono text-[9px] font-bold tracking-wider text-slate-900'>{r.plate}</span>
                    </div>
                    <p className={`shrink-0 text-[11px] font-semibold ${r.cls}`}>{r.due}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className='absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-xl sm:flex'>
          <span className='flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
            <Icon name='chat' className='h-5 w-5' />
          </span>
          <div>
            <p className='text-xs font-semibold'>WhatsApp reminder sent</p>
            <p className='text-[11px] text-slate-500'>to Rahul Sharma</p>
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default Hero
