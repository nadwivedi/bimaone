import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { openRazorpayCheckout } from '../../utils/razorpay'
import { PLANS_CONFIG } from '../../config/plansConfig'
import useCurrentPlan from '../../hooks/useCurrentPlan'
import {
  DURATION_OPTIONS,
  computePlanPrice,
  computeDurationDays,
  formatINR,
} from '../../utils/planPricing'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const SubscribePage = () => {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { resetCache } = useCurrentPlan()
  const [duration, setDuration] = useState(3)
  const [purchasing, setPurchasing] = useState(false)

  const plan = PLANS_CONFIG.find((p) => p.id === planId) || null
  const yearly = plan?.billing === 'yearly'
  const quarterly = computePlanPrice(plan, duration)
  const { base, gross, discount, net, savings } = yearly
    ? { base: plan.price, gross: plan.price, discount: 0, net: plan.price, savings: 0 }
    : quarterly
  const isAnnual = !yearly && duration === 12
  const durationDays = yearly ? plan.durationDays : computeDurationDays(duration)

  const handlePay = async () => {
    if (!plan) return

    setPurchasing(true)
    try {
      const orderRes = await axios.post(
        `${API_URL}/api/payment/create-order`,
        { planKey: plan.id, durationMonths: yearly ? 12 : duration },
        { withCredentials: true }
      )

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.message || 'Failed to create payment order')
      }

      const { order_id, amount, currency, key_id } = orderRes.data

      openRazorpayCheckout({
        order_id,
        amount,
        currency,
        key_id,
        name: 'BimaOne',
        description: yearly ? `${plan.name} 1-Year Subscription` : `${plan.name} ${duration}-Month Subscription`,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        onSuccess: async (paymentResponse) => {
          try {
            const verifyRes = await axios.post(
              `${API_URL}/api/payment/verify-payment`,
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                planKey: plan.id,
                durationMonths: yearly ? 12 : duration,
              },
              { withCredentials: true }
            )

            if (verifyRes.data?.success) {
              resetCache()
              toast.success(`Payment successful! Welcome to ${plan.name} plan. 🎉`, { autoClose: 4000 })
              navigate('/pricing')
            } else {
              toast.error(verifyRes.data?.message || 'Payment verification failed.')
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr)
            toast.error(verifyErr.response?.data?.message || 'Payment verification failed.')
          } finally {
            setPurchasing(false)
          }
        },
        onFailure: (err) => {
          console.error('Razorpay payment failed:', err)
          toast.error(err?.description || 'Payment failed or cancelled.')
          setPurchasing(false)
        },
        onDismiss: () => {
          toast.info('Payment window closed.')
          setPurchasing(false)
        },
      })
    } catch (error) {
      console.error('Error starting checkout:', error)
      toast.error(error.response?.data?.message || error.message || 'Error starting payment process.')
      setPurchasing(false)
    }
  }

  if (!plan || plan.price === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4'>
        <div className='max-w-md w-full bg-white rounded-[28px] border border-slate-200 p-8 text-center shadow-[0_28px_60px_-34px_rgba(15,23,42,0.25)]'>
          <h1 className='text-lg font-black text-slate-900 mb-2'>Plan not available</h1>
          <p className='text-sm text-slate-500 mb-6'>
            {plan ? 'The Free plan is active by default and does not require a subscription.' : 'We could not find the plan you selected.'}
          </p>
          <Link
            to='/pricing'
            className='inline-block rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:opacity-90 transition-all'
          >
            Back to Pricing
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-6 md:px-6 lg:px-8'>
      <div className='mx-auto max-w-lg'>
        <button
          onClick={() => navigate('/pricing')}
          className='mb-4 inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all'
        >
          <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M15 19l-7-7 7-7' />
          </svg>
          Back to Pricing
        </button>

        <div className='rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.25)] animate-slideUp'>
          <div className='flex items-center justify-between mb-1'>
            <h1 className='text-2xl font-black text-slate-900'>{plan.name} Plan</h1>
            {plan.badge && (
              <span className='rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md'>
                {plan.badge}
              </span>
            )}
          </div>
          <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6'>
            {yearly ? '1 year subscription' : 'Choose your subscription duration'}
          </p>

          {isAnnual && (
            <div className='mb-5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3'>
              <p className='text-xs font-black text-emerald-700'>🎉 10% OFF on 1 Year plans</p>
              <p className='text-[11px] font-semibold text-emerald-600'>You save {formatINR(savings)}</p>
            </div>
          )}

          {!yearly && <label className='block mb-2'>
            <span className='text-[11px] font-bold text-slate-500 uppercase tracking-wider'>Subscription Duration</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className='mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all cursor-pointer'
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.months} value={opt.months}>
                  {opt.label}{opt.months === 12 ? ' — 10% OFF' : ''}
                </option>
              ))}
            </select>
          </label>}

          <div className='mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
            <div className='flex items-end justify-between'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>Total Payable</p>
                {discount > 0 ? (
                  <>
                    <p className='text-sm font-semibold text-slate-400 line-through'>{formatINR(gross)}</p>
                    <p className='text-3xl font-black text-slate-900'>{formatINR(net)}</p>
                  </>
                ) : (
                  <p className='text-3xl font-black text-slate-900'>{formatINR(net)}</p>
                )}
              </div>
              <div className='text-right'>
                <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>Validity</p>
                <p className='text-sm font-black text-slate-700'>{yearly ? '1 Year' : `${duration} Months`}</p>
                <p className='text-[11px] font-semibold text-slate-400'>{durationDays} days</p>
              </div>
            </div>
            {yearly ? (
              <p className='mt-2 text-[11px] font-semibold text-slate-400'>incl. GST · billed once for the full year</p>
            ) : discount > 0 ? (
              <p className='mt-2 text-[11px] font-bold text-emerald-600'>incl. 10% annual discount (base {formatINR(base)} / 3 months)</p>
            ) : (
              <p className='mt-2 text-[11px] font-semibold text-slate-400'>base price {formatINR(base)} / 3 months</p>
            )}
          </div>

          <button
            onClick={handlePay}
            disabled={purchasing}
            className='mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 text-sm font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {purchasing ? (
              <>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Pay {formatINR(net)}</span>
                <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M17 8l4 4m0 0l-4 4m4-4H3' />
                </svg>
              </>
            )}
          </button>

          <p className='mt-4 text-center text-[11px] font-semibold text-slate-400'>
            Secured by Razorpay · You can cancel anytime from Settings
          </p>
        </div>
      </div>
    </div>
  )
}

export default SubscribePage
