import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import * as XLSX from 'xlsx'
import AddFitnessModal from './Fitness/AddFitnessModal'
import AddPucModal from './Puc/AddPucModal'
import AddGpsModal from './Gps/AddGpsModal'
import AddTaxModal from './Tax/AddTaxModal'
import AddPermitModal from './Permit/components/AddPermitModal'
import AddRcModal from './Rc/AddRcModal'
import EditFitnessModal from './Fitness/EditFitnessModal'
import EditPucModal from './Puc/EditPucModal'
import EditGpsModal from './Gps/EditGpsModal'
import EditTaxModal from './Tax/EditTaxModal'
import EditPermitModal from './Permit/components/EditPermitModal'
import EditRcModal from './Rc/EditRcModal'
import ImportModal from '../components/ImportModal'
import DocumentDetailModal from '../components/DocumentDetailModal'
import useCurrentPlan from '../hooks/useCurrentPlan'
import UpgradePopup from '../components/UpgradePopup'
import { getDaysRemaining } from '../utils/dateHelpers'


const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"


const RTODocuments = () => {
  const { features } = useCurrentPlan()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)
  const [showAddFitnessModal, setShowAddFitnessModal] = useState(false)
  const [showAddPucModal, setShowAddPucModal] = useState(false)
  const [showAddGpsModal, setShowAddGpsModal] = useState(false)
  const [showAddTaxModal, setShowAddTaxModal] = useState(false)
  const [showAddPermitModal, setShowAddPermitModal] = useState(false)
  const [showAddRcModal, setShowAddRcModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [initialExtractionFile, setInitialExtractionFile] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [editingDoc, setEditingDoc] = useState(null)
  const [deletingDoc, setDeletingDoc] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchAllDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = [
        { type: 'Tax', url: `${API_URL}/api/tax`, fromField: 'taxFrom', toField: 'taxTo' },
        { type: 'PUC', url: `${API_URL}/api/puc`, fromField: 'validFrom', toField: 'validTo' },
        { type: 'GPS', url: `${API_URL}/api/gps`, fromField: 'validFrom', toField: 'validTo' },
        { type: 'Fitness', url: `${API_URL}/api/fitness`, fromField: 'validFrom', toField: 'validTo' },
        { type: 'Permit', url: `${API_URL}/api/permit`, fromField: 'validFrom', toField: 'validTo' },
        { type: 'RC', url: `${API_URL}/api/rc`, fromField: null, toField: null },
      ];

      const requests = endpoints.map(ep => axios.get(ep.url, { withCredentials: true, params: { limit: 1000 } }));
      const responses = await Promise.allSettled(requests);
      
      let allDocs = [];
      
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.data.success) {
          const ep = endpoints[index];
          const records = response.value.data.data.map(record => ({
            id: record._id,
            type: ep.type,
            vehicleNumber: record.vehicleNumber,
            validFrom: ep.fromField ? (record[ep.fromField] || 'N/A') : 'N/A',
            validTo: ep.toField ? (record[ep.toField] || 'N/A') : 'N/A',
            status: ep.type === 'RC' ? 'Active' : (record.status === 'active' ? 'Active' : (record.status === 'expiring_soon' ? 'Expiring Soon' : 'Expired')),
            rawRecord: record
          }));
          allDocs = [...allDocs, ...records];
        }
      });

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllDocuments();
  }, [fetchAllDocuments]);

  const handleDeleteConfirm = async () => {
    if (!deletingDoc) return
    setIsDeleting(true)
    const typeLower = deletingDoc.type.toLowerCase()
    try {
      const res = await axios.delete(`${API_URL}/api/${typeLower}/${deletingDoc.id}`, { withCredentials: true })
      if (res.data.success) {
        toast.success(`${deletingDoc.type} record deleted successfully`)
        setDeletingDoc(null)
        fetchAllDocuments()
      } else {
        toast.error('Failed to delete record')
      }
    } catch {
      toast.error('Failed to delete record')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSubmit = async (formData) => {
    if (!editingDoc) return
    const typeLower = editingDoc.type.toLowerCase()
    try {
      await axios.put(`${API_URL}/api/${typeLower}/${editingDoc.id}`, formData, { withCredentials: true })
      toast.success('Record updated successfully')
      setEditingDoc(null)
      fetchAllDocuments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record')
    }
  }

  const handleEditClick = (e, doc) => {
    e.stopPropagation();
    setEditingDoc(doc)
  }

  const statusPriority = { 'Active': 1, 'Expiring Soon': 2, 'Expired': 3 }

  const totalDocs = documents.length
  const activeDocs = documents.filter(d => d.status === 'Active').length
  const expiringDocs = documents.filter(d => d.status === 'Expiring Soon').length
  const expiredDocs = documents.filter(d => d.status === 'Expired').length

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.type.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'All' || doc.status === statusFilter
      const matchesType = typeFilter === 'All' || doc.type === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
    .sort((a, b) => statusPriority[a.status] - statusPriority[b.status])

  const handleExport = () => {
    if (!filteredDocuments.length) return
    const exportData = filteredDocuments.map((doc) => {
      const record = doc.rawRecord || {}
      const fee = getFeeInfo(doc)
      return {
        'Type': doc.type === 'Tax' ? 'Road Tax' : doc.type,
        'Vehicle Number': doc.vehicleNumber || '',
        'Holder Name': record.ownerName || record.policyHolderName || record.name || '',
        'Mobile': record.mobileNumber || '',
        'Valid From': doc.validFrom !== 'N/A' ? doc.validFrom : '',
        'Valid To': doc.validTo !== 'N/A' ? doc.validTo : '',
        'Status': doc.status,
        'Total Fee': fee ? fee.total : '',
        'Paid': fee ? fee.paid : '',
        'Pending': fee ? fee.pending : '',
        'Remarks': record.remarks || '',
      }
    })
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'RTO Documents')
    XLSX.writeFile(wb, `rto_documents_${typeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const STATUS_STYLES = {
    Active: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
    'Expiring Soon': { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', label: 'Expiring' },
    Expired: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', label: 'Expired' },
  }

  const TYPE_CONFIG = {
    Tax: { label: 'Road Tax', tint: 'bg-emerald-50 text-emerald-600 ring-emerald-100', icon: 'M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z' },
    PUC: { label: 'PUC', tint: 'bg-sky-50 text-sky-600 ring-sky-100', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
    GPS: { label: 'GPS', tint: 'bg-violet-50 text-violet-600 ring-violet-100', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    Fitness: { label: 'Fitness', tint: 'bg-amber-50 text-amber-600 ring-amber-100', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    Permit: { label: 'Permit', tint: 'bg-rose-50 text-rose-600 ring-rose-100', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    RC: { label: 'RC', tint: 'bg-blue-50 text-blue-600 ring-blue-100', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2' },
  }

  const typeLabel = (type) => TYPE_CONFIG[type]?.label || type
  const holderName = (doc) => doc.rawRecord?.ownerName || doc.rawRecord?.policyHolderName || doc.rawRecord?.name || ''

  // Tax stores fee fields as totalAmount/paidAmount/balanceAmount; PUC, Fitness, GPS & Permit use totalFee/paid/balance; RC has no fee tracking.
  const getFeeInfo = (doc) => {
    const record = doc.rawRecord || {}
    const total = doc.type === 'Tax' ? record.totalAmount : record.totalFee
    if (total === undefined || total === null) return null
    const paid = doc.type === 'Tax' ? (record.paidAmount || 0) : (record.paid || 0)
    const pending = doc.type === 'Tax' ? record.balanceAmount : record.balance
    return {
      total: Number(total) || 0,
      paid: Number(paid) || 0,
      pending: pending !== undefined && pending !== null ? Number(pending) : Math.max((Number(total) || 0) - (Number(paid) || 0), 0),
    }
  }

  const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  const getExpiryInfo = (doc) => {
    if (!/^\d{1,2}-\d{1,2}-\d{4}$/.test(doc.validTo || '')) return null
    const days = getDaysRemaining(doc.validTo)
    if (days < 0) return { text: `Expired (${-days}d ago)`, cls: 'text-rose-600' }
    if (days === 0) return { text: 'Expires (today)', cls: 'text-amber-600' }
    return { text: `Expiring (in ${days}d)`, cls: days <= 30 ? 'text-amber-600' : 'text-emerald-600' }
  }

  const typeCounts = documents.reduce((acc, d) => ({ ...acc, [d.type]: (acc[d.type] || 0) + 1 }), {})

  const feeTotals = filteredDocuments.reduce((acc, doc) => {
    const fee = getFeeInfo(doc)
    if (!fee) return acc
    acc.total += fee.total
    acc.paid += fee.paid
    acc.pending += fee.pending
    return acc
  }, { total: 0, paid: 0, pending: 0 })

  const TypeIcon = ({ type, size = 'h-10 w-10' }) => (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${TYPE_CONFIG[type]?.tint || 'bg-slate-50 text-slate-500 ring-slate-100'}`}>
      <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={TYPE_CONFIG[type]?.icon || TYPE_CONFIG.Permit.icon} />
      </svg>
    </div>
  )

  const StatusBadge = ({ status }) => {
    const s = STATUS_STYLES[status] || STATUS_STYLES.Active
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${s.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    )
  }

  const Plate = ({ number }) => (
    <span className='inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold tracking-wider text-slate-800 shadow-sm'>
      {number}
    </span>
  )

  const ActionButtons = ({ doc }) => (
    <div className='flex items-center justify-end gap-1'>
      <button
        onClick={(e) => { e.stopPropagation(); setViewingDoc(doc) }}
        className='cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
        title='View Details'
      >
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
        </svg>
      </button>
      <button
        onClick={(e) => handleEditClick(e, doc)}
        className='cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600'
        title='Edit Record'
      >
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setDeletingDoc(doc) }}
        className='cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600'
        title='Delete Record'
      >
        <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
        </svg>
      </button>
    </div>
  )

  const statCards = [
    { key: 'All', label: 'Total Documents', value: totalDocs, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', iconCls: 'bg-blue-50 text-blue-600', activeCls: 'border-blue-500 ring-4 ring-blue-500/10' },
    { key: 'Active', label: 'Active', value: activeDocs, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', iconCls: 'bg-emerald-50 text-emerald-600', activeCls: 'border-emerald-500 ring-4 ring-emerald-500/10' },
    { key: 'Expiring Soon', label: 'Expiring Soon', value: expiringDocs, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', iconCls: 'bg-amber-50 text-amber-600', activeCls: 'border-amber-500 ring-4 ring-amber-500/10' },
    { key: 'Expired', label: 'Expired', value: expiredDocs, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', iconCls: 'bg-rose-50 text-rose-600', activeCls: 'border-rose-500 ring-4 ring-rose-500/10' },
  ]

  const typeTabs = [{ value: 'All', label: 'All', count: totalDocs }, ...Object.keys(TYPE_CONFIG).map((t) => ({ value: t, label: TYPE_CONFIG[t].label, count: typeCounts[t] || 0 }))]

  return (
    <div className='min-h-screen bg-slate-50' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <main className='px-3 pt-4 pb-32 lg:px-8 lg:pt-6'>
        <section className='w-full space-y-5'>
          {/* Header */}
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h1 className='text-xl font-bold text-slate-900 md:text-2xl'>RTO Documents</h1>
              <p className='mt-0.5 text-sm text-slate-500'>Road Tax, PUC, Fitness, Permit, GPS &amp; RC for all your vehicles</p>
            </div>
            <div className='flex items-center gap-2'>
              {filteredDocuments.length > 0 && (
                <button
                  type='button'
                  onClick={() => !features.excelDownload ? setShowUpgradePopup(true) : handleExport()}
                  className='flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50'
                >
                  <svg className='h-4 w-4 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                  Export Excel
                </button>
              )}
              <button
                type='button'
                onClick={() => setShowImportModal(true)}
                className='flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-800 active:scale-[0.98]'
              >
                <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 4v16m8-8H4' />
                </svg>
                Add Document
              </button>
            </div>
          </div>

          {/* Stat cards (click to filter by status) */}
          {!loading && documents.length > 0 && (
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4'>
              {statCards.map((stat) => {
                const isActive = statusFilter === stat.key
                return (
                  <button
                    key={stat.key}
                    type='button'
                    onClick={() => setStatusFilter(isActive && stat.key !== 'All' ? 'All' : stat.key)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md ${isActive ? stat.activeCls : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconCls}`}>
                      <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={stat.icon} />
                      </svg>
                    </div>
                    <div className='min-w-0'>
                      <p className='text-2xl font-bold leading-none text-slate-900'>{stat.value}</p>
                      <p className='mt-1 truncate text-xs font-medium text-slate-500'>{stat.label}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Documents card */}
          <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
            {/* Toolbar: type tabs + search */}
            <div className='flex flex-col gap-3 border-b border-slate-200 p-3 md:p-4 lg:flex-row lg:items-center lg:justify-between'>
              <div className='-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden lg:pb-0'>
                {typeTabs.map((tab) => {
                  const isActive = typeFilter === tab.value
                  return (
                    <button
                      key={tab.value}
                      type='button'
                      onClick={() => setTypeFilter(tab.value)}
                      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {tab.label}
                      <span className={`rounded-md px-1.5 text-[11px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
                    </button>
                  )
                })}
              </div>

              <div className='relative w-full lg:w-72'>
                <svg className='pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                </svg>
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search vehicle number...'
                  className='w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                />
                {searchQuery && (
                  <button type='button' onClick={() => setSearchQuery('')} className='absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-600' title='Clear'>
                    <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Active status filter chip */}
            {statusFilter !== 'All' && (
              <div className='flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500'>
                Showing
                <StatusBadge status={statusFilter} />
                <button type='button' onClick={() => setStatusFilter('All')} className='cursor-pointer font-semibold text-blue-700 hover:underline'>Clear</button>
              </div>
            )}

            {/* Fee summary for the currently filtered documents */}
            {feeTotals.total > 0 && (
              <div className='grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-100 text-center'>
                <div className='bg-white px-3 py-2.5'>
                  <p className='text-[11px] font-medium text-slate-500'>Total Fee</p>
                  <p className='text-sm font-bold text-slate-900'>{formatCurrency(feeTotals.total)}</p>
                </div>
                <div className='bg-white px-3 py-2.5'>
                  <p className='text-[11px] font-medium text-slate-500'>Paid</p>
                  <p className='text-sm font-bold text-emerald-600'>{formatCurrency(feeTotals.paid)}</p>
                </div>
                <div className='bg-white px-3 py-2.5'>
                  <p className='text-[11px] font-medium text-slate-500'>Pending</p>
                  <p className={`text-sm font-bold ${feeTotals.pending > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(feeTotals.pending)}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className='py-16 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent'></div>
                <p className='mt-3 text-sm text-slate-500'>Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className='px-4 py-16 text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400'>
                  <svg className='h-8 w-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
                <h3 className='text-base font-semibold text-slate-800'>{documents.length === 0 ? 'No documents yet' : 'No documents found'}</h3>
                <p className='mt-1 text-sm text-slate-500'>
                  {documents.length === 0 ? 'Click "Add Document" to add your first RTO document.' : 'Try a different search or filter.'}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className='divide-y divide-slate-100 lg:hidden'>
                  {filteredDocuments.map((doc) => {
                    const expiry = getExpiryInfo(doc)
                    const fee = getFeeInfo(doc)
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setViewingDoc(doc)}
                        className='flex cursor-pointer items-start gap-3 p-4 transition hover:bg-slate-50'
                      >
                        <TypeIcon type={doc.type} />
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-start justify-between gap-2'>
                            <div className='min-w-0'>
                              <p className='text-sm font-semibold text-slate-900'>{typeLabel(doc.type)}</p>
                              <div className='mt-1'><Plate number={doc.vehicleNumber} /></div>
                              {holderName(doc) && <p className='mt-1 truncate text-sm font-medium text-slate-700'>{holderName(doc)}</p>}
                            </div>
                          </div>
                          <div className='mt-2.5 flex items-end justify-between gap-2'>
                            <div className='text-xs text-slate-500'>
                              {doc.validTo !== 'N/A' ? (
                                <>
                                  <p>From <span className='font-medium text-slate-700'>{doc.validFrom}</span></p>
                                  <p>To <span className='font-semibold text-slate-800'>{doc.validTo}</span></p>
                                  {expiry && <p className={`font-semibold ${expiry.cls}`}>{expiry.text}</p>}
                                </>
                              ) : (
                                <span>No expiry</span>
                              )}
                            </div>
                            <ActionButtons doc={doc} />
                          </div>
                          {fee && (
                            <div className='mt-2.5 flex items-center gap-3 border-t border-slate-100 pt-2 text-xs'>
                              <span className='text-slate-500'>Fee <span className='font-semibold text-slate-800'>{formatCurrency(fee.total)}</span></span>
                              <span className='text-slate-500'>Paid <span className='font-semibold text-emerald-600'>{formatCurrency(fee.paid)}</span></span>
                              {fee.pending > 0 && (
                                <span className='text-slate-500'>Due <span className='font-semibold text-rose-600'>{formatCurrency(fee.pending)}</span></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop table */}
                <div className='hidden lg:block'>
                  <table className='w-full text-left'>
                    <thead>
                      <tr className='border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500'>
                        <th className='px-5 py-3'>Document</th>
                        <th className='px-5 py-3'>Vehicle</th>
                        <th className='px-5 py-3'>Validity</th>
                        <th className='px-5 py-3'>Fee</th>
                        <th className='px-5 py-3 text-right'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {filteredDocuments.map((doc) => {
                        const expiry = getExpiryInfo(doc)
                        const holder = holderName(doc)
                        const fee = getFeeInfo(doc)
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setViewingDoc(doc)}
                            className='cursor-pointer transition hover:bg-slate-50'
                          >
                            <td className='px-5 py-3.5'>
                              <div className='flex items-center gap-3'>
                                <TypeIcon type={doc.type} />
                                <div className='min-w-0'>
                                  <p className='text-sm font-semibold text-slate-900'>{typeLabel(doc.type)}</p>
                                </div>
                              </div>
                            </td>
                            <td className='px-5 py-3.5'>
                              <Plate number={doc.vehicleNumber} />
                              {holder && <p className='mt-1 max-w-[200px] truncate text-sm font-medium text-slate-700' title={holder}>{holder}</p>}
                            </td>
                            <td className='px-5 py-3.5 text-sm'>
                              {doc.validTo !== 'N/A' ? (
                                <div className='leading-tight'>
                                  <p className='text-slate-500'>From <span className='font-medium text-slate-700'>{doc.validFrom}</span></p>
                                  <p className='text-slate-500'>To <span className='font-semibold text-slate-800'>{doc.validTo}</span></p>
                                  {expiry && <p className={`text-xs font-semibold ${expiry.cls}`}>{expiry.text}</p>}
                                </div>
                              ) : (
                                <span className='text-slate-400'>No expiry</span>
                              )}
                            </td>
                            <td className='px-5 py-3.5 text-sm'>
                              {fee ? (
                                <div className='grid grid-cols-[auto_auto] gap-x-3 leading-snug'>
                                  <span className='text-slate-500'>Total</span>
                                  <span className='text-right font-semibold text-slate-800'>{formatCurrency(fee.total)}</span>
                                  <span className='text-slate-500'>Paid</span>
                                  <span className='text-right font-semibold text-emerald-600'>{formatCurrency(fee.paid)}</span>
                                  <span className='text-slate-500'>Balance</span>
                                  <span className={`text-right font-semibold ${fee.pending > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatCurrency(fee.pending)}</span>
                                </div>
                              ) : (
                                <span className='text-slate-400'>—</span>
                              )}
                            </td>
                            <td className='px-5 py-3.5'>
                              <ActionButtons doc={doc} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className='border-t border-slate-100 px-5 py-3 text-xs text-slate-500'>
                  Showing {filteredDocuments.length} of {totalDocs} documents
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {deletingDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-bold text-slate-800">Delete Record</h3>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Are you sure you want to delete this {deletingDoc.type === 'Tax' ? 'Road Tax' : deletingDoc.type} record for <span className="font-bold">{deletingDoc.vehicleNumber}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingDoc(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDoc?.type === 'Fitness' && (
        <EditFitnessModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSuccess={() => {
            setEditingDoc(null)
            fetchAllDocuments()
          }}
          fitness={editingDoc.rawRecord}
        />
      )}
      {editingDoc?.type === 'Tax' && (
        <EditTaxModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleEditSubmit}
          tax={editingDoc.rawRecord}
        />
      )}
      {editingDoc?.type === 'PUC' && (
        <EditPucModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleEditSubmit}
          puc={editingDoc.rawRecord}
        />
      )}
      {editingDoc?.type === 'GPS' && (
        <EditGpsModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleEditSubmit}
          gps={editingDoc.rawRecord}
        />
      )}
      {editingDoc?.type === 'Permit' && (
        <EditPermitModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleEditSubmit}
          permit={editingDoc.rawRecord}
        />
      )}
      {editingDoc?.type === 'RC' && (
        <EditRcModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          onSubmit={handleEditSubmit}
          rc={editingDoc.rawRecord}
        />
      )}
      {showAddFitnessModal && (
        <AddFitnessModal
          isOpen={showAddFitnessModal}
          onClose={() => {
            setShowAddFitnessModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddFitnessModal(false)
            toast.success('Fitness record added successfully')
            fetchAllDocuments()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {showAddTaxModal && (
        <AddTaxModal
          isOpen={showAddTaxModal}
          onClose={() => {
            setShowAddTaxModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddTaxModal(false)
            toast.success('Road Tax record added successfully')
            fetchAllDocuments()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {showAddPucModal && (
        <AddPucModal
          isOpen={showAddPucModal}
          onClose={() => {
            setShowAddPucModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddPucModal(false)
            toast.success('PUC record added successfully')
            fetchAllDocuments()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {showAddGpsModal && (
        <AddGpsModal
          isOpen={showAddGpsModal}
          onClose={() => {
            setShowAddGpsModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddGpsModal(false)
            toast.success('GPS record added successfully')
            fetchAllDocuments()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {showAddPermitModal && (
        <AddPermitModal
          isOpen={showAddPermitModal}
          onClose={() => {
            setShowAddPermitModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddPermitModal(false)
            toast.success('Permit record added successfully')
            fetchAllDocuments()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {showAddRcModal && (
        <AddRcModal
          isOpen={showAddRcModal}
          onClose={() => {
            setShowAddRcModal(false)
            setInitialExtractionFile(null)
          }}
          onSubmit={() => {
            setShowAddRcModal(false)
            toast.success('RC record added successfully')
            fetchAllDocuments()
          }}
          initialExtractionFile={initialExtractionFile}
        />
      )}

      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onProceed={(type, method, file) => {
            setShowImportModal(false)
            setInitialExtractionFile(method === 'ai' ? file : null)
            const modalMap = {
              puc: () => setShowAddPucModal(true),
              fitness: () => setShowAddFitnessModal(true),
              tax: () => setShowAddTaxModal(true),
              gps: () => setShowAddGpsModal(true),
              permit: () => setShowAddPermitModal(true),
              rc: () => setShowAddRcModal(true),
            }
            modalMap[type]?.()
          }}
        />
      )}

      <UpgradePopup
        isOpen={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        title='Excel Download'
        message='Excel download is available on the Plus plan. Upgrade to Plus to unlock Excel exports of all your records.'
      />

      {viewingDoc && (
        <DocumentDetailModal
          type={viewingDoc.type}
          id={viewingDoc.id}
          onClose={() => setViewingDoc(null)}
          onChanged={fetchAllDocuments}
        />
      )}
    </div>
  )
}

export default RTODocuments
