import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const ForceEmailVerificationModal = () => {
  const { user, setUser, logout } = useAuth()
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  // Auto send OTP on mount
  useEffect(() => {
    sendOtp()
    setTimeout(() => otpRefs[0].current?.focus(), 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const sendOtp = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/send-email-verification`, {}, { withCredentials: true })
    } catch (err) {
      console.error('Send OTP error:', err)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return
    setLoading(true)
    try {
      await axios.post(`${BACKEND_URL}/api/auth/send-email-verification`, {}, { withCredentials: true })
      toast.success('Verification OTP resent to your email')
      setResendCooldown(60)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otp = otpDigits.join('')
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/verify-email`, { otp }, { withCredentials: true })
      if (response.data.success) {
        toast.success('Email verified successfully! Welcome to BimaOne.')
        if (response.data.data?.user) {
          setUser(response.data.data.user)
        } else {
          setUser({ ...user, emailVerified: true })
        }
      } else {
        toast.error(response.data.message || 'Verification failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const nd = [...otpDigits]
    nd[index] = value
    setOtpDigits(nd)
    if (value && index < 5) otpRefs[index + 1].current?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const nd = [...otpDigits]
        nd[index - 1] = ''
        setOtpDigits(nd)
        otpRefs[index - 1].current?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs[index - 1].current?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs[index + 1].current?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const nd = [...otpDigits]
    for (let i = 0; i < pasted.length; i++) nd[i] = pasted[i]
    setOtpDigits(nd)
    const nextIndex = Math.min(pasted.length, 5)
    otpRefs[nextIndex].current?.focus()
  }

  return (
    <div className='fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in'>
      <div className='bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-white/20 relative'>
        <div className='text-center mb-6'>
          <div className='w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm'>
            <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
            </svg>
          </div>
          <h2 className='text-xl font-black text-slate-900'>Verify Email to Access App</h2>
          <p className='text-xs text-slate-500 mt-1.5'>We sent a 6-digit verification OTP to</p>
          <p className='text-sm font-bold text-blue-600 mt-0.5'>{user?.email}</p>
          <p className='text-[11px] text-amber-600 font-semibold bg-amber-50 rounded-xl p-2.5 mt-3 border border-amber-200'>
            🔒 Email verification is mandatory to use BimaOne.
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className='space-y-5'>
          <div>
            <label className='block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center'>Enter 6-Digit OTP</label>
            <div className='flex items-center justify-center gap-2' onPaste={handleOtpPaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={otpRefs[index]}
                  type='text'
                  inputMode='numeric'
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className='w-11 h-14 text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <button
            type='submit'
            disabled={loading || otpDigits.join('').length !== 6}
            className='w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2'
          >
            {loading ? (
              <>
                <svg className='animate-spin h-5 w-5 text-white' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                </svg>
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </button>

          <div className='flex items-center justify-between pt-2 border-t border-slate-100 text-xs'>
            <button
              type='button'
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className='font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 cursor-pointer transition-colors'
            >
              {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
            </button>

            <button
              type='button'
              onClick={logout}
              className='font-bold text-slate-500 hover:text-rose-600 cursor-pointer transition-colors'
            >
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ForceEmailVerificationModal
