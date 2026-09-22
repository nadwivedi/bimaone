import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { getInsuranceCompanies, subscribeInsuranceCompanies } from '../utils/insuranceCompanyCache'
import { getProductTypes, subscribeProductTypes } from '../utils/productTypeCache'
import useCurrentPlan from '../hooks/useCurrentPlan'
import UpgradePopup from '../components/UpgradePopup'
import DocumentDetailModal from '../components/DocumentDetailModal'
import AddInsuranceModal from './Insurance/AddInsuranceModal'
import EditTaxModal from './Tax/EditTaxModal'
import EditPucModal from './Puc/EditPucModal'
import EditGpsModal from './Gps/EditGpsModal'
import EditFitnessModal from './Fitness/EditFitnessModal'
import EditPermitModal from './Permit/components/EditPermitModal'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const PAGE_SIZE = 40

const computeFilterMode = (q = '', company = '', productType = '', policyType = '', validity = '', dateFrom = '', dateTo = '', referenceId = '', imdId = '', claimStatus = '', financialYear = '') => Boolean(
  String(q || '').trim() || company || productType || policyType || validity || dateFrom || dateTo || referenceId || imdId || claimStatus || financialYear
)

const POLICY_TYPES = [
  'Comprehensive', 'Third Party', 'Standalone OD', 'Bundle'
]

const DOCUMENT_TYPES = [
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Tax', label: 'Road Tax' },
  { value: 'PUC', label: 'PUC' },
  { value: 'GPS', label: 'GPS' },
  { value: 'Fitness', label: 'Fitness' },
  { value: 'Permit', label: 'Permit' },
]

const API_ENDPOINTS = {
  Insurance: '/api/insurance',
  Tax: '/api/tax',
  PUC: '/api/puc',
  GPS: '/api/gps',
  Fitness: '/api/fitness',
  Permit: '/api/permit',
}

const ICON = {
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  close: 'M6 18L18 6M6 6l12 12',
  download: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  chevron: 'M9 5l7 7-7 7',
  chevronDown: 'M19 9l-7 7-7-7',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  warn: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
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
  return { text: `Expiring (in ${days}d)`, cls: days <= 30 ? 'text-amber-600' : 'text-emerald-600' }
}

const formatPremium = (value) => (
  value != null && value !== '' ? `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'
)

const FILTER_TONES = {
  blue: { wrap: 'from-blue-50 to-sky-50 border-blue-200', badge: 'bg-blue-600' },
  emerald: { wrap: 'from-emerald-50 to-teal-50 border-emerald-200', badge: 'bg-emerald-600' },
  amber: { wrap: 'from-amber-50 to-orange-50 border-amber-200', badge: 'bg-amber-500' },
}

const FilterSection = ({ n, title, tone, children }) => (
  <section className={`rounded-xl border-2 bg-gradient-to-r p-3 md:p-5 ${FILTER_TONES[tone].wrap}`}>
    <h3 className='mb-3 flex items-center gap-2 text-base font-bold text-gray-800'>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white md:h-7 md:w-7 ${FILTER_TONES[tone].badge}`}>{n}</span>
      {title}
    </h3>
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>{children}</div>
  </section>
)

const fieldCls = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'

const FilterSelect = ({ label, value, onChange, children }) => (
  <label className='block'>
    <span className='mb-1 block text-xs font-semibold text-gray-700 md:text-sm'>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldCls} cursor-pointer`}>
      {children}
    </select>
  </label>
)

const FilterDate = ({ label, value, onChange }) => (
  <label className='block'>
    <span className='mb-1 block text-xs font-semibold text-gray-700 md:text-sm'>{label}</span>
    <input type='date' value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} />
  </label>
)

const Search = () => {
  const { features } = useCurrentPlan()
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [records, setRecords] = useState([])
  const [page, setPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingRecord, setDeletingRecord] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filterType, setFilterType] = useState('Insurance')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterProductType, setFilterProductType] = useState('')
  const [filterPolicyType, setFilterPolicyType] = useState('')
  const [filterValidity, setFilterValidity] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterReference, setFilterReference] = useState('')
  const [referencesList, setReferencesList] = useState([])
  const [filterImd, setFilterImd] = useState('')
  const [filterClaimStatus, setFilterClaimStatus] = useState('')
  const [filterFinancialYear, setFilterFinancialYear] = useState('')
  const [availableFinancialYears, setAvailableFinancialYears] = useState([])
  const [imdList, setImdList] = useState([])
  const [companiesList, setCompaniesList] = useState([])
  const [productTypesList, setProductTypesList] = useState([])
  const debounceRef = useRef(null)

  const insuranceFilterCount = filterType === 'Insurance' ? [filterCompany, filterProductType, filterPolicyType, filterReference, filterImd, filterClaimStatus, filterFinancialYear].filter(Boolean).length : 0
  const activeFilterCount = insuranceFilterCount + (filterValidity ? 1 : 0) + (filterDateFrom ? 1 : 0) + (filterDateTo ? 1 : 0)

  const fetchRecords = useCallback(async (pageNum, append = false, query = '', type = 'Insurance', company = '', productType = '', policyType = '', validity = '', dateFrom = '', dateTo = '', referenceId = '', imdId = '', claimStatus = '', financialYear = '') => {
    const q = query.trim()
    setSearchQuery(q)
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    setSearched(true)

    try {
      const filterMode = computeFilterMode(q, company, productType, policyType, validity, dateFrom, dateTo, referenceId, imdId, claimStatus, financialYear)
      const params = filterMode
        ? { search: q, all: 'true' }
        : { search: q, limit: PAGE_SIZE, page: pageNum }
      if (type === 'Insurance') {
        if (company) params.insuranceCompanyId = company
        if (productType) {
          params.product = productType
          const matchedP = productTypesList.find(p => (typeof p === 'string' ? p : p.name) === productType)
          if (matchedP && typeof matchedP === 'object' && matchedP._id) {
            params.productTypeId = matchedP._id
          }
        }
        if (policyType) params.insuranceClass = policyType
        if (referenceId) params.referenceId = referenceId
        if (imdId) params.imdId = imdId
        if (claimStatus) params.claimStatus = claimStatus
        if (financialYear) params.financialYear = financialYear
      }
      if (validity) params.validity = validity
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo

      const endpoint = API_ENDPOINTS[type] || '/api/insurance'
      const res = await axios.get(`${API_URL}${endpoint}`, {
        withCredentials: true,
        params,
      })

      if (res.data.success) {
        const data = res.data.data
        const pagination = res.data.pagination
        if (append) setRecords(prev => [...prev, ...data])
        else setRecords(data)
        setPage(pagination.currentPage)
        setTotalRecords(pagination.totalRecords)
        setHasMore(pagination.currentPage < pagination.totalPages)
        if (res.data.financialYears) setAvailableFinancialYears(res.data.financialYears)
      }
    } catch (err) {
      console.error('Search error:', err)
      if (!append) setRecords([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Fetch references list
  useEffect(() => {
    axios.get(`${API_URL}/api/references`, { withCredentials: true })
      .then((res) => {
        if (res.data.success) setReferencesList(res.data.data)
      })
      .catch(() => {})
    axios.get(`${API_URL}/api/imd`, { withCredentials: true })
      .then((res) => {
        if (res.data.success) setImdList(res.data.data)
      })
      .catch(() => {})
    getInsuranceCompanies(API_URL).then((data) => setCompaniesList(data || []))
    const unsubCompanies = subscribeInsuranceCompanies((data) => setCompaniesList(data || []))

    getProductTypes(API_URL).then((data) => setProductTypesList(data || []))
    const unsubProductTypes = subscribeProductTypes((data) => setProductTypesList(data || []))

    return () => {
      unsubCompanies()
      unsubProductTypes()
    }
  }, [])

  const companyNameById = useCallback((id) => companiesList.find(c => c._id === id)?.name || '', [companiesList])
  const referenceNameById = useCallback((id) => referencesList.find(r => r._id === id)?.name || '', [referencesList])
  const imdNameById = useCallback((id) => imdList.find(i => i._id === id)?.name || '', [imdList])
  // Current (live) company name for a record — falls back to the name snapshot stored on the record
  const recordCompanyName = useCallback((record) => (
    (record.insuranceCompanyId && companyNameById(record.insuranceCompanyId)) || record.insuranceCompany || ''
  ), [companyNameById])
  const recordReferenceName = useCallback((record) => (
    (record.referenceId && referenceNameById(record.referenceId)) || record.reference || ''
  ), [referenceNameById])
  const recordImdName = useCallback((record) => (
    (record.imdId && imdNameById(record.imdId)) || record.imd || ''
  ), [imdNameById])

  // Initial load
  useEffect(() => {
    fetchRecords(1, false, '', 'Insurance', '', '', '', '')
  }, [fetchRecords])

  // Reset pagination and search when type changes
  useEffect(() => {
    setRecords([])
    setPage(1)
    setFilterCompany('')
    setFilterProductType('')
    setFilterPolicyType('')
    setFilterValidity('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterReference('')
    setFilterImd('')
    setFilterClaimStatus('')
    setFilterFinancialYear('')
    setSearched(false)
    setShowFilterPanel(false)
  }, [filterType])

  // Trigger search immediately on input change (each keystroke) and filter changes
  useEffect(() => {
    setRecords([])
    setPage(1)
    fetchRecords(1, false, inputValue, filterType, filterCompany, filterProductType, filterPolicyType, filterValidity, filterDateFrom, filterDateTo, filterReference, filterImd, filterClaimStatus, filterFinancialYear)
  }, [inputValue, filterType, filterCompany, filterProductType, filterPolicyType, filterValidity, filterDateFrom, filterDateTo, filterReference, filterImd, filterClaimStatus, filterFinancialYear, fetchRecords])


  // Lock body scroll when filter panel is open
  useEffect(() => {
    if (showFilterPanel) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showFilterPanel])

  // Close filter panel on Esc
  useEffect(() => {
    if (!showFilterPanel) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowFilterPanel(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showFilterPanel])

  const handleLoadMore = () => {
    fetchRecords(page + 1, true, searchQuery, filterType, filterCompany, filterProductType, filterPolicyType, filterValidity, filterDateFrom, filterDateTo, filterReference, filterImd, filterClaimStatus, filterFinancialYear)
  }

  const handleClearFilters = () => {
    setFilterCompany('')
    setFilterProductType('')
    setFilterPolicyType('')
    setFilterValidity('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterReference('')
    setFilterImd('')
    setFilterClaimStatus('')
    setFilterFinancialYear('')
  }

  const handleExport = async () => {
    if (!filteredRecords.length) return
    try {
      const params = { search: inputValue.trim(), all: 'true' }
      if (filterType === 'Insurance') {
        if (filterCompany) params.insuranceCompanyId = filterCompany
        if (filterProductType) {
          params.product = filterProductType
          const matchedP = productTypesList.find(p => (typeof p === 'string' ? p : p.name) === filterProductType)
          if (matchedP && typeof matchedP === 'object' && matchedP._id) {
            params.productTypeId = matchedP._id
          }
        }
        if (filterPolicyType) params.insuranceClass = filterPolicyType
        if (filterReference) params.referenceId = filterReference
        if (filterImd) params.imdId = filterImd
        if (filterClaimStatus) params.claimStatus = filterClaimStatus
        if (filterFinancialYear) params.financialYear = filterFinancialYear
      }
      if (filterValidity) params.validity = filterValidity
      if (filterDateFrom) params.dateFrom = filterDateFrom
      if (filterDateTo) params.dateTo = filterDateTo

      const endpoint = API_ENDPOINTS[filterType] || '/api/insurance'
      const res = await axios.get(`${API_URL}${endpoint}`, { withCredentials: true, params })
      const data = res.data?.data || []
      if (!data.length) return

      const exportData = data.map((r) => {
        const row = {
          'Vehicle Number': r.vehicleNumber || 'N/A',
          'Policy Holder': r.policyHolderName || r.ownerName || r.name || '',
          'Mobile': r.mobileNumber || '',
        }
        if (filterType === 'Insurance') {
          row['Insurance Company'] = recordCompanyName(r)
          row['Product'] = r.product || ''
          row['Vehicle Class'] = r.vehicleClass || ''
          row['Policy Type'] = r.insuranceClass || ''
          row['Policy Number'] = r.policyNumber || ''
          row['Issue Date'] = r.issueDate || ''
          row['Valid From'] = r.validFrom || ''
          row['Valid To'] = r.validTo || ''
          row['TP Valid From'] = r.tpValidFrom || ''
          row['TP Valid To'] = r.tpValidTo || ''
          row['OD Premium'] = r.odPremium ?? ''
          row['TP Premium'] = r.tpPremium ?? ''
          row['Net Premium'] = r.netPremium ?? ''
          row['Gross Premium'] = r.premium ?? ''
          row['Client Name'] = recordReferenceName(r)
          row['Agent Name (IMD)'] = recordImdName(r)
          row['Claim Raised'] = r.claimRaised ? 'Yes' : 'No'
          row['Claim Date'] = r.claimDate || ''
          row['Claim Remarks'] = r.claimRemarks || ''
          row['Renewal Status'] = r.renewalStatus || 'pending'
        } else {
          row['Valid From'] = r.validFrom || r.taxFrom || ''
          row['Valid To'] = r.validTo || r.taxTo || ''
        }
        row['Remarks'] = r.remarks || ''
        return row
      })
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Records')
      XLSX.writeFile(wb, `${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  const filteredRecords = records

  const filterMode = computeFilterMode(inputValue, filterCompany, filterProductType, filterPolicyType, filterValidity, filterDateFrom, filterDateTo, filterReference, filterImd, filterClaimStatus, filterFinancialYear)

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null
    const parts = dateStr.split('-')
    if (parts.length !== 3) return null
    const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    if (Number.isNaN(expiry.getTime())) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  }

  const isInsurance = filterType === 'Insurance'
  const typeLabel = DOCUMENT_TYPES.find((t) => t.value === filterType)?.label || filterType
  const fyLabel = (y) => `FY ${y}-${String(Number(y) + 1).slice(2)}`

  const activeChips = [
    isInsurance && filterCompany && { key: 'company', label: companyNameById(filterCompany), clear: () => setFilterCompany('') },
    isInsurance && filterProductType && { key: 'product', label: filterProductType, clear: () => setFilterProductType('') },
    isInsurance && filterPolicyType && { key: 'policy', label: filterPolicyType, clear: () => setFilterPolicyType('') },
    isInsurance && filterReference && { key: 'client', label: `Client: ${referenceNameById(filterReference)}`, clear: () => setFilterReference('') },
    isInsurance && filterImd && { key: 'agent', label: `Agent: ${imdNameById(filterImd)}`, clear: () => setFilterImd('') },
    isInsurance && filterClaimStatus && { key: 'claim', label: filterClaimStatus === 'raised' ? 'Claim raised' : 'No claim', clear: () => setFilterClaimStatus('') },
    isInsurance && filterFinancialYear && { key: 'fy', label: fyLabel(filterFinancialYear), clear: () => setFilterFinancialYear('') },
    filterValidity && { key: 'validity', label: filterValidity === 'expired' ? 'Expired' : `Expires in ${filterValidity} days`, clear: () => setFilterValidity('') },
    filterDateFrom && { key: 'from', label: `Issued from ${filterDateFrom}`, clear: () => setFilterDateFrom('') },
    filterDateTo && { key: 'to', label: `Issued to ${filterDateTo}`, clear: () => setFilterDateTo('') },
  ].filter(Boolean)

  const openRecord = (record) => setViewingRecord({ type: filterType, id: record._id })

  const refetch = () => {
    fetchRecords(1, false, inputValue, filterType, filterCompany, filterProductType, filterPolicyType, filterValidity, filterDateFrom, filterDateTo, filterReference, filterImd, filterClaimStatus, filterFinancialYear)
  }

  const startEdit = (e, record) => {
    e.stopPropagation()
    setEditingRecord({ type: filterType, record })
  }

  const startDelete = (e, record) => {
    e.stopPropagation()
    setDeletingRecord({ type: filterType, record })
  }

  const finishEdit = () => {
    setEditingRecord(null)
    refetch()
  }

  // PUC and GPS edit modals hand the form back instead of saving it themselves.
  const saveEditedRecord = async (formData) => {
    const { type, record } = editingRecord
    try {
      await axios.put(`${API_URL}${API_ENDPOINTS[type]}/${record._id}`, formData, { withCredentials: true })
      toast.success('Record updated successfully')
      finishEdit()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record')
    }
  }

  const confirmDelete = async () => {
    if (!deletingRecord) return
    const { type, record } = deletingRecord
    setIsDeleting(true)
    try {
      const res = await axios.delete(`${API_URL}${API_ENDPOINTS[type]}/${record._id}`, { withCredentials: true })
      if (res.data?.success) {
        toast.success(`${DOCUMENT_TYPES.find((t) => t.value === type)?.label || type} record deleted`)
        setDeletingRecord(null)
        refetch()
      } else {
        toast.error('Failed to delete record')
      }
    } catch {
      toast.error('Failed to delete record')
    } finally {
      setIsDeleting(false)
    }
  }

  const RowActions = ({ record, compact = false }) => (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'justify-end gap-1.5'}`}>
      <button
        type='button'
        onClick={(e) => { e.stopPropagation(); openRecord(record) }}
        className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
        title='View'
      >
        <Svg d={ICON.eye} className='h-3.5 w-3.5' />
        View
      </button>
      <button
        type='button'
        onClick={(e) => startEdit(e, record)}
        className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
        title='Edit'
      >
        <Svg d={ICON.edit} className='h-3.5 w-3.5' />
        Edit
      </button>
      <button
        type='button'
        onClick={(e) => startDelete(e, record)}
        className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
        title='Delete'
      >
        <Svg d={ICON.trash} className='h-3.5 w-3.5' />
        {compact ? 'Delete' : <span className='sr-only'>Delete</span>}
      </button>
    </div>
  )

  const exportButton = (
    <button
      type='button'
      onClick={() => (!features.excelDownload ? setShowUpgradePopup(true) : handleExport())}
      disabled={!filteredRecords.length}
      className='inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50'
    >
      <Svg d={ICON.download} className='h-4 w-4' />
      Export Excel
    </button>
  )

  return (
    <div className='min-h-screen bg-slate-50' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <main className='w-full space-y-4 px-3 pt-4 pb-32 md:space-y-5 lg:px-8 lg:pt-6 lg:pb-10'>
        {/* Search panel */}
        <section className='rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 md:p-5'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 [&::-webkit-scrollbar]:hidden'>
              {DOCUMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type='button'
                  onClick={() => setFilterType(t.value)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold transition ${filterType === t.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className='hidden items-center gap-2 md:flex'>
              <span className='rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200'>
                {loading ? '…' : totalRecords} records
              </span>
              {exportButton}
            </div>
          </div>

          <div className='mt-3 flex gap-2'>
            <label className='relative block flex-1'>
              <span className='pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400'>
                {loading ? (
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent' />
                ) : (
                  <Svg d={ICON.search} className='h-5 w-5' />
                )}
              </span>
              <input
                type='text'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isInsurance ? 'Search by policy holder, vehicle number, mobile or policy number' : `Search ${typeLabel} by name, vehicle number or mobile`}
                className='w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-[15px] font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
              />
            </label>
            <button
              type='button'
              onClick={() => setShowFilterPanel(true)}
              className={`relative inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition md:px-4 ${activeFilterCount > 0 ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-700/20' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              <Svg d={ICON.filter} className='h-5 w-5' />
              <span className='hidden sm:inline'>Filters</span>
              {activeFilterCount > 0 && (
                <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-blue-700'>{activeFilterCount}</span>
              )}
            </button>
          </div>

          {activeChips.length > 0 && (
            <div className='mt-3 flex flex-wrap items-center gap-2'>
              {activeChips.map((c) => (
                <span key={c.key} className='inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-blue-800'>
                  {c.label}
                  <button type='button' onClick={c.clear} className='rounded-full p-0.5 text-blue-500 transition hover:bg-blue-100 hover:text-blue-800' aria-label={`Remove ${c.label}`}>
                    <Svg d={ICON.close} className='h-3.5 w-3.5' strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <button type='button' onClick={handleClearFilters} className='text-xs font-semibold text-rose-600 hover:text-rose-700'>
                Clear all
              </button>
            </div>
          )}

          <div className='mt-3 flex items-center justify-between md:hidden'>
            <span className='text-xs font-medium text-slate-500'>{loading ? 'Searching…' : `${totalRecords} records`}</span>
            {exportButton}
          </div>
        </section>

        {/* Results */}
        <section className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
          {loading ? (
            <div className='flex flex-col items-center gap-3 py-20'>
              <div className='h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-r-transparent' />
              <p className='text-sm text-slate-400'>Loading records…</p>
            </div>
          ) : searched && records.length === 0 ? (
            <div className='flex flex-col items-center gap-2 px-6 py-20 text-center'>
              <span className='flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
                <Svg d={ICON.search} className='h-7 w-7' />
              </span>
              <p className='font-semibold text-slate-800'>No records found</p>
              <p className='text-sm text-slate-500'>{activeFilterCount > 0 ? 'Try removing some filters.' : 'Try a different name or vehicle number.'}</p>
              {activeFilterCount > 0 && (
                <button type='button' onClick={handleClearFilters} className='mt-1 text-sm font-semibold text-blue-700 hover:text-blue-800'>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className='flex items-center justify-between border-b border-slate-100 px-4 py-3 md:px-6'>
                <p className='text-sm text-slate-500'>
                  Showing <span className='font-semibold text-slate-800'>{filteredRecords.length}</span> of{' '}
                  <span className='font-semibold text-slate-800'>{totalRecords}</span> {typeLabel} records
                </p>
              </div>

              {/* Desktop table */}
              <div className='hidden overflow-x-auto md:block'>
                <table className='w-full min-w-[760px] text-left'>
                  <thead>
                    <tr className='bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      <th className='px-6 py-3'>{isInsurance ? 'Policy Holder' : 'Owner'} &amp; Vehicle</th>
                      {isInsurance && <th className='px-6 py-3'>Company &amp; Policy</th>}
                      {isInsurance && <th className='px-6 py-3'>Client &amp; Agent</th>}
                      <th className='px-6 py-3'>Validity</th>
                      {isInsurance && <th className='px-6 py-3 text-right'>Premium</th>}
                      <th className='px-6 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {filteredRecords.map((record) => {
                      const name = record.policyHolderName || record.ownerName || record.name || ''
                      const due = dueText(getDaysLeft(record.validTo || record.taxTo))
                      return (
                        <tr key={record._id} onClick={() => openRecord(record)} className='cursor-pointer transition hover:bg-slate-50'>
                          <td className='px-6 py-3.5'>
                            <p className='mb-1 max-w-[240px] truncate text-sm font-semibold text-slate-800' title={name}>{name || '—'}</p>
                            <Plate value={record.vehicleNumber} />
                            {record.mobileNumber && <p className='text-xs text-slate-500'>{record.mobileNumber}</p>}
                          </td>
                          {isInsurance && (
                            <td className='px-6 py-3.5'>
                              <p className='max-w-[220px] truncate text-sm font-medium text-slate-800'>{recordCompanyName(record) || '—'}</p>
                              <p className='text-xs text-slate-500'>{[record.product, record.insuranceClass].filter(Boolean).join(' · ') || '—'}</p>
                              {record.policyNumber && <p className='font-mono text-[11px] text-slate-400'>{record.policyNumber}</p>}
                            </td>
                          )}
                          {isInsurance && (
                            <td className='px-6 py-3.5'>
                              <p className='text-sm font-medium text-slate-800'>{recordReferenceName(record) || '—'}</p>
                              <p className='text-xs text-slate-500'>{recordImdName(record)}</p>
                            </td>
                          )}
                          <td className='whitespace-nowrap px-6 py-3.5'>
                            <p className='text-xs text-slate-500'>From {record.validFrom || record.taxFrom || '—'}</p>
                            <p className='text-sm font-semibold text-slate-800'>To {record.validTo || record.taxTo || '—'}</p>
                            <p className={`text-xs font-semibold ${due.cls}`}>{due.text}</p>
                          </td>
                          {isInsurance && (
                            <td className='whitespace-nowrap px-6 py-3.5 text-right text-sm font-semibold text-emerald-700'>
                              {formatPremium(record.premium)}
                            </td>
                          )}
                          <td className='px-6 py-3.5'>
                            <RowActions record={record} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <ul className='divide-y divide-slate-100 md:hidden'>
                {filteredRecords.map((record) => {
                  const name = record.policyHolderName || record.ownerName || record.name || ''
                  const due = dueText(getDaysLeft(record.validTo || record.taxTo))
                  const company = isInsurance ? recordCompanyName(record) : ''
                  return (
                    <li key={record._id} className='px-4 py-3'>
                      <button type='button' onClick={() => openRecord(record)} className='flex w-full items-start gap-3 text-left active:bg-slate-50'>
                        <span className='min-w-0 flex-1'>
                          <span className='mb-0.5 block truncate text-sm font-semibold text-slate-800'>{name || '—'}</span>
                          <Plate value={record.vehicleNumber} small />
                          {company && <span className='block truncate text-xs text-slate-500'>{company}{record.product ? ` · ${record.product}` : ''}</span>}
                          {record.mobileNumber && <span className='block text-xs text-slate-400'>{record.mobileNumber}</span>}
                        </span>
                        <span className='shrink-0 text-right'>
                          <span className='block text-xs font-semibold text-slate-700'>{record.validTo || record.taxTo || '—'}</span>
                          <span className={`block text-[11px] font-semibold ${due.cls}`}>{due.text}</span>
                          {isInsurance && record.premium != null && (
                            <span className='mt-1 block text-xs font-semibold text-emerald-700'>{formatPremium(record.premium)}</span>
                          )}
                        </span>
                      </button>
                      <div className='mt-2.5 border-t border-dashed border-slate-100 pt-2.5'>
                        <RowActions record={record} compact />
                      </div>
                    </li>
                  )
                })}
              </ul>

              {!filterMode && hasMore && (
                <div className='border-t border-slate-100 p-4 text-center'>
                  <button
                    type='button'
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className='inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {loadingMore ? (
                      <>
                        <span className='h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent' />
                        Loading…
                      </>
                    ) : (
                      <>
                        <Svg d={ICON.chevronDown} className='h-4 w-4' />
                        Load more
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Filter popup */}
      {showFilterPanel && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-2 md:p-4' onClick={() => setShowFilterPanel(false)}>
          <div
            className='flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-label='Filters'
          >
            <div className='flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-3 text-white md:p-4'>
              <div>
                <h2 className='text-lg font-bold md:text-xl'>Filter {typeLabel}</h2>
                <p className='text-xs text-slate-300 md:text-sm'>Results update as you choose</p>
              </div>
              <button type='button' onClick={() => setShowFilterPanel(false)} className='rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2' aria-label='Close'>
                <Svg d={ICON.close} className='h-5 w-5 md:h-6 md:w-6' />
              </button>
            </div>

            <div className='flex-1 space-y-4 overflow-y-auto p-3 md:p-6'>
              {isInsurance && (
                <FilterSection n={1} title='Policy' tone='blue'>
                  <FilterSelect label='Insurance Company' value={filterCompany} onChange={setFilterCompany}>
                    <option value=''>All companies</option>
                    {companiesList.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </FilterSelect>
                  <FilterSelect label='Product Type' value={filterProductType} onChange={setFilterProductType}>
                    <option value=''>All product types</option>
                    {productTypesList.map((p) => {
                      const name = typeof p === 'string' ? p : p.name
                      return <option key={p._id || name} value={name}>{name}</option>
                    })}
                  </FilterSelect>
                  <FilterSelect label='Policy Type' value={filterPolicyType} onChange={setFilterPolicyType}>
                    <option value=''>All policy types</option>
                    {POLICY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </FilterSelect>
                  <FilterSelect label='Financial Year' value={filterFinancialYear} onChange={setFilterFinancialYear}>
                    <option value=''>All financial years</option>
                    {availableFinancialYears.map((y) => <option key={y} value={String(y)}>{fyLabel(y)}</option>)}
                  </FilterSelect>
                </FilterSection>
              )}

              {isInsurance && (
                <FilterSection n={2} title='Client & Claim' tone='emerald'>
                  <FilterSelect label='Client Name' value={filterReference} onChange={setFilterReference}>
                    <option value=''>All clients</option>
                    {referencesList.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </FilterSelect>
                  <FilterSelect label='Agent Name (IMD)' value={filterImd} onChange={setFilterImd}>
                    <option value=''>All agents</option>
                    {imdList.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </FilterSelect>
                  <FilterSelect label='Claim Status' value={filterClaimStatus} onChange={setFilterClaimStatus}>
                    <option value=''>Any</option>
                    <option value='raised'>Claim raised</option>
                    <option value='not_raised'>No claim</option>
                  </FilterSelect>
                </FilterSection>
              )}

              <FilterSection n={isInsurance ? 3 : 1} title='Dates' tone='amber'>
                <FilterSelect label='Validity' value={filterValidity} onChange={setFilterValidity}>
                  <option value=''>Any validity</option>
                  <option value='expired'>Expired</option>
                  <option value='7'>Expires in 7 days</option>
                  <option value='30'>Expires in 30 days</option>
                  <option value='45'>Expires in 45 days</option>
                  <option value='60'>Expires in 60 days</option>
                </FilterSelect>
                <div />
                <FilterDate label='Issue Date From' value={filterDateFrom} onChange={setFilterDateFrom} />
                <FilterDate label='Issue Date To' value={filterDateTo} onChange={setFilterDateTo} />
              </FilterSection>
            </div>

            <div className='flex flex-shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 p-3 md:p-4'>
              <button
                type='button'
                onClick={handleClearFilters}
                disabled={activeFilterCount === 0}
                className='rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent'
              >
                Clear all
              </button>
              <button
                type='button'
                onClick={() => setShowFilterPanel(false)}
                className='rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-2 font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 md:px-8'
              >
                Show {loading ? '' : totalRecords} results
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingRecord && (
        <DocumentDetailModal
          type={viewingRecord.type}
          id={viewingRecord.id}
          onClose={() => setViewingRecord(null)}
          onChanged={refetch}
        />
      )}

      {editingRecord?.type === 'Insurance' && (
        <AddInsuranceModal
          isOpen
          isEditMode
          initialData={editingRecord.record}
          onClose={() => setEditingRecord(null)}
          onSubmit={finishEdit}
        />
      )}
      {editingRecord?.type === 'Tax' && (
        <EditTaxModal isOpen tax={editingRecord.record} onClose={() => setEditingRecord(null)} onSubmit={finishEdit} />
      )}
      {editingRecord?.type === 'Permit' && (
        <EditPermitModal isOpen permit={editingRecord.record} onClose={() => setEditingRecord(null)} onSubmit={finishEdit} />
      )}
      {editingRecord?.type === 'Fitness' && (
        <EditFitnessModal isOpen fitness={editingRecord.record} onClose={() => setEditingRecord(null)} onSuccess={finishEdit} />
      )}
      {editingRecord?.type === 'PUC' && (
        <EditPucModal isOpen puc={editingRecord.record} onClose={() => setEditingRecord(null)} onSubmit={saveEditedRecord} />
      )}
      {editingRecord?.type === 'GPS' && (
        <EditGpsModal isOpen gps={editingRecord.record} onClose={() => setEditingRecord(null)} onSubmit={saveEditedRecord} />
      )}

      {deletingRecord && (
        <div className='fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4' onClick={() => !isDeleting && setDeletingRecord(null)}>
          <div className='w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl' onClick={(e) => e.stopPropagation()} role='alertdialog' aria-modal='true'>
            <div className='p-6'>
              <span className='flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600'>
                <Svg d={ICON.warn} className='h-6 w-6' />
              </span>
              <h3 className='mt-4 text-lg font-bold text-slate-900'>Delete this record?</h3>
              <p className='mt-1 text-sm text-slate-500'>
                The {DOCUMENT_TYPES.find((t) => t.value === deletingRecord.type)?.label || deletingRecord.type} record for{' '}
                <span className='font-semibold text-slate-800'>{deletingRecord.record.vehicleNumber || 'this vehicle'}</span>
                {(deletingRecord.record.policyHolderName || deletingRecord.record.ownerName || deletingRecord.record.name) && (
                  <> ({deletingRecord.record.policyHolderName || deletingRecord.record.ownerName || deletingRecord.record.name})</>
                )}{' '}
                will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className='flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4'>
              <button
                type='button'
                onClick={() => setDeletingRecord(null)}
                disabled={isDeleting}
                className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={confirmDelete}
                disabled={isDeleting}
                className='rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50'
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
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

export default Search
