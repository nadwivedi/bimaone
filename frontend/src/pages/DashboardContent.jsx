import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import AddVehicleModal from './VehicleRegistration/AddVehicleModal'
import AddInsuranceModal from './Insurance/AddInsuranceModal'
import { useAuth } from '../context/AuthContext'
import { parseDate } from '../utils/dateFormatter'
import { ToastContainer, toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const colorMap = {
  emerald: {
    strip: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-600'
  },
  amber: {
    strip: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-600'
  },
  indigo: {
    strip: 'bg-indigo-500',
    light: 'bg-indigo-50',
    text: 'text-indigo-600'
  },
  rose: {
    strip: 'bg-rose-500',
    light: 'bg-rose-50',
    text: 'text-rose-600'
  },
  blue: {
    strip: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-600'
  },
  teal: {
    strip: 'bg-teal-500',
    light: 'bg-teal-50',
    text: 'text-teal-600'
  }
}

const DashboardContent = () => {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [showAddInsuranceModal, setShowAddInsuranceModal] = useState(false)
  const [showUploadOptions, setShowUploadOptions] = useState(false)

  const [initialExtractionFile, setInitialExtractionFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [realExpiringDocs, setRealExpiringDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [recentDocs, setRecentDocs] = useState([])
  const [showMobilePrompt, setShowMobilePrompt] = useState(false)
  const [promptMobile, setPromptMobile] = useState('')
  const [submittingMobile, setSubmittingMobile] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const fileInputRef = useRef(null)
  const promptRef = useRef(null)
  const passwordPromptRef = useRef(null)

  useEffect(() => {
    fetchVehicles()
    fetchExpiringDocs()
    fetchRecentDocs()
  }, [])

  useEffect(() => {
    if (user && !user.mobile) {
      setShowMobilePrompt(true)
    }
  }, [user])

  useEffect(() => {
    if (user && user.hasPassword === false && user.mobile) {
      const dismissed = localStorage.getItem('passwordPromptDismissedAt')
      if (dismissed) {
        const dismissedDate = new Date(dismissed).toDateString()
        const today = new Date().toDateString()
        if (dismissedDate === today) return
      }
      setShowPasswordPrompt(true)
    }
  }, [user])

  useEffect(() => {
    if (showMobilePrompt && promptRef.current) {
      promptRef.current.focus()
    }
  }, [showMobilePrompt])

  useEffect(() => {
    if (showPasswordPrompt && passwordPromptRef.current) {
      passwordPromptRef.current.focus()
    }
  }, [showPasswordPrompt])

  const calculateDaysLeft = (validTo) => {
    if (!validTo || validTo === 'N/A' || validTo === 'None') return 9999
    const expiryDate = parseDate(validTo)
    if (!expiryDate) return 9999
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = expiryDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const fetchExpiringDocs = async () => {
    try {
      setLoadingDocs(true)
      const endpoints = [
        { type: 'Tax', url: `${API_URL}/api/tax/expiring-soon`, fromField: 'taxFrom', toField: 'taxTo', color: 'emerald' },
        { type: 'PUC', url: `${API_URL}/api/puc/expiring-soon`, fromField: 'validFrom', toField: 'validTo', color: 'amber' },
        { type: 'GPS', url: `${API_URL}/api/gps/expiring-soon`, fromField: 'validFrom', toField: 'validTo', color: 'indigo' },
        { type: 'Fitness', url: `${API_URL}/api/fitness/expiring-soon`, fromField: 'validFrom', toField: 'validTo', color: 'rose' },
        { type: 'Insurance', url: `${API_URL}/api/insurance/expiring-soon`, fromField: 'validFrom', toField: 'validTo', color: 'blue' },
        { type: 'Permit', url: `${API_URL}/api/permit/expiring-soon`, fromField: 'validFrom', toField: 'validTo', color: 'teal' },
      ]

      const requests = endpoints.map(ep => axios.get(ep.url, { withCredentials: true }))
      const responses = await Promise.allSettled(requests)

      let allDocs = []

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.data.success) {
          const ep = endpoints[index]
          const records = response.value.data.data.map(record => {
            const validTo = record[ep.toField] || 'N/A'
            const daysLeft = calculateDaysLeft(validTo)
            return {
              id: record._id,
              type: ep.type,
              vehicleNumber: record.vehicleNumber || 'N/A',
              validFrom: record[ep.fromField] || 'N/A',
              validTo: validTo,
              daysLeft: daysLeft,
              color: ep.color,
              insuredName: record.policyHolderName || record.ownerName || record.name || '',
              rawRecord: record
            }
          })
          allDocs = [...allDocs, ...records]
        }
      })

      allDocs.sort((a, b) => a.daysLeft - b.daysLeft)
      setRealExpiringDocs(allDocs)
    } catch (error) {
      console.error('Error fetching expiring documents:', error)
    } finally {
      setLoadingDocs(false)
    }
  }

  const fetchRecentDocs = async () => {
    try {
      const endpoints = [
        { type: 'Tax', url: `${API_URL}/api/tax`, fromField: 'taxFrom', toField: 'taxTo', color: 'emerald', nameField: 'ownerName' },
        { type: 'PUC', url: `${API_URL}/api/puc`, fromField: 'validFrom', toField: 'validTo', color: 'amber', nameField: 'ownerName' },
        { type: 'GPS', url: `${API_URL}/api/gps`, fromField: 'validFrom', toField: 'validTo', color: 'indigo', nameField: 'ownerName' },
        { type: 'Fitness', url: `${API_URL}/api/fitness`, fromField: 'validFrom', toField: 'validTo', color: 'rose', nameField: 'ownerName' },
        { type: 'Insurance', url: `${API_URL}/api/insurance`, fromField: 'validFrom', toField: 'validTo', color: 'blue', nameField: 'policyHolderName' },
        { type: 'Permit', url: `${API_URL}/api/permit`, fromField: 'validFrom', toField: 'validTo', color: 'teal', nameField: 'name' },
      ]
      const requests = endpoints.map(ep => axios.get(ep.url, { withCredentials: true, params: { limit: 5 } }))
      const responses = await Promise.allSettled(requests)
      let allDocs = []
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.data.success) {
          const ep = endpoints[index]
          const records = response.value.data.data.map(record => ({
            id: record._id,
            type: ep.type,
            vehicleNumber: record.vehicleNumber || 'N/A',
            insuredName: record[ep.nameField] || '',
            validFrom: record[ep.fromField] || 'N/A',
            validTo: record[ep.toField] || 'N/A',
            createdAt: record.createdAt,
            color: ep.color,
          }))
          allDocs = [...allDocs, ...records]
        }
      })
      allDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setRecentDocs(allDocs.slice(0, 5))
    } catch (error) {
      console.error('Error fetching recent documents:', error)
    }
  }

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get(`${API_URL}/api/vehicle`, {
        params: { page: 1, limit: 1000 },
        withCredentials: true,
      })
      if (response.data?.success) {
        setVehicles(response.data.data || [])
      } else {
        setVehicles([])
        setError('Failed to load vehicles.')
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err)
      setVehicles([])
      setError('Failed to fetch registered vehicles.')
    } finally {
      setLoading(false)
    }
  }

  const handleMobileSubmit = async () => {
    if (!/^\d{10}$/.test(promptMobile)) {
      return
    }
    setSubmittingMobile(true)
    try {
      const response = await axios.put(`${API_URL}/api/auth/mobile`, { mobile: promptMobile }, { withCredentials: true })
      if (response.data.success) {
        setUser(response.data.data.user)
        setShowMobilePrompt(false)
        if (!response.data.data.user.hasPassword) {
          setShowPasswordPrompt(true)
        }
      }
    } catch (_err) {
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

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top_left,_#f5f3ff,_#faf7f2_45%,_#fffdf9_100%)]'>
      <main className='px-2 pt-3 pb-32 lg:px-8 lg:pt-4'>
        <section className='w-full'>
          <div className='max-w-7xl mx-auto'>

            <div className='rounded-[28px] border border-stone-200 bg-white p-4 shadow-[0_28px_60px_-34px_rgba(68,64,60,0.25)] md:p-5 lg:p-6'>
              <div className='mb-6 grid grid-cols-3 gap-4'>
                <button
                  type='button'
                  onClick={() => navigate('/rto-documents')}
                  className='flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-violet-100 bg-violet-50/50 p-4 transition-all hover:border-violet-300 hover:bg-violet-100/50 hover:shadow-xl group'
                >
                  <div className='flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform'>
                    <svg className='h-5 w-5 md:h-6 md:w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                    </svg>
                  </div>
                  <span className='text-[10px] md:text-sm font-bold text-violet-900'>RTO Documents</span>
                </button>

                <button
                  type='button'
                  onClick={() => navigate('/kyc')}
                  className='flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-orange-100 bg-orange-50/50 p-4 transition-all hover:border-orange-300 hover:bg-orange-100/50 hover:shadow-xl group'
                >
                  <div className='flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform'>
                    <svg className='h-5 w-5 md:h-6 md:w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2' />
                    </svg>
                  </div>
                  <span className='text-[10px] md:text-sm font-bold text-orange-900'>KYC</span>
                </button>

                <button
                  type='button'
                  onClick={() => setShowUploadOptions(true)}
                  className='flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-stone-100 bg-stone-50/50 p-4 transition-all hover:border-stone-300 hover:bg-stone-100/50 hover:shadow-xl group'
                >
                  <div className='flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-stone-900 text-white shadow-lg shadow-stone-200 group-hover:scale-110 transition-transform'>
                    <svg className='h-5 w-5 md:h-6 md:w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' />
                    </svg>
                  </div>
                  <span className='text-[10px] md:text-sm font-bold text-stone-900'>Upload Insurance</span>
                </button>
              </div>

              <h2 className='mb-6 flex items-center gap-2 text-lg font-black text-stone-900 before:h-5 before:w-1.5 before:rounded-full before:bg-gradient-to-b before:from-violet-500 before:to-fuchsia-500 before:content-[""]'>Expiring Soon</h2>

              {(() => {
                const filteredDocs = realExpiringDocs.filter(doc => 
                  doc.vehicleNumber.toUpperCase().includes(searchQuery.toUpperCase()) || 
                  doc.type.toUpperCase().includes(searchQuery.toUpperCase())
                ).slice(0, 12)

                return (
                  <>
                    <div className='lg:hidden space-y-3'>
                      {loadingDocs ? (
                        <div className='text-center py-8'>
                          <div className='animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto'></div>
                          <p className='text-xs text-stone-500 mt-2 font-bold uppercase tracking-widest'>Scanning Documents...</p>
                        </div>
                      ) : filteredDocs.length === 0 ? (
                        <div className='text-center py-12 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200'>
                          <p className='text-sm text-stone-500 font-bold'>No documents expiring soon.</p>
                        </div>
                      ) : (
                        filteredDocs.map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => navigate(`/rto-documents/${doc.type}/${doc.id}`)}
                            className='group relative overflow-hidden rounded-xl border-2 border-stone-200 bg-white p-3 shadow-sm hover:border-violet-400 transition-all cursor-pointer'
                          >
                            <div className='flex items-start gap-3'>
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${doc.color}-50 text-${doc.color}-600`}>
                                {doc.type === 'Insurance' && <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' /></svg>}
                                {doc.type === 'Tax' && <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>}
                                {doc.type === 'PUC' && <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' /></svg>}
                                {doc.type === 'Fitness' && <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>}
                                {doc.type === 'GPS' && <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>}
                                {doc.type === 'Permit' && <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' /></svg>}
                              </div>
                              <div className='min-w-0 flex-1'>
                                {doc.insuredName && <p className='text-sm font-black text-stone-900 truncate leading-tight'>{doc.insuredName}</p>}
                                <p className='text-[10px] font-medium text-stone-500 mt-0.5'>{doc.type === 'Tax' ? 'Road Tax' : doc.type}</p>
                                <p className='text-[10px] font-mono text-stone-400'>{doc.vehicleNumber}</p>
                              </div>
                              <div className='text-right shrink-0'>
                                <p className={`text-[11px] font-black ${
                                  doc.daysLeft < 0 ? 'text-red-600' : doc.daysLeft <= 2 ? 'text-orange-600' : 'text-amber-600'
                                }`}>
                                  {doc.daysLeft < 0 ? 'Expired' : doc.daysLeft === 0 ? 'Today' : `${doc.daysLeft}d left`}
                                </p>
                                <p className='text-[10px] text-stone-400'>{doc.validTo}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className='hidden lg:block'>
                      {loadingDocs ? (
                        <div className='text-center py-12 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200'>
                          <div className='animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto'></div>
                          <p className='text-xs text-stone-500 mt-2 font-bold uppercase tracking-widest'>Scanning Documents...</p>
                        </div>
                      ) : filteredDocs.length === 0 ? (
                        <div className='text-center py-12 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200'>
                          <p className='text-sm text-stone-500 font-bold'>No documents expiring soon.</p>
                        </div>
                      ) : (
                        <div className='grid grid-cols-4 gap-4'>
                          {filteredDocs.map((doc) => {
                            const colors = colorMap[doc.color] || colorMap.blue
                            return (
                              <div
                                key={doc.id}
                                onClick={() => navigate(`/rto-documents/${doc.type}/${doc.id}`)}
                                className='group relative overflow-hidden rounded-xl border border-stone-150 bg-stone-50/30 p-4 transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:border-violet-300 hover:shadow-[0_20px_50px_-20px_rgba(139,92,246,0.15)] cursor-pointer'
                              >
                                <div className={`absolute top-0 left-0 right-0 h-1 ${colors.strip}`} />

                                <div className='flex items-start justify-between mb-3 mt-1'>
                                  <div className='flex items-center gap-2.5'>
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ${colors.light} ${colors.text}`}>
                                      {doc.type === 'Insurance' && <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' /></svg>}
                                      {doc.type === 'Tax' && <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>}
                                      {doc.type === 'PUC' && <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' /></svg>}
                                      {doc.type === 'Fitness' && <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>}
                                      {doc.type === 'GPS' && <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>}
                                      {doc.type === 'Permit' && <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' /></svg>}
                                    </div>
                                    <div>
                                      {doc.insuredName && <p className='text-sm font-black text-stone-800 group-hover:text-violet-600 transition-colors leading-tight'>{doc.insuredName}</p>}
                                      <p className='text-[10px] font-semibold text-stone-500 mt-0.5'>{doc.type === 'Tax' ? 'Road Tax' : doc.type}</p>
                                      <p className='text-[10px] font-mono font-bold text-stone-500 uppercase'>{doc.vehicleNumber}</p>
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    doc.daysLeft < 0
                                      ? 'bg-red-50 text-red-600 border border-red-100'
                                      : doc.daysLeft <= 2
                                      ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                                  }`}>
                                    {doc.daysLeft < 0 ? 'Expired' : doc.daysLeft === 0 ? 'Today' : `${doc.daysLeft}d left`}
                                  </span>
                                </div>

                                <div className='mt-4 pt-3 border-t border-stone-100/80 flex flex-col gap-1 text-[11px] text-stone-500'>
                                  <div className='flex justify-between'>
                                    <span className='font-medium text-stone-400'>Valid From:</span>
                                    <span className='font-semibold text-stone-700'>{doc.validFrom}</span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='font-medium text-stone-400'>Valid To:</span>
                                    <span className='font-semibold text-stone-700'>{doc.validTo}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

            <div className='mt-6 rounded-[28px] border border-stone-200 bg-white p-4 shadow-[0_28px_60px_-34px_rgba(68,64,60,0.25)] md:p-5 lg:p-6'>
              <h2 className='mb-6 flex items-center gap-2 text-lg font-black text-stone-900 before:h-5 before:w-1.5 before:rounded-full before:bg-gradient-to-b before:from-violet-500 before:to-fuchsia-500 before:content-[""]'>Recently Added</h2>
              {recentDocs.length === 0 ? (
                <div className='rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 py-12 text-center'>
                  <p className='text-sm font-bold text-stone-500'>No recently added documents.</p>
                </div>
              ) : (
                <>
                  <div className='space-y-3 lg:hidden'>
                    {recentDocs.map((doc) => {
                      const dotColor = ({ emerald: '#10B981', amber: '#F59E0B', indigo: '#6366F1', rose: '#F43F5E', blue: '#3B82F6', teal: '#14B8A6' })[doc.color] || '#3B82F6'
                      return (
                        <div key={doc.id} onClick={() => navigate(`/rto-documents/${doc.type}/${doc.id}`)} className='rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-[0_4px_16px_-6px_rgba(68,64,60,0.08)] transition-all hover:border-violet-300 hover:shadow-[0_8px_24px_-8px_rgba(139,92,246,0.18)] cursor-pointer'>
                          <div className='flex items-start gap-3'>
                            <div className='h-2 w-2 shrink-0 rounded-full mt-1' style={{ backgroundColor: dotColor }} />
                            <div className='min-w-0 flex-1'>
                              {doc.insuredName && <p className='text-sm font-black text-stone-800 leading-tight'>{doc.insuredName}</p>}
                              <p className='font-mono text-[11px] text-stone-400'>{doc.vehicleNumber}</p>
                              <p className='text-[11px] font-medium text-stone-500 mt-0.5'>{doc.type === 'Tax' ? 'Road Tax' : doc.type}</p>
                            </div>
                            <p className='whitespace-nowrap text-[11px] font-semibold text-violet-600 shrink-0'>{timeAgo(doc.createdAt)}</p>
                          </div>
                          <div className='mt-2.5 flex items-center gap-4 border-t border-stone-100 pt-2.5'>
                            <div className='text-[10px] text-stone-400'>
                              <span className='font-semibold text-stone-500'>From:</span> {doc.validFrom}
                            </div>
                            <div className='text-[10px] text-stone-400'>
                              <span className='font-semibold text-stone-500'>To:</span> {doc.validTo}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className='hidden lg:block'>
                    <div className='overflow-hidden rounded-2xl border border-stone-100 bg-white'>
                      <table className='w-full text-left'>
                        <thead>
                          <tr className='border-b border-stone-100 bg-stone-50/50'>
                            <th className='px-6 py-4 text-[10px] font-black uppercase tracking-wider text-stone-400'>Insured</th>
                            <th className='px-6 py-4 text-[10px] font-black uppercase tracking-wider text-stone-400'>Vehicle</th>
                            <th className='px-6 py-4 text-[10px] font-black uppercase tracking-wider text-stone-400'>Document</th>
                            <th className='px-6 py-4 text-[10px] font-black uppercase tracking-wider text-stone-400'>Valid From</th>
                            <th className='px-6 py-4 text-[10px] font-black uppercase tracking-wider text-stone-400'>Valid To</th>
                            <th className='px-6 py-4 text-[10px] font-black uppercase tracking-wider text-stone-400 text-right'>Added</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-stone-50'>
                          {recentDocs.map((doc) => (
                            <tr key={doc.id} onClick={() => navigate(`/rto-documents/${doc.type}/${doc.id}`)} className='transition-colors hover:bg-stone-50/50 group cursor-pointer'>
                              <td className='px-6 py-3 text-sm font-black text-stone-800'>{doc.insuredName || '\u2014'}</td>
                              <td className='px-6 py-3'>
                                <span className='font-mono text-xs font-bold text-stone-600'>{doc.vehicleNumber}</span>
                              </td>
                              <td className='px-6 py-3'>
                                <div className='flex items-center gap-3'>
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${doc.color}-50 text-${doc.color}-600`}>
                                    {doc.type === 'Insurance' && <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' /></svg>}
                                    {doc.type === 'Tax' && <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>}
                                    {doc.type === 'PUC' && <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' /></svg>}
                                    {doc.type === 'Fitness' && <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>}
                                    {doc.type === 'GPS' && <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' /></svg>}
                                    {doc.type === 'Permit' && <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' /></svg>}
                                  </div>
                                  <span className='text-sm font-bold text-stone-700'>{doc.type === 'Tax' ? 'Road Tax' : doc.type}</span>
                                </div>
                              </td>
                              <td className='px-6 py-3 text-xs font-medium text-stone-500'>{doc.validFrom}</td>
                              <td className='px-6 py-3 text-xs font-medium text-stone-500'>{doc.validTo}</td>
                              <td className='px-6 py-3 text-right'>
                                <span className='rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-black uppercase text-violet-600'>{timeAgo(doc.createdAt)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {showAddVehicleModal && (
        <AddVehicleModal
          isOpen={showAddVehicleModal}
          onClose={() => setShowAddVehicleModal(false)}
          onSuccess={() => {
            setShowAddVehicleModal(false)
            fetchVehicles()
          }}
          editData={null}
        />
      )}

      {showAddInsuranceModal && (
        <AddInsuranceModal
          isOpen={showAddInsuranceModal}
          onClose={() => {
            setShowAddInsuranceModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddInsuranceModal(false)
            fetchExpiringDocs()
            fetchRecentDocs()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {showUploadOptions && (
        <div
          className='fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4'
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false) }}
          onDrop={(e) => {
            e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) {
              setShowUploadOptions(false)
              setInitialExtractionFile(file)
              setShowAddInsuranceModal(true)
            }
          }}
        >
          <div className='bg-white rounded-2xl shadow-2xl max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-xl font-bold text-stone-900'>Upload Insurance</h2>
              <button onClick={() => setShowUploadOptions(false)} className='text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            <div className='space-y-4'>
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='w-full flex items-center gap-4 p-4 rounded-xl border-2 border-violet-200 bg-violet-50 hover:border-violet-400 hover:bg-violet-100 transition-all group text-left'
              >
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg group-hover:scale-110 transition-transform'>
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
                  </svg>
                </div>
                <div>
                  <p className='text-base font-black text-stone-900'>AI Upload</p>
                  <p className='text-xs text-stone-500 font-medium mt-0.5'>Upload document &amp; auto-fill details</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*,application/pdf'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setShowUploadOptions(false)
                    setInitialExtractionFile(file)
                    setShowAddInsuranceModal(true)
                  }
                  e.target.value = ''
                }}
              />
              <button
                type='button'
                onClick={() => {
                  setShowUploadOptions(false)
                  setInitialExtractionFile(null)
                  setShowAddInsuranceModal(true)
                }}
                className='w-full flex items-center gap-4 p-4 rounded-xl border-2 border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50 transition-all group text-left'
              >
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-stone-600 to-stone-800 text-white shadow-lg group-hover:scale-110 transition-transform'>
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                  </svg>
                </div>
                <div>
                  <p className='text-base font-black text-stone-900'>Manual Upload</p>
                  <p className='text-xs text-stone-500 font-medium mt-0.5'>Fill insurance details manually</p>
                </div>
              </button>
              <div className={`hidden md:flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-5 text-center transition-colors ${isDragOver ? 'border-violet-400 bg-violet-50' : 'border-stone-200 bg-transparent'}`}>
                <svg className='w-8 h-8 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' />
                </svg>
                <p className='text-sm font-semibold text-stone-600'>Drag &amp; drop your insurance document here</p>
                <p className='text-xs text-stone-400'>PDF or Image (max 15MB)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMobilePrompt && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm'>
            <div className='text-center mb-6'>
              <div className='w-14 h-14 bg-fuchsia-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg className='w-7 h-7 text-fuchsia-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' />
                </svg>
              </div>
              <h3 className='text-lg font-bold text-stone-800'>Almost done!</h3>
              <p className='text-sm text-stone-500 mt-1'>Please enter your mobile number to complete registration</p>
            </div>
            <input
              ref={promptRef}
              type='text'
              value={promptMobile}
              onChange={(e) => { setPromptMobile(e.target.value.replace(/\D/g, '').slice(0, 10)) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleMobileSubmit() }}
              placeholder='10-digit mobile number'
              className='w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all text-sm text-center font-medium tracking-widest'
              disabled={submittingMobile}
            />
            <button
              type='button'
              onClick={handleMobileSubmit}
              disabled={submittingMobile || promptMobile.length !== 10}
              className='w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 cursor-pointer'
            >
              {submittingMobile ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm'>
            <div className='text-center mb-6'>
              <div className='w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg className='w-7 h-7 text-violet-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
                </svg>
              </div>
              <h3 className='text-lg font-bold text-stone-800'>Set a password</h3>
              <p className='text-sm text-stone-500 mt-1'>Add a password so you can login with your email too</p>
            </div>
            <div className='space-y-3'>
              <div className='relative'>
                <input
                  ref={passwordPromptRef}
                  type={showPass ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSetPassword() }}
                  placeholder='New password (min. 6 characters)'
                  className='w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm text-center font-medium'
                  disabled={submittingPassword}
                />
                <button type='button' onClick={() => setShowPass(!showPass)} className='absolute right-3 top-1/2 -transtone-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer'>
                  {showPass ? (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' /></svg>
                  ) : (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' /></svg>
                  )}
                </button>
              </div>
              <div className='relative'>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSetPassword() }}
                  placeholder='Confirm password'
                  className='w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm text-center font-medium'
                  disabled={submittingPassword}
                />
                <button type='button' onClick={() => setShowConfirmPass(!showConfirmPass)} className='absolute right-3 top-1/2 -transtone-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer'>
                  {showConfirmPass ? (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' /></svg>
                  ) : (
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' /></svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type='button'
              onClick={handleSetPassword}
              disabled={submittingPassword || !passwordInput || passwordInput.length < 6 || passwordInput !== confirmPasswordInput}
              className='w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 cursor-pointer'
            >
              {submittingPassword ? 'Saving...' : 'Set Password'}
            </button>
            <button
              type='button'
              onClick={() => { localStorage.setItem('passwordPromptDismissedAt', new Date().toISOString()); setShowPasswordPrompt(false) }}
              disabled={submittingPassword}
              className='w-full mt-2 px-4 py-2.5 text-sm font-semibold text-stone-500 hover:text-stone-700 transition-colors cursor-pointer rounded-xl'
            >
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardContent
