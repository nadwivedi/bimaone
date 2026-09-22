import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import useCurrentPlan from '../hooks/useCurrentPlan'
import UpgradePopup from '../components/UpgradePopup'
import { prependCoverPage } from '../utils/generateCoverPage'
import EditFitnessModal from './Fitness/EditFitnessModal'
import EditPucModal from './Puc/EditPucModal'
import EditGpsModal from './Gps/EditGpsModal'
import EditTaxModal from './Tax/EditTaxModal'
import EditPermitModal from './Permit/components/EditPermitModal'
import EditRcModal from './Rc/EditRcModal'
import AddInsuranceModal from './Insurance/AddInsuranceModal'


const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

// --- Helpers ---
const ICONS = {
  tax: 'M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z',
  puc: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
  gps: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  fitness: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  permit: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  rc: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  insurance: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
}

const TYPE_CONFIG = {
  Tax: {
    apiPath: 'tax',
    documentField: 'taxDocument',
    icon: ICONS.tax,
    color: 'emerald',
    fromField: 'taxFrom',
    toField: 'taxTo',
    fee: { total: 'totalAmount', paid: 'paidAmount', pending: 'balanceAmount' },
    extraFields: [
      { label: 'Owner Name', key: 'ownerName' },
      { label: 'Mobile Number', key: 'mobileNumber' },
      { label: 'Road Tax Amount', key: 'taxAmount', prefix: '₹' },
    ],
  },
  PUC: {
    apiPath: 'puc',
    documentField: 'pucDocument',
    icon: ICONS.puc,
    color: 'sky',
    fromField: 'validFrom',
    toField: 'validTo',
    fee: { total: 'totalFee', paid: 'paid', pending: 'balance' },
    extraFields: [
      { label: 'Owner Name', key: 'ownerName' },
      { label: 'Mobile Number', key: 'mobileNumber' },
    ],
  },
  GPS: {
    apiPath: 'gps',
    documentField: 'gpsDocument',
    icon: ICONS.gps,
    color: 'violet',
    fromField: 'validFrom',
    toField: 'validTo',
    fee: { total: 'totalFee', paid: 'paid', pending: 'balance' },
    extraFields: [
      { label: 'Owner Name', key: 'ownerName' },
      { label: 'Mobile Number', key: 'mobileNumber' },
    ],
  },
  Fitness: {
    apiPath: 'fitness',
    documentField: 'fitnessDocument',
    icon: ICONS.fitness,
    color: 'amber',
    fromField: 'validFrom',
    toField: 'validTo',
    fee: { total: 'totalFee', paid: 'paid', pending: 'balance' },
    extraFields: [
      { label: 'Owner Name', key: 'ownerName' },
      { label: 'Mobile Number', key: 'mobileNumber' },
      { label: 'Party ID', key: 'partyId' },
    ],
  },
  Insurance: {
    apiPath: 'insurance',
    documentField: 'insuranceDocument',
    endorsementField: 'endorsementDocument',
    icon: ICONS.insurance,
    color: 'blue',
    fromField: 'validFrom',
    toField: 'validTo',
    extraFields: [
      { label: 'Policy Number', key: 'policyNumber' },
      { label: 'Policy Holder', key: 'policyHolderName' },
      { label: 'Insurance Company', key: 'insuranceCompany' },
      { label: 'Product', key: 'product' },
      { label: 'OD Premium', key: 'odPremium', prefix: '₹' },
      { label: 'TP Premium', key: 'tpPremium', prefix: '₹' },
      { label: 'Net Premium', key: 'netPremium', prefix: '₹' },
      { label: 'Gross Premium', key: 'premium', prefix: '₹' },
      { label: 'Mobile Number', key: 'mobileNumber' },
      { label: 'Issue Date', key: 'issueDate' },
      { label: 'Client Name', key: 'reference' },
      { label: 'Agent name (IMD)', key: 'imd' },
      { label: 'Claim Raised', key: 'claimRaised' },
      { label: 'Claim Date', key: 'claimDate' },
      { label: 'Claim Remarks', key: 'claimRemarks' },
      { label: 'Remarks', key: 'remarks' },
      { label: 'Notes', key: 'notes' },
    ],
  },
  Permit: {
    apiPath: 'permit',
    documentField: 'permitDocument',
    icon: ICONS.permit,
    color: 'rose',
    fromField: 'validFrom',
    toField: 'validTo',
    fee: { total: 'totalFee', paid: 'paid', pending: 'balance' },
    extraFields: [
      { label: 'Name', key: 'name' }
    ],
  },
  RC: {
    apiPath: 'rc',
    documentField: 'rcFrontImage',
    icon: ICONS.rc,
    color: 'blue',
    fromField: null,
    toField: null,
    extraFields: [
      { label: 'Chassis No', key: 'chassisNo' },
      { label: 'Engine No', key: 'engineNo' },
      { label: 'Make', key: 'make' },
      { label: 'Model', key: 'model' },
    ],
  },
}

const STATUS_STYLES = {
  active: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: 'Active' },
  expiring_soon: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', label: 'Expiring Soon' },
  expired: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', label: 'Expired' },
  unknown: { badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', label: 'Unknown' },
}

const isPdf = (url) => url && (url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf'))
const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const Icon = ({ d, className = 'h-4 w-4' }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={d} />
  </svg>
)

const DOWNLOAD_ICON = 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
const DOC_ICON = 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
const FILE_ICON = 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'

const RcImageBlock = ({ url, label, apiUrl }) => {
  const fullUrl = url && (url.startsWith('http') || url.startsWith('data:') ? url : `${apiUrl}${url}`)

  const handleDownload = async () => {
    if (!fullUrl) return
    try {
      const res = await fetch(fullUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `RC_${label.replace(/\s/g, '_')}.${blob.type.split('/')[1] || 'png'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(fullUrl, '_blank')
    }
  }

  return fullUrl ? (
    <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
      <div className='flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3'>
        <h3 className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
          <Icon d={DOC_ICON} className='h-4 w-4 text-slate-400' />
          RC {label}
        </h3>
        <button onClick={handleDownload} className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'>
          <Icon d={DOWNLOAD_ICON} className='h-3.5 w-3.5' />
          Download
        </button>
      </div>
      <div className='flex min-h-[200px] items-center justify-center bg-slate-50 p-3'>
        <img src={fullUrl} alt={`RC ${label}`} className='w-full rounded-lg object-contain' style={{ maxHeight: '400px' }} />
      </div>
    </div>
  ) : null
}

// --- Component ---
const RTODocumentDetail = () => {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { features } = useCurrentPlan()
  const canPersonalized = features.customizedPolicyDownload === true
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfError, setPdfError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)

  const resolvedTypeKey = Object.keys(TYPE_CONFIG).find(k => k.toLowerCase() === (type || '').toLowerCase()) || type
  const config = TYPE_CONFIG[resolvedTypeKey]

  const fetchRecord = async () => {
    if (!config) return
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/${config.apiPath}/${id}`, { withCredentials: true })
      if (res.data?.success) {
        setRecord(res.data.data)
      } else {
        setError('Record not found.')
      }
    } catch {
      setError('Failed to load record. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!config) {
      setError('Unknown document type.')
      setLoading(false)
      return
    }
    fetchRecord()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await axios.delete(`${API_URL}/api/${config.apiPath}/${id}`, { withCredentials: true })
      if (res.data.success) {
        toast.success(`${config.label || (type === 'Tax' ? 'Road Tax' : type)} record deleted`)
        navigate('/rto-documents')
      } else {
        toast.error('Failed to delete record')
      }
    } catch {
      toast.error('Failed to delete record')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleEditSubmit = async (updatedData) => {
    try {
      await axios.put(`${API_URL}/api/${config.apiPath}/${id}`, updatedData, { withCredentials: true })
      toast.success('Record updated successfully')
      setShowEditModal(false)
      fetchRecord()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record')
    }
  }

  const handleEditClick = () => {
    setShowEditModal(true)
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 font-semibold">Unknown document type.</p>
      </div>
    )
  }

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-600' },
    sky: { bg: 'bg-sky-50', ring: 'ring-sky-100', text: 'text-sky-600' },
    violet: { bg: 'bg-violet-50', ring: 'ring-violet-100', text: 'text-violet-600' },
    amber: { bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-600' },
    blue: { bg: 'bg-blue-50', ring: 'ring-blue-100', text: 'text-blue-600' },
    rose: { bg: 'bg-rose-50', ring: 'ring-rose-100', text: 'text-rose-600' },
  }

  const col = colorMap[config.color] || colorMap.blue
  const status = record?.status || 'unknown'
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.unknown
  const documentUrl = record ? record[config.documentField] : null

  const feeInfo = (() => {
    if (!config.fee || !record) return null
    const total = record[config.fee.total]
    if (total === undefined || total === null) return null
    const paid = record[config.fee.paid] || 0
    const pending = record[config.fee.pending]
    return {
      total: Number(total) || 0,
      paid: Number(paid) || 0,
      pending: pending !== undefined && pending !== null ? Number(pending) : Math.max((Number(total) || 0) - (Number(paid) || 0), 0),
    }
  })()

  const detailFields = config.extraFields.filter(f => record && record[f.key] !== undefined && record[f.key] !== null && record[f.key] !== '')
  const fullDocUrl = documentUrl 
    ? (documentUrl.startsWith('http') || documentUrl.startsWith('data:') ? documentUrl : `${API_URL}${documentUrl}`) 
    : null

  const displayFilename = record?.documentName || (fullDocUrl && !fullDocUrl.startsWith('data:') ? fullDocUrl.split('/').pop() : null)

  const endorsementUrls = (() => {
    if (!record) return []
    const docs = record.endorsementDocuments
    if (Array.isArray(docs) && docs.length > 0) return docs
    const single = config.endorsementField ? record[config.endorsementField] : null
    return single ? [single] : []
  })()
  const fullEndorsementUrls = endorsementUrls.map(url =>
    url.startsWith('http') || url.startsWith('data:') ? url : `${API_URL}${url}`
  )

  const [endorsementImgsLoaded, setEndorsementImgsLoaded] = useState({})

  const handleDownload = async (forcePersonalized = null) => {
    if (!fullDocUrl) return
    const personalizedEnabled = forcePersonalized === true
    if (personalizedEnabled && !canPersonalized) {
      setShowUpgradePopup(true)
      return
    }
    const isInsurance = (type || '').toLowerCase() === 'insurance'
    try {
      const response = await fetch(fullDocUrl)
      const blob = await response.blob()

      if (personalizedEnabled && isInsurance) {
        // Generate personalized cover page and prepend (works for both PDF and Image documents!)
        const origBytes = new Uint8Array(await blob.arrayBuffer())
        try {
          const mergedBytes = await prependCoverPage(origBytes, user, record)
          const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' })
          const blobUrl = URL.createObjectURL(mergedBlob)
          const link = document.createElement('a')
          link.href = blobUrl
          const baseName = displayFilename ? displayFilename.replace(/\.[^/.]+$/, "") : 'insurance_policy'
          link.download = `Personalized_${baseName}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(blobUrl)
          toast.success('Personalized PDF downloaded!')
          return
        } catch (coverErr) {
          console.error('Cover page generation failed, downloading original:', coverErr)
          toast.error('Cover page generation failed – downloading original file')
        }
      }

      // Default download (no cover page)
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = displayFilename || `document.${blob.type.split('/')[1] || 'pdf'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download error:', err)
      window.open(fullDocUrl, '_blank')
    }
  }

  const handleEndorsementDownload = async (url) => {
    if (!url) return
    const filename = !url.startsWith('data:') ? url.split('/').pop() : null
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename || `endorsement.${blob.type.split('/')[1] || 'pdf'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 pb-24 pt-5 md:px-6 lg:px-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        {/* Loading State */}
        {loading && (
          <div className="mt-20 flex flex-col items-center gap-4">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
            <p className="text-sm font-medium text-slate-400">Loading record…</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="mt-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Icon d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' className='h-8 w-8' />
            </div>
            <h3 className="text-base font-semibold text-slate-800">{error}</h3>
            <button onClick={() => navigate(-1)} className="mt-4 cursor-pointer rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Go Back
            </button>
          </div>
        )}

        {/* Record Loaded */}
        {!loading && !error && record && (
          <div className="space-y-4">

            {/* Hero Card */}
            <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5'>
                <div className='flex items-center gap-3.5'>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${col.bg} ${col.ring} ${col.text}`}>
                    <Icon d={config.icon} className='h-6 w-6' />
                  </div>
                  <div>
                    <h1 className='text-lg font-bold text-slate-900'>{type === 'Tax' ? 'Road Tax' : type} Document</h1>
                    <span className='mt-1 inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold tracking-wider text-slate-800 shadow-sm'>
                      {record.vehicleNumber}
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-2 sm:flex-col sm:items-end'>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyle.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                    {statusStyle.label}
                  </span>
                  <div className='flex gap-2'>
                    <button
                      onClick={handleEditClick}
                      className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                    >
                      <Icon d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' className='h-3.5 w-3.5' />
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                    >
                      <Icon d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' className='h-3.5 w-3.5' />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Validity Period (inline in hero) */}
              {config.fromField && config.toField && (
                <div className='grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100'>
                  <div className='px-4 py-3 md:px-5'>
                    <p className='text-[11px] font-medium uppercase tracking-wide text-slate-400'>Valid From</p>
                    <p className='mt-0.5 text-sm font-semibold text-slate-700'>{record[config.fromField] || '—'}</p>
                  </div>
                  <div className='px-4 py-3 md:px-5'>
                    <p className='text-[11px] font-medium uppercase tracking-wide text-slate-400'>Valid To</p>
                    <p className={`mt-0.5 text-sm font-bold ${col.text}`}>{record[config.toField] || '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Summary */}
            {feeInfo && (
              <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                <div className='border-b border-slate-100 px-4 py-3 md:px-5'>
                  <h3 className='text-sm font-semibold text-slate-800'>Payment Summary</h3>
                </div>
                <div className='grid grid-cols-3 divide-x divide-slate-100 text-center'>
                  <div className='px-3 py-3.5'>
                    <p className='text-[11px] font-medium text-slate-400'>Total Fee</p>
                    <p className='mt-0.5 text-base font-bold text-slate-900'>{formatCurrency(feeInfo.total)}</p>
                  </div>
                  <div className='px-3 py-3.5'>
                    <p className='text-[11px] font-medium text-slate-400'>Paid</p>
                    <p className='mt-0.5 text-base font-bold text-emerald-600'>{formatCurrency(feeInfo.paid)}</p>
                  </div>
                  <div className='px-3 py-3.5'>
                    <p className='text-[11px] font-medium text-slate-400'>Pending</p>
                    <p className={`mt-0.5 text-base font-bold ${feeInfo.pending > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(feeInfo.pending)}</p>
                  </div>
                </div>
                {feeInfo.pending > 0 ? (
                  <div className='flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-4 py-2.5 md:px-5'>
                    <Icon d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' className='h-4 w-4 shrink-0 text-amber-600' />
                    <p className='text-xs font-semibold text-amber-700'>Partial payment — {formatCurrency(feeInfo.pending)} still due</p>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 border-t border-emerald-100 bg-emerald-50 px-4 py-2.5 md:px-5'>
                    <Icon d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' className='h-4 w-4 shrink-0 text-emerald-600' />
                    <p className='text-xs font-semibold text-emerald-700'>Fully paid</p>
                  </div>
                )}
              </div>
            )}

            {/* Extra Fields */}
            {detailFields.length > 0 && (
              <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                <div className='border-b border-slate-100 px-4 py-3 md:px-5'>
                  <h3 className='text-sm font-semibold text-slate-800'>Record Details</h3>
                </div>
                <div className='grid grid-cols-1 gap-x-4 gap-y-3 p-4 sm:grid-cols-2 md:p-5'>
                  {detailFields.map(({ label, key, prefix }) => {
                    const val = record[key]
                    const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : prefix ? `${prefix}${val}` : val
                    return (
                      <div key={key}>
                        <p className='text-[11px] font-medium text-slate-400'>{label}</p>
                        <p className={`mt-0.5 text-sm font-semibold ${key === 'claimRaised' ? (val ? 'text-emerald-600' : 'text-slate-500') : 'text-slate-800'}`}>
                          {display}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Fee Breakup (if present) */}
            {Array.isArray(record.feeBreakup) && record.feeBreakup.length > 0 && (
              <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                <div className='border-b border-slate-100 px-4 py-3 md:px-5'>
                  <h3 className='text-sm font-semibold text-slate-800'>Fee Breakup</h3>
                </div>
                <div className='divide-y divide-slate-100 px-4 md:px-5'>
                  {record.feeBreakup.map((item, i) => (
                    <div key={i} className='flex items-center justify-between py-2.5 text-sm'>
                      <p className='font-medium text-slate-600'>{item.name}</p>
                      <p className='font-semibold text-slate-800'>{formatCurrency(item.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Preview Section */}
            {type === 'RC' ? (
              <div className="space-y-4">
                {/* RC Front Image */}
                {record.rcFrontImage && (
                  <RcImageBlock url={record.rcFrontImage} label="Front Side" apiUrl={API_URL} />
                )}
                {/* RC Back Image */}
                {record.rcBackImage && (
                  <RcImageBlock url={record.rcBackImage} label="Back Side" apiUrl={API_URL} />
                )}
              </div>
            ) : fullDocUrl && (
              <div className='flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                <div className='flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 p-4 md:px-5'>
                  <div className='flex items-center justify-between'>
                    <h3 className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
                      <Icon d={DOC_ICON} className='h-4 w-4 text-slate-400' />
                      Attached Document
                    </h3>
                    {(type || '').toLowerCase() === 'insurance' ? (
                      <div className='flex items-center gap-2'>
                        {canPersonalized ? (
                          <button
                            onClick={() => handleDownload(true)}
                            className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800'
                            title='Download PDF with personalized cover page'
                          >
                            <Icon d={DOWNLOAD_ICON} className='h-3.5 w-3.5' />
                            Personalized PDF
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowUpgradePopup(true)}
                            className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100'
                            title='Upgrade to download the personalized PDF'
                          >
                            <Icon d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' className='h-3.5 w-3.5' />
                            Personalized PDF
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(false)}
                          className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                          title='Download original document without cover page'
                        >
                          Original PDF
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDownload()}
                        className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                        title='Download document'
                      >
                        <Icon d={DOWNLOAD_ICON} className='h-3.5 w-3.5' />
                        Download
                      </button>
                    )}
                  </div>
                  {/* Filename Display */}
                  {displayFilename && (
                    <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5'>
                      <Icon d={FILE_ICON} className='h-3.5 w-3.5 text-blue-500' />
                      <span className='truncate font-mono text-xs font-medium text-slate-600'>{displayFilename}</span>
                    </div>
                  )}
                </div>

                {!isPdf(fullDocUrl) ? (
                  <div className='relative flex min-h-[200px] items-center justify-center bg-slate-50 p-3'>
                    {!imgLoaded && (
                      <div className='absolute inset-0 z-10 flex items-center justify-center bg-slate-50'>
                        <div className='h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-r-transparent' />
                      </div>
                    )}
                    <img
                      src={fullDocUrl}
                      alt="Uploaded document"
                      className={`w-full rounded-lg object-contain transition-opacity duration-300 ${imgLoaded ? 'block opacity-100' : 'hidden opacity-0'}`}
                      style={{ maxHeight: '480px' }}
                      onLoad={() => setImgLoaded(true)}
                      onError={() => setImgLoaded(true)}
                    />
                  </div>
                ) : (
                  <div className='relative bg-slate-50'>
                    <iframe
                      src={fullDocUrl}
                      title="Document PDF"
                      className="w-full border-none"
                      style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}
                    />
                  </div>
                )}
              </div>
            )}

            {type === 'Insurance' && fullEndorsementUrls.length > 0 && fullEndorsementUrls.map((url, idx) => {
              const filename = !url.startsWith('data:') ? url.split('/').pop() : null
              return (
                <div key={idx} className='flex flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm'>
                  <div className='flex flex-col gap-2 border-b border-amber-200 bg-amber-50 p-4 md:px-5'>
                    <div className='flex items-center justify-between'>
                      <h3 className='flex items-center gap-2 text-sm font-semibold text-slate-800'>
                        <Icon d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.414 6.586a6 6 0 108.484 8.484L20.5 13' className='h-4 w-4 text-amber-500' />
                        Endorsement{fullEndorsementUrls.length > 1 ? ` #${idx + 1}` : ' Document'}
                      </h3>
                      <button
                        onClick={() => handleEndorsementDownload(url)}
                        className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 hover:text-amber-800'
                        title='Download endorsement'
                      >
                        <Icon d={DOWNLOAD_ICON} className='h-3.5 w-3.5' />
                        Download
                      </button>
                    </div>
                    {filename && (
                      <div className='flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5'>
                        <Icon d={FILE_ICON} className='h-3.5 w-3.5 text-amber-500' />
                        <span className='truncate font-mono text-xs font-medium text-slate-600'>{filename}</span>
                      </div>
                    )}
                  </div>
                  {!isPdf(url) ? (
                    <div className='relative flex min-h-[200px] items-center justify-center bg-slate-50 p-3'>
                      {!endorsementImgsLoaded[idx] && (
                        <div className='absolute inset-0 z-10 flex items-center justify-center bg-slate-50'>
                          <div className='h-6 w-6 animate-spin rounded-full border-2 border-amber-300 border-r-transparent' />
                        </div>
                      )}
                      <img
                        src={url}
                        alt={`Endorsement document ${idx + 1}`}
                        className={`w-full rounded-lg object-contain transition-opacity duration-300 ${endorsementImgsLoaded[idx] ? 'block opacity-100' : 'hidden opacity-0'}`}
                        style={{ maxHeight: '480px' }}
                        onLoad={() => setEndorsementImgsLoaded(prev => ({ ...prev, [idx]: true }))}
                        onError={() => setEndorsementImgsLoaded(prev => ({ ...prev, [idx]: true }))}
                      />
                    </div>
                  ) : (
                    <div className='relative bg-slate-50'>
                      <iframe
                        src={url}
                        title={`Endorsement PDF ${idx + 1}`}
                        className="w-full border-none"
                        style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-bold text-slate-800">Delete Record</h3>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Are you sure you want to delete this {config.label} record for <span className="font-bold">{record?.vehicleNumber}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && type === 'Fitness' && (
        <EditFitnessModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchRecord()
          }}
          fitness={record}
        />
      )}
      {showEditModal && type === 'Tax' && (
        <EditTaxModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          tax={record}
        />
      )}
      {showEditModal && type === 'PUC' && (
        <EditPucModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          puc={record}
        />
      )}
      {showEditModal && type === 'GPS' && (
        <EditGpsModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          gps={record}
        />
      )}
      {showEditModal && type === 'Permit' && (
        <EditPermitModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          permit={record}
        />
      )}
      {showEditModal && type === 'RC' && (
        <EditRcModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
          rc={record}
        />
      )}
      {showEditModal && type === 'Insurance' && (
        <AddInsuranceModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={async () => {
            setShowEditModal(false)
            fetchRecord()
          }}
          initialData={record}
          isEditMode={true}
        />
      )}

      <UpgradePopup
        isOpen={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        message='Personalised policy download is available on the Plus plan. Upgrade to Plus to unlock personalised PDF downloads.'
      />
    </div>
  )
}

export default RTODocumentDetail
