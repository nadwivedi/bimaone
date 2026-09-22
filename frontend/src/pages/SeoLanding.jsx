import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'
import { TONES, TONE_ORDER } from '../data/features'
import { landingBySlug } from '../data/landingPages'
import usePageMeta, { SITE_URL } from '../hooks/usePageMeta'

const STEP_TONES = ['blue', 'emerald', 'amber']

// One keyword landing page (e.g. /posp-agent-software), driven by data/landingPages.js.
const SeoLanding = ({ slug }) => {
  const page = landingBySlug[slug]

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: page.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: page.nav, item: `${SITE_URL}/${page.slug}` },
        ],
      },
    ],
  }), [page])

  usePageMeta({ title: page.title, description: page.description, path: `/${page.slug}`, jsonLd })

  return (
    <PublicLayout>
      <div className='bg-slate-50'>
        {/* Header */}
        <section className='relative overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 pb-14 pt-10 text-white md:px-8 md:pb-20 md:pt-14'>
          <div className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl' />
          <div className='relative mx-auto max-w-3xl text-center'>
            <nav aria-label='Breadcrumb' className='mb-4 text-xs text-slate-400'>
              <Link to='/' className='hover:text-white'>Home</Link>
              <span className='mx-1.5'>/</span>
              <span className='text-slate-200'>{page.nav}</span>
            </nav>
            <span className='inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>
              {page.badge}
            </span>
            <h1 className='mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl'>{page.h1}</h1>
            <p className='mt-4 text-sm leading-relaxed text-slate-300 md:text-lg'>{page.intro}</p>
            <div className='mt-7 flex flex-col justify-center gap-3 sm:flex-row'>
              <Link
                to='/login'
                className='inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-700 hover:to-blue-600'
              >
                Start Free
                <Icon name='arrow' className='h-4 w-4' />
              </Link>
              <Link
                to='/pricing'
                className='inline-flex items-center justify-center rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20'
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Problems */}
        <section className='px-4 py-12 md:px-8 md:py-16'>
          <div className='mx-auto max-w-6xl'>
            <h2 className='text-center text-2xl font-bold tracking-tight text-slate-900 md:text-3xl'>{page.problemsTitle}</h2>
            <div className='mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-4'>
              {page.problems.map((p) => (
                <div key={p.title} className='rounded-xl border-2 border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-4 md:p-5'>
                  <h3 className='font-bold text-slate-900'>{p.title}</h3>
                  <p className='mt-1 text-sm leading-relaxed text-slate-600'>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className='px-4 pb-12 md:px-8 md:pb-16'>
          <div className='mx-auto max-w-6xl rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 md:p-8'>
            <h2 className='text-2xl font-bold tracking-tight text-slate-900 md:text-3xl'>{page.featuresTitle}</h2>
            <div className='mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:mt-6 md:gap-4'>
              {page.features.map((f, i) => {
                const t = TONES[TONE_ORDER[i % TONE_ORDER.length]]
                return (
                  <div key={f.title} className='rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 md:p-5'>
                    <div className='flex items-start gap-3'>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${t.icon}`}>
                        <Icon name={f.icon} className='h-5 w-5' />
                      </span>
                      <div className='min-w-0'>
                        <h3 className='text-sm font-bold text-slate-900 md:text-base'>{f.title}</h3>
                        <p className='mt-1 text-xs leading-relaxed text-slate-500 md:text-sm'>{f.text}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className='px-4 pb-12 md:px-8 md:pb-16'>
          <div className='mx-auto max-w-6xl'>
            <h2 className='text-center text-2xl font-bold tracking-tight text-slate-900 md:text-3xl'>How it works</h2>
            <ol className='mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-4'>
              {page.steps.map((s, i) => {
                const t = TONES[STEP_TONES[i % STEP_TONES.length]]
                return (
                  <li key={s.title} className={`rounded-xl border-2 bg-gradient-to-r p-4 md:p-5 ${t.card}`}>
                    <div className='flex items-center gap-3'>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${t.icon}`}>{i + 1}</span>
                      <h3 className='font-bold text-slate-900'>{s.title}</h3>
                    </div>
                    <p className='mt-2 text-sm leading-relaxed text-slate-600'>{s.text}</p>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className='px-4 pb-12 md:px-8 md:pb-16'>
          <div className='mx-auto max-w-3xl'>
            <h2 className='mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 md:mb-8 md:text-3xl'>Frequently asked questions</h2>
            <div className='divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
              {page.faqs.map((f, i) => (
                <details key={f.q} className='group px-5 md:px-6' open={i === 0}>
                  <summary className='flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left [&::-webkit-details-marker]:hidden'>
                    <h3 className='text-sm font-semibold text-slate-900 md:text-base'>{f.q}</h3>
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
            {page.note && <p className='mt-4 text-center text-xs text-slate-400'>{page.note}</p>}
          </div>
        </section>

        {/* Related pages */}
        <section className='px-4 pb-12 md:px-8 md:pb-16'>
          <div className='mx-auto max-w-6xl'>
            <h2 className='text-lg font-bold text-slate-900 md:text-xl'>Explore more</h2>
            <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              {page.related.map((s) => landingBySlug[s]).filter(Boolean).map((r) => (
                <Link
                  key={r.slug}
                  to={`/${r.slug}`}
                  className='flex items-center justify-between gap-3 rounded-xl bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:text-blue-700 hover:shadow-md'
                >
                  {r.nav}
                  <Icon name='arrow' className='h-4 w-4 shrink-0' />
                </Link>
              ))}
              <Link
                to='/features'
                className='flex items-center justify-between gap-3 rounded-xl bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:text-blue-700 hover:shadow-md'
              >
                All features
                <Icon name='arrow' className='h-4 w-4 shrink-0' />
              </Link>
            </div>
          </div>
        </section>

        <CtaBanner />
      </div>
    </PublicLayout>
  )
}

export default SeoLanding
