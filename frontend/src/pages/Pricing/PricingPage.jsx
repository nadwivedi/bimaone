import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { PLANS_CONFIG } from '../../config/plansConfig'
import PublicLayout from '../../components/PublicLayout'
import Icon from '../../components/Icon'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const PLANS = PLANS_CONFIG.filter((p) => p.billing === 'yearly')

const FEATURE_ROWS = [
  { label: 'Automated WhatsApp reminders', value: (f) => f.whatsappRenewal },
  { label: 'Unlimited clients & policies', value: (f) => f.clientLimit === 0 },
  { label: 'Your client app', value: (f) => f.clientApp },
  { label: 'Renewal tracking & alerts', value: (f) => f.appNotificationRenewal },
  { label: 'Premium calculator & quotations', value: (f) => f.personalisedQuotation },
  { label: 'Excel import & export', value: (f) => f.excelDownload },
  {
    label: 'AI document upload',
    value: (f) => (f.aiUpload === false ? false : f.aiDocuments > 0 ? `${f.aiDocuments} / month` : 'Unlimited'),
  },
  { label: 'Lead management', value: (f) => f.leadManagement },
  { label: 'Advanced vehicle search', value: (f) => f.advancedVehicleSearch },
  { label: 'RC download', value: (f) => f.rcDownload },
  { label: 'Support', value: (f) => f.support },
]

const Value = ({ value }) => {
  if (value === true) {
    return (
      <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
        <Icon name='check' className='h-3 w-3' strokeWidth={3} />
      </span>
    )
  }
  if (value === false || value == null) {
    return (
      <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
        <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
        </svg>
      </span>
    )
  }
  return <span className='shrink-0 text-sm font-semibold text-slate-900'>{value}</span>
}

const PLAN_TONES = [
  { head: 'from-sky-50 to-blue-50 border-blue-100 text-slate-900' },
  { head: 'from-emerald-50 to-teal-50 border-emerald-100 text-slate-900' },
  { head: 'from-violet-50 to-purple-50 border-violet-100 text-slate-900' },
]

const ASSURANCES = [
  { title: 'Secure payment', text: 'Paid safely through Razorpay', iconName: 'lock', card: 'from-blue-50 to-sky-50 border-blue-200', icon: 'bg-blue-600' },
  { title: 'GST included', text: 'The price you see is what you pay', iconName: 'receipt', card: 'from-emerald-50 to-teal-50 border-emerald-200', icon: 'bg-emerald-600' },
  { title: 'Real support', text: 'Help on WhatsApp and phone', iconName: 'chat', card: 'from-amber-50 to-orange-50 border-amber-200', icon: 'bg-amber-500' },
]

const PricingPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myPlan, setMyPlan] = useState(null)

  useEffect(() => {
    if (!user) return
    axios
      .get(`${API_URL}/api/user-plans/my-plan`, { withCredentials: true })
      .then((res) => setMyPlan(res?.data?.data || null))
      .catch(() => {})
  }, [user])

  const activeKey = myPlan && myPlan.status !== 'expired' ? myPlan.planKey : null
  const myPlanName = PLANS_CONFIG.find((p) => p.id === myPlan?.planKey)?.name || myPlan?.name

  const handleBuy = (plan) => {
    if (!user) {
      toast.info('Please sign in to purchase a plan.')
      navigate('/login')
      return
    }
    navigate(`/subscribe/${plan.id}`)
  }

  const content = (
    <div className='bg-slate-50' style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <section className='relative overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 pb-28 pt-12 text-white md:px-8 md:pb-32 md:pt-16'>
        <div className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl' />
        <div className='relative mx-auto max-w-2xl text-center'>
          <span className='inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>Pricing</span>
          <h1 className='mt-4 text-3xl font-bold tracking-tight md:text-5xl'>Simple yearly plans</h1>
          <p className='mt-3 text-sm text-slate-300 md:text-lg'>One payment for the whole year. No hidden charges. All prices include GST.</p>

          {myPlan && (
            <div className='mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-white/10 px-4 py-2 text-xs ring-1 ring-inset ring-white/20 md:text-sm'>
              <span>Your plan: <span className='font-semibold'>{myPlanName || 'Free'}</span></span>
              <span className='hidden h-3 w-px bg-white/30 sm:block' />
              <span className={myPlan.status === 'expired' ? 'font-semibold text-rose-300' : 'text-slate-300'}>
                {myPlan.status === 'expired' ? 'Expired on ' : 'Valid till '}
                {myPlan.expiryDate ? new Date(myPlan.expiryDate).toLocaleDateString('en-IN') : '—'}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Plans, overlapping the header */}
      <section className='relative z-10 -mt-20 px-4 md:px-8'>
        <div className='mx-auto grid max-w-6xl items-start gap-5 lg:grid-cols-3 lg:gap-6'>
          {PLANS.map((plan, i) => {
            const featured = Boolean(plan.badge)
            const isCurrent = plan.id === activeKey
            const tone = PLAN_TONES[i % PLAN_TONES.length]
            return (
              <div
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/10 ${featured ? 'ring-2 ring-blue-600 lg:-mt-4' : 'ring-1 ring-slate-200'}`}
              >
                <div className={`px-6 pb-6 pt-6 ${featured ? 'bg-gradient-to-br from-blue-700 to-blue-500 text-white' : `border-b-2 bg-gradient-to-r ${tone.head}`}`}>
                  <div className='flex items-center justify-between gap-2'>
                    <h2 className='text-lg font-bold'>{plan.name}</h2>
                    {featured && (
                      <span className='rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ring-white/30'>{plan.badge}</span>
                    )}
                    {isCurrent && !featured && (
                      <span className='rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white'>Current</span>
                    )}
                  </div>
                  <div className='mt-4 flex items-baseline gap-1'>
                    <span className='text-4xl font-bold tracking-tight'>₹{plan.price.toLocaleString('en-IN')}</span>
                    <span className={`text-sm ${featured ? 'text-blue-100' : 'text-slate-500'}`}>/ year</span>
                  </div>
                  <p className={`mt-1 text-xs ${featured ? 'text-blue-100' : 'text-slate-500'}`}>That's about ₹{Math.round(plan.price / 12)} a month</p>

                  {isCurrent ? (
                    <div className={`mt-5 rounded-lg py-3 text-center text-sm font-semibold ${featured ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'}`}>
                      Current plan
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => handleBuy(plan)}
                      className={`mt-5 w-full rounded-lg py-3 text-sm font-semibold transition ${featured ? 'bg-white text-blue-700 shadow-md hover:bg-blue-50' : 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-700/20 hover:from-blue-800 hover:to-blue-700'}`}
                    >
                      Choose {plan.name}
                    </button>
                  )}
                </div>

                <ul className='space-y-3 p-6'>
                  {FEATURE_ROWS.map((row) => {
                    const v = row.value(plan.features)
                    return (
                      <li key={row.label} className='flex items-center justify-between gap-3'>
                        <span className={`text-sm ${v === false ? 'text-slate-400' : 'text-slate-700'}`}>{row.label}</span>
                        <Value value={v} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Reassurance */}
      <section className='px-4 py-12 md:px-8 md:py-16'>
        <div className='mx-auto grid max-w-6xl gap-3 sm:grid-cols-3 md:gap-4'>
          {ASSURANCES.map((a) => (
            <div key={a.title} className={`rounded-xl border-2 bg-gradient-to-r p-4 md:p-5 ${a.card}`}>
              <div className='flex items-center gap-3'>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${a.icon}`}>
                  <Icon name={a.iconName} className='h-5 w-5' />
                </span>
                <div>
                  <p className='text-sm font-bold text-slate-900'>{a.title}</p>
                  <p className='text-xs text-slate-600'>{a.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='mx-auto mt-6 max-w-6xl rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 md:flex md:items-center md:justify-between md:p-6 md:text-left'>
          <div>
            <p className='font-bold text-slate-900'>Not sure which plan is right for you?</p>
            <p className='text-sm text-slate-500'>Tell us how you work and we'll suggest the best plan.</p>
          </div>
          <a
            href='https://wa.me/919202469725'
            target='_blank'
            rel='noopener noreferrer'
            className='mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 md:mt-0'
          >
            <Icon name='chat' className='h-4 w-4' />
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </div>
  )

  return user ? <div className='min-h-screen bg-slate-50'>{content}</div> : <PublicLayout>{content}</PublicLayout>
}

export default PricingPage
