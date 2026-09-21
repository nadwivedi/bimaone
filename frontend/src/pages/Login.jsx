import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser, setIsAuthenticated, isAuthenticated, loading: authLoading } = useAuth()
  const [mode, setMode] = useState('login')
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    name: '',
    email: '',
    mobile: '',
    referralCode: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [forgotStep, setForgotStep] = useState(0)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [otpDigits, setOtpDigits] = useState(['','','','','',''])
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  // Email verification after signup
  const [signupVerifyMode, setSignupVerifyMode] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [verifyOtpDigits, setVerifyOtpDigits] = useState(['','','','','',''])
  const [verifyResendCooldown, setVerifyResendCooldown] = useState(0)
  const verifyOtpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const refCode = params.get('ref')
    if (refCode) {
      const cleaned = refCode.trim().toUpperCase()
      setFormData((prev) => ({ ...prev, referralCode: cleaned }))
      localStorage.setItem('pendingReferralCode', cleaned)
      setMode('signup')
    }
  }, [location.search])

  useEffect(() => {
    if (forgotStep === 2 && otpRefs[0].current) {
      otpRefs[0].current.focus()
    }
  }, [forgotStep])

  useEffect(() => {
    if (signupVerifyMode && verifyOtpRefs[0].current) {
      setTimeout(() => verifyOtpRefs[0].current?.focus(), 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signupVerifyMode])

  useEffect(() => {
    if (verifyResendCooldown > 0) {
      const t = setTimeout(() => setVerifyResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [verifyResendCooldown])

  const switchMode = (newMode) => {
    if (newMode === mode) return
    setMode(newMode)
    setError('')
    setFormData({ identifier: '', password: '', name: '', email: '', mobile: '', referralCode: '' })
    localStorage.removeItem('pendingReferralCode')
    resetForgotPassword()
  }

  const resetForgotPassword = () => {
    setForgotStep(0)
    setForgotEmail('')
    setForgotOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotMessage('')
    setError('')
    setOtpDigits(['','','','','',''])
  }

  const extractReferralCode = (input) => {
    const trimmed = input.trim()
    const linkMatch = trimmed.match(/[?&]ref=([A-Za-z0-9]{4,10})(?:&|$)/)
    if (linkMatch) return linkMatch[1].toUpperCase()
    const codeMatch = trimmed.match(/^[A-Za-z0-9]{4,10}$/)
    if (codeMatch) return codeMatch[0].toUpperCase()
    return ''
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === 'referralCode') {
      const extracted = extractReferralCode(value)
      if (extracted) {
        localStorage.setItem('pendingReferralCode', extracted)
      } else if (!value.trim()) {
        localStorage.removeItem('pendingReferralCode')
      }
    }
    setError('')
  }

  const handleForgotPassword = () => {
    setForgotStep(1)
    setForgotEmail(formData.identifier.includes('@') ? formData.identifier : '')
    setError('')
  }

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value
    setOtpDigits(newDigits)
    if (value && index < 5) {
      otpRefs[index + 1].current.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits]
        newDigits[index - 1] = ''
        setOtpDigits(newDigits)
        otpRefs[index - 1].current.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs[index - 1].current.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs[index + 1].current.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newDigits = [...otpDigits]
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setOtpDigits(newDigits)
    const nextIndex = Math.min(pasted.length, 5)
    otpRefs[nextIndex].current.focus()
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setForgotMessage('')

    if (!forgotEmail) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, {
        email: forgotEmail
      })
      if (response.data.success) {
        setForgotMessage(response.data.message)
        setForgotStep(2)
      } else {
        setError(response.data.message || 'Failed to send OTP')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')

    const otp = otpDigits.join('')
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/verify-otp`, {
        email: forgotEmail,
        otp
      })
      if (response.data.success) {
        setForgotMessage('')
        setForgotStep(3)
      } else {
        setError(response.data.message || 'Invalid OTP')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/reset-password`, {
        email: forgotEmail,
        otp: otpDigits.join(''),
        newPassword
      })
      if (response.data.success) {
        setForgotMessage('Password reset successfully!')
        setTimeout(() => {
          resetForgotPassword()
        }, 2000)
      } else {
        setError(response.data.message || 'Failed to reset password')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.identifier || !formData.password) {
      setError('Please enter mobile number/email and password')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        identifier: formData.identifier,
        password: formData.password
      }, { withCredentials: true })

      if (response.data.success) {
        setUser(response.data.data.user)
        setIsAuthenticated(true)
        navigate('/')
      } else {
        setError(response.data.message || 'Login failed')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e, skipPassword) => {
    e.preventDefault()
    setError('')

    const { name, email, password, referralCode } = formData
    if (!name || !email) {
      setError('Name and email are required')
      return
    }

    const effectivePassword = skipPassword ? '' : password
    const payload = { name, email }
    const extractedRef = extractReferralCode(referralCode)
    if (extractedRef) {
      payload.referralCode = extractedRef
    }
    if (effectivePassword) {
      if (effectivePassword.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      payload.password = password
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, payload, { withCredentials: true })

      if (response.data.success) {
        setUser(response.data.data.user)
        setIsAuthenticated(true)
        navigate('/')
      } else {
        setError(response.data.message || 'Registration failed')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError('')
    const pendingRef = localStorage.getItem('pendingReferralCode') || ''
    localStorage.removeItem('pendingReferralCode')
    const payload = { credential: credentialResponse.credential }
    const extractedRef = extractReferralCode(pendingRef)
    if (extractedRef) {
      payload.referralCode = extractedRef
    }
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/google`, payload, { withCredentials: true })

      if (response.data.success) {
        setUser(response.data.data.user)
        setIsAuthenticated(true)
        navigate('/')
      } else {
        setError(response.data.message || 'Google login failed')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySignupEmail = async (e) => {
    e.preventDefault()
    setError('')
    const otp = verifyOtpDigits.join('')
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP sent to your email')
      return
    }
    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/verify-email`, { otp }, { withCredentials: true })
      if (response.data.success) {
        setUser(response.data.data.user)
        navigate('/')
      } else {
        setError(response.data.message || 'Invalid OTP')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerificationOtp = async () => {
    if (verifyResendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await axios.post(`${BACKEND_URL}/api/auth/send-email-verification`, {}, { withCredentials: true })
      setVerifyResendCooldown(60)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const nd = [...verifyOtpDigits]
    nd[index] = value
    setVerifyOtpDigits(nd)
    if (value && index < 5) verifyOtpRefs[index + 1].current?.focus()
  }

  const handleVerifyOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!verifyOtpDigits[index] && index > 0) {
        const nd = [...verifyOtpDigits]
        nd[index - 1] = ''
        setVerifyOtpDigits(nd)
        verifyOtpRefs[index - 1].current?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      verifyOtpRefs[index - 1].current?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      verifyOtpRefs[index + 1].current?.focus()
    }
  }

  const handleVerifyOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const nd = [...verifyOtpDigits]
    for (let i = 0; i < pasted.length; i++) nd[i] = pasted[i]
    setVerifyOtpDigits(nd)
    const nextIndex = Math.min(pasted.length, 5)
    verifyOtpRefs[nextIndex].current?.focus()
  }

  const handleGoogleError = () => {
    setError('Google Sign In was unsuccessful. Try again later')
  }

  if (authLoading) {
    return (
      <div className='min-h-[100dvh] bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center p-4'>
        <div className='bg-white rounded-2xl shadow-2xl p-8'>
          <div className='flex flex-col items-center justify-center'>
            <svg className='animate-spin h-12 w-12 text-orange-600 mb-4' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
            </svg>
            <p className='text-gray-600 font-semibold'>Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-[100dvh] bg-gradient-to-br from-slate-50 via-indigo-50 to-blue-100 flex flex-col items-center justify-center p-4 relative overflow-hidden'>
      <div className='absolute top-0 left-0 w-full h-full overflow-hidden z-0'>
        <div className='absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-300/20 rounded-full blur-3xl'></div>
        <div className='absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-emerald-300/20 rounded-full blur-3xl'></div>
      </div>

      <div className='w-full max-w-md z-10'>
        <div className='bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/20'>
          <div className='text-center mb-6'>
            <div className='mb-4'>
              <Link to='/' className='inline-flex items-center gap-1'>
                <img src='/bimalogo.png' alt='BimaOne' className='h-[72px] w-auto' />
                <div className='flex flex-col'>
                  <span className='text-[26px] font-bold leading-none' style={{ fontFamily: "'Poppins', sans-serif" }}>
                    <span className='text-slate-800'>Bima</span><span style={{ color: '#003afd' }}>Box</span>
                  </span>
                  <span className='mt-0.5 text-[6.5px] font-medium tracking-wide' style={{ color: '#0c1f48', fontFamily: "'Inter', sans-serif" }}>All your policies. One smart place.</span>
                </div>
              </Link>
            </div>

            {forgotStep === 0 ? (
              <>
                <div className='flex bg-slate-100 rounded-xl p-1 mb-4'>
                  <button
                    type='button'
                    onClick={() => switchMode('login')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Sign In
                  </button>
                  <button
                    type='button'
                    onClick={() => switchMode('signup')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Sign Up
                  </button>
                </div>

                {mode === 'login' ? (
                  <p className='text-slate-500 text-xs'>Enter your credentials to access BimaOne</p>
                ) : (
                  <p className='text-slate-500 text-xs'>Create your BimaOne account</p>
                )}

                {formData.referralCode && (
                  <div className='mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl'>
                    <div className='flex items-center gap-2'>
                      <svg className='w-4 h-4 text-emerald-600 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
                      </svg>
                      <p className='text-xs font-semibold text-emerald-800'>
                        You were referred by someone! Sign up to earn them a reward.
                      </p>
                    </div>
                    <p className='text-[11px] text-emerald-600 font-bold mt-1 ml-6'>
                      Referral code: <span className='tracking-wider'>{formData.referralCode}</span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className='mb-2'>
                <p className='text-slate-700 font-bold text-sm'>
                  {forgotStep === 1 && 'Forgot Password'}
                  {forgotStep === 2 && 'Enter OTP'}
                  {forgotStep === 3 && 'Reset Password'}
                </p>
                <p className='text-slate-400 text-xs mt-1'>
                  {forgotStep === 1 && 'Enter your registered email to receive OTP'}
                  {forgotStep === 2 && `OTP sent to ${forgotEmail}`}
                  {forgotStep === 3 && 'Choose a new password for your account'}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-xl animate-shake'>
              <div className='flex items-center gap-2'>
                <svg className='w-5 h-5 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
                <p className='text-sm text-red-800 font-medium'>{error}</p>
              </div>
            </div>
          )}

          {forgotMessage && (
            <div className='mb-4 p-4 bg-green-50 border border-green-200 rounded-xl'>
              <div className='flex items-center gap-2'>
                <svg className='w-5 h-5 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
                <p className='text-sm text-green-800 font-medium'>{forgotMessage}</p>
              </div>
            </div>
          )}

          {forgotStep === 0 ? (
            <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className='space-y-3.5'>
              {mode === 'signup' && (
                <>
                  <div>
                    <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>Full Name</label>
                    <div className='relative group'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                        <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
                        </svg>
                      </div>
                      <input type='text' name='name' value={formData.name} onChange={handleChange} placeholder='John Doe' className='w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>Email</label>
                    <div className='relative group'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                        <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                        </svg>
                      </div>
                      <input type='email' name='email' value={formData.email} onChange={handleChange} placeholder='john@example.com' className='w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                    </div>
                  </div>
                </>
              )}

              {mode === 'signup' && (
                <div>
                  <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>Referral Code or Link <span className='text-slate-400 font-medium normal-case'>(optional)</span></label>
                  <div className='relative group'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                      <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
                      </svg>
                    </div>
                    <input type='text' name='referralCode' value={formData.referralCode} onChange={handleChange} placeholder='e.g. ABC123 or bimabox.in?ref=ABC123' className='w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                  </div>
                  {formData.referralCode.trim() && extractReferralCode(formData.referralCode) && formData.referralCode.trim() !== extractReferralCode(formData.referralCode) && (
                    <p className='mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1'>
                      <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                      </svg>
                      Referral code detected: <span className='font-black tracking-wider'>{extractReferralCode(formData.referralCode)}</span>
                    </p>
                  )}
                </div>
              )}

              {mode === 'login' && (
                <div>
                  <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>Email or Mobile</label>
                  <div className='relative group'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                      <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                      </svg>
                    </div>
                    <input type='text' name='identifier' value={formData.identifier} onChange={handleChange} placeholder='Email or Mobile' className='w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                  </div>
                </div>
              )}

              <div>
                <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>Password {mode === 'signup' && <span className='text-slate-400 font-medium normal-case'>(optional)</span>}</label>
                <div className='relative group'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                    <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                    </svg>
                  </div>
                  <input type={showPassword ? 'text' : 'password'} name='password' value={formData.password} onChange={handleChange} placeholder={mode === 'signup' ? 'Set a password (optional)' : '••••••••'} className='w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                  <button type='button' onClick={() => setShowPassword(!showPassword)} className='absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors'>
                    {showPassword ? (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                      </svg>
                    ) : (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {mode === 'login' && (
                <div className='text-right -mt-2'>
                  <button type='button' onClick={handleForgotPassword} className='text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer'>
                    Forgot Password?
                  </button>
                </div>
              )}

              {mode === 'signup' ? (
                <div className='flex gap-3 mt-4'>
                  <button type='submit' disabled={loading} className='flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2'>
                    {loading ? (
                      <>
                        <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                  <button type='button' onClick={(e) => handleSignup(e, true)} disabled={loading} className='flex-1 bg-white border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'>
                    Maybe Later
                  </button>
                </div>
              ) : (
                <button type='submit' disabled={loading} className='w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-4'>
                  {loading ? (
                    <>
                      <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              )}

              <div className='relative my-4'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-slate-200'></div>
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-white px-2 text-slate-400 font-bold tracking-widest'>Or continue with</span>
                </div>
              </div>

              <div className='flex justify-center'>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap theme="outline" size="large" shape="pill" width="100%" />
              </div>
            </form>
          ) : forgotStep === 1 ? (
            <form onSubmit={handleSendOtp} className='space-y-3.5'>
              <div>
                <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>Email Address</label>
                <div className='relative group'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                    <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                    </svg>
                  </div>
                  <input type='email' value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder='john@example.com' className='w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                </div>
              </div>

              <button type='submit' disabled={loading} className='w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-4'>
                {loading ? (
                  <>
                    <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <span>Send OTP</span>
                )}
              </button>

              <div className='text-center'>
                <button type='button' onClick={resetForgotPassword} className='text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer'>
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : forgotStep === 2 ? (
            <form onSubmit={handleVerifyOtp} className='space-y-3.5'>
              <div>
                <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 ml-1'>Enter OTP</label>
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
                      className='w-12 h-14 text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              <button type='submit' disabled={loading || otpDigits.join('').length !== 6} className='w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-4'>
                {loading ? (
                  <>
                    <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>

              <div className='text-center'>
                <button type='button' onClick={() => setForgotStep(1)} className='text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer'>
                  ← Change Email
                </button>
              </div>
            </form>
          ) : forgotStep === 3 ? (
            <form onSubmit={handleResetPassword} className='space-y-3.5'>
              <div>
                <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>New Password</label>
                <div className='relative group'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                    <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                    </svg>
                  </div>
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder='Min. 6 characters' className='w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                  <button type='button' onClick={() => setShowNewPassword(!showNewPassword)} className='absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors'>
                    {showNewPassword ? (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                      </svg>
                    ) : (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 ml-1'>Confirm Password</label>
                <div className='relative group'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500'>
                    <svg className='w-5 h-5 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                    </svg>
                  </div>
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder='Re-enter new password' className='w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium' disabled={loading} />
                  <button type='button' onClick={() => setShowConfirmPassword(!showConfirmPassword)} className='absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors'>
                    {showConfirmPassword ? (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                      </svg>
                    ) : (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type='submit' disabled={loading} className='w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-4'>
                {loading ? (
                  <>
                    <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>

              <div className='text-center'>
                <button type='button' onClick={resetForgotPassword} className='text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer'>
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : null}

          <div className='mt-4 text-center space-y-1'>
            <p className='text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1'>
              <svg className='w-3 h-3 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
              </svg>
              Your documents are encrypted and secure.
            </p>
            <p className='text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1'>
              <svg className='w-3 h-3 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' />
              </svg>
              Data stored securely on cloud.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
