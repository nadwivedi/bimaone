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
      <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf'>
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
  return <span className='shrink-0 text-sm font-semibold text-ink'>{value}</span>
}

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
    <div className='bg-canvas px-4 md:px-8 py-14 md:py-20 font-poppins text-ink'>
      <div className='mx-auto max-w-6xl'>
        <div className='mx-auto max-w-2xl text-center'>
          <p className='text-sm font-semibold text-leaf'>Pricing</p>
          <h1 className='mt-2 text-3xl md:text-4xl font-semibold tracking-tight'>Simple yearly plans</h1>
          <p className='mt-4 text-slate-500'>One payment for the whole year. No hidden charges. All prices include GST.</p>
        </div>

        {myPlan && (
          <div className='mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm'>
            <span className='text-slate-500'>
              Your plan: <span className='font-semibold text-ink'>{myPlanName || 'Free'}</span>
            </span>
            <span className={myPlan.status === 'expired' ? 'font-semibold text-rose-600' : 'text-slate-500'}>
              {myPlan.status === 'expired' ? 'Expired on ' : 'Valid till '}
              {myPlan.expiryDate ? new Date(myPlan.expiryDate).toLocaleDateString('en-IN') : '—'}
            </span>
          </div>
        )}

        <div className='mt-12 grid gap-6 lg:grid-cols-3'>
          {PLANS.map((plan) => {
            const featured = Boolean(plan.badge)
            const isCurrent = plan.id === activeKey
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl bg-white p-7 ${featured ? 'border-2 border-brand shadow-[0_20px_50px_-24px_rgba(11,63,168,0.45)]' : 'border border-slate-200'}`}
              >
                {featured && (
                  <span className='absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white'>
                    {plan.badge}
                  </span>
                )}
                <h2 className='text-lg font-semibold'>{plan.name}</h2>
                <div className='mt-4 flex items-baseline gap-1'>
                  <span className='text-4xl font-semibold tracking-tight'>₹{plan.price.toLocaleString('en-IN')}</span>
                  <span className='text-sm text-slate-500'>/ year</span>
                </div>
                <p className='mt-1 text-xs text-slate-400'>That's about ₹{Math.round(plan.price / 12)} a month</p>

                {isCurrent ? (
                  <div className='mt-6 rounded-lg border border-leaf/30 bg-leaf-soft py-3 text-center text-sm font-semibold text-leaf-dark'>
                    Current plan
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => handleBuy(plan)}
                    className={`mt-6 rounded-lg py-3 text-sm font-semibold transition-colors ${featured ? 'bg-brand text-white hover:bg-brand-dark' : 'border border-slate-300 text-ink hover:border-brand hover:text-brand'}`}
                  >
                    Choose {plan.name}
                  </button>
                )}

                <ul className='mt-7 space-y-3.5 border-t border-slate-100 pt-6'>
                  {FEATURE_ROWS.map((row) => {
                    const v = row.value(plan.features)
                    return (
                      <li key={row.label} className='flex items-center justify-between gap-3'>
                        <span className={`text-sm ${v === false ? 'text-slate-400' : 'text-slate-600'}`}>{row.label}</span>
                        <Value value={v} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>

        <p className='mt-10 text-center text-sm text-slate-500'>
          Not sure which plan is right for you?{' '}
          <a href='https://wa.me/919202469725' target='_blank' rel='noopener noreferrer' className='font-semibold text-leaf hover:text-leaf-dark'>
            Chat with us on WhatsApp
          </a>
        </p>
      </div>
    </div>
  )

  return user ? <div className='min-h-screen bg-canvas pb-10 lg:pb-0'>{content}</div> : <PublicLayout>{content}</PublicLayout>
}

export default PricingPage
