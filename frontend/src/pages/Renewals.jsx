import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import * as XLSX from 'xlsx'
import AddInsuranceModal from './Insurance/AddInsuranceModal'
import useCurrentPlan from '../hooks/useCurrentPlan'
import UpgradePopup from '../components/UpgradePopup'

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

const Renewals = () => {
  const navigate = useNavigate()
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

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f5f3ff,_#faf7f2_45%,_#fffdf9_100%)]'>
      <main className='px-2 pt-3 pb-10 lg:px-8 lg:pt-4'>
        <div className='w-full'>
          <div className='rounded-[32px] border border-stone-200 bg-white p-4 shadow-[0_28px_60px_-34px_rgba(68,64,60,0.25)] md:p-5 lg:p-6'>

            {/* Header Row */}
            <div className='mb-4 flex items-center justify-between flex-wrap gap-3 border-b border-dashed border-stone-200 pb-3'>
              <div className='flex items-center gap-2.5'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white'>
                  <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                  </svg>
                </div>
                <div>
                  <h2 className='text-sm md:text-base font-black leading-tight text-stone-900'>Renewals</h2>
                  {expiredPendingCount > 0 && statusFilter === 'pending' ? (
                    <p className='mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800'>
                      {expiredPendingCount} expired · action needed
                    </p>
                  ) : (
                    <p className='text-[10px] font-semibold text-stone-400'>Track and close upcoming renewals</p>
                  )}
                </div>
              </div>

              <div className='flex items-center gap-2'>
                {/* Financial Year filter - only shows FYs with actual documents */}
                <div className='relative'>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    disabled={availableFinancialYears.length === 0}
                    className='appearance-none rounded-full border border-stone-200 bg-stone-50 py-1.5 pl-3 pr-7 text-[10px] font-black text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait'
                  >
                    <option value=''>All FY</option>
                    {availableFinancialYears.map((y) => (
                      <option key={y} value={String(y)}>FY {y}-{String(y + 1).slice(2)}</option>
                    ))}
                  </select>
                  <div className='pointer-events-none absolute inset-y-0 right-2 flex items-center'>
                    <svg className='w-3 h-3 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                    </svg>
                  </div>
                </div>

                {sortedPolicies.length > 0 && (
                  <button
                    onClick={() => !features.excelDownload ? setShowUpgradePopup(true) : handleExport()}
                    className='flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 transition-all'
                  >
                    <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                    </svg>
                    Export
                  </button>
                )}
              </div>
            </div>

            {/* Document Type chips */}
            <div className='mb-4 flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden'>
              {DOCUMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type='button'
                  onClick={() => setDocType(t.value)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-black transition-all ${docType === t.value
                    ? 'border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                    : 'border-stone-200 bg-white text-stone-500 hover:border-violet-300 hover:text-violet-700'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status cards */}
            <div className='mb-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3'>
              {statusTabs.map((tab) => {
                const tone = {
                  pending: { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', chip: 'bg-amber-100 text-amber-700' },
                  renewed: { icon: 'M5 13l4 4L19 7', chip: 'bg-emerald-100 text-emerald-700' },
                  opportunity: { icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', chip: 'bg-sky-100 text-sky-700' },
                  lost: { icon: 'M18 12H6', chip: 'bg-stone-200 text-stone-600' },
                }[tab.key]
                const active = statusFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${active
                      ? 'bg-stone-900 text-white shadow-lg shadow-stone-900/20'
                      : 'bg-stone-50 text-stone-800 ring-1 ring-stone-200 hover:bg-white hover:ring-violet-200'
                      }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white/15 text-white' : tone.chip}`}>
                      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d={tone.icon} />
                      </svg>
                    </span>
                    <span>
                      <span className={`block text-lg md:text-xl font-black leading-none`}>{tab.count}</span>
                      <span className={`mt-1 block text-[10px] font-bold uppercase tracking-wider ${active ? 'text-stone-300' : 'text-stone-400'}`}>{tab.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>



            {loading ? (
              <div className='text-center py-12'>
                <div className='animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto'></div>
                <p className='text-xs text-stone-500 mt-2 font-bold tracking-widest'>Loading renewals...</p>
              </div>
            ) : sortedPolicies.length === 0 ? (
              <div className='text-center py-12 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200'>
                <div className='flex justify-center mb-3'>
                  <svg className='h-10 w-10 text-stone-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
                  </svg>
                </div>
                <p className='text-sm text-stone-500 font-bold'>No {statusFilter === 'renewed' ? 'renewed' : statusFilter === 'opportunity' ? 'opportunity' : statusFilter === 'lost' ? 'lost' : 'pending'} {docConfig.label} records.</p>
                <p className='text-xs text-stone-400 mt-1'>All {docConfig.label} records are up to date.</p>
              </div>
            ) : (
              <>
                <div className='space-y-3 lg:hidden'>
                      {sortedPolicies.map((policy) => {
                    const status = policy.renewalStatus || ''
                    const isResolved = status === 'renewed' || status === 'lost'
                    const isExpired = policy.daysLeft < 0
                    return (
                      <div
                        key={policy._id}
                        onClick={() => navigate(`/rto-documents/${docType}/${policy._id}`)}
                        className={`group relative overflow-hidden rounded-xl border-2 p-3 shadow-sm transition-all cursor-pointer ${
                          status === 'renewed'
                            ? 'border-stone-200 bg-white'
                            : status === 'lost'
                            ? 'border-stone-200 bg-white'
                            : status === 'opportunity'
                            ? 'border-stone-200 bg-white'
                            : isExpired
                            ? 'border-stone-200 bg-white'
                            : 'border-stone-200 bg-white hover:border-amber-400'
                        }`}
                      >
                        {/* Expired ribbon */}
                        {isExpired && !isResolved && (
                          <div className='absolute top-0 right-0 bg-orange-100 text-orange-700 text-[8px] font-black tracking-wider px-2 py-0.5 rounded-bl-lg rounded-tr-xl'>
                            Expired
                          </div>
                        )}
                        <div className='flex items-center gap-3'>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isExpired && !isResolved ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>
                            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
                            </svg>
                          </div>
                          <div className='min-w-0 flex-1'>
                            <h3 className='text-sm font-bold text-stone-900 truncate pr-12'>{policy[docConfig.holderField]}</h3>
                            <p className='text-[10px] font-mono text-stone-500'>{policy.vehicleNumber}</p>
                            {docConfig.subField && <p className='text-[9px] text-stone-400'>{policy[docConfig.subField]}</p>}
                            {docType === 'Insurance' && <p className='text-[10px] font-semibold text-fuchsia-600 mt-0.5'>{policy.product || '—'}</p>}
                          </div>
                          <div className='text-right'>
                            <p className={`text-[11px] font-black ${
                              isExpired && !isResolved ? 'text-orange-600' : policy.daysLeft <= 5 ? 'text-orange-600' : 'text-amber-600'
                            }`}>
                              {policy.daysLeft < 0
                                ? `${Math.abs(policy.daysLeft)}d ago`
                                : policy.daysLeft === 0
                                ? 'Today'
                                : `${policy.daysLeft}d left`}
                            </p>
                            <p className='text-[10px] text-stone-400'>{policy[docConfig.validToField]}</p>
                          </div>
                        </div>
                        {(docConfig.numberField || docType === 'Insurance') && (
                          <div className='mt-2.5 border-t border-stone-100 pt-2.5 text-[10px] text-stone-400'>
                            <div className='flex flex-col gap-0.5 min-w-0'>
                              {docConfig.numberField && (
                                <span><span className='font-semibold text-stone-500'>{docConfig.numberLabel}:</span> {policy[docConfig.numberField] || '—'}</span>
                              )}
                              {docType === 'Insurance' && (
                                <>
                                  <span><span className='font-semibold text-stone-500'>Issue Date:</span> {policy.issueDate || '—'}</span>
                                  <span><span className='font-semibold text-stone-500'>Class:</span> {policy.insuranceClass || '—'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        {isResolved ? (
                          <div className='mt-2 flex justify-center border-t border-stone-100 pt-2'>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'pending') }}
                              className='text-[10px] font-semibold text-stone-400 hover:text-stone-600 underline'
                            >
                              Reset
                            </button>
                          </div>
                        ) : (
                          <div className='mt-2 grid grid-cols-3 gap-1 border-t border-stone-100 pt-2'>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'renewed') }}
                              className='flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-1 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 transition-all'
                            >
                              <svg className='h-3.5 w-3.5 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
                              </svg>
                              Renewed
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'opportunity') }}
                              className='flex items-center justify-center gap-1 rounded-lg bg-sky-50 px-1 py-2 text-[10px] font-bold text-sky-600 hover:bg-sky-100 transition-all'
                            >
                              <svg className='h-3.5 w-3.5 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                              </svg>
                              Opportunity
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'lost') }}
                              className='flex items-center justify-center gap-1 rounded-lg bg-red-50 px-1 py-2 text-[10px] font-bold text-red-600 hover:bg-red-100 transition-all'
                            >
                              <svg className='h-3.5 w-3.5 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                              </svg>
                              Lost
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className='hidden lg:block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_32px_-20px_rgba(68,64,60,0.35)]'>
                  <table className='w-full text-left'>
                    <thead>
                      <tr className='border-b border-violet-100 bg-violet-50/70'>
                        <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-violet-900/60'>Holder</th>
                        {docType === 'Insurance' && <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-violet-900/60'>Product / Class</th>}
                        {docConfig.subField && <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-violet-900/60'>Company / {docConfig.numberLabel || 'Policy No'}</th>}
                        {!docConfig.subField && docConfig.numberField && <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-violet-900/60'>{docConfig.numberLabel}</th>}
                        <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-violet-900/60'>{docType === 'Insurance' ? 'Issue Date / Valid To' : 'Valid To'}</th>
                        <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-violet-900/60'>Days</th>
                        <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-violet-900/60'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-stone-100'>
                  {sortedPolicies.map((policy) => {
                        const status = policy.renewalStatus || ''
                        const isResolved = status === 'renewed' || status === 'lost'
                        const isExpired = policy.daysLeft < 0
                        return (
                          <tr
                            key={policy._id}
                            onClick={() => navigate(`/rto-documents/${docType}/${policy._id}`)}
                            className={`group transition-colors hover:bg-violet-50/40 cursor-pointer ${
                              ''
                            }`}
                          >
                            <td className='px-4 py-3'>
                              <div className='text-sm font-black text-stone-900 group-hover:text-violet-700 transition-colors'>{policy[docConfig.holderField] || '—'}</div>
                              <span className='mt-1 inline-block rounded-md border border-stone-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-stone-800'>{policy.vehicleNumber}</span>
                            </td>
                            {docType === 'Insurance' && (
                              <td className='px-4 py-3 text-xs font-medium text-stone-500'>
                                <div className='text-sm font-bold text-fuchsia-700'>{policy.product || '—'}</div>
                                <div className='text-[10px] text-stone-400'>{policy.insuranceClass || '—'}</div>
                              </td>
                            )}
                            {docConfig.subField && (
                              <td className='px-4 py-3'>
                                <div className='text-xs font-medium text-stone-700'>{policy[docConfig.subField] || '—'}</div>
                                {docConfig.numberField && policy[docConfig.numberField] && (
                                  <div className='text-[10px] font-mono text-stone-500 mt-0.5'>{policy[docConfig.numberField]}</div>
                                )}
                              </td>
                            )}
                            {!docConfig.subField && docConfig.numberField && (
                              <td className='px-4 py-3'>
                                <span className='text-xs font-semibold text-stone-600'>{policy[docConfig.numberField] || '—'}</span>
                              </td>
                            )}
                            <td className='whitespace-nowrap px-4 py-3 text-xs'>
                              {docType === 'Insurance' && (
                                <p className='font-medium text-stone-500'>
                                  <span className='mr-1 text-[8px] font-black uppercase tracking-wider text-stone-400'>Issued</span>
                                  {policy.issueDate || '—'}
                                </p>
                              )}
                              <p className={`font-black text-stone-800 ${docType === 'Insurance' ? 'mt-0.5' : ''}`}>
                                <span className='mr-1 text-[8px] font-black uppercase tracking-wider text-stone-400'>Valid</span>
                                {policy[docConfig.validToField] || '—'}
                              </p>
                            </td>
                            <td className='px-4 py-3'>
                              <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full ${
                                status === 'renewed'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : status === 'lost'
                                  ? 'bg-red-50 text-red-600 border border-red-100'
                                  : status === 'opportunity'
                                  ? 'bg-sky-50 text-sky-600 border border-sky-100'
                                  : isExpired
                                  ? 'bg-orange-100 text-orange-700'
                                  : policy.daysLeft <= 5
                                  ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                  : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {status === 'renewed'
                                  ? 'Renewed'
                                  : status === 'lost'
                                  ? 'Lost'
                                  : status === 'opportunity'
                                  ? 'Opportunity'
                                  : isExpired
                                  ? `${Math.abs(policy.daysLeft)}d ago`
                                  : policy.daysLeft === 0
                                  ? 'Today'
                                  : `${policy.daysLeft}d`}
                              </span>
                            </td>
                            <td className='px-4 py-3'>
                              {isResolved ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'pending') }}
                                  className='text-[10px] font-semibold text-stone-400 hover:text-stone-600 underline'
                                >
                                  Reset
                                </button>
                              ) : status === 'opportunity' ? (
                                <div className='flex items-center gap-1'>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'renewed') }}
                                    className='flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-600 hover:text-white hover:ring-emerald-600 transition-all'
                                  >
                                    <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
                                    </svg>
                                    Renewed
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'lost') }}
                                    className='flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-600 hover:text-white hover:ring-red-600 transition-all'
                                  >
                                    <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                    </svg>
                                    Lost
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'pending') }}
                                    className='text-[10px] font-semibold text-stone-400 hover:text-stone-600 underline'
                                  >
                                    Reset
                                  </button>
                                </div>
                              ) : (
                                <div className='flex items-center gap-1'>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'renewed') }}
                                    className='flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-600 hover:text-white hover:ring-emerald-600 transition-all'
                                  >
                                    <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
                                    </svg>
                                    Renewed
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'opportunity') }}
                                    className='flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700 ring-1 ring-inset ring-sky-200 hover:bg-sky-600 hover:text-white hover:ring-sky-600 transition-all'
                                  >
                                    <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                                    </svg>
                                    Opportunity
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(policy._id, 'lost') }}
                                    className='flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-600 hover:text-white hover:ring-red-600 transition-all'
                                  >
                                    <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                    </svg>
                                    Lost
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {confirmModal && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm'>
            <div className='text-center mb-6'>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmModal.status === 'renewed' ? 'bg-emerald-100' : confirmModal.status === 'lost' ? 'bg-red-100' : confirmModal.status === 'opportunity' ? 'bg-sky-100' : 'bg-stone-100'
              }`}>
                {confirmModal.status === 'renewed' ? (
                  <svg className='w-7 h-7 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
                  </svg>
                ) : confirmModal.status === 'lost' ? (
                  <svg className='w-7 h-7 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' />
                  </svg>
                ) : confirmModal.status === 'opportunity' ? (
                  <svg className='w-7 h-7 text-sky-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                ) : (
                  <svg className='w-7 h-7 text-stone-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                  </svg>
                )}
              </div>
              <h3 className='text-lg font-bold text-stone-800'>Confirm Action</h3>
              <p className='text-sm text-stone-500 mt-2'>
                Are you sure you want to mark this policy as <span className='font-bold text-stone-700'>{confirmModal.label}</span>?
              </p>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() => setConfirmModal(null)}
                className='flex-1 px-4 py-2.5 rounded-xl border-2 border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer ${
                  confirmModal.status === 'renewed'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmModal.status === 'lost'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.status === 'opportunity'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-stone-600 hover:bg-stone-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
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
              <button onClick={() => { setShowUploadOptions(false); setRenewalUploadPrefill(null) }} className='text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer'>
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
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg group-hover:scale-110 transition-transform'>
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
              </div>
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
            fetchRenewals(financialYear, docType)
          }}
          initialExtractionFile={initialExtractionFile}
          prefilledVehicleNumber={renewalUploadPrefill?.vehicleNumber || ''}
          prefilledOwnerName={renewalUploadPrefill?.policyHolderName || ''}
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
