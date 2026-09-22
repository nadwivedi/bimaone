import PublicLayout from '../components/PublicLayout'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'
import { TONES } from '../data/features'
import usePageMeta from '../hooks/usePageMeta'

const numbers = [
  { value: '2020', label: 'Founded', icon: 'star', tone: 'blue' },
  { value: '6+ years', label: 'Serving agents', icon: 'heart', tone: 'emerald' },
  { value: '500+', label: 'Agents on BimaOne', icon: 'users', tone: 'violet' },
]

const problems = [
  'Renewal dates written in diaries and forgotten',
  'Client documents lost in files and phone galleries',
  'Hours spent typing policy details by hand',
  'No clear view of how the business is doing',
]

const values = [
  { icon: 'heart', title: 'Made for agents', description: 'Every screen is designed around how insurance agents actually work.', tone: 'blue' },
  { icon: 'bolt', title: 'Simple to use', description: 'If you can use WhatsApp, you can use BimaOne from day one.', tone: 'emerald' },
  { icon: 'lock', title: 'Safe with us', description: 'Your client data and documents stay secure and private to you.', tone: 'amber' },
  { icon: 'users', title: 'Here to help', description: 'Real people on WhatsApp and phone whenever you need help.', tone: 'violet' },
]

const About = () => {
  usePageMeta({
    title: 'About BimaOne – Insurance Agent Software Since 2020',
    description: 'BimaOne is insurance agent software and insurance management software built in 2020 for Indian insurance agents. Six years of making insurance agents’ work easy.',
    path: '/about',
  })

  return (
  <PublicLayout>
    <div className='bg-slate-50'>
      {/* Header */}
      <section className='relative overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 pb-20 pt-10 text-white md:px-8 md:pb-24 md:pt-14'>
        <div className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl' />
        <div className='relative mx-auto max-w-3xl text-center'>
          <span className='inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>About BimaOne</span>
          <h1 className='mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl'>Insurance agent software, made for insurance agents</h1>
          <p className='mt-4 text-sm leading-relaxed text-slate-300 md:text-lg'>
            BimaOne is insurance management software developed in 2020 with one goal — to make the work of an insurance agent easy. For 6 years we have been serving agents across India.
          </p>
        </div>
      </section>

      {/* Numbers, overlapping the header */}
      <section className='relative z-10 -mt-12 px-4 md:px-8'>
        <div className='mx-auto grid max-w-5xl grid-cols-3 gap-2.5 md:gap-4'>
          {numbers.map((n) => {
            const t = TONES[n.tone]
            return (
              <div key={n.label} className={`rounded-xl border-2 bg-gradient-to-r p-3 shadow-lg shadow-slate-900/5 md:p-5 ${t.card}`}>
                <div className='flex flex-col gap-2 md:flex-row md:items-center md:gap-3'>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white md:h-11 md:w-11 ${t.icon}`}>
                    <Icon name={n.icon} className='h-5 w-5' />
                  </span>
                  <div className='min-w-0'>
                    <p className={`text-lg font-bold leading-none md:text-2xl ${t.text}`}>{n.value}</p>
                    <p className='mt-1 text-[11px] font-semibold text-slate-600 md:text-sm'>{n.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Story + problems */}
      <section className='px-4 py-12 md:px-8 md:py-16'>
        <div className='mx-auto grid max-w-5xl gap-4 md:gap-6 lg:grid-cols-5'>
          <div className='rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-7 lg:col-span-3'>
            <span className='inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200'>Our story</span>
            <h2 className='mt-3 text-xl font-bold text-slate-900 md:text-2xl'>Why we built BimaOne</h2>
            <div className='mt-3 space-y-3 text-sm leading-relaxed text-slate-600 md:text-[15px]'>
              <p>
                An agent's day is full of follow-ups, renewals and paperwork. In 2020 we saw agents managing all of it with diaries,
                paper files and scattered spreadsheets — and losing business simply because a renewal date was missed.
              </p>
              <p>
                So we built one place for every policy, client document and renewal date. Over six years we kept improving it with
                feedback from agents — adding vehicle documents, AI auto entry, premium calculator and WhatsApp reminders.
              </p>
              <p>Today BimaOne helps agents save hours every week, serve clients better and grow with confidence.</p>
            </div>
          </div>

          <div className='rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 md:p-7 lg:col-span-2'>
            <h3 className='flex items-center gap-2 text-base font-bold text-slate-900 md:text-lg'>
              <span className='flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white'>
                <Icon name='check' className='h-4 w-4' strokeWidth={3} />
              </span>
              Problems we solve
            </h3>
            <ul className='mt-4 space-y-2.5'>
              {problems.map((p) => (
                <li key={p} className='flex items-start gap-2.5 rounded-lg bg-white/80 px-3 py-2.5 text-sm text-slate-700 shadow-sm'>
                  <Icon name='check' className='mt-0.5 h-4 w-4 shrink-0 text-emerald-600' strokeWidth={2.5} />
                  {p}
                </li>
              ))}
            </ul>
            <div className='mt-5 flex items-center gap-3 rounded-lg bg-white/80 px-3 py-3 shadow-sm'>
              <div className='text-center'>
                <p className='text-lg font-bold text-blue-700'>2020</p>
                <p className='text-[10px] text-slate-500'>Launched</p>
              </div>
              <div className='h-1 flex-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500' />
              <div className='text-center'>
                <p className='text-lg font-bold text-emerald-700'>Today</p>
                <p className='text-[10px] text-slate-500'>6 years strong</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className='px-4 pb-12 md:px-8 md:pb-16'>
        <div className='mx-auto max-w-5xl'>
          <h2 className='mb-5 text-center text-xl font-bold text-slate-900 md:mb-6 md:text-2xl'>Our promise to every agent</h2>
          <div className='grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4'>
            {values.map((v) => {
              const t = TONES[v.tone]
              return (
                <div key={v.title} className={`rounded-xl border-2 bg-gradient-to-r p-4 md:p-5 ${t.card}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-white md:h-10 md:w-10 ${t.icon}`}>
                    <Icon name={v.icon} className='h-5 w-5' />
                  </span>
                  <h3 className='mt-3 text-sm font-bold text-slate-900 md:text-base'>{v.title}</h3>
                  <p className='mt-1 text-xs leading-relaxed text-slate-600 md:text-sm'>{v.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  </PublicLayout>
  )
}

export default About
