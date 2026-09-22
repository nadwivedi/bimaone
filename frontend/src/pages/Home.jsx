import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import PublicLayout from '../components/PublicLayout'
import Hero from '../components/Hero'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'
import { highlightFeatures } from '../data/features'

const stats = [
  { value: '6+', label: 'Years serving agents' },
  { value: '500+', label: 'Active agents' },
  { value: '10K+', label: 'Documents managed' },
  { value: '98%', label: 'Happy customers' },
]

const steps = [
  { title: 'Add your data', description: 'Upload documents or import your existing Excel sheets in minutes.' },
  { title: 'Let AI fill details', description: 'BimaOne reads documents and fills policy numbers, dates and vehicle details.' },
  { title: 'Never miss a renewal', description: 'Get reminded before expiry and send WhatsApp reminders to clients.' },
]

const Home = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('ref')) {
      navigate(`/login${location.search}`, { replace: true })
    }
  }, [location.search, navigate])

  return (
    <PublicLayout>
      <Hero />

      {/* Stats */}
      <section className='border-b border-slate-100'>
        <div className='mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4 px-4 md:px-8'>
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`py-10 text-center ${i % 2 === 1 ? 'border-l border-slate-100' : ''} ${i > 0 ? 'md:border-l md:border-slate-100' : ''} ${i > 1 ? 'border-t border-slate-100 md:border-t-0' : ''}`}
            >
              <p className='text-3xl font-semibold text-ink'>{s.value}</p>
              <p className='mt-1 text-sm text-slate-500'>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className='px-4 md:px-8 py-20 md:py-24'>
        <div className='mx-auto max-w-6xl'>
          <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12'>
            <div className='max-w-xl'>
              <p className='text-sm font-semibold text-leaf'>Features</p>
              <h2 className='mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink'>
                Built around the daily work of an agent
              </h2>
            </div>
            <Link to='/features' className='inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark'>
              View all features
              <Icon name='arrow' className='h-4 w-4' />
            </Link>
          </div>

          <div className='grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3'>
            {highlightFeatures.map((f) => (
              <div key={f.title} className='bg-white p-7 transition-colors hover:bg-canvas'>
                <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand'>
                  <Icon name={f.icon} className='h-5 w-5' />
                </span>
                <h3 className='mt-5 text-base font-semibold text-ink'>{f.title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-slate-500'>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className='bg-canvas px-4 md:px-8 py-20 md:py-24'>
        <div className='mx-auto max-w-6xl'>
          <div className='max-w-xl mb-12'>
            <p className='text-sm font-semibold text-leaf'>How it works</p>
            <h2 className='mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink'>Get started in three steps</h2>
          </div>
          <ol className='grid gap-6 md:grid-cols-3'>
            {steps.map((s, i) => (
              <li key={s.title} className='rounded-2xl border border-slate-200 bg-white p-7'>
                <span className='text-sm font-semibold text-brand'>Step {i + 1}</span>
                <h3 className='mt-3 text-lg font-semibold text-ink'>{s.title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-slate-500'>{s.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* About teaser */}
      <section className='px-4 md:px-8 py-20 md:py-24'>
        <div className='mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2'>
          <div>
            <p className='text-sm font-semibold text-leaf'>About BimaOne</p>
            <h2 className='mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-ink'>
              Made for insurance agents, by people who understand them
            </h2>
            <p className='mt-5 leading-relaxed text-slate-500'>
              Since 2020, BimaOne has helped insurance agents across India replace diaries, files and scattered
              spreadsheets with one simple app. For six years our only goal has been to make an agent's work easier.
            </p>
            <Link to='/about' className='mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark'>
              Read our story
              <Icon name='arrow' className='h-4 w-4' />
            </Link>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='rounded-2xl bg-brand p-7 text-white'>
              <p className='text-4xl font-semibold'>2020</p>
              <p className='mt-2 text-sm text-blue-100'>Year BimaOne was founded</p>
            </div>
            <div className='rounded-2xl bg-leaf p-7 text-white'>
              <p className='text-4xl font-semibold'>6 yrs</p>
              <p className='mt-2 text-sm text-green-50'>Serving insurance agents</p>
            </div>
            <div className='col-span-2 rounded-2xl border border-slate-200 p-7'>
              <div className='flex items-start gap-4'>
                <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf'>
                  <Icon name='heart' className='h-5 w-5' />
                </span>
                <p className='text-sm leading-relaxed text-slate-600'>
                  Every feature in BimaOne starts with a real problem an agent faces — a missed renewal, a lost
                  document, or hours spent on manual entry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner />
    </PublicLayout>
  )
}

export default Home
