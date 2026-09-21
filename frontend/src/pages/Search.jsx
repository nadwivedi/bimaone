import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { getInsuranceCompanies, subscribeInsuranceCompanies } from '../utils/insuranceCompanyCache'
import { getProductTypes, subscribeProductTypes } from '../utils/productTypeCache'
import useCurrentPlan from '../hooks/useCurrentPlan'
import UpgradePopup from '../components/UpgradePopup'

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

const Search = () => {
  const navigate = useNavigate()
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
  const filterPanelRef = useRef(null)
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

  // Close filter panel on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setShowFilterPanel(false)
      }
    }
    if (showFilterPanel) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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

  // Validity filter applied client-side on loaded records

  const getValidityDays = (rec) => {
    if (!rec.validTo) return null
    const parts = rec.validTo.split('-')
    if (parts.length !== 3) return null
    const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  }

  const filteredRecords = records

  const filterMode = computeFilterMode(inputValue, filterCompany, filterProductType, filterPolicyType, filterValidity, filterDateFrom, filterDateTo, filterReference, filterImd, filterClaimStatus, filterFinancialYear)

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null
    const parts = dateStr.split('-')
    if (parts.length !== 3) return null
    const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getExpiryField = (record) => record.validTo || record.taxTo

  const getStatusBadge = (record) => {
    const expiryField = getExpiryField(record)
    if (!expiryField) return null
    const parts = expiryField.split('-')
    if (parts.length !== 3) return null
    const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: 'Expired', class: 'bg-rose-100 text-rose-700 ring-rose-600/20' }
    if (diff <= 30) return { label: `${diff}d left`, class: 'bg-amber-100 text-amber-700 ring-amber-600/20' }
    return { label: 'Active', class: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' }
  }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f5f3ff,_#faf7f2_45%,_#fffdf9_100%)]'>
      <main className='px-2 pt-3 pb-32 lg:px-8 lg:pt-4'>
        <section className='w-full'>
          <div className='max-w-6xl mx-auto'>
            <div className='rounded-[32px] border border-stone-200 bg-white p-4 shadow-[0_28px_60px_-34px_rgba(68,64,60,0.25)] md:p-5 lg:p-6'>

              {/* Header */}
              <div className='mb-6 flex items-center justify-between'>
                <div>
                  <h1 className='text-lg md:text-2xl font-black text-stone-900'>Search {filterType === 'Tax' ? 'Road Tax' : filterType}</h1>
                  <p className='text-[8px] md:text-xs font-bold text-stone-400 uppercase tracking-[0.15em] mt-0.5'>Browse all {filterType === 'Tax' ? 'road tax' : filterType.toLowerCase()} records</p>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className='text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1'
                  >
                    <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                    Clear filters
                  </button>
                )}
              </div>

              {/* Search Bar + Filter Icon */}
              <div className='flex gap-2 items-center relative'>
                {/* Type Selector */}
                <div className='relative shrink-0'>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className='appearance-none rounded-xl border-2 border-stone-200 bg-white py-2.5 pl-3 pr-8 text-xs font-black text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all cursor-pointer'
                  >
                    {DOCUMENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <div className='pointer-events-none absolute inset-y-0 right-2 flex items-center'>
                    <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                    </svg>
                  </div>
                </div>

                <div className='relative flex-1'>
                  <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
                    {loading ? (
                      <div className='animate-spin h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full' />
                    ) : (
                      <svg className='w-4 h-4 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                      </svg>
                    )}
                  </div>
                  <input
                    type='text'
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder='Search by name, vehicle number...'
                    className='w-full rounded-xl border-2 border-stone-200 bg-white py-2.5 pl-9 pr-4 text-xs font-black text-stone-900 placeholder:text-[10px] md:placeholder:text-xs placeholder:text-stone-400 placeholder:font-semibold focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all uppercase'
                  />
                </div>

                {/* Filter Icon Button */}
                <div className='relative' ref={filterPanelRef}>
                  <button
                    onClick={() => setShowFilterPanel(prev => !prev)}
                    className={`relative flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${showFilterPanel || activeFilterCount > 0
                        ? 'border-violet-500 bg-violet-500 text-white shadow-lg shadow-violet-200'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-violet-400 hover:text-violet-500 hover:shadow-md'
                      }`}
                    title='Filter'
                  >
                    <svg className='w-4.5 h-4.5' style={{ width: '18px', height: '18px' }} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' />
                    </svg>
                    {activeFilterCount > 0 && (
                      <span className='absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow'>
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Filter Dropdown Panel */}
                  {showFilterPanel && (
                    <>
                      {/* Overlay backdrop */}
                      <div
                        className='fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm lg:bg-black/20'
                        onClick={() => setShowFilterPanel(false)}
                      />

                      <div className='fixed inset-0 z-[60] flex items-center justify-center'>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`
                            bg-white lg:bg-white/80 lg:backdrop-blur-xl
                            rounded-2xl border border-stone-200 shadow-2xl shadow-stone-300/50
                            overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150
                            w-[88vw] lg:w-[30rem] max-h-[85vh] lg:max-h-[90vh] flex flex-col
                          `}
                        >
                          {/* Panel Header */}
                           <div className='flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'>
                            <div className='flex items-center gap-2'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' />
                              </svg>
                              <span className='text-sm font-bold'>Filters</span>
                            </div>
                            <div className='flex items-center gap-3'>
                              {activeFilterCount > 0 && (
                                <button
                                  onClick={handleClearFilters}
                                  className='text-[10px] font-bold text-white/85 hover:text-white transition-colors underline underline-offset-2'
                                >
                                  Clear all
                                </button>
                              )}
                              <button
                                onClick={() => setShowFilterPanel(false)}
                                className='text-white/85 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/10'
                                title='Close'
                              >
                                <svg className='w-4.5 h-4.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className='p-4 lg:p-6 space-y-4 lg:space-y-5 flex-1 overflow-y-auto'>

                            {filterType === 'Insurance' && (
                              <>
                                {/* Insurance Company */}
                                <div>
                                  <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                    Insurance Company
                                  </label>
                                  <div className='relative'>
                                    <select
                                      value={filterCompany}
                                      onChange={(e) => setFilterCompany(e.target.value)}
                                      className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all cursor-pointer'
                                    >
                                      <option value=''>All Companies</option>
                                      {companiesList.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                      ))}
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                      <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                      </svg>
                                    </div>
                                  </div>
                                  {filterCompany && (
                                    <div className='mt-1.5 flex items-center justify-between'>
                                      <span className='text-[10px] font-bold text-violet-600 truncate max-w-[200px]'>{companyNameById(filterCompany)}</span>
                                      <button onClick={() => setFilterCompany('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Product Type */}
                                <div>
                                  <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                    Product Type
                                  </label>
                                  <div className='relative'>
                                    <select
                                      value={filterProductType}
                                      onChange={(e) => setFilterProductType(e.target.value)}
                                      className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all cursor-pointer'
                                    >
                                       <option value=''>All Product Types</option>
                                       {productTypesList.map(p => {
                                         const name = typeof p === 'string' ? p : p.name
                                         return <option key={p._id || name} value={name}>{name}</option>
                                       })}
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                      <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                      </svg>
                                    </div>
                                  </div>
                                  {filterProductType && (
                                    <div className='mt-1.5 flex items-center justify-between'>
                                      <span className='text-[10px] font-bold text-violet-600 truncate max-w-[200px]'>{filterProductType}</span>
                                      <button onClick={() => setFilterProductType('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Policy Type */}
                                <div>
                                  <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                    Policy Type
                                  </label>
                                  <div className='relative'>
                                    <select
                                      value={filterPolicyType}
                                      onChange={(e) => setFilterPolicyType(e.target.value)}
                                      className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all cursor-pointer'
                                    >
                                      <option value=''>All Policy Types</option>
                                      {POLICY_TYPES.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                      ))}
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                      <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                      </svg>
                                    </div>
                                  </div>
                                  {filterPolicyType && (
                                    <div className='mt-1.5 flex items-center justify-between'>
                                      <span className='text-[10px] font-bold text-violet-600 truncate max-w-[200px]'>{filterPolicyType}</span>
                                      <button onClick={() => setFilterPolicyType('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Client Name */}
                                <div>
                                  <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                    Client Name
                                  </label>
                                  <div className='relative'>
                                    <select
                                      value={filterReference}
                                      onChange={(e) => setFilterReference(e.target.value)}
                                      className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all cursor-pointer'
                                    >
                                      <option value=''>All Client Names</option>
                                      {referencesList.map((r) => (
                                        <option key={r._id} value={r._id}>{r.name}</option>
                                      ))}
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                      <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                      </svg>
                                    </div>
                                  </div>
                                  {filterReference && (
                                    <div className='mt-1.5 flex items-center justify-between'>
                                      <span className='text-[10px] font-bold text-violet-600 truncate max-w-[200px]'>{referenceNameById(filterReference)}</span>
                                      <button onClick={() => setFilterReference('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                  </div>

                                {/* Agent name */}
                                <div>
                                  <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                    Agent name (IMD)
                                  </label>
                                  <div className='relative'>
                                    <select
                                      value={filterImd}
                                      onChange={(e) => setFilterImd(e.target.value)}
                                      className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all cursor-pointer'
                                    >
                                      <option value=''>All Agent names</option>
                                      {imdList.map((r) => (
                                        <option key={r._id} value={r._id}>{r.name}</option>
                                      ))}
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                      <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                      </svg>
                                    </div>
                                  </div>
                                  {filterImd && (
                                    <div className='mt-1.5 flex items-center justify-between'>
                                      <span className='text-[10px] font-bold text-purple-600 truncate max-w-[200px]'>{imdNameById(filterImd)}</span>
                                      <button onClick={() => setFilterImd('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Claim Status */}
                                <div>
                                  <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                    Claim Status
                                  </label>
                                  <div className='relative'>
                                    <select
                                      value={filterClaimStatus}
                                      onChange={(e) => setFilterClaimStatus(e.target.value)}
                                      className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all cursor-pointer'
                                    >
                                      <option value=''>All — Any Claim</option>
                                      <option value='raised'>Claim Raised</option>
                                      <option value='not_raised'>No Claim</option>
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                      <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                      </svg>
                                    </div>
                                  </div>
                                  {filterClaimStatus && (
                                    <div className='mt-1.5 flex items-center justify-between'>
                                      <span className='text-[10px] font-bold text-teal-600 truncate max-w-[200px]'>{filterClaimStatus === 'raised' ? 'Claim Raised' : 'No Claim'}</span>
                                      <button onClick={() => setFilterClaimStatus('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Financial Year */}
                                <div>
                                  <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                    Financial Year
                                  </label>
                                  <div className='relative'>
                                    <select
                                      value={filterFinancialYear}
                                      onChange={(e) => setFilterFinancialYear(e.target.value)}
                                      className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all cursor-pointer'
                                    >
                                      <option value=''>All Financial Years</option>
                                      {availableFinancialYears.map((y) => (
                                        <option key={y} value={String(y)}>{y}-{String(y + 1).slice(2)}</option>
                                      ))}
                                    </select>
                                    <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                      <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                      </svg>
                                    </div>
                                  </div>
                                  {filterFinancialYear && (
                                    <div className='mt-1.5 flex items-center justify-between'>
                                      <span className='text-[10px] font-bold text-teal-600 truncate max-w-[200px]'>FY {filterFinancialYear}-{String(Number(filterFinancialYear) + 1).slice(2)}</span>
                                      <button onClick={() => setFilterFinancialYear('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                        <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Validity */}
                            <div>
                              <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                Validity Period
                              </label>
                              <div className='relative'>
                                <select
                                  value={filterValidity}
                                  onChange={(e) => setFilterValidity(e.target.value)}
                                  className='w-full appearance-none rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 pl-3 pr-8 text-xs font-bold text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all cursor-pointer'
                                >
                                  <option value=''>All — Any Validity</option>
                                  <option value='expired'>❌ Expired</option>
                                  <option value='7'>⚠️ Expires in 7 Days</option>
                                  <option value='30'>🔔 Expires in 30 Days</option>
                                  <option value='45'>🔔 Expires in 45 Days</option>
                                  <option value='60'>✅ Expires in 60 Days</option>
                                </select>
                                <div className='pointer-events-none absolute inset-y-0 right-2.5 flex items-center'>
                                  <svg className='w-3.5 h-3.5 text-stone-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                                  </svg>
                                </div>
                              </div>
                              {filterValidity && (
                                <div className='mt-1.5 flex items-center justify-between'>
                                  <span className='text-[10px] font-bold text-violet-600 truncate max-w-[200px]'>
                                    {filterValidity === 'expired' ? 'Expired' : `Expires in ${filterValidity} Days`}
                                  </span>
                                  <button onClick={() => setFilterValidity('')} className='text-stone-400 hover:text-rose-500 transition-colors ml-1'>
                                    <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Policy Issue Date */}
                            <div>
                              <label className='block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5'>
                                Policy Issue Date
                              </label>
                              <div className='flex gap-2'>
                                <div className='flex-1'>
                                  <input
                                    type='date'
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className='w-full rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 px-3 text-xs font-bold text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all'
                                  />
                                  {filterDateFrom && (
                                    <div className='mt-1 flex items-center justify-between'>
                                      <span className='text-[9px] font-bold text-violet-600'>From</span>
                                      <button onClick={() => setFilterDateFrom('')} className='text-stone-400 hover:text-rose-500 transition-colors'>
                                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className='flex-1'>
                                  <input
                                    type='date'
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className='w-full rounded-xl border-2 border-stone-200 bg-white py-2 lg:py-2.5 px-3 text-xs font-bold text-stone-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all'
                                  />
                                  {filterDateTo && (
                                    <div className='mt-1 flex items-center justify-between'>
                                      <span className='text-[9px] font-bold text-violet-600'>To</span>
                                      <button onClick={() => setFilterDateTo('')} className='text-stone-400 hover:text-rose-500 transition-colors'>
                                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className='flex-shrink-0 border-t border-stone-100 bg-white px-4 pb-4 pt-3 lg:px-6 lg:pb-6'>
                            <button
                              onClick={() => setShowFilterPanel(false)}
                              className='w-full py-2 lg:py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs lg:text-sm font-bold shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:from-violet-700 hover:to-indigo-700 active:scale-95'
                            >
                              Apply Filters
                              {activeFilterCount > 0 && (
                                <span className='ml-2 bg-white/30 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md'>
                                  {activeFilterCount} active
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Active Filter Chips */}
              {activeFilterCount > 0 && (
                <div className='mt-3 flex flex-wrap gap-2'>
                  {filterType === 'Insurance' && filterCompany && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16' />
                      </svg>
                      {companyNameById(filterCompany)}
                      <button onClick={() => setFilterCompany('')} className='ml-0.5 hover:text-rose-500 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterType === 'Insurance' && filterProductType && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700 ring-1 ring-inset ring-purple-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                      </svg>
                      {filterProductType}
                      <button onClick={() => setFilterProductType('')} className='ml-0.5 hover:text-rose-500 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterType === 'Insurance' && filterPolicyType && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                      </svg>
                      {filterPolicyType}
                      <button onClick={() => setFilterPolicyType('')} className='ml-0.5 hover:text-rose-500 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterType === 'Insurance' && filterReference && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 ring-1 ring-inset ring-teal-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' />
                      </svg>
                      {referenceNameById(filterReference)}
                      <button onClick={() => setFilterReference('')} className='ml-0.5 hover:text-rose-500 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterType === 'Insurance' && filterImd && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700 ring-1 ring-inset ring-purple-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' />
                      </svg>
                      {imdNameById(filterImd)}
                      <button onClick={() => setFilterImd('')} className='ml-0.5 hover:text-rose-500 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterType === 'Insurance' && filterClaimStatus && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 ring-1 ring-inset ring-teal-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
                      </svg>
                      {filterClaimStatus === 'raised' ? 'Claim Raised' : 'No Claim'}
                      <button onClick={() => setFilterClaimStatus('')} className='ml-0.5 hover:text-rose-500 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterType === 'Insurance' && filterFinancialYear && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700 ring-1 ring-inset ring-cyan-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
                      </svg>
                      FY {filterFinancialYear}-{String(Number(filterFinancialYear) + 1).slice(2)}
                      <button onClick={() => setFilterFinancialYear('')} className='ml-0.5 hover:text-rose-500 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterValidity && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                      {filterValidity === 'expired' ? 'Expired' : `Expires in ${filterValidity} Days`}
                      <button onClick={() => setFilterValidity('')} className='ml-0.5 hover:text-rose-700 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterDateFrom && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700 ring-1 ring-inset ring-orange-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                      </svg>
                      Issue From: {filterDateFrom}
                      <button onClick={() => setFilterDateFrom('')} className='ml-0.5 hover:text-rose-700 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filterDateTo && (
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700 ring-1 ring-inset ring-orange-200'>
                      <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                      </svg>
                      Issue To: {filterDateTo}
                      <button onClick={() => setFilterDateTo('')} className='ml-0.5 hover:text-rose-700 transition-colors'>
                        <svg className='w-2.5 h-2.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className='mt-6 text-center py-12 bg-stone-50/50 rounded-2xl border-2 border-dashed border-stone-200'>
                  <div className='animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto'></div>
                  <p className='text-xs text-stone-500 mt-2 font-bold uppercase tracking-widest'>Loading records...</p>
                </div>
              )}

              {/* No Results */}
              {!loading && searched && records.length === 0 && (
                <div className='mt-6 text-center py-12 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200'>
                  <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-stone-50 to-stone-100 shadow-inner'>
                    <svg className='h-10 w-10 text-stone-300' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                    </svg>
                  </div>
                  <h3 className='text-lg font-black text-stone-800'>No Records Found</h3>
                  <p className='mt-1 text-xs font-semibold text-stone-400'>
                    {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Try a different search term.'}
                  </p>
                  {activeFilterCount > 0 && (
                    <button onClick={handleClearFilters} className='mt-3 text-xs font-bold text-violet-600 hover:text-violet-700 underline underline-offset-2'>
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Results */}
              {!loading && records.length > 0 && (
                <>
                  <div className='mt-6 mb-3 flex items-center justify-between flex-wrap gap-2'>
                    <p className='text-xs font-bold text-stone-500'>
                      Showing <span className='text-stone-800'>{filteredRecords.length}</span> of <span className='text-stone-800'>{totalRecords}</span> results
                    </p>
                    <div className='flex items-center gap-2'>
                      {filteredRecords.length > 0 && (
                        <button
                          onClick={() => !features.excelDownload ? setShowUpgradePopup(true) : handleExport()}
                          className='flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 transition-all border border-emerald-200'
                        >
                          <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                          </svg>
                          Export Excel
                        </button>
                      )}
                      {activeFilterCount > 0 && (
                        <span className='text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg'>
                          {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
                        </span>
                      )}
                    </div>
                  </div>

                  {filteredRecords.length === 0 && filterValidity && (
                    <div className='text-center py-10 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200'>
                      <p className='text-sm font-black text-stone-400'>No records match the validity filter</p>
                      <button onClick={() => setFilterValidity('')} className='mt-2 text-xs font-bold text-violet-600 hover:text-violet-700 underline underline-offset-2'>Clear validity filter</button>
                    </div>
                  )}

                  <div className='hidden md:block overflow-x-auto rounded-2xl border border-stone-200 bg-white'>
                    <table className='w-full min-w-[720px] text-left'>
                      <thead>
                        <tr className='border-b border-stone-200 bg-stone-50'>
                          <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-stone-400'>#</th>
                          <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-stone-400'>{filterType === 'Insurance' ? 'Policy Holder / Vehicle' : 'Name / Vehicle'}</th>
                          {filterType === 'Insurance' && <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-stone-400'>Company / Product</th>}
                          {filterType === 'Insurance' && <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-stone-400'>Client / Agent</th>}
                          <th className='px-4 py-3 text-[10px] font-black uppercase tracking-wider text-stone-400'>Validity (From / To)</th>
                          {filterType === 'Insurance' && <th className='px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-stone-400'>Premium</th>}
                          <th className='px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-stone-400'>Status</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-stone-100'>
                        {filteredRecords.map((record, idx) => {
                          const badge = getStatusBadge(record)
                          const recordName = record.policyHolderName || record.ownerName || record.name || 'Unknown'
                          const days = getDaysLeft(record.validTo || record.taxTo)
                          return (
                            <tr
                              key={record._id}
                              onClick={() => navigate(`/rto-documents/${filterType}/${record._id}`)}
                              className='cursor-pointer transition-colors odd:bg-white even:bg-stone-50/40 hover:bg-violet-50/60'
                            >
                              <td className='px-4 py-3 text-[11px] font-bold text-stone-400'>{idx + 1}</td>
                              <td className='px-4 py-3'>
                                <p className='text-sm font-black text-stone-900'>{recordName}</p>
                                <p className='mt-0.5 font-mono text-xs font-black uppercase tracking-wider text-violet-700'>{record.vehicleNumber || 'N/A'}</p>
                                {record.mobileNumber && <p className='text-[10px] font-bold text-stone-400'>{record.mobileNumber}</p>}
                              </td>
                              {filterType === 'Insurance' && (
                                <td className='px-4 py-3'>
                                  <p className='text-xs font-bold text-stone-700'>{recordCompanyName(record) || '—'}</p>
                                  <p className='text-[10px] font-semibold text-stone-400'>{[record.product, record.insuranceClass].filter(Boolean).join(' · ')}</p>
                                  {record.policyNumber && <p className='font-mono text-[10px] text-stone-400'>{record.policyNumber}</p>}
                                </td>
                              )}
                              {filterType === 'Insurance' && (
                                <td className='px-4 py-3'>
                                  <p className='text-xs font-bold text-stone-700'>{recordReferenceName(record) || '—'}</p>
                                  <p className='text-[10px] font-semibold text-stone-400'>{recordImdName(record)}</p>
                                </td>
                              )}
                              <td className='whitespace-nowrap px-4 py-3'>
                                <p className='text-xs font-medium text-stone-500'>
                                  <span className='mr-1 text-[8px] font-black uppercase tracking-wider text-stone-400'>From</span>
                                  {record.validFrom || record.taxFrom || 'N/A'}
                                </p>
                                <p className='mt-0.5 text-xs font-black text-stone-900'>
                                  <span className='mr-1 text-[8px] font-black uppercase tracking-wider text-stone-400'>To</span>
                                  {record.validTo || record.taxTo || 'N/A'}
                                  {days !== null && <span className={`ml-1 ${days < 0 ? 'text-rose-600' : 'text-stone-400'}`}>({days}d)</span>}
                                </p>
                              </td>
                              {filterType === 'Insurance' && (
                                <td className='whitespace-nowrap px-4 py-3 text-right text-xs font-black text-emerald-700'>
                                  {record.premium != null ? `₹${record.premium.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '—'}
                                </td>
                              )}
                              <td className='px-4 py-3 text-right'>
                                {badge && (
                                  <span className={`inline-block rounded-lg px-2 py-1 text-[9px] font-black uppercase leading-none tracking-wider ring-1 ring-inset ${badge.class}`}>
                                    {badge.label}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className='grid gap-4 md:hidden'>
                    {filteredRecords.map((record) => {
                      const badge = getStatusBadge(record)
                      const recordName = record.policyHolderName || record.ownerName || record.name || 'Unknown'
                      return (
                        <div
                          key={record._id}
                          onClick={() => navigate(`/rto-documents/${filterType}/${record._id}`)}
                          className='group relative overflow-hidden rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-violet-500 hover:shadow-xl hover:shadow-violet-100/40 hover:-transtone-y-0.5 cursor-pointer'
                        >
                          <div className='flex items-start justify-between'>
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2 flex-wrap'>
                                <h3 className='text-xs sm:text-sm font-black text-stone-900 truncate sm:overflow-visible sm:whitespace-normal max-w-[200px] sm:max-w-none'>
                                  {recordName}
                                </h3>
                                {filterType === 'Insurance' && record.premium != null && (
                                  <span className='inline-flex items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shadow-sm'>
                                    ₹{record.premium.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              <p className='text-[10px] font-black tracking-wider text-stone-400 uppercase font-mono mt-0.5'>
                                {record.vehicleNumber || 'N/A'}
                              </p>
                              {record.mobileNumber && (
                                <p className='text-[10px] font-bold text-stone-400 mt-0.5'>{record.mobileNumber}</p>
                              )}
                              <div className='mt-2.5 flex flex-wrap gap-1.5'>
                                <span className='inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[9px] font-black text-stone-600 ring-1 ring-inset ring-stone-300/50 whitespace-nowrap shadow-sm'>
                                  {filterType}
                                </span>
                                {filterType === 'Insurance' && recordCompanyName(record) && (
                                  <span className='inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-700 ring-1 ring-inset ring-violet-700/10 whitespace-nowrap shadow-sm'>
                                    {recordCompanyName(record)}
                                  </span>
                                )}
                                {filterType === 'Insurance' && record.product && (
                                  <span className='inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[9px] font-black text-purple-700 ring-1 ring-inset ring-purple-700/10 whitespace-nowrap shadow-sm'>
                                    {record.product}
                                  </span>
                                )}
                                {filterType === 'Insurance' && record.insuranceClass && (
                                  <span className='inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap shadow-sm'>
                                    {record.insuranceClass}
                                  </span>
                                )}
                                {filterType === 'Insurance' && recordReferenceName(record) && (
                                  <span className='inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[9px] font-black text-teal-700 ring-1 ring-inset ring-teal-700/10 whitespace-nowrap shadow-sm'>
                                    {recordReferenceName(record)}
                                  </span>
                                )}
                                {filterType === 'Insurance' && recordImdName(record) && (
                                  <span className='inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[9px] font-black text-purple-700 ring-1 ring-inset ring-purple-700/10 whitespace-nowrap shadow-sm'>
                                    {recordImdName(record)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {badge && (
                              <span className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black uppercase leading-none tracking-wider shadow-sm ring-1 ring-inset ${badge.class}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <div className='mt-4 flex items-center justify-between border-t border-stone-100 pt-3'>
                            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-stone-500'>
                              <span className='whitespace-nowrap'>
                                <span className='text-[8px] font-black uppercase tracking-wider text-stone-400 mr-1'>From</span>
                                <span className='text-stone-700 font-semibold'>{record.validFrom || record.taxFrom || 'N/A'}</span>
                              </span>
                              <span className='text-stone-300 hidden min-[320px]:inline'>•</span>
                              <span className='whitespace-nowrap'>
                                <span className='text-[8px] font-black uppercase tracking-wider text-stone-400 mr-1'>To</span>
                                <span className='font-black text-stone-900'>
                                  {record.validTo || record.taxTo || 'N/A'}
                                  {(() => {
                                    const days = getDaysLeft(record.validTo || record.taxTo)
                                    if (days === null) return null
                                    return (
                                      <span className='text-rose-600 ml-1'>({days}d)</span>
                                    )
                                  })()}
                                </span>
                              </span>
                              {filterType === 'Insurance' && record.issueDate && (
                                <>
                                  <span className='text-stone-300 hidden min-[320px]:inline'>•</span>
                                  <span className='whitespace-nowrap'>
                                    <span className='text-[8px] font-black uppercase tracking-wider text-stone-400 mr-1'>Issued</span>
                                    <span className='text-stone-700 font-semibold'>{record.issueDate}</span>
                                  </span>
                                </>
                              )}
                            </div>
                            {filterType === 'Insurance' && record.policyNumber && (
                              <span className='hidden sm:inline-block self-start sm:self-auto -mt-1 sm:mt-0 text-[9px] font-extrabold text-stone-400 bg-stone-50 px-2 py-0.5 rounded border border-stone-150 uppercase tracking-wider truncate sm:overflow-visible sm:whitespace-normal max-w-[130px] sm:max-w-none shadow-sm'>
                                {record.policyNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {!filterMode && hasMore && (
                    <div className='mt-8 text-center'>
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className='inline-flex items-center gap-2 rounded-xl bg-white border-2 border-stone-200 px-8 py-3 text-xs font-black text-stone-700 uppercase tracking-wider transition-all hover:border-violet-400 hover:text-violet-600 hover:shadow-lg hover:shadow-violet-100/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        {loadingMore ? (
                          <>
                            <div className='animate-spin h-4 w-4 border-2 border-violet-600 border-t-transparent rounded-full'></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                            </svg>
                            Load More
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </section>
      </main>

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
