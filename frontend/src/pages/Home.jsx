import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Footer from '../components/Footer'

const features = [
  {
    icon: (
      <svg className='h-6 w-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
      </svg>
    ),
    title: 'Insurance Tracking',
    description: 'Keep all your vehicle insurance policies in one place with expiry alerts and renewal reminders.',
  },
  {
    icon: (
      <svg className='h-6 w-6 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
      </svg>
    ),
    title: 'Document Management',
    description: 'Manage tax, PUC, fitness, GPS, and permits digitally. No more paper clutter or missed renewals.',
  },
  {
    icon: (
      <svg className='h-6 w-6 text-purple-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
      </svg>
    ),
    title: 'AI-Powered Upload',
    description: 'Upload documents and let AI extract details automatically. Fast, accurate, and hassle-free.',
  },
  {
    icon: (
      <svg className='h-6 w-6 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
      </svg>
    ),
    title: 'Expiry Alerts',
    description: 'Get smart notifications before your documents expire. Never miss a renewal deadline again.',
  },
    {
      icon: (
        <svg className='h-6 w-6 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
        </svg>
      ),
      title: 'WhatsApp Alerts',
      description: 'Automated renewal reminders and notifications sent directly to your clients via WhatsApp. Never miss a follow-up.',
    },
    {
      icon: (
        <svg className='h-6 w-6 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' />
        </svg>
      ),
      title: 'Auto AI Entry',
      description: 'Upload any document and let AI auto-extract all details in seconds. No manual data entry needed.',
    },
]

const stats = [
  { label: 'Documents Tracked', value: '10K+' },
  { label: 'Active Users', value: '500+' },
  { label: 'Vehicles Managed', value: '3K+' },
  { label: 'Happy Customers', value: '98%' },
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
    <div className='min-h-screen bg-white'>
      <Navbar />

      <Hero />

      {/* Stats Strip */}
      <section className='border-y border-slate-100 bg-slate-50/50'>
        <div className='max-w-5xl mx-auto px-4 md:px-8 py-8'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
            {stats.map((stat) => (
              <div key={stat.label} className='text-center'>
                <p className='text-2xl md:text-3xl font-black text-slate-900'>{stat.value}</p>
                <p className='text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1'>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className='py-20 md:py-28 px-4 md:px-8'>
        <div className='max-w-5xl mx-auto'>
          <div className='text-center mb-14'>
            <h2 className='text-3xl md:text-4xl font-black text-slate-900'>Everything You Need</h2>
            <p className='text-slate-500 mt-3 max-w-xl mx-auto'>
              From insurance to permits, BimaOne simplifies every aspect of vehicle document management.
            </p>
          </div>
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {features.map((feature) => (
              <div
                key={feature.title}
                className='group rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200'
              >
                <div className='h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors mb-4'>
                  {feature.icon}
                </div>
                <h3 className='text-base font-bold text-slate-900 mb-2'>{feature.title}</h3>
                <p className='text-sm text-slate-500 leading-relaxed'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20 px-4 md:px-8 bg-gradient-to-b from-slate-50 to-white'>
        <div className='max-w-3xl mx-auto text-center'>
          <h2 className='text-3xl md:text-4xl font-black text-slate-900'>Ready to Simplify Your Vehicle Management?</h2>
          <p className='text-slate-500 mt-4 max-w-lg mx-auto'>
            Join hundreds of users who trust BimaOne to keep their vehicle documents organized and never miss a renewal.
          </p>
          <Link
            to={`/login${location.search}`}
            className='inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold text-base mt-8 hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-95'
          >
            Get Started Free
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M13 7l5 5m0 0l-5 5m5-5H6' />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Home
