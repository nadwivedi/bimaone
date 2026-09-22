import { Link } from 'react-router-dom'
import Icon from './Icon'

const renewals = [
  { initials: 'RS', name: 'Rahul Sharma', doc: 'Motor Policy · CG04 AB 1234', due: 'Due in 3 days', tone: 'amber' },
  { initials: 'PV', name: 'Priya Verma', doc: 'PUC · CG07 KL 5521', due: 'Due in 6 days', tone: 'amber' },
  { initials: 'AS', name: 'Ajay Singh', doc: 'Health Policy', due: 'Renewed', tone: 'green' },
]

const toneCls = {
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-leaf-soft text-leaf-dark',
}

const Hero = () => {
  return (
    <section className='bg-canvas border-b border-slate-100'>
      <div className='mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-2'>
        <div className='text-center lg:text-left'>
          <span className='inline-flex items-center gap-2 rounded-full bg-leaf-soft px-3 py-1 text-xs font-semibold text-leaf-dark'>
            <span className='h-1.5 w-1.5 rounded-full bg-leaf' />
            Trusted by insurance agents since 2020
          </span>
          <h1 className='mt-5 text-4xl md:text-5xl font-semibold leading-[1.15] tracking-tight text-ink'>
            The simple way to run your <span className='text-brand'>insurance</span> <span className='text-leaf'>business</span>
          </h1>
          <p className='mt-5 text-base md:text-lg leading-relaxed text-slate-500 max-w-xl mx-auto lg:mx-0'>
            BimaOne keeps your policies, client documents and renewals in one place — so you never miss a
            renewal and spend less time on paperwork.
          </p>
          <div className='mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3'>
            <Link
              to='/login'
              className='w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark'
            >
              Get Started Free
              <Icon name='arrow' className='h-4 w-4' />
            </Link>
            <Link
              to='/features'
              className='w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-slate-400'
            >
              See All Features
            </Link>
          </div>
          <ul className='mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-slate-500'>
            {['Free plan available', 'No credit card', 'Works on mobile'].map((t) => (
              <li key={t} className='flex items-center gap-1.5'>
                <Icon name='check' className='h-4 w-4 text-leaf' strokeWidth={2.5} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className='relative mx-auto w-full max-w-md lg:max-w-none'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-20px_rgba(11,27,63,0.25)]'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs text-slate-400'>This week</p>
                <p className='text-base font-semibold text-ink'>Upcoming Renewals</p>
              </div>
              <span className='rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand'>12 due</span>
            </div>

            <div className='mt-5 grid grid-cols-3 gap-3'>
              {[
                { label: 'Policies', value: '1,248' },
                { label: 'Renewed', value: '86%' },
                { label: 'Clients', value: '932' },
              ].map((s) => (
                <div key={s.label} className='rounded-xl bg-canvas px-3 py-3'>
                  <p className='text-lg font-semibold text-ink'>{s.value}</p>
                  <p className='text-xs text-slate-400'>{s.label}</p>
                </div>
              ))}
            </div>

            <ul className='mt-5 divide-y divide-slate-100'>
              {renewals.map((r) => (
                <li key={r.name} className='flex items-center justify-between py-3'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand'>
                      {r.initials}
                    </span>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium text-ink'>{r.name}</p>
                      <p className='truncate text-xs text-slate-400'>{r.doc}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${toneCls[r.tone]}`}>{r.due}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className='absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg'>
            <span className='flex h-9 w-9 items-center justify-center rounded-full bg-leaf-soft text-leaf'>
              <Icon name='chat' className='h-5 w-5' />
            </span>
            <div>
              <p className='text-xs font-semibold text-ink'>Reminder sent</p>
              <p className='text-[11px] text-slate-400'>via WhatsApp</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
