import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import PublicLayout from '../components/PublicLayout'
import Hero from '../components/Hero'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'
import { highlightFeatures, TONES, TONE_ORDER } from '../data/features'
import usePageMeta from '../hooks/usePageMeta'
import { PAGE_META } from '../data/pageMeta'

const stats = [
  { value: '6+', label: 'Years serving agents', icon: 'star', tone: 'blue' },
  { value: '500+', label: 'Active agents', icon: 'users', tone: 'emerald' },
  { value: '10K+', label: 'Documents managed', icon: 'clipboard', tone: 'amber' },
  { value: '98%', label: 'Happy customers', icon: 'heart', tone: 'violet' },
]

const steps = [
  { title: 'Upload your documents', description: 'Drop a policy PDF or photo, or import your existing Excel sheet in minutes.', tone: 'blue' },
  { title: 'AI fills the details', description: 'Policy number, dates, premium and vehicle details are read and filled for you.', tone: 'emerald' },
  { title: 'Renew on time', description: 'See what expires next and send WhatsApp reminders to clients automatically.', tone: 'amber' },
]

const reasons = [
  { icon: 'chat', title: 'Automated WhatsApp', text: 'Reminders go out before every expiry' },
  { icon: 'chip', title: 'AI upload', text: 'No more typing policy details' },
  { icon: 'lock', title: 'Private & secure', text: 'Only you can see your clients' },
  { icon: 'phone', title: 'Any device', text: 'Phone, tablet or computer' },
]

const faqs = [
  {
    q: 'What is insurance agent software?',
    a: 'Insurance agent software helps agents manage their clients, policies and renewals digitally. BimaOne stores every policy and client document, reminds you before expiry and sends automated WhatsApp reminders to your clients.',
  },
  {
    q: 'How is BimaOne different from other insurance management software?',
    a: 'BimaOne is insurance management software made only for Indian insurance agents. Along with policy and renewal tracking it handles RTO documents (tax, PUC, fitness, permit, GPS), client KYC, leads and premium quotations — all from your phone or computer.',
  },
  {
    q: 'Can BimaOne read my policy PDFs automatically?',
    a: 'Yes. Upload a policy PDF or photo and BimaOne uses AI to fill in the policy number, dates, premium and vehicle details, so you never type them by hand.',
  },
  {
    q: 'Does it send renewal reminders on WhatsApp?',
    a: 'Yes. Automated WhatsApp renewal reminders are included in every plan, so your clients are reminded before their policy or document expires.',
  },
  {
    q: 'How much does BimaOne cost?',
    a: 'Plans start at ₹899 per year, with Standard at ₹1,999 and Premium at ₹4,999 per year. All prices include GST.',
  },
]

const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

const SectionTitle =({ eyebrow, title, subtitle }) => (
  <div className='mx-auto mb-8 max-w-2xl text-center md:mb-12'>
    <span className='inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200'>{eyebrow}</span>
    <h2 className='mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-4xl'>{title}</h2>
    {subtitle && <p className='mt-3 text-sm text-slate-500 md:text-base'>{subtitle}</p>}
  </div>
)

const Home = () => {
  const location = useLocation()
  const navigate = useNavigate()

  usePageMeta({
    ...PAGE_META['/'],
    path: '/',
    jsonLd: HOME_JSON_LD,
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('ref')) {
      navigate(`/login${location.search}`, { replace: true })
    }
  }, [location.search, navigate])

  return (
    <PublicLayout>
      <div className='bg-slate-50'>
        <Hero />

        {/* Stats, overlapping the hero */}
        <section className='relative z-10 -mt-14 px-4 md:-mt-16 md:px-8'>
          <div className='mx-auto grid max-w-6xl grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4'>
            {stats.map((s) => {
              const t = TONES[s.tone]
              return (
                <div key={s.label} className={`rounded-xl border-2 bg-gradient-to-r p-4 shadow-lg shadow-slate-900/5 md:p-5 ${t.card}`}>
                  <div className='flex items-center gap-3'>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white md:h-12 md:w-12 ${t.icon}`}>
                      <Icon name={s.icon} className='h-5 w-5 md:h-6 md:w-6' />
                    </span>
                    <div className='min-w-0'>
                      <p className={`text-2xl font-bold leading-none md:text-3xl ${t.text}`}>{s.value}</p>
                      <p className='mt-1 text-xs font-semibold text-slate-600 md:text-sm'>{s.label}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Features */}
        <section className='px-4 py-16 md:px-8 md:py-24'>
          <div className='mx-auto max-w-6xl'>
            <SectionTitle
              eyebrow='Features'
              title='Insurance management software built for agents'
              subtitle='From policies to renewals to client documents — everything an insurance agent needs, in one app.'
            />
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {highlightFeatures.map((f, i) => {
                const t = TONES[TONE_ORDER[i % TONE_ORDER.length]]
                return (
                  <div key={f.title} className='group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md md:p-6'>
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ${t.icon}`}>
                      <Icon name={f.icon} className='h-5 w-5' />
                    </span>
                    <h3 className='mt-4 text-base font-bold text-slate-900'>{f.title}</h3>
                    <p className='mt-1.5 text-sm leading-relaxed text-slate-500'>{f.description}</p>
                  </div>
                )
              })}
            </div>
            <div className='mt-8 text-center'>
              <Link
                to='/features'
                className='inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700'
              >
                View all features
                <Icon name='arrow' className='h-4 w-4' />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className='bg-white px-4 py-16 md:px-8 md:py-24'>
          <div className='mx-auto max-w-6xl'>
            <SectionTitle eyebrow='How it works' title='Get started in three simple steps' />
            <ol className='grid gap-4 md:grid-cols-3'>
              {steps.map((s, i) => {
                const t = TONES[s.tone]
                return (
                  <li key={s.title} className={`rounded-xl border-2 bg-gradient-to-r p-5 md:p-6 ${t.card}`}>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${t.icon}`}>{i + 1}</span>
                    <h3 className='mt-4 text-lg font-bold text-slate-900'>{s.title}</h3>
                    <p className='mt-1.5 text-sm leading-relaxed text-slate-600'>{s.description}</p>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        {/* Why BimaOne */}
        <section className='px-4 py-16 md:px-8 md:py-24'>
          <div className='mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] p-6 text-white md:p-12'>
            <div className='grid items-center gap-8 lg:grid-cols-2 lg:gap-12'>
              <div>
                <span className='inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>Since 2020</span>
                <h2 className='mt-4 text-2xl font-bold leading-tight md:text-4xl'>Made for insurance agents, by people who understand them</h2>
                <p className='mt-4 text-sm leading-relaxed text-slate-300 md:text-base'>
                  For six years BimaOne has helped agents across India replace diaries, files and scattered spreadsheets with one simple app.
                </p>
                <Link to='/about' className='mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200'>
                  Read our story
                  <Icon name='arrow' className='h-4 w-4' />
                </Link>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                {reasons.map((r) => (
                  <div key={r.title} className='rounded-xl bg-white/10 p-4 ring-1 ring-inset ring-white/15'>
                    <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-white/15'>
                      <Icon name={r.icon} className='h-5 w-5' />
                    </span>
                    <p className='mt-3 text-sm font-semibold'>{r.title}</p>
                    <p className='mt-0.5 text-xs text-slate-300'>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className='px-4 pb-16 md:px-8 md:pb-24'>
          <div className='mx-auto max-w-3xl'>
            <SectionTitle eyebrow='FAQ' title='Questions about our insurance agent software' />
            <div className='divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
              {faqs.map((f, i) => (
                <details key={f.q} className='group px-5 md:px-6' open={i === 0}>
                  <summary className='flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-slate-900 md:text-base [&::-webkit-details-marker]:hidden'>
                    <h3>{f.q}</h3>
                    <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-transform group-open:rotate-45'>
                      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 4v16m8-8H4' />
                      </svg>
                    </span>
                  </summary>
                  <p className='-mt-1 pb-4 text-sm leading-relaxed text-slate-600'>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <CtaBanner />
      </div>
    </PublicLayout>
  )
}

export default Home
