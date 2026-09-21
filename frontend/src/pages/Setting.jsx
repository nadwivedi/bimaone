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


const ICONS = {
  mobile: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  business: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  services: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  address: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  plan: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  ai: 'M13 10V3L4 14h7v7l9-11h-7z',
  manual: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  clients: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8',
  client: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  agent: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  gift: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  wallet: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  instagram: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z',
  facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
}

const SettingGroup = ({ title, children, className = '' }) => (
  <section className={className}>
    <p className='mb-1.5 px-4 text-[11px] font-bold uppercase tracking-wider text-stone-400'>{title}</p>
    <div className='overflow-hidden rounded-2xl bg-white divide-y divide-stone-100 ring-1 ring-stone-200/70'>
      {children}
    </div>
  </section>
)

const SettingRow = ({ icon, color, label, value, to, href, onClick, external, chevron = true }) => {
  const content = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${color}`}>
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={icon} />
        </svg>
      </span>
      <span className='min-w-0 flex-1 text-sm font-semibold text-stone-800'>{label}</span>
      {value != null && value !== '' && (
        <span className='min-w-0 max-w-[55%] truncate text-right text-sm text-stone-400'>{value}</span>
      )}
      {chevron && (
        <svg className='h-4 w-4 shrink-0 text-stone-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
        </svg>
      )}
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 active:bg-stone-100'
  if (to) return <Link to={to} className={cls}>{content}</Link>
  if (href) return <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{content}</a>
  if (onClick) return <button type='button' onClick={onClick} className={`${cls} cursor-pointer`}>{content}</button>
  return <div className={cls}>{content}</div>
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

  const planName = myPlan ? (myPlan._config?.name || myPlan.name || 'Free') : null
  const planExpired = myPlan?.status === 'expired'
  const planDaysLeft = myPlan?.expiryDate
    ? Math.ceil((new Date(myPlan.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const planFeatures = myPlan?._config?.features
  const usageText = (used, limit) => (!limit || limit <= 0 ? `${used} · Unlimited` : `${used} / ${limit}`)

  return (
    <div className='min-h-screen bg-stone-100/70 px-3 pb-32 pt-4 md:px-6 font-sans'>
      <div className='mx-auto max-w-2xl space-y-6 lg:hidden'>
        {/* Left column: profile + account */}
        <div className='space-y-6'>
        {/* Profile header */}
        <div className='flex flex-col items-center pt-4 text-center'>
          <div className='relative'>
            <div className='flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl font-black text-white shadow-lg shadow-violet-500/25 ring-4 ring-white'>
              {user?.picture ? (
                <img src={resolvePictureUrl(user.picture)} alt={user.name} className='h-full w-full object-cover' />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <button
              type='button'
              onClick={openEditModal}
              className='absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white ring-4 ring-stone-100 hover:bg-violet-700 transition-colors cursor-pointer'
              aria-label='Edit profile'
            >
              <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
              </svg>
            </button>
          </div>
          <h1 className='mt-3 text-xl font-black text-stone-900'>{user?.name || 'User'}</h1>
          <p className='text-sm text-stone-500'>{user?.email || user?.mobile || ''}</p>
          <button
            type='button'
            onClick={openEditModal}
            className='mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-stone-200 hover:bg-violet-50 transition-colors cursor-pointer'
          >
            Edit Profile
          </button>
        </div>

        <SettingGroup title='Account'>
          <SettingRow icon={ICONS.mobile} color='bg-emerald-500' label='Mobile' value={user?.mobile?.replace(/(\d{5})(\d{5})/, '$1 $2') || 'Not linked'} onClick={openEditModal} />
          <SettingRow icon={ICONS.email} color='bg-sky-500' label='Email' value={user?.email ? (user?.emailVerified ? `${user.email} ✓` : user.email) : 'Not linked'} chevron={false} />
          <SettingRow icon={ICONS.business} color='bg-amber-500' label='Business' value={user?.businessName || 'Add'} onClick={openEditModal} />
          {user?.modeOfBusiness?.length > 0 && (
            <SettingRow icon={ICONS.services} color='bg-cyan-500' label='Services' value={user.modeOfBusiness.join(', ')} onClick={openEditModal} />
          )}
          <SettingRow icon={ICONS.address} color='bg-rose-400' label='Address' value={user?.address || 'Add'} onClick={openEditModal} />
        </SettingGroup>
        </div>

        {/* Right column: plan, manage, support, legal */}
        <div className='space-y-6'>

        <SettingGroup title='Plan'>
          {planLoading ? (
            <div className='animate-pulse px-4 py-4'>
              <div className='h-4 w-1/2 rounded bg-stone-100' />
            </div>
          ) : myPlan ? (
            <>
              <SettingRow
                icon={ICONS.plan}
                color='bg-violet-600'
                label={`${planName} plan`}
                value={planExpired
                  ? 'Expired'
                  : myPlan.expiryDate
                  ? (planDaysLeft <= 0 ? 'Ends today' : `${planDaysLeft}d left`)
                  : 'Never expires'}
                to='/pricing'
              />
              {planFeatures && (
                <>
                  <SettingRow icon={ICONS.ai} color='bg-fuchsia-500' label='AI Documents' value={usageText(myPlan.usage?.aiDocumentsUsed || 0, planFeatures.aiDocuments)} chevron={false} />
                  <SettingRow icon={ICONS.manual} color='bg-pink-500' label='Manual Uploads' value={usageText(myPlan.usage?.manualDocumentsUsed || 0, planFeatures.manualDocuments)} chevron={false} />
                  <SettingRow icon={ICONS.clients} color='bg-teal-500' label='Clients' value={usageText(myPlan.clientsUsed ?? 0, planFeatures.clientLimit)} chevron={false} />
                </>
              )}
              {(planExpired || planName !== 'Pro') && (
                <Link to='/pricing' className='block px-4 py-3 text-center text-sm font-bold text-violet-600 hover:bg-violet-50 transition-colors'>
                  {planExpired ? 'Renew Subscription' : 'Upgrade Plan'}
                </Link>
              )}
            </>
          ) : (
            <SettingRow icon={ICONS.plan} color='bg-stone-400' label='No active plan' value='See plans' to='/pricing' />
          )}
        </SettingGroup>

        <SettingGroup title='Manage'>
          <SettingRow icon={ICONS.client} color='bg-violet-500' label='Client Names' onClick={() => navigate('/client-name')} />
          <SettingRow icon={ICONS.agent} color='bg-purple-500' label='Agent Names' onClick={() => navigate('/agent-name')} />
          {/* <SettingRow icon={ICONS.gift} color='bg-orange-500' label='Refer & Earn' value='₹99 each' to='/refer-and-earn' /> */}
          {/* <SettingRow icon={ICONS.wallet} color='bg-amber-500' label='Wallet Balance' value={`₹${user?.walletBalance || 0}`} to='/refer-and-earn' /> */}
        </SettingGroup>

        <SettingGroup title='Support'>
          <SettingRow icon={ICONS.email} color='bg-sky-500' label='Email Helpdesk' value='mybimabox@gmail.com' href='mailto:mybimabox@gmail.com' />
          <SettingRow icon={ICONS.phone} color='bg-emerald-500' label='Call Us' value='+91 7004534508' href='tel:+917004534508' />
          <SettingRow icon={ICONS.help} color='bg-stone-500' label='Support Center' to='/contact-us' />
          <SettingRow icon={ICONS.instagram} color='bg-pink-500' label='Instagram' href='https://www.instagram.com/bimabox.in/' external />
          <SettingRow icon={ICONS.facebook} color='bg-blue-600' label='Facebook' href='https://www.facebook.com/profile.php?viewas=100000686899395&id=61590698249898' external />
        </SettingGroup>

        <SettingGroup title='Legal'>
          <SettingRow icon={ICONS.lock} color='bg-stone-600' label='Privacy Policy' to='/privacy-policy' />
          <SettingRow icon={ICONS.doc} color='bg-stone-600' label='Terms of Service' to='/terms-and-conditions' />
        </SettingGroup>

        <div className='overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/70'>
          <button
            type='button'
            onClick={handleLogout}
            className='w-full px-4 py-3.5 text-center text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer'
          >
            Sign Out
          </button>
        </div>
        <p className='pb-2 text-center text-[11px] font-semibold text-stone-400'>BimaOne</p>
        </div>
      </div>

      {/* ===== Desktop layout ===== */}
      <div className='mx-auto hidden max-w-6xl space-y-6 lg:block'>
        {/* Profile hero */}
        <div className='overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/70'>
          <div className='flex items-center justify-between gap-6 px-8 py-6'>
            <div className='flex items-center gap-5'>
              <div className='flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl font-black text-white shadow-lg shadow-violet-500/20'>
                {user?.picture ? (
                  <img src={resolvePictureUrl(user.picture)} alt={user.name} className='h-full w-full object-cover' />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <h1 className='text-2xl font-black text-stone-900'>{user?.name || 'User'}</h1>
                <div className='mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500'>
                  {user?.email && <span>{user.email}</span>}
                  {user?.emailVerified && (
                    <span className='rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-200'>Verified</span>
                  )}
                  {user?.businessName && (
                    <>
                      <span className='text-stone-300'>•</span>
                      <span className='font-semibold text-violet-700'>{user.businessName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              type='button'
              onClick={openEditModal}
              className='flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors cursor-pointer'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
              </svg>
              Edit Profile
            </button>
          </div>

          {/* Plan + usage strip */}
          <div className='grid grid-cols-4 divide-x divide-stone-100 border-t border-stone-100 bg-stone-50/60'>
            <div className='px-6 py-5'>
              <p className='text-[11px] font-bold uppercase tracking-wider text-stone-400'>Current Plan</p>
              {planLoading ? (
                <div className='mt-2 h-6 w-24 animate-pulse rounded bg-stone-200' />
              ) : (
                <>
                  <p className='mt-1 text-xl font-black text-stone-900'>{planName || 'No plan'}</p>
                  <p className={`text-xs font-semibold ${planExpired ? 'text-orange-600' : 'text-stone-500'}`}>
                    {!myPlan
                      ? 'No active subscription'
                      : planExpired
                      ? 'Expired'
                      : myPlan.expiryDate
                      ? (planDaysLeft <= 0 ? 'Ends today' : `${planDaysLeft} days left`)
                      : 'Never expires'}
                  </p>
                  {(!myPlan || planExpired || planName !== 'Pro') && (
                    <Link to='/pricing' className='mt-2 inline-block text-xs font-bold text-violet-600 hover:text-violet-800'>
                      {planExpired ? 'Renew now →' : 'Upgrade →'}
                    </Link>
                  )}
                </>
              )}
            </div>
            {[
              { label: 'AI Documents', icon: ICONS.ai, color: 'bg-fuchsia-500', used: myPlan?.usage?.aiDocumentsUsed || 0, limit: planFeatures?.aiDocuments },
              { label: 'Manual Uploads', icon: ICONS.manual, color: 'bg-pink-500', used: myPlan?.usage?.manualDocumentsUsed || 0, limit: planFeatures?.manualDocuments },
              { label: 'Clients', icon: ICONS.clients, color: 'bg-teal-500', used: myPlan?.clientsUsed ?? 0, limit: planFeatures?.clientLimit },
            ].map((u) => {
              const unlimited = !u.limit || u.limit <= 0
              const pct = unlimited ? 100 : Math.min(100, Math.round((u.used / u.limit) * 100))
              return (
                <div key={u.label} className='px-6 py-5'>
                  <div className='flex items-center gap-2'>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-md text-white ${u.color}`}>
                      <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={u.icon} />
                      </svg>
                    </span>
                    <p className='text-[11px] font-bold uppercase tracking-wider text-stone-400'>{u.label}</p>
                  </div>
                  <p className='mt-2 text-xl font-black text-stone-900'>
                    {planLoading ? '…' : u.used}
                    <span className='ml-1 text-xs font-bold text-stone-400'>{unlimited ? '· Unlimited' : `/ ${u.limit}`}</span>
                  </p>
                  <div className='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200'>
                    <div className={`h-full rounded-full ${pct >= 90 && !unlimited ? 'bg-orange-500' : 'bg-violet-500'}`} style={{ width: `${planLoading ? 0 : pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className='grid grid-cols-3 items-start gap-6'>
          {/* Personal details */}
          <div className='col-span-2 rounded-3xl bg-white p-6 ring-1 ring-stone-200/70'>
            <div className='mb-5 flex items-center justify-between'>
              <div>
                <h2 className='text-base font-black text-stone-900'>Personal Details</h2>
                <p className='text-xs text-stone-400'>Your contact and business information</p>
              </div>
              <button type='button' onClick={openEditModal} className='text-sm font-bold text-violet-600 hover:text-violet-800 cursor-pointer'>Edit</button>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              {[
                { label: 'Full Name', value: user?.name, icon: ICONS.client, color: 'bg-violet-500' },
                { label: 'Mobile', value: user?.mobile?.replace(/(\d{5})(\d{5})/, '$1 $2'), icon: ICONS.mobile, color: 'bg-emerald-500' },
                { label: 'Email', value: user?.email, icon: ICONS.email, color: 'bg-sky-500' },
                { label: 'Business', value: user?.businessName, icon: ICONS.business, color: 'bg-amber-500' },
                { label: 'Services', value: user?.modeOfBusiness?.join(', '), icon: ICONS.services, color: 'bg-cyan-500' },
                { label: 'Address', value: user?.address, icon: ICONS.address, color: 'bg-rose-400' },
              ].map((f) => (
                <div key={f.label} className='flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3.5 ring-1 ring-inset ring-stone-100'>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${f.color}`}>
                    <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={f.icon} />
                    </svg>
                  </span>
                  <div className='min-w-0'>
                    <p className='text-[11px] font-bold uppercase tracking-wider text-stone-400'>{f.label}</p>
                    {f.value ? (
                      <p className='truncate text-sm font-semibold text-stone-800' title={f.value}>{f.value}</p>
                    ) : (
                      <button type='button' onClick={openEditModal} className='text-sm font-semibold text-violet-600 hover:text-violet-800 cursor-pointer'>+ Add</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support, legal, sign out */}
          <div className='space-y-6'>
            <SettingGroup title='Support'>
              <SettingRow icon={ICONS.email} color='bg-sky-500' label='Email Helpdesk' href='mailto:mybimabox@gmail.com' />
              <SettingRow icon={ICONS.phone} color='bg-emerald-500' label='Call Us' value='7004534508' href='tel:+917004534508' />
              <SettingRow icon={ICONS.help} color='bg-stone-500' label='Support Center' to='/contact-us' />
            </SettingGroup>

            <SettingGroup title='Legal'>
              <SettingRow icon={ICONS.lock} color='bg-stone-600' label='Privacy Policy' to='/privacy-policy' />
              <SettingRow icon={ICONS.doc} color='bg-stone-600' label='Terms of Service' to='/terms-and-conditions' />
            </SettingGroup>

            <div className='flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200/70'>
              <span className='text-[11px] font-bold uppercase tracking-wider text-stone-400'>Follow us</span>
              <div className='flex gap-2'>
                <a href='https://www.instagram.com/bimabox.in/' target='_blank' rel='noopener noreferrer' aria-label='Instagram' className='flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500 text-white hover:opacity-90'>
                  <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={ICONS.instagram} /></svg>
                </a>
                <a href='https://www.facebook.com/profile.php?viewas=100000686899395&id=61590698249898' target='_blank' rel='noopener noreferrer' aria-label='Facebook' className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:opacity-90'>
                  <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={ICONS.facebook} /></svg>
                </a>
              </div>
            </div>

            <button
              type='button'
              onClick={handleLogout}
              className='flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-rose-600 ring-1 ring-stone-200/70 hover:bg-rose-50 transition-colors cursor-pointer'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
              </svg>
              Sign Out
            </button>
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
