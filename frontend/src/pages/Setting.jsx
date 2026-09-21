import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'
import { enforceMobileNumberFormat } from '../utils/contactValidation'
import { PLANS_CONFIG } from '../config/plansConfig'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const resolvePictureUrl = (picture) => {
  if (!picture) return ''
  if (picture.startsWith('data:') || picture.startsWith('http://') || picture.startsWith('https://')) return picture
  return `${API_URL}${picture}`
}

const PLAN_STYLES = {
  Free: { badge: 'from-slate-600 to-slate-800', ring: 'shadow-slate-500/10', chip: 'bg-slate-100 text-slate-600 border border-slate-200' },
  Go: { badge: 'from-blue-600 to-cyan-500', ring: 'shadow-blue-500/20', chip: 'bg-blue-50 text-blue-600 border border-blue-100' },
  Plus: { badge: 'from-violet-600 to-indigo-600', ring: 'shadow-indigo-500/20', chip: 'bg-indigo-50 text-indigo-600 border border-indigo-100' },
  Pro: { badge: 'from-amber-500 via-orange-500 to-rose-500', ring: 'shadow-amber-500/30', chip: 'bg-amber-50 text-amber-700 border border-amber-100' },
}
const getPlanStyle = (name) => PLAN_STYLES[name] || PLAN_STYLES.Free

const USAGE_ICONS = {
  ai: (
    <svg className='h-4 w-4 text-indigo-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
    </svg>
  ),
  manual: (
    <svg className='h-4 w-4 text-pink-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
    </svg>
  ),
  client: (
    <svg className='h-4 w-4 text-emerald-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8' />
    </svg>
  ),
}

const UsageStat = ({ icon, label, used, limit, colorClass }) => {
  const unlimited = !limit || limit <= 0
  const pct = unlimited ? 100 : Math.min(100, Math.round((used / limit) * 100))
  const near = !unlimited && pct >= 90
  return (
    <div className='group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_8px_30px_-6px_rgba(15,23,42,0.08)] transition-all duration-300 overflow-hidden'>
      <div className='absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
      <div className='flex items-center gap-3 mb-3'>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${colorClass}`}>
          {icon}
        </div>
        <span className='text-xs font-bold tracking-wider text-slate-500'>{label}</span>
      </div>
      <div className='flex items-baseline justify-between mb-2'>
        <span className='text-2xl font-black text-slate-900 tracking-tight'>{used}</span>
        <span className='text-xs font-bold text-slate-400'>{unlimited ? 'Unlimited' : `/ ${limit}`}</span>
      </div>
      <div className='h-2 w-full rounded-full bg-slate-100 overflow-hidden'>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            near ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const Setting = () => {
  const navigate = useNavigate()
  const { logout, user, setUser } = useAuth()
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editBusinessName, setEditBusinessName] = useState('')
  const [editModeOfBusiness, setEditModeOfBusiness] = useState([])
  const [modeOfBusinessInput, setModeOfBusinessInput] = useState('')
  const [editPicture, setEditPicture] = useState('')
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [saving, setSaving] = useState(false)
  const [myPlan, setMyPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/user-plans/my-plan`, { withCredentials: true })
        const data = response.data?.data || null
        if (data) {
          const cfg = PLANS_CONFIG.find((p) => p.id === data.planKey)
          setMyPlan({ ...data, _config: cfg })
        } else {
          setMyPlan(null)
        }
      } catch (error) {
        console.error('Error fetching plan:', error)
      } finally {
        setPlanLoading(false)
      }
    }
    loadPlan()
  }, [])

  useEffect(() => {
    if (showEditModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showEditModal])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const openEditModal = () => {
    setEditName(user?.name || '')
    setEditMobile(user?.mobile || '')
    setEditAddress(user?.address || '')
    setEditBusinessName(user?.businessName || '')
    setEditModeOfBusiness(user?.modeOfBusiness || [])
    setModeOfBusinessInput('')
    setEditPicture(user?.picture || '')
    setShowEditModal(true)
  }

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setUploadingPicture(true)
    try {
      const formData = new FormData()
      formData.append('document', file)
      const res = await axios.post(`${API_URL}/api/upload/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      })
      if (res.data.success) {
        setEditPicture(res.data.data.path)
      } else {
        toast.error('Failed to upload image')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image')
    } finally {
      setUploadingPicture(false)
    }
  }

  const addModeOfBusiness = () => {
    const value = modeOfBusinessInput.trim()
    if (!value) return
    setEditModeOfBusiness((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setModeOfBusinessInput('')
  }

  const removeModeOfBusiness = (value) => {
    setEditModeOfBusiness((prev) => prev.filter((m) => m !== value))
  }

  const handleModeOfBusinessKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addModeOfBusiness()
    }
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const response = await axios.put(`${API_URL}/api/auth/profile`, {
        name: editName.trim(),
        mobile: editMobile,
        address: editAddress,
        businessName: editBusinessName,
        modeOfBusiness: editModeOfBusiness,
        picture: editPicture
      }, { withCredentials: true })
      if (response.data.success) {
        setUser(response.data.data.user)
        setShowEditModal(false)
        toast.success('Profile updated successfully')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-50/50 px-4 pb-32 pt-8 md:px-6 lg:px-8 font-sans'>
      <div className='mx-auto max-w-6xl'>
        {/* Header Banner */}
        <div className='relative mb-8 overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-900 to-indigo-950 p-4 md:p-5 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.3)]'>
          <div className='absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl' />
          <div className='absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 blur-3xl' />
          <div className='relative flex flex-col md:flex-row md:items-center justify-between gap-6'>
            <div className='flex items-center gap-3'>
              <div className='h-9 w-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/10'>
                <svg className='h-5 w-5 text-indigo-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                </svg>
              </div>
              <div>
                <h1 className='text-lg md:text-xl font-black tracking-tight text-white'>Account Settings</h1>
                <p className='text-indigo-200 text-[11px] md:text-xs font-semibold tracking-wide mt-0.5'>Manage your profile, preferences, and subscriptions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column Layout */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          
          {/* ===== Left Column – Profile Card ===== */}
          <div className='lg:col-span-4'>
            <div className='lg:sticky lg:top-6 space-y-6'>
              <div className='relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_15px_40px_-20px_rgba(15,23,42,0.15)]'>
                {/* Visual Accent header */}
                <div className='h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600' />
                
                <div className='px-6 pb-6 pt-0 text-center relative'>
                  {/* Overlapping Avatar */}
                  <div className='relative h-24 w-24 mx-auto -mt-12 mb-4'>
                    <div className='h-full w-full rounded-full flex items-center justify-center overflow-hidden font-black text-slate-800 text-3xl bg-slate-100'>
                      {user?.picture ? (
                        <img src={resolvePictureUrl(user.picture)} alt={user.name} className='h-full w-full object-cover' />
                      ) : (
                        user?.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <span className='absolute bottom-1 right-1 flex h-4 w-4'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                      <span className='relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white'></span>
                    </span>
                  </div>

                  <h2 className='text-xl font-bold text-slate-900 truncate max-w-full'>{user?.name || 'User'}</h2>
                  <div className='inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100'>
                    <p className='text-[10px] font-black tracking-wider'>Active Member</p>
                  </div>

                  <button
                    onClick={openEditModal}
                    className='mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 text-sm font-bold hover:shadow-[0_8px_25px_-4px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:translate-y-0'
                  >
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
                    </svg>
                    Edit Profile
                  </button>

                  {/* Profile Details List */}
                  <div className='mt-5 text-left space-y-2.5'>
                    <div className='flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3 border border-slate-100 hover:bg-slate-100/50 transition-colors duration-200'>
                      <div className='h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100'>
                        <svg className='h-4 w-4 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                        </svg>
                      </div>
                      <div className='min-w-0'>
                        <p className='text-[10px] font-bold tracking-wider text-slate-400'>Mobile</p>
                        <p className='text-sm font-bold text-slate-800'>{user?.mobile?.replace(/(\d{5})(\d{5})/, '$1 $2') || 'Not linked'}</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3 border border-slate-100 hover:bg-slate-100/50 transition-colors duration-200'>
                      <div className='h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 border border-violet-100'>
                        <svg className='h-4 w-4 text-violet-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                        </svg>
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-1'>
                          <p className='text-[10px] font-bold tracking-wider text-slate-400'>Email Address</p>
                          {user?.emailVerified && (
                            <span className='inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200'>
                              <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                              </svg>
                              Verified
                            </span>
                          )}
                        </div>
                        <p className='text-sm font-bold text-slate-800 truncate'>{user?.email || 'Not linked'}</p>
                      </div>
                    </div>

                    {user?.businessName && (
                      <div className='flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3 border border-slate-100 hover:bg-slate-100/50 transition-colors duration-200'>
                        <div className='h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100'>
                          <svg className='h-4 w-4 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                          </svg>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-bold tracking-wider text-slate-400'>Business Name</p>
                          <p className='text-sm font-bold text-slate-800 truncate'>{user.businessName}</p>
                        </div>
                      </div>
                    )}

                    {user?.modeOfBusiness?.length > 0 && (
                      <div className='flex items-start gap-3.5 rounded-2xl bg-slate-50 p-3 border border-slate-100 hover:bg-slate-100/50 transition-colors duration-200'>
                        <div className='h-9 w-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 border border-sky-100'>
                          <svg className='h-4 w-4 text-sky-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                          </svg>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='text-[10px] font-bold tracking-wider text-slate-400 mb-1'>Services</p>
                          <div className='flex flex-wrap gap-1.5'>
                            {user.modeOfBusiness.map((mode) => (
                              <span key={mode} className='inline-flex items-center rounded-lg bg-sky-100 text-sky-700 px-2 py-0.5 text-xs font-bold'>
                                {mode}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {user?.address && (
                      <div className='flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3 border border-slate-100 hover:bg-slate-100/50 transition-colors duration-200'>
                        <div className='h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100'>
                          <svg className='h-4 w-4 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                          </svg>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-bold tracking-wider text-slate-400'>Address</p>
                          <p className='text-sm font-bold text-slate-800 truncate'>{user.address}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Wallet Balance */}
                  <div className='mt-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 p-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center'>
                          <svg className='h-4 w-4 text-amber-700' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                          </svg>
                        </div>
                        <span className='text-xs font-bold tracking-wider text-amber-700'>Wallet Balance</span>
                      </div>
                      <span className='text-xl font-black text-amber-800'>₹{user?.walletBalance || 0}</span>
                    </div>
                    <Link
                      to='/refer-and-earn'
                      className='mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-100/50 hover:bg-amber-100 rounded-xl py-2 transition-colors'
                    >
                      <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
                      </svg>
                      Refer & Earn – Invite friends, get ₹99 each
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Right Column – Subscription, Settings & Actions ===== */}
          <div className='lg:col-span-8 space-y-6'>
            
            {/* Subscription Plan Card */}
            <div className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)]'>
              <div className='flex items-center justify-between border-b border-slate-100 pb-5 mb-5'>
                <div className='flex items-center gap-3'>
                  <div className='h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100'>
                    <svg className='h-5 w-5 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-sm font-bold text-slate-800 tracking-tight'>Active Subscription</h3>
                    <p className='text-[10px] text-slate-400 font-semibold tracking-wider mt-0.5'>Billing details &amp; quotas</p>
                  </div>
                </div>
                <Link
                  to='/pricing'
                  className='inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:-translate-y-0.5 transition-all duration-200'
                >
                  Explore Plans
                  <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                  </svg>
                </Link>
              </div>

              {planLoading ? (
                <div className='animate-pulse space-y-5'>
                  <div className='flex items-center justify-between'>
                    <div className='h-8 w-28 rounded-full bg-slate-100' />
                    <div className='h-8 w-24 rounded-xl bg-slate-100' />
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                    <div className='h-24 rounded-2xl bg-slate-100' />
                    <div className='h-24 rounded-2xl bg-slate-100' />
                    <div className='h-24 rounded-2xl bg-slate-100' />
                  </div>
                </div>
              ) : myPlan ? (
                (() => {
                  const planName = myPlan._config?.name || myPlan.name || 'Free'
                  const style = getPlanStyle(planName)
                  const isExpired = myPlan.status === 'expired'
                  const daysLeft = myPlan.expiryDate
                    ? Math.ceil((new Date(myPlan.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null
                  return (
                    <div className='space-y-6'>
                      <div className='flex flex-wrap items-center justify-between gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100'>
                        <div className='flex items-center gap-3'>
                          <span className={`inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r ${style.badge} px-5 py-2.5 text-base font-black text-white shadow-lg ${style.ring}`}>
                            {planName}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider ${isExpired ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            <span className={`h-2 w-2 rounded-full ${isExpired ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {isExpired ? 'Expired' : 'Active'}
                          </span>
                        </div>
                        <div className='text-left sm:text-right'>
                          <p className='text-[10px] font-bold tracking-wider text-slate-400'>
                            {isExpired ? 'Expired On' : myPlan.expiryDate ? 'Expiration / Renewal Date' : 'Plan Duration'}
                          </p>
                          <p className={`text-sm font-extrabold ${isExpired ? 'text-rose-600' : 'text-slate-800'} mt-1`}>
                            {myPlan.expiryDate ? new Date(myPlan.expiryDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Never Expires'}
                            {!isExpired && daysLeft !== null && daysLeft <= 7 && (
                              <span className='ml-2 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100'>({daysLeft <= 0 ? 'today' : `${daysLeft}d left`})</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {myPlan._config?.features && (
                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                          <UsageStat
                            icon={USAGE_ICONS.ai}
                            label='AI Documents'
                            used={myPlan.usage?.aiDocumentsUsed || 0}
                            limit={myPlan._config.features.aiDocuments}
                            colorClass='bg-indigo-50 border border-indigo-100'
                          />
                          <UsageStat
                            icon={USAGE_ICONS.manual}
                            label='Manual Uploads'
                            used={myPlan.usage?.manualDocumentsUsed || 0}
                            limit={myPlan._config.features.manualDocuments}
                            colorClass='bg-pink-50 border border-pink-100'
                          />
                          <UsageStat
                            icon={USAGE_ICONS.client}
                            label='Client Limit'
                            used={myPlan.clientsUsed ?? 0}
                            limit={myPlan._config.features.clientLimit}
                            colorClass='bg-emerald-50 border border-emerald-100'
                          />
                        </div>
                      )}

                      {(isExpired || planName !== 'Pro') && (
                        <Link
                          to='/pricing'
                          className='flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white py-4 text-sm font-black tracking-wide hover:shadow-[0_8px_25px_-4px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 shadow-lg shadow-indigo-600/10'
                        >
                          {isExpired ? 'Renew Subsciption' : 'Upgrade Plan'}
                        </Link>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div className='text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200'>
                  <p className='text-sm font-bold text-slate-500'>No active billing profile found</p>
                </div>
              )}
            </div>

            {/* Database Management Options */}
            <div className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)]'>
              <div className='flex items-center gap-3 border-b border-slate-100 pb-5 mb-5'>
                <div className='h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100'>
                  <svg className='h-5 w-5 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-bold text-slate-800 tracking-tight'>Database Management</h3>
                  <p className='text-[10px] text-slate-400 font-semibold tracking-wider mt-0.5'>Manage directory names &amp; categories</p>
                </div>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <button
                  onClick={() => navigate('/client-name')}
                  className='group flex items-center gap-4 rounded-2xl bg-slate-50/50 hover:bg-indigo-50/20 p-4 border border-slate-100 hover:border-indigo-200 transition-all duration-300 text-left cursor-pointer'
                >
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-transform duration-200'>
                    <svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.418 0-8 2.239-8 5v1a1 1 0 001 1h14a1 1 0 001-1v-1c0-2.761-3.582-5-8-5z' />
                    </svg>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors'>Client Name</p>
                    <p className='text-[10px] font-semibold text-slate-400 mt-0.5'>List of clients linked to vehicles</p>
                  </div>
                  <svg className='h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/agent-name')}
                  className='group flex items-center gap-4 rounded-2xl bg-slate-50/50 hover:bg-purple-50/20 p-4 border border-slate-100 hover:border-purple-200 transition-all duration-300 text-left cursor-pointer'
                >
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/10 group-hover:scale-105 transition-transform duration-200'>
                    <svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M3 7a2 2 0 012-2h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z' />
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M8 5V4a1 1 0 011-1h6a1 1 0 011 1v1M12 13a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM8.5 17c.5-1.5 1.941-2.5 3.5-2.5s3 1 3.5 2.5' />
                    </svg>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors'>Agent Name</p>
                    <p className='text-[10px] font-semibold text-slate-400 mt-0.5'>Manage agent IDs and names</p>
                  </div>
                  <svg className='h-4 w-4 shrink-0 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                  </svg>
                </button>
              </div>
            </div>

            {/* Refer & Earn */}
            <div className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)]'>
              <div className='flex items-center gap-3 border-b border-slate-100 pb-5 mb-5'>
                <div className='h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100'>
                  <svg className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-bold text-slate-800 tracking-tight'>Refer & Earn</h3>
                  <p className='text-[10px] text-slate-400 font-semibold tracking-wider mt-0.5'>Invite friends, earn ₹99 per referral</p>
                </div>
              </div>
              <Link
                to='/refer-and-earn'
                className='group flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 p-4 border border-emerald-100 hover:border-emerald-200 transition-all duration-300'
              >
                <div className='flex items-center gap-3'>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform duration-200'>
                    <svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
                    </svg>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors'>Referral Program</p>
                    <p className='text-[10px] font-semibold text-slate-400 mt-0.5'>Share your code & track earnings</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-black text-emerald-600 bg-white px-3 py-1 rounded-lg border border-emerald-200 shadow-sm'>₹99 each</span>
                  <svg className='h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                  </svg>
                </div>
              </Link>
            </div>

            {/* Legal, Support & Info */}
            <div className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)] space-y-6'>
              <div className='flex items-center gap-3 border-b border-slate-100 pb-5 mb-5'>
                <div className='h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100'>
                  <svg className='h-5 w-5 text-rose-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-bold text-slate-800 tracking-tight'>Help &amp; Documentation</h3>
                  <p className='text-[10px] text-slate-400 font-semibold tracking-wider mt-0.5'>Support, terms &amp; legal resources</p>
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <a href='mailto:mybimabox@gmail.com' className='group flex items-center gap-4 rounded-2xl bg-slate-50/50 hover:bg-blue-50/20 p-4 border border-slate-100 hover:border-blue-200 transition-all duration-300 text-left'>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform duration-200'>
                    <svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                    </svg>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors'>Email Helpdesk</p>
                    <p className='text-[10px] font-semibold text-slate-400 mt-0.5'>mybimabox@gmail.com</p>
                  </div>
                </a>

                <a href='tel:+917004534508' className='group flex items-center gap-4 rounded-2xl bg-slate-50/50 hover:bg-emerald-50/20 p-4 border border-slate-100 hover:border-emerald-200 transition-all duration-300 text-left'>
                  <div className='h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform duration-200'>
                    <svg className='h-6 w-6 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                    </svg>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors'>Direct Hotline</p>
                    <p className='text-[10px] font-semibold text-slate-400 mt-0.5'>+91 7004534508</p>
                  </div>
                </a>
              </div>

              {/* Social Channels */}
              <div className='pt-2'>
                <div className='flex items-center gap-2 mb-3'>
                  <div className='h-1.5 w-1.5 rounded-full bg-slate-300' />
                  <span className='text-[10px] font-bold tracking-wider text-slate-400'>Connect with us</span>
                </div>
                <div className='flex items-center gap-3'>
                  <a
                    href='https://www.instagram.com/bimabox.in/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group flex items-center justify-center h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 hover:shadow-lg hover:shadow-pink-500/10 hover:-translate-y-0.5 transition-all duration-200 active:scale-95'
                    aria-label='Instagram'
                  >
                    <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                      <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' />
                    </svg>
                  </a>
                  
                  <a
                    href='https://www.facebook.com/profile.php?viewas=100000686899395&id=61590698249898'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group flex items-center justify-center h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-200 active:scale-95'
                    aria-label='Facebook'
                  >
                    <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                      <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Legal Link Grid */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-left'>
                <Link
                  to='/contact-us'
                  className='group flex items-center justify-between rounded-2xl bg-slate-50/50 hover:bg-rose-50/20 p-3.5 border border-slate-100 hover:border-rose-200 transition-all duration-300'
                >
                  <div>
                    <p className='text-xs font-bold text-slate-800 group-hover:text-rose-700 transition-colors'>Support Center</p>
                    <p className='text-[9px] text-slate-400 mt-0.5 font-semibold'>Help &amp; contact info</p>
                  </div>
                  <svg className='h-4 w-4 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                  </svg>
                </Link>

                <Link
                  to='/privacy-policy'
                  className='group flex items-center justify-between rounded-2xl bg-slate-50/50 hover:bg-blue-50/20 p-3.5 border border-slate-100 hover:border-blue-200 transition-all duration-300'
                >
                  <div>
                    <p className='text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors'>Privacy Policy</p>
                    <p className='text-[9px] text-slate-400 mt-0.5 font-semibold'>Security &amp; rules</p>
                  </div>
                  <svg className='h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                  </svg>
                </Link>

                <Link
                  to='/terms-and-conditions'
                  className='group flex items-center justify-between rounded-2xl bg-slate-50/50 hover:bg-violet-50/20 p-3.5 border border-slate-100 hover:border-violet-200 transition-all duration-300'
                >
                  <div>
                    <p className='text-xs font-bold text-slate-800 group-hover:text-violet-700 transition-colors'>Terms of Service</p>
                    <p className='text-[9px] text-slate-400 mt-0.5 font-semibold'>Legal guidelines</p>
                  </div>
                  <svg className='h-4 w-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Logout Card */}
            <div>
              <button
                onClick={handleLogout}
                className='group w-full flex items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-200 py-4.5 text-xs font-black tracking-wider text-rose-600 transition-all hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.15)] active:scale-[0.99] cursor-pointer'
              >
                <svg className='h-4.5 w-4.5 text-rose-600 transition-transform group-hover:translate-x-0.5 duration-200' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
                </svg>
                Sign out of BimaOne
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4' onClick={() => setShowEditModal(false)}>
          <div className='bg-white rounded-3xl shadow-2xl w-full max-w-md mx-auto overflow-hidden animate-scaleUp border border-slate-100 max-h-[90vh] flex flex-col' onClick={e => e.stopPropagation()}>
            <div className='bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white shrink-0'>
              <div className='flex justify-between items-center'>
                <div>
                  <h2 className='text-lg font-bold'>Edit Profile</h2>
                  <p className='text-slate-300 text-xs mt-0.5'>Update your personal settings</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className='text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition cursor-pointer'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            </div>
            <div className='p-6 space-y-4 overflow-y-auto flex-1 min-h-0'>
              <div className='flex justify-center'>
                <div className='relative h-24 w-24'>
                  <div className='h-full w-full rounded-full flex items-center justify-center overflow-hidden font-black text-slate-800 text-3xl bg-slate-100'>
                    {uploadingPicture ? (
                      <svg className='h-6 w-6 animate-spin text-indigo-500' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                      </svg>
                    ) : editPicture ? (
                      <img src={resolvePictureUrl(editPicture)} alt={editName} className='h-full w-full object-cover' />
                    ) : (
                      editName?.charAt(0) || 'U'
                    )}
                  </div>
                  <label
                    htmlFor='profile-picture-upload'
                    className='absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-2 ring-white hover:bg-indigo-700 transition-colors cursor-pointer'
                    title='Change photo'
                  >
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' />
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 13a3 3 0 11-6 0 3 3 0 016 0z' />
                    </svg>
                    <input
                      id='profile-picture-upload'
                      type='file'
                      accept='image/*'
                      onChange={handlePictureUpload}
                      disabled={uploadingPicture}
                      className='hidden'
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className='block text-xs font-bold tracking-wider text-slate-500 mb-1.5'>Full Name <span className='text-rose-500'>*</span></label>
                <input
                  type='text'
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder='Enter full name'
                  className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none text-sm text-slate-800 font-semibold'
                />
              </div>
              <div>
                <label className='block text-xs font-bold tracking-wider text-slate-500 mb-1.5'>Mobile Number</label>
                <input
                  type='text'
                  value={editMobile}
                  onChange={(e) => setEditMobile(enforceMobileNumberFormat(e.target.value))}
                  placeholder='Enter mobile number'
                  maxLength={10}
                  className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none text-sm text-slate-800 font-semibold'
                />
              </div>
              <div>
                <label className='block text-xs font-bold tracking-wider text-slate-500 mb-1.5'>Email Address</label>
                <input
                  type='email'
                  value={user?.email || ''}
                  disabled
                  className='w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 text-sm font-semibold cursor-not-allowed'
                />
                <p className='text-[10px] text-slate-400 mt-1 font-semibold'>Email address cannot be modified</p>
              </div>
              <div>
                <label className='block text-xs font-bold tracking-wider text-slate-500 mb-1.5'>Business / Agency Name</label>
                <input
                  type='text'
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  placeholder='Enter agency or business name'
                  className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none text-sm text-slate-800 font-semibold'
                />
              </div>
              <div>
                <label className='block text-xs font-bold tracking-wider text-slate-500 mb-1.5'>Services</label>
                <div className='flex flex-wrap gap-1.5 mb-2'>
                  {editModeOfBusiness.map((mode) => (
                    <span key={mode} className='inline-flex items-center gap-1 rounded-lg bg-sky-100 text-sky-700 pl-2 pr-1 py-0.5 text-xs font-bold'>
                      {mode}
                      <button
                        type='button'
                        onClick={() => removeModeOfBusiness(mode)}
                        className='text-sky-500 hover:text-sky-800 rounded-full p-0.5 cursor-pointer'
                      >
                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type='text'
                  value={modeOfBusinessInput}
                  onChange={(e) => setModeOfBusinessInput(e.target.value)}
                  onKeyDown={handleModeOfBusinessKeyDown}
                  onBlur={addModeOfBusiness}
                  placeholder='Type a service and press Enter (e.g. Insurance, Mutual Fund, NPS, Loan)'
                  className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none text-sm text-slate-800 font-semibold'
                />
                <p className='text-[10px] text-slate-400 mt-1 font-semibold'>Press Enter or comma to add each service</p>
              </div>
              <div>
                <label className='block text-xs font-bold tracking-wider text-slate-500 mb-1.5'>Office Address</label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder='Enter full office/business address'
                  rows={2}
                  className='w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none text-sm text-slate-800 font-semibold resize-none'
                />
              </div>
            </div>
            <div className='border-t border-slate-100 p-4 bg-slate-50/50 flex justify-end gap-3 shrink-0'>
              <button type='button' onClick={() => setShowEditModal(false)} className='px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 cursor-pointer transition-colors'>Cancel</button>
              <button
                type='button'
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className='px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer'
              >
                {saving ? (
                  <span className='flex items-center gap-2'>
                    <svg className='h-4 w-4 animate-spin text-white' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Setting
