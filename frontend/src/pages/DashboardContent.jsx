import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import AddInsuranceModal from './Insurance/AddInsuranceModal'
import DocumentDetailModal from '../components/DocumentDetailModal'
import { useAuth } from '../context/AuthContext'
import { parseDate } from '../utils/dateFormatter'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

const DOC_TYPES = [
  { type: 'Insurance', path: 'insurance', label: 'Insurance', to: 'validTo', tile: 'bg-blue-50 text-blue-700 ring-blue-100', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { type: 'Tax', path: 'tax', label: 'Road Tax', to: 'taxTo', tile: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { type: 'PUC', path: 'puc', label: 'PUC', to: 'validTo', tile: 'bg-amber-50 text-amber-700 ring-amber-100', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { type: 'GPS', path: 'gps', label: 'GPS', to: 'validTo', tile: 'bg-indigo-50 text-indigo-700 ring-indigo-100', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { type: 'Fitness', path: 'fitness', label: 'Fitness', to: 'validTo', tile: 'bg-rose-50 text-rose-700 ring-rose-100', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { type: 'Permit', path: 'permit', label: 'Permit', to: 'validTo', tile: 'bg-teal-50 text-teal-700 ring-teal-100', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
]
const TYPE_BY_KEY = Object.fromEntries(DOC_TYPES.map((t) => [t.type, t]))

const ICON = {
  cloud: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  pencil: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  chevron: 'M9 5l7 7-7 7',
  docs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  kyc: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  phone: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
}

const Svg = ({ d, className = 'h-5 w-5', strokeWidth = 2 }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={strokeWidth} d={d} />
  </svg>
)

const daysUntil = (validTo) => {
  const d = parseDate(validTo)
  if (!d || Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

const dueText = (days) => {
  if (days === null) return { text: '—', cls: 'text-slate-400' }
  if (days < 0) return { text: `Expired (${-days}d ago)`, cls: 'text-rose-600' }
  if (days === 0) return { text: 'Expires (today)', cls: 'text-amber-600' }
  return { text: `Expiring (in ${days}d)`, cls: days <= 7 ? 'text-amber-600' : 'text-emerald-600' }
}

const EMPTY_STATS = { active: 0, expiringSoon: 0, expired: 0 }

const STAT_TONES = {
  emerald: { card: 'from-emerald-50 to-teal-50 border-emerald-200', icon: 'bg-emerald-600', value: 'text-emerald-700' },
  amber: { card: 'from-amber-50 to-orange-50 border-amber-200', icon: 'bg-amber-500', value: 'text-amber-700' },
  rose: { card: 'from-rose-50 to-pink-50 border-rose-200', icon: 'bg-rose-600', value: 'text-rose-700' },
}

const DashboardContent = () => {
  const { user, setUser } = useAuth()

  const [stats, setStats] = useState(EMPTY_STATS)
  const [loadingStats, setLoadingStats] = useState(true)
  const [listKind, setListKind] = useState('expiring-soon')
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingDoc, setViewingDoc] = useState(null)

  const [showAddInsuranceModal, setShowAddInsuranceModal] = useState(false)
  const [initialExtractionFile, setInitialExtractionFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepth = useRef(0)
  const fileInputRef = useRef(null)

  const [showMobilePrompt, setShowMobilePrompt] = useState(false)
  const [promptMobile, setPromptMobile] = useState('')
  const [submittingMobile, setSubmittingMobile] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const promptRef = useRef(null)
  const passwordPromptRef = useRef(null)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    const responses = await Promise.allSettled(
      DOC_TYPES.map((t) => axios.get(`${API_URL}/api/${t.path}/statistics`, { withCredentials: true }))
    )
    const totals = { ...EMPTY_STATS }
    responses.forEach((r) => {
      const data = r.status === 'fulfilled' && r.value.data?.success ? r.value.data.data : null
      if (!data) return
      totals.active += data.active || 0
      totals.expiringSoon += data.expiringSoon || 0
      totals.expired += data.expired || 0
    })
    setStats(totals)
    setLoadingStats(false)
  }, [])

  const fetchDocs = useCallback(async (kind) => {
    setLoadingDocs(true)
    const responses = await Promise.allSettled(
      DOC_TYPES.map((t) => axios.get(`${API_URL}/api/${t.path}/${kind}`, { withCredentials: true, params: { all: 'true' } }))
    )
    const rows = []
    responses.forEach((r, i) => {
      if (r.status !== 'fulfilled' || !r.value.data?.success) return
      const t = DOC_TYPES[i]
      r.value.data.data.forEach((rec) => {
        const validTo = rec[t.to] || ''
        rows.push({
          id: rec._id,
          type: t.type,
          vehicleNumber: rec.vehicleNumber || '—',
          name: rec.policyHolderName || rec.ownerName || rec.name || '',
          mobile: rec.mobileNumber || '',
          validTo,
          days: daysUntil(validTo),
        })
      })
    })
    rows.sort((a, b) => (kind === 'expired' ? (b.days ?? 0) - (a.days ?? 0) : (a.days ?? 9999) - (b.days ?? 9999)))
    setDocs(rows)
    setLoadingDocs(false)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchDocs(listKind)
  }, [fetchDocs, listKind])

  const refreshAll = () => {
    fetchStats()
    fetchDocs(listKind)
  }

  useEffect(() => {
    if (user && !user.mobile) setShowMobilePrompt(true)
  }, [user])

  useEffect(() => {
    if (user && user.hasPassword === false && user.mobile) {
      const dismissed = localStorage.getItem('passwordPromptDismissedAt')
      if (dismissed && new Date(dismissed).toDateString() === new Date().toDateString()) return
      setShowPasswordPrompt(true)
    }
  }, [user])

  useEffect(() => {
    if (showMobilePrompt) promptRef.current?.focus()
  }, [showMobilePrompt])

  useEffect(() => {
    if (showPasswordPrompt) passwordPromptRef.current?.focus()
  }, [showPasswordPrompt])

  const startUpload = (file) => {
    if (!file) return
    const okType = file.type === 'application/pdf' || file.type.startsWith('image/')
    if (!okType) {
      toast.error('Please upload a PDF or an image of the policy.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File is larger than 15 MB.')
      return
    }
    setInitialExtractionFile(file)
    setShowAddInsuranceModal(true)
  }

  const openManualEntry = () => {
    setInitialExtractionFile(null)
    setShowAddInsuranceModal(true)
  }

  const dropHandlers = {
    onDragEnter: (e) => {
      e.preventDefault()
      dragDepth.current += 1
      setIsDragOver(true)
    },
    onDragOver: (e) => e.preventDefault(),
    onDragLeave: (e) => {
      e.preventDefault()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setIsDragOver(false)
    },
    onDrop: (e) => {
      e.preventDefault()
      dragDepth.current = 0
      setIsDragOver(false)
      startUpload(e.dataTransfer.files?.[0])
    },
  }

  const handleMobileSubmit = async () => {
    if (!/^\d{10}$/.test(promptMobile)) return
    setSubmittingMobile(true)
    try {
      const response = await axios.put(`${API_URL}/api/auth/mobile`, { mobile: promptMobile }, { withCredentials: true })
      if (response.data.success) {
        setUser(response.data.data.user)
        setShowMobilePrompt(false)
        if (!response.data.data.user.hasPassword) setShowPasswordPrompt(true)
      }
    } catch {
      toast.error('Could not save mobile number. Please try again.')
    } finally {
      setSubmittingMobile(false)
    }
  }

  const handleSetPassword = async () => {
    if (!passwordInput || passwordInput.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (passwordInput !== confirmPasswordInput) {
      toast.error('Passwords do not match')
      return
    }
    setSubmittingPassword(true)
    try {
      const response = await axios.post(`${API_URL}/api/auth/set-password`, { password: passwordInput }, { withCredentials: true })
      if (response.data.success) {
        setUser(response.data.data.user)
        setShowPasswordPrompt(false)
        toast.success('Password set successfully!')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password')
    } finally {
      setSubmittingPassword(false)
    }
  }

  const q = searchQuery.trim().toUpperCase()
  const typeCounts = docs.reduce((acc, d) => ({ ...acc, [d.type]: (acc[d.type] || 0) + 1 }), {})
  const visibleDocs = docs.filter((d) =>
    (typeFilter === 'All' || d.type === typeFilter) &&
    (!q || d.vehicleNumber.toUpperCase().includes(q) || d.name.toUpperCase().includes(q) || d.mobile.includes(q))
  )

  const statCards = [
    { key: 'active', label: 'Total Active', hint: 'Policies & documents in force', value: stats.active, icon: ICON.check, tone: 'emerald' },
    { key: 'expiring-soon', label: 'Expiring Soon', hint: 'Renew in the coming days', value: stats.expiringSoon, icon: ICON.clock, tone: 'amber' },
    { key: 'expired', label: 'Expired', hint: 'Need renewal now', value: stats.expired, icon: ICON.alert, tone: 'rose' },
  ]

  return (
    <div className='min-h-screen bg-slate-50' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <main className='w-full space-y-4 px-3 pt-4 pb-8 md:space-y-5 lg:px-6 lg:pt-5 lg:pb-8'>
        {/* 1. Stats */}
        <section className='grid grid-cols-3 gap-2.5 md:gap-4'>
          {statCards.map((s) => {
            const t = STAT_TONES[s.tone]
            const clickable = s.key !== 'active'
            const selected = listKind === s.key
            return (
              <button
                key={s.key}
                type='button'
                disabled={!clickable}
                onClick={() => clickable && setListKind(s.key)}
                className={`rounded-xl border-2 bg-gradient-to-r p-3 text-left transition md:px-4 md:py-4 ${t.card} ${clickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} ${selected ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
              >
                <div className='flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3'>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white md:h-11 md:w-11 ${t.icon}`}>
                    <Svg d={s.icon} className='h-5 w-5 md:h-6 md:w-6' />
                  </span>
                  <div className='min-w-0'>
                    <p className={`text-xl font-bold leading-none md:text-2xl ${t.value}`}>{loadingStats ? '…' : s.value}</p>
                    <p className='mt-1 text-xs font-semibold text-slate-700 md:text-sm'>{s.label}</p>
                    <p className='hidden text-xs text-slate-500 md:block'>{s.hint}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* 2. Upload */}
        <section>
          <div>
            <div
              {...dropHandlers}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              role='button'
              tabIndex={0}
              aria-label='Upload insurance policy'
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all md:py-6 ${
                isDragOver
                  ? 'scale-[1.01] border-blue-500 bg-blue-50'
                  : 'border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 hover:border-blue-400'
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg shadow-blue-700/20 transition-transform md:h-12 md:w-12 ${isDragOver ? 'scale-110 bg-blue-600' : 'bg-gradient-to-br from-blue-700 to-blue-500 group-hover:scale-105'}`}>
                <Svg d={ICON.cloud} className='h-5 w-5 md:h-6 md:w-6' />
              </span>
              <p className='mt-2.5 text-base font-bold text-slate-800'>
                {isDragOver ? 'Release to upload' : 'Drag & drop your insurance policy here'}
              </p>
              <p className='text-xs text-slate-500 md:text-sm'>PDF or image · up to 15 MB</p>
              <div className='mt-3 flex flex-col items-center gap-2 sm:flex-row sm:gap-3'>
                <span className='inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition group-hover:from-blue-800 group-hover:to-blue-700'>
                  <Svg d={ICON.bolt} className='h-4 w-4' />
                  Browse file · AI auto-fill
                </span>
                <span className='text-xs font-medium text-slate-400'>or</span>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    openManualEntry()
                  }}
                  className='inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'
                >
                  <Svg d={ICON.pencil} className='h-4 w-4' />
                  Enter manually
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*,application/pdf'
              className='hidden'
              onChange={(e) => {
                startUpload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          <div className='mt-2 flex flex-col items-center gap-2 text-xs text-slate-500 sm:flex-row md:justify-start'>
            <span>Uploading other documents?</span>
            <div className='flex items-center gap-2'>
            <Link
              to='/rto-documents'
              className='inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700'
            >
              <Svg d={ICON.docs} className='h-3.5 w-3.5' />
              RTO Documents
            </Link>
            <Link
              to='/kyc'
              className='inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700'
            >
              <Svg d={ICON.kyc} className='h-3.5 w-3.5' />
              KYC
            </Link>
            </div>
          </div>
        </section>

        {/* 3. Expiring / expired list */}
        <section className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
          <div className='border-b border-slate-100 px-4 py-3.5 md:px-5'>
            <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
              <div className='inline-flex self-start rounded-lg bg-slate-100 p-1'>
                {[
                  { key: 'expiring-soon', label: 'Expiring Soon', count: stats.expiringSoon, badge: 'bg-amber-100 text-amber-700' },
                  { key: 'expired', label: 'Expired', count: stats.expired, badge: 'bg-rose-100 text-rose-700' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type='button'
                    onClick={() => setListKind(tab.key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${listKind === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${listKind === tab.key ? tab.badge : 'bg-slate-200 text-slate-500'}`}>
                      {loadingStats ? '…' : tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <label className='relative block md:w-72'>
                <span className='pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400'>
                  <Svg d={ICON.search} className='h-4 w-4' />
                </span>
                <input
                  type='search'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search vehicle, name or mobile'
                  className='w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                />
              </label>
            </div>

            <div className='mt-2.5 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden'>
              {['All', ...DOC_TYPES.map((t) => t.type)].map((type) => {
                const count = type === 'All' ? docs.length : typeCounts[type] || 0
                if (type !== 'All' && count === 0) return null
                const active = typeFilter === type
                return (
                  <button
                    key={type}
                    type='button'
                    onClick={() => setTypeFilter(type)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    {type === 'All' ? 'All' : TYPE_BY_KEY[type].label}{' '}
                    <span className={active ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {loadingDocs ? (
            <div className='flex flex-col items-center gap-3 py-16'>
              <div className='h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-r-transparent' />
              <p className='text-sm text-slate-400'>Loading documents…</p>
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className='flex flex-col items-center gap-2 px-6 py-16 text-center'>
              <span className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
                <Svg d={ICON.check} className='h-7 w-7' />
              </span>
              <p className='font-semibold text-slate-800'>
                {q || typeFilter !== 'All' ? 'No matching documents' : listKind === 'expired' ? 'No expired documents' : 'Nothing expiring soon'}
              </p>
              <p className='text-sm text-slate-500'>
                {q || typeFilter !== 'All' ? 'Try a different search or filter.' : 'You are all caught up.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className='hidden w-full text-left md:table'>
                <thead>
                  <tr className='bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                    <th className='px-5 py-2.5'>Document</th>
                    <th className='px-5 py-2.5'>Client &amp; Vehicle</th>
                    <th className='px-5 py-2.5'>Valid To</th>
                    <th className='px-5 py-2.5' />
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {visibleDocs.map((d) => {
                    const t = TYPE_BY_KEY[d.type]
                    const due = dueText(d.days)
                    return (
                      <tr key={`${d.type}-${d.id}`} onClick={() => setViewingDoc(d)} className='cursor-pointer transition hover:bg-slate-50'>
                        <td className='px-5 py-3'>
                          <div className='flex items-center gap-3'>
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ${t.tile}`}>
                              <Svg d={t.icon} className='h-5 w-5' />
                            </span>
                            <span className='text-sm font-semibold text-slate-800'>{t.label}</span>
                          </div>
                        </td>
                        <td className='px-5 py-3'>
                          <p className='mb-1 max-w-[260px] truncate text-sm font-semibold text-slate-800' title={d.name}>{d.name || '—'}</p>
                          <span className='inline-block rounded-md border-2 border-slate-800 bg-amber-300 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-slate-900'>
                            {d.vehicleNumber}
                          </span>
                        </td>
                        <td className='px-5 py-3'>
                          <p className='text-sm font-semibold text-slate-800'>{d.validTo || '—'}</p>
                          <p className={`text-xs font-semibold ${due.cls}`}>{due.text}</p>
                        </td>
                        <td className='px-5 py-3 text-right'>
                          <span className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm'>
                            View
                            <Svg d={ICON.chevron} className='h-3.5 w-3.5' />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Mobile list */}
              <ul className='divide-y divide-slate-100 md:hidden'>
                {visibleDocs.map((d) => {
                  const t = TYPE_BY_KEY[d.type]
                  const due = dueText(d.days)
                  return (
                    <li key={`${d.type}-${d.id}`}>
                      <button type='button' onClick={() => setViewingDoc(d)} className='flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50'>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${t.tile}`}>
                          <Svg d={t.icon} className='h-5 w-5' />
                        </span>
                        <span className='min-w-0 flex-1'>
                          <span className='mb-0.5 block truncate text-sm font-semibold text-slate-800'>{d.name || '—'}</span>
                          <span className='inline-block rounded border-2 border-slate-800 bg-amber-300 px-1.5 font-mono text-[11px] font-bold tracking-wider text-slate-900'>
                            {d.vehicleNumber}
                          </span>
                          <span className='block text-xs text-slate-500'>{t.label}</span>
                        </span>
                        <span className='shrink-0 text-right'>
                          <span className='block text-xs font-semibold text-slate-700'>{d.validTo}</span>
                          <span className={`block text-[11px] font-semibold ${due.cls}`}>{due.text}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <p className='border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 md:px-5'>
                Showing {visibleDocs.length} of {docs.length} {listKind === 'expired' ? 'expired' : 'expiring'} documents
              </p>
            </>
          )}
        </section>
      </main>

      {showAddInsuranceModal && (
        <AddInsuranceModal
          isOpen={showAddInsuranceModal}
          onClose={() => {
            setShowAddInsuranceModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddInsuranceModal(false)
            setInitialExtractionFile(null)
            refreshAll()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {viewingDoc && (
        <DocumentDetailModal
          type={viewingDoc.type}
          id={viewingDoc.id}
          onClose={() => setViewingDoc(null)}
          onChanged={refreshAll}
        />
      )}

      {showMobilePrompt && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl'>
            <div className='bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-5 py-4 text-white'>
              <div className='flex items-center gap-3'>
                <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/15'>
                  <Svg d={ICON.phone} />
                </span>
                <div>
                  <h3 className='text-lg font-bold'>Almost done!</h3>
                  <p className='text-xs text-slate-300'>Enter your mobile number to complete registration</p>
                </div>
              </div>
            </div>
            <div className='p-5'>
              <input
                ref={promptRef}
                type='text'
                inputMode='numeric'
                value={promptMobile}
                onChange={(e) => setPromptMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMobileSubmit() }}
                placeholder='10-digit mobile number'
                className='w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-[15px] font-medium tracking-widest text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                disabled={submittingMobile}
              />
              <button
                type='button'
                onClick={handleMobileSubmit}
                disabled={submittingMobile || promptMobile.length !== 10}
                className='mt-4 w-full rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {submittingMobile ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl'>
            <div className='bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-5 py-4 text-white'>
              <div className='flex items-center gap-3'>
                <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/15'>
                  <Svg d={ICON.lock} />
                </span>
                <div>
                  <h3 className='text-lg font-bold'>Set a password</h3>
                  <p className='text-xs text-slate-300'>So you can also log in with your email</p>
                </div>
              </div>
            </div>
            <div className='space-y-3 p-5'>
              {[
                { key: 'new', ref: passwordPromptRef, value: passwordInput, set: setPasswordInput, show: showPass, toggle: () => setShowPass(!showPass), placeholder: 'New password (min. 6 characters)' },
                { key: 'confirm', ref: null, value: confirmPasswordInput, set: setConfirmPasswordInput, show: showConfirmPass, toggle: () => setShowConfirmPass(!showConfirmPass), placeholder: 'Confirm password' },
              ].map((f) => (
                <div key={f.key} className='relative'>
                  <input
                    ref={f.ref}
                    type={f.show ? 'text' : 'password'}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSetPassword() }}
                    placeholder={f.placeholder}
                    className='w-full rounded-lg border border-slate-300 px-4 py-3 pr-11 text-[15px] font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                    disabled={submittingPassword}
                  />
                  <button
                    type='button'
                    onClick={f.toggle}
                    className='absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600'
                    aria-label={f.show ? 'Hide password' : 'Show password'}
                  >
                    <Svg d={f.show ? ICON.eyeOff : ICON.eye} />
                  </button>
                </div>
              ))}
              <button
                type='button'
                onClick={handleSetPassword}
                disabled={submittingPassword || !passwordInput || passwordInput.length < 6 || passwordInput !== confirmPasswordInput}
                className='w-full rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {submittingPassword ? 'Saving...' : 'Set Password'}
              </button>
              <button
                type='button'
                onClick={() => {
                  localStorage.setItem('passwordPromptDismissedAt', new Date().toISOString())
                  setShowPasswordPrompt(false)
                }}
                disabled={submittingPassword}
                className='w-full rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700'
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardContent
