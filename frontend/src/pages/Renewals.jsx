import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import AddInsuranceModal from './Insurance/AddInsuranceModal'
import useCurrentPlan from '../hooks/useCurrentPlan'
import UpgradePopup from '../components/UpgradePopup'
import DocumentDetailModal from '../components/DocumentDetailModal'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const getCurrentFY = () => {
  const now = new Date()
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}


// Document type -> API base + field mapping so the same Renewals view can drive any type.
const DOCUMENT_TYPES = [
  { value: 'Insurance', label: 'Insurance', endpoint: '/api/insurance', holderField: 'policyHolderName', subField: 'insuranceCompany', numberField: 'policyNumber', numberLabel: 'Policy No', validFromField: 'validFrom', validToField: 'validTo' },
  { value: 'Tax', label: 'Road Tax', endpoint: '/api/tax', holderField: 'ownerName', subField: null, numberField: null, numberLabel: null, validFromField: 'taxFrom', validToField: 'taxTo' },
  { value: 'PUC', label: 'PUC', endpoint: '/api/puc', holderField: 'ownerName', subField: null, numberField: null, numberLabel: null, validFromField: 'validFrom', validToField: 'validTo' },
  { value: 'GPS', label: 'GPS', endpoint: '/api/gps', holderField: 'ownerName', subField: null, numberField: null, numberLabel: null, validFromField: 'validFrom', validToField: 'validTo' },
  { value: 'Fitness', label: 'Fitness', endpoint: '/api/fitness', holderField: 'ownerName', subField: null, numberField: null, numberLabel: null, validFromField: 'validFrom', validToField: 'validTo' },
  { value: 'Permit', label: 'Permit', endpoint: '/api/permit', holderField: 'name', subField: null, numberField: null, numberLabel: null, validFromField: 'validFrom', validToField: 'validTo' },
]

const ICON = {
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  download: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  close: 'M6 18L18 6M6 6l12 12',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  check: 'M5 13l4 4L19 7',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  trend: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  x: 'M6 18L18 6M6 6l12 12',
  reset: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  ban: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  cloud: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  pencil: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
}

const Svg = ({ d, className = 'h-5 w-5', strokeWidth = 2 }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={strokeWidth} d={d} />
  </svg>
)

const Plate = ({ value, small = false }) => (
  <span className={`inline-block rounded-md border-2 border-slate-800 bg-amber-300 font-mono font-bold text-slate-900 ${small ? 'px-1.5 text-[11px] tracking-wider' : 'px-2 py-0.5 text-xs tracking-widest'}`}>
    {value || '—'}
  </span>
)

const dueText = (days) => {
  if (days === null || days === undefined) return { text: '', cls: 'text-slate-400' }
  if (days < 0) return { text: `Expired (${-days}d ago)`, cls: 'text-rose-600' }
  if (days === 0) return { text: 'Expires (today)', cls: 'text-amber-600' }
  return { text: `Expiring (in ${days}d)`, cls: days <= 7 ? 'text-amber-600' : 'text-emerald-600' }
}

const STATUS_META = {
  pending: { label: 'Pending', icon: ICON.clock, card: 'from-amber-50 to-orange-50 border-amber-200', dot: 'bg-amber-500', value: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  renewed: { label: 'Renewed', icon: ICON.check, card: 'from-emerald-50 to-teal-50 border-emerald-200', dot: 'bg-emerald-600', value: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  opportunity: { label: 'Opportunity', icon: ICON.trend, card: 'from-sky-50 to-cyan-50 border-sky-200', dot: 'bg-sky-600', value: 'text-sky-700', badge: 'bg-sky-50 text-sky-700 ring-sky-200' },
  lost: { label: 'Lost', icon: ICON.x, card: 'from-rose-50 to-pink-50 border-rose-200', dot: 'bg-rose-600', value: 'text-rose-700', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

const ACTION_STYLES = {
  renewed: { label: 'Renewed', icon: ICON.check, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-600 hover:text-white hover:ring-emerald-600' },
  opportunity: { label: 'Opportunity', icon: ICON.trend, cls: 'bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-600 hover:text-white hover:ring-sky-600' },
  lost: { label: 'Lost', icon: ICON.x, cls: 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-600 hover:text-white hover:ring-rose-600' },
}

const CONFIRM_META = {
  renewed: { icon: ICON.shield, ring: 'bg-emerald-50 text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  lost: { icon: ICON.ban, ring: 'bg-rose-50 text-rose-600', btn: 'bg-rose-600 hover:bg-rose-700' },
  opportunity: { icon: ICON.trend, ring: 'bg-sky-50 text-sky-600', btn: 'bg-sky-600 hover:bg-sky-700' },
  pending: { icon: ICON.reset, ring: 'bg-slate-100 text-slate-600', btn: 'bg-slate-700 hover:bg-slate-800' },
}

const Renewals = () => {
  const { features } = useCurrentPlan()
  const [docType, setDocType] = useState('Insurance')
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)
  const [financialYear, setFinancialYear] = useState(String(getCurrentFY()))
  const [availableFinancialYears, setAvailableFinancialYears] = useState([])
  const [tabCounts, setTabCounts] = useState({ pending: 0, renewed: 0, lost: 0, opportunity: 0 })
  const [confirmModal, setConfirmModal] = useState(null)
  const [renewalUploadPrefill, setRenewalUploadPrefill] = useState(null)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [showAddInsuranceModal, setShowAddInsuranceModal] = useState(false)
  const [initialExtractionFile, setInitialExtractionFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingId, setViewingId] = useState(null)

  const docConfig = DOCUMENT_TYPES.find((d) => d.value === docType) || DOCUMENT_TYPES[0]

  // fetchRenewals: pass explicit fy/type/status to avoid stale closure issues
  const fetchRenewals = useCallback(async (fy, type, status) => {
    try {
      setLoading(true)
      const endpoint = (DOCUMENT_TYPES.find((d) => d.value === type) || DOCUMENT_TYPES[0]).endpoint
      const params = { status }
      if (fy) params.financialYear = fy
      const response = await axios.get(`${API_URL}${endpoint}/renewals`, {
        withCredentials: true,
        params,
      })
      if (response.data?.success) {
        setPolicies(response.data.data)
        if (response.data.counts) setTabCounts(response.data.counts)
        if (response.data.financialYears) {
          setAvailableFinancialYears(response.data.financialYears)
          setFinancialYear((prev) => {
            if (!prev) return prev
            return response.data.financialYears.includes(Number(prev)) ? prev : ''
          })
        }
      }
    } catch (err) {
      console.error('Error fetching renewals:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // When document type changes: reset state and fetch with current FY (default)
  useEffect(() => {
    setAvailableFinancialYears([])
    setPolicies([])
    setTabCounts({ pending: 0, renewed: 0, lost: 0, opportunity: 0 })
    setFinancialYear(String(getCurrentFY())) // Always default to current FY
    fetchRenewals(String(getCurrentFY()), docType, statusFilter)
  }, [docType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch whenever FY selection or status tab changes (user explicitly chose a FY)
  useEffect(() => {
    fetchRenewals(financialYear, docType, statusFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialYear, statusFilter])

  const handleStatusChange = (id, status) => {
    const labels = { renewed: 'Renewed', lost: 'Lost', opportunity: 'Opportunity', pending: 'Reset to Pending' }
    setConfirmModal({ id, status, label: labels[status] })
  }

  const confirmAction = async () => {
    if (!confirmModal) return
    const { id, status } = confirmModal
    setConfirmModal(null)
    try {
      await axios.patch(
        `${API_URL}${docConfig.endpoint}/${id}/renewal-status`,
        { status },
        { withCredentials: true }
      )
      // Record no longer belongs to the active tab's status — drop it and refresh counts
      setPolicies((prev) => prev.filter((p) => p._id !== id))
      fetchRenewals(financialYear, docType, statusFilter)
      if (status === 'renewed' && docType === 'Insurance') {
        const renewedPolicy = policies.find((p) => p._id === id)
        setRenewalUploadPrefill({
          vehicleNumber: renewedPolicy?.vehicleNumber || '',
          policyHolderName: renewedPolicy?.[docConfig.holderField] || '',
        })
        setShowUploadOptions(true)
      }
    } catch (err) {
      console.error('Error updating renewal status:', err)
    }
  }

  // Backend already scopes `policies` to the active tab's status and financial year.
  const sortedPolicies = [...policies].sort((a, b) => {
    if (statusFilter === 'pending') {
      return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999)
    }
    const dateA = a.renewalStatusChangedAt ? new Date(a.renewalStatusChangedAt) : new Date(0)
    const dateB = b.renewalStatusChangedAt ? new Date(b.renewalStatusChangedAt) : new Date(0)
    return dateB - dateA
  })

  // Count badges for tabs come from the server (counts across all statuses, not just the active tab)
  const expiredPendingCount = policies.filter(
    (p) => (p.renewalStatus || 'pending') === 'pending' && p.daysLeft < 0
  ).length

  const statusTabs = [
    { key: 'pending', label: 'Pending', count: tabCounts.pending },
    { key: 'renewed', label: 'Renewed', count: tabCounts.renewed },
    { key: 'opportunity', label: 'Opportunity', count: tabCounts.opportunity },
    { key: 'lost', label: 'Lost', count: tabCounts.lost },
  ]

  const handleExport = () => {
    if (!sortedPolicies.length) return
    const exportData = sortedPolicies.map((r) => {
      const row = {
        'Holder Name': r[docConfig.holderField] || '',
        'Vehicle Number': r.vehicleNumber || '',
        'Mobile': r.mobileNumber || '',
      }
      if (docConfig.subField) row[docType === 'Insurance' ? 'Insurance Company' : docConfig.subField] = r[docConfig.subField] || ''
      if (docType === 'Insurance') {
        row['Vehicle Class'] = r.vehicleClass || ''
        row['Product'] = r.product || ''
        row['Policy Type'] = r.insuranceClass || ''
      }
      if (docConfig.numberField) row[docConfig.numberLabel] = r[docConfig.numberField] || ''
      if (docType === 'Insurance') row['Issue Date'] = r.issueDate || ''
      row['Valid From'] = r[docConfig.validFromField] || ''
      row['Valid To'] = r[docConfig.validToField] || ''
      if (docType === 'Insurance') {
        row['TP Valid From'] = r.tpValidFrom || ''
        row['TP Valid To'] = r.tpValidTo || ''
        row['OD Premium'] = r.odPremium ?? ''
        row['TP Premium'] = r.tpPremium ?? ''
        row['Net Premium'] = r.netPremium ?? ''
        row['Gross Premium'] = r.premium ?? ''
        row['Client Name'] = r.reference || ''
        row['Agent Name (IMD)'] = r.imd || ''
        row['Claim Raised'] = r.claimRaised ? 'Yes' : 'No'
        row['Claim Date'] = r.claimDate || ''
        row['Claim Remarks'] = r.claimRemarks || ''
      }
      row['Days Left'] = r.daysLeft ?? ''
      row['Renewal Status'] = r.renewalStatus || 'pending'
      row['Remarks'] = r.remarks || ''
      return row
    })
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Renewals')
    XLSX.writeFile(wb, `renewals_${docType}_${statusFilter}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const q = searchQuery.trim().toLowerCase()
  const visiblePolicies = q
    ? sortedPolicies.filter((p) =>
        [p[docConfig.holderField], p.vehicleNumber, p.mobileNumber, docConfig.numberField && p[docConfig.numberField]]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : sortedPolicies

  const actionsFor = (policy) => {
    const status = policy.renewalStatus || 'pending'
    if (status === 'renewed' || status === 'lost') return ['reset']
    if (status === 'opportunity') return ['renewed', 'lost', 'reset']
    return ['renewed', 'opportunity', 'lost']
  }

  const ActionButtons = ({ policy, full = false }) => (
    <div className={full ? 'grid grid-cols-3 gap-1.5' : 'flex items-center justify-end gap-1.5'}>
      {actionsFor(policy).map((a) => {
        if (a === 'reset') {
          return (
            <button
              key='reset'
              type='button'
              onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'pending') }}
              className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${full ? 'col-span-3' : ''}`}
            >
              <Svg d={ICON.reset} className='h-3.5 w-3.5' />
              Reset to pending
            </button>
          )
        }
        const s = ACTION_STYLES[a]
        return (
          <button
            key={a}
            type='button'
            onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, a) }}
            className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${s.cls}`}
          >
            <Svg d={s.icon} className='h-3.5 w-3.5' strokeWidth={2.5} />
            {s.label}
          </button>
        )
      })}
    </div>
  )

  const StatusBadge = ({ policy }) => {
    const status = policy.renewalStatus || 'pending'
    if (status === 'pending') {
      const due = dueText(policy.daysLeft)
      return due.text ? <span className={`text-xs font-semibold ${due.cls}`}>{due.text}</span> : null
    }
    const m = STATUS_META[status]
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${m.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
        {m.label}
      </span>
    )
  }

  const emptyLabel = STATUS_META[statusFilter]?.label.toLowerCase() || 'pending'

  return (
    <div className='min-h-screen bg-slate-50' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <main className='w-full space-y-4 px-3 pt-4 pb-10 md:space-y-5 lg:px-8 lg:pt-6'>
        {/* Header card */}
        <section className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
          <div className='bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 pt-4 text-white md:px-6'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h1 className='text-lg font-bold md:text-2xl'>Renewals</h1>
                <p className='text-xs text-slate-300 md:text-sm'>
                  {expiredPendingCount > 0 && statusFilter === 'pending'
                    ? `${expiredPendingCount} already expired — follow up today`
                    : 'Track and close upcoming renewals'}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <label className='relative'>
                  <span className='sr-only'>Financial year</span>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    disabled={availableFinancialYears.length === 0}
                    className='cursor-pointer appearance-none rounded-lg bg-white/15 py-1.5 pl-3 pr-8 text-xs font-semibold text-white ring-1 ring-inset ring-white/20 outline-none transition hover:bg-white/25 focus:ring-white/50 disabled:cursor-wait disabled:opacity-50 [&>option]:text-slate-800'
                  >
                    <option value=''>All FY</option>
                    {availableFinancialYears.map((y) => (
                      <option key={y} value={String(y)}>FY {y}-{String(y + 1).slice(2)}</option>
                    ))}
                  </select>
                  <svg className='pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                  </svg>
                </label>
                <button
                  type='button'
                  onClick={() => (!features.excelDownload ? setShowUpgradePopup(true) : handleExport())}
                  disabled={!sortedPolicies.length}
                  className='inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-white/20 transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40'
                >
                  <Svg d={ICON.download} className='h-4 w-4' />
                  <span className='hidden sm:inline'>Export Excel</span>
                </button>
              </div>
            </div>

            <div className='-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden'>
              {DOCUMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type='button'
                  onClick={() => setDocType(t.value)}
                  className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-semibold transition ${docType === t.value ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className='p-3 md:p-5'>
            <div className='rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-3'>
              <label className='relative block'>
                <span className='pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400'>
                  <Svg d={ICON.search} className='h-5 w-5' />
                </span>
                <input
                  type='search'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${docConfig.label.toLowerCase()} renewals by name, vehicle or mobile`}
                  className='w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-3 text-[15px] font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                />
              </label>
            </div>
          </div>
        </section>

        {/* Status cards */}
        <section className='grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4'>
          {statusTabs.map((tab) => {
            const m = STATUS_META[tab.key]
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type='button'
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-xl border-2 bg-gradient-to-r p-3 text-left transition hover:shadow-md md:p-4 ${m.card} ${active ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
              >
                <div className='flex items-center gap-3'>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white md:h-11 md:w-11 ${m.dot}`}>
                    <Svg d={m.icon} className='h-5 w-5' strokeWidth={2.5} />
                  </span>
                  <div className='min-w-0'>
                    <p className={`text-xl font-bold leading-none md:text-2xl ${m.value}`}>{tab.count}</p>
                    <p className='mt-1 truncate text-xs font-semibold text-slate-700 md:text-sm'>{m.label}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </section>

        {/* Results */}
        <section className='md:overflow-hidden md:rounded-2xl md:bg-white md:shadow-sm md:ring-1 md:ring-slate-200'>
          {loading ? (
            <div className='flex flex-col items-center gap-3 rounded-2xl bg-white py-20 ring-1 ring-slate-200 md:rounded-none md:ring-0'>
              <div className='h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-r-transparent' />
              <p className='text-sm text-slate-400'>Loading renewals…</p>
            </div>
          ) : visiblePolicies.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-20 text-center ring-1 ring-slate-200 md:rounded-none md:ring-0'>
              <span className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
                <Svg d={ICON.shield} className='h-7 w-7' />
              </span>
              <p className='font-semibold text-slate-800'>
                {q ? 'No matching renewals' : `No ${emptyLabel} ${docConfig.label} renewals`}
              </p>
              <p className='text-sm text-slate-500'>{q ? 'Try a different name, vehicle or mobile.' : 'You are all caught up here.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className='hidden overflow-x-auto md:block'>
                <table className='w-full min-w-[820px] text-left'>
                  <thead>
                    <tr className='bg-gradient-to-r from-slate-50 to-blue-50 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      <th className='px-6 py-3'>{docType === 'Insurance' ? 'Policy Holder' : 'Owner'}</th>
                      {docType === 'Insurance' && <th className='px-6 py-3'>Company &amp; Product</th>}
                      <th className='px-6 py-3'>Valid To</th>
                      <th className='px-6 py-3 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {visiblePolicies.map((policy) => {
                      const name = policy[docConfig.holderField] || ''
                      return (
                        <tr key={policy._id} onClick={() => setViewingId(policy._id)} className='cursor-pointer transition hover:bg-blue-50/40'>
                          <td className='px-6 py-3.5'>
                            <p className='mb-1 max-w-[240px] truncate text-sm font-semibold text-slate-800' title={name}>{name || '—'}</p>
                            <div className='flex items-center gap-2'>
                              <Plate value={policy.vehicleNumber} />
                              {policy.mobileNumber && <span className='text-xs text-slate-400'>{policy.mobileNumber}</span>}
                            </div>
                          </td>
                          {docType === 'Insurance' && (
                            <td className='px-6 py-3.5'>
                              <p className='max-w-[240px] text-sm text-slate-700'>{policy[docConfig.subField] || '—'}</p>
                              <p className='max-w-[240px] text-xs text-slate-400'>{[policy.product, policy.insuranceClass].filter(Boolean).join(' · ')}</p>
                              {policy.policyNumber && <p className='font-mono text-[11px] text-slate-400'>{policy.policyNumber}</p>}
                            </td>
                          )}
                          <td className='whitespace-nowrap px-6 py-3.5'>
                            <p className='text-sm font-semibold text-slate-800'>{policy[docConfig.validToField] || '—'}</p>
                            <StatusBadge policy={policy} />
                          </td>
                          <td className='px-6 py-3.5'>
                            <ActionButtons policy={policy} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className='space-y-3 md:hidden'>
                {visiblePolicies.map((policy) => {
                  const name = policy[docConfig.holderField] || ''
                  const company = docConfig.subField ? policy[docConfig.subField] : ''
                  const product = docType === 'Insurance' ? [policy.product, policy.insuranceClass].filter(Boolean).join(' · ') : ''
                  return (
                    <li key={policy._id} className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70'>
                      <button type='button' onClick={() => setViewingId(policy._id)} className='block w-full p-3.5 text-left active:bg-slate-50'>
                        <span className='flex items-start justify-between gap-3'>
                          <span className='min-w-0'>
                            <span className='block truncate text-[15px] font-semibold text-slate-900'>{name || '—'}</span>
                            <span className='mt-1 flex items-center gap-2'>
                              <Plate value={policy.vehicleNumber} small />
                              {policy.mobileNumber && <span className='text-xs text-slate-400'>{policy.mobileNumber}</span>}
                            </span>
                          </span>
                          <span className='shrink-0 text-right'>
                            <span className='block text-xs font-semibold text-slate-800'>{policy[docConfig.validToField] || '—'}</span>
                            <StatusBadge policy={policy} />
                          </span>
                        </span>
                        {company && <span className='mt-2 block break-words text-xs font-medium text-slate-700'>{company}</span>}
                        {product && <span className={`${company ? 'mt-0.5' : 'mt-2'} block break-words text-xs text-slate-500`}>{product}</span>}
                      </button>
                      <div className='border-t border-slate-100 bg-slate-50/60 p-2'>
                        <ActionButtons policy={policy} full />
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className='mt-3 rounded-xl bg-white px-4 py-3 text-xs text-slate-500 ring-1 ring-slate-200 md:mt-0 md:rounded-none md:border-t md:border-slate-100 md:bg-gray-50 md:px-6 md:ring-0'>
                Showing <span className='font-semibold text-slate-700'>{visiblePolicies.length}</span>
                {q ? <> of <span className='font-semibold text-slate-700'>{sortedPolicies.length}</span></> : null} {emptyLabel} {docConfig.label} renewals
              </div>
            </>
          )}
        </section>
      </main>

      {/* Confirm status change */}
      {confirmModal && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4' onClick={() => setConfirmModal(null)}>
          <div className='w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl' onClick={(e) => e.stopPropagation()} role='alertdialog' aria-modal='true'>
            <div className='p-6'>
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${CONFIRM_META[confirmModal.status].ring}`}>
                <Svg d={CONFIRM_META[confirmModal.status].icon} className='h-6 w-6' />
              </span>
              <h3 className='mt-4 text-lg font-bold text-slate-900'>Mark as {confirmModal.label}?</h3>
              <p className='mt-1 text-sm text-slate-500'>
                {confirmModal.status === 'renewed' && docType === 'Insurance'
                  ? 'After confirming you can upload the renewed policy right away.'
                  : `This ${docConfig.label.toLowerCase()} record will move to the ${confirmModal.label.toLowerCase()} list.`}
              </p>
            </div>
            <div className='flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4'>
              <button
                type='button'
                onClick={() => setConfirmModal(null)}
                className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={confirmAction}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${CONFIRM_META[confirmModal.status].btn}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload renewed policy */}
      {showUploadOptions && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 md:p-4'>
          <div className='w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl'>
            <div className='flex items-center justify-between bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-4 text-white'>
              <div>
                <h2 className='text-lg font-bold'>Upload Renewed Policy</h2>
                <p className='text-xs text-slate-300'>
                  {renewalUploadPrefill?.vehicleNumber ? `For ${renewalUploadPrefill.vehicleNumber}` : 'Add the new policy for this client'}
                </p>
              </div>
              <button
                type='button'
                onClick={() => { setShowUploadOptions(false); setRenewalUploadPrefill(null) }}
                className='rounded-lg p-1.5 text-white transition hover:bg-white/20'
                aria-label='Close'
              >
                <Svg d={ICON.close} className='h-5 w-5' />
              </button>
            </div>
            <div className='p-4 md:p-5'>
              <div
                role='button'
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setIsDragOver(false) }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    setShowUploadOptions(false)
                    setInitialExtractionFile(file)
                    setShowAddInsuranceModal(true)
                  }
                }}
                className={`group flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 hover:border-blue-400'}`}
              >
                <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 text-white shadow-lg shadow-blue-700/20 transition-transform group-hover:scale-105'>
                  <Svg d={ICON.cloud} className='h-6 w-6' />
                </span>
                <p className='mt-3 font-bold text-slate-800'>{isDragOver ? 'Release to upload' : 'Drop the renewed policy here'}</p>
                <p className='text-xs text-slate-500'>PDF or image · AI fills in the details</p>
                <span className='mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-700/20'>
                  <Svg d={ICON.bolt} className='h-4 w-4' />
                  Browse file
                </span>
              </div>
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
            </div>
            <div className='flex items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 md:px-5'>
              <button
                type='button'
                onClick={() => { setShowUploadOptions(false); setRenewalUploadPrefill(null) }}
                className='rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
              >
                Skip for now
              </button>
              <button
                type='button'
                onClick={() => {
                  setShowUploadOptions(false)
                  setInitialExtractionFile(null)
                  setShowAddInsuranceModal(true)
                }}
                className='inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'
              >
                <Svg d={ICON.pencil} className='h-4 w-4' />
                Enter manually
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddInsuranceModal && (
        <AddInsuranceModal
          isOpen={showAddInsuranceModal}
          onClose={() => {
            setShowAddInsuranceModal(false)
            setInitialExtractionFile(null)
            setRenewalUploadPrefill(null)
          }}
          onSubmit={() => {
            setShowAddInsuranceModal(false)
            setInitialExtractionFile(null)
            setRenewalUploadPrefill(null)
            fetchRenewals(financialYear, docType, statusFilter)
          }}
          initialExtractionFile={initialExtractionFile}
          prefilledVehicleNumber={renewalUploadPrefill?.vehicleNumber || ''}
          prefilledOwnerName={renewalUploadPrefill?.policyHolderName || ''}
        />
      )}

      {viewingId && (
        <DocumentDetailModal
          type={docType}
          id={viewingId}
          onClose={() => setViewingId(null)}
          onChanged={() => fetchRenewals(financialYear, docType, statusFilter)}
        />
      )}

      <UpgradePopup
        isOpen={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        title='Excel Download'
        message='Excel download is available on the Plus plan. Upgrade to Plus to unlock Excel exports of all your records.'
      />
    </div>
  )
}

export default Renewals
