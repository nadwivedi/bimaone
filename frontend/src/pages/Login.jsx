import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta'
import { PAGE_META } from '../data/pageMeta'
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

  usePageMeta({
    ...PAGE_META['/login'],
    path: '/login',
  })

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

  if (authLoading) {
    return (
      <div className='min-h-[100dvh] bg-gradient-to-br from-[#0c1f48] via-[#0a1838] to-[#070f26] flex items-center justify-center p-4'>
        <div className='bg-white rounded-2xl shadow-2xl p-8'>
          <div className='flex flex-col items-center justify-center'>
            <svg className='animate-spin h-12 w-12 text-blue-600 mb-4' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
            </svg>
            <p className='text-gray-600 font-semibold'>Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:opacity-60'
  const primaryBtnCls = 'flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3.5 text-[15px] font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'
  const linkBtnCls = 'cursor-pointer text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline'

  const Icon = ({ d, className = 'h-5 w-5' }) => (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={d} />
    </svg>
  )

  const icons = {
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    phone: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    login: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
    shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
  }

  const Spinner = () => (
    <svg className='h-5 w-5 animate-spin text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
    </svg>
  )

  const renderField = ({ icon, type = 'text', ...props }) => (
    <div className='relative'>
      <span className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400'>
        <Icon d={icons[icon]} />
      </span>
      <input type={type} className={inputCls} disabled={loading} {...props} />
    </div>
  )

  const renderPasswordField = ({ value, onChange, show, setShow, placeholder, name }) => (
    <div className='relative'>
      <span className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400'>
        <Icon d={icons.lock} />
      </span>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputCls} pr-11`}
        disabled={loading}
      />
      <button
        type='button'
        onClick={() => setShow(!show)}
        className='absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600'
        title='Toggle password visibility'
      >
        <Icon d={show ? icons.eye : icons.eyeOff} />
      </button>
    </div>
  )

  const titles = {
    login: ['Login to BimaOne', 'Welcome back 👋 Sign in to manage your policies and renewals.'],
    signup: ['Create your free account', 'Start managing your insurance business with BimaOne.'],
    1: ['Forgot Password', 'Enter your registered email to receive an OTP.'],
    2: ['Enter OTP', `We've sent a 6-digit OTP to ${forgotEmail}`],
    3: ['Reset Password', 'Choose a new password for your account.'],
  }
  const [title, subtitle] = forgotStep === 0 ? titles[mode] : titles[forgotStep]

  return (
    <div className='flex min-h-[100dvh] items-center justify-center bg-slate-100 p-4 sm:p-6' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className='grid w-full max-w-[1000px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-300/60 lg:grid-cols-2'>
        {/* Left - promotional panel */}
        <div className='relative hidden overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] p-12 text-white lg:flex lg:flex-col lg:justify-center'>
          <div className='pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/[0.06]' />
          <div className='pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/[0.05]' />
          <div className='pointer-events-none absolute bottom-16 right-12 h-24 w-24 rounded-full bg-sky-400/15' />

          <div className='relative'>
            {/* Not an <h1>: this panel is hidden on mobile, and the form heading carries the page's h1. */}
            <p className='text-[2.5rem] font-bold leading-[1.15]'>
              Your Policies,<br />Simplified.
            </p>
            <p className='mt-5 max-w-sm text-lg leading-relaxed text-slate-300'>
              Manage clients and renewals from one simple dashboard.
            </p>

            <div className='mt-10 flex items-center gap-3 border-t border-white/30 pt-6'>
              <Icon d={icons.shield} className='h-6 w-6' />
              <span className='font-medium'>Safe & Secure</span>
            </div>
          </div>
        </div>

        {/* Right - form */}
        <div className='flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-12'>
          <div className='mb-10 text-center'>
            <Link to='/' className='inline-flex'>
              <img src='/bimaone%20logo.png' alt='BimaOne - Insurance Agent Software' className='h-12 w-auto sm:h-14' />
            </Link>
          </div>

          <div className='mb-6'>
            <h1 className='text-[1.75rem] font-bold text-slate-900 sm:text-[2rem]'>{title}</h1>
            <p className='mt-1 text-sm text-slate-500'>{subtitle}</p>
          </div>

          {forgotStep === 0 && formData.referralCode && (
            <div className='mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3'>
              <p className='flex items-center gap-2 text-xs font-semibold text-emerald-800'>
                <Icon d={icons.link} className='h-4 w-4 shrink-0 text-emerald-600' />
                You were referred by someone! Sign up to earn them a reward.
              </p>
              <p className='ml-6 mt-1 text-[11px] font-bold text-emerald-600'>
                Referral code: <span className='tracking-wider'>{formData.referralCode}</span>
              </p>
            </div>
          )}

          {error && (
            <div className='mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5'>
              <Icon d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' className='h-5 w-5 shrink-0 text-red-600' />
              <p className='text-sm font-medium text-red-800'>{error}</p>
            </div>
          )}

          {forgotMessage && (
            <div className='mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3.5'>
              <Icon d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' className='h-5 w-5 shrink-0 text-green-600' />
              <p className='text-sm font-medium text-green-800'>{forgotMessage}</p>
            </div>
          )}

          {forgotStep === 0 ? (
            <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
              {mode === 'login' ? (
                <div className='space-y-4'>
                  {renderField({ icon: 'phone', name: 'identifier', value: formData.identifier, onChange: handleChange, placeholder: 'Mobile Number or Email' })}
                  {renderPasswordField({ name: 'password', value: formData.password, onChange: handleChange, show: showPassword, setShow: setShowPassword, placeholder: 'Password' })}
                </div>
              ) : (
                <div className='space-y-4'>
                  {renderField({ icon: 'user', name: 'name', value: formData.name, onChange: handleChange, placeholder: 'Full Name' })}
                  {renderField({ icon: 'mail', type: 'email', name: 'email', value: formData.email, onChange: handleChange, placeholder: 'Email Address' })}
                  {renderPasswordField({ name: 'password', value: formData.password, onChange: handleChange, show: showPassword, setShow: setShowPassword, placeholder: 'Password (optional)' })}
                  <div>
                    {renderField({ icon: 'link', name: 'referralCode', value: formData.referralCode, onChange: handleChange, placeholder: 'Referral code or link (optional)' })}
                    {formData.referralCode.trim() && extractReferralCode(formData.referralCode) && formData.referralCode.trim() !== extractReferralCode(formData.referralCode) && (
                      <p className='mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600'>
                        <Icon d='M5 13l4 4L19 7' className='h-3.5 w-3.5' />
                        Referral code detected: <span className='font-black tracking-wider'>{extractReferralCode(formData.referralCode)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className='mt-3 flex justify-end'>
                  <button type='button' onClick={handleForgotPassword} className={linkBtnCls}>
                    Forgot Password?
                  </button>
                </div>
              )}

              {mode === 'login' ? (
                <button type='submit' disabled={loading} className={`${primaryBtnCls} mt-5`}>
                  {loading ? <><Spinner /><span>Logging in...</span></> : <><Icon d={icons.login} /><span>Login</span></>}
                </button>
              ) : (
                <div className='mt-6 flex gap-3'>
                  <button type='submit' disabled={loading} className={`${primaryBtnCls} flex-1`}>
                    {loading ? <><Spinner /><span>Creating...</span></> : <span>Create Account</span>}
                  </button>
                  <button
                    type='button'
                    onClick={(e) => handleSignup(e, true)}
                    disabled={loading}
                    className='flex-1 cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    Maybe Later
                  </button>
                </div>
              )}

              <p className='mt-10 text-center text-sm text-slate-500'>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button type='button' onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className={linkBtnCls}>
                  {mode === 'login' ? 'Register Now' : 'Login'}
                </button>
              </p>
            </form>
          ) : forgotStep === 1 ? (
            <form onSubmit={handleSendOtp} className='space-y-5'>
              {renderField({ icon: 'mail', type: 'email', value: forgotEmail, onChange: (e) => setForgotEmail(e.target.value), placeholder: 'Email Address' })}
              <button type='submit' disabled={loading} className={primaryBtnCls}>
                {loading ? <><Spinner /><span>Sending OTP...</span></> : <span>Send OTP</span>}
              </button>
              <div className='text-center'>
                <button type='button' onClick={resetForgotPassword} className={linkBtnCls}>← Back to Login</button>
              </div>
            </form>
          ) : forgotStep === 2 ? (
            <form onSubmit={handleVerifyOtp} className='space-y-5'>
              <div className='flex items-center justify-between gap-2' onPaste={handleOtpPaste}>
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
                    className='h-14 w-full max-w-[52px] rounded-lg border border-slate-300 text-center text-xl font-bold text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                    disabled={loading}
                  />
                ))}
              </div>
              <button type='submit' disabled={loading || otpDigits.join('').length !== 6} className={primaryBtnCls}>
                {loading ? <><Spinner /><span>Verifying...</span></> : <span>Verify OTP</span>}
              </button>
              <div className='text-center'>
                <button type='button' onClick={() => setForgotStep(1)} className={linkBtnCls}>← Change Email</button>
              </div>
            </form>
          ) : forgotStep === 3 ? (
            <form onSubmit={handleResetPassword} className='space-y-4'>
              {renderPasswordField({ value: newPassword, onChange: (e) => setNewPassword(e.target.value), show: showNewPassword, setShow: setShowNewPassword, placeholder: 'New password (min. 6 characters)' })}
              {renderPasswordField({ value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), show: showConfirmPassword, setShow: setShowConfirmPassword, placeholder: 'Confirm new password' })}
              <button type='submit' disabled={loading} className={`${primaryBtnCls} !mt-5`}>
                {loading ? <><Spinner /><span>Resetting...</span></> : <span>Reset Password</span>}
              </button>
              <div className='text-center'>
                <button type='button' onClick={resetForgotPassword} className={linkBtnCls}>← Back to Login</button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Login
