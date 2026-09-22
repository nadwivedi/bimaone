import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import useCurrentPlan from '../hooks/useCurrentPlan'
import UpgradePopup from './UpgradePopup'
import { prependCoverPage } from '../utils/generateCoverPage'
import EditFitnessModal from '../pages/Fitness/EditFitnessModal'
import EditPucModal from '../pages/Puc/EditPucModal'
import EditGpsModal from '../pages/Gps/EditGpsModal'
import EditTaxModal from '../pages/Tax/EditTaxModal'
import EditPermitModal from '../pages/Permit/components/EditPermitModal'
import EditRcModal from '../pages/Rc/EditRcModal'
import AddInsuranceModal from '../pages/Insurance/AddInsuranceModal'

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
const CLOSE_ICON = 'M6 18L18 6M6 6l12 12'

const EDIT_ICON = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
const TRASH_ICON = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
const WARN_ICON = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
const CHECK_CIRCLE_ICON = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
const CLIP_ICON = 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.414 6.586a6 6 0 108.484 8.484L20.5 13'

const toDate = (s) => {
  if (!s || typeof s !== 'string') return null
  const p = s.split(/[/-]/)
  if (p.length !== 3 || p.some((x) => Number.isNaN(Number(x)))) return null
  const [a, b, c] = p.map(Number)
  const d = p[0].length === 4 ? new Date(a, b - 1, c) : new Date(c, b - 1, a)
  return Number.isNaN(d.getTime()) ? null : d
}

const prettyDate = (s) => {
  const d = toDate(s)
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : s || '—'
}

const DAY_MS = 86400000

const getValidity = (from, to) => {
  const toD = toDate(to)
  if (!toD) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((toD - today) / DAY_MS)
  const fromD = toDate(from)
  const span = fromD ? toD - fromD : 0
  const elapsed = span > 0 ? Math.min(100, Math.max(0, ((today - fromD) / span) * 100)) : daysLeft < 0 ? 100 : 0
  const tone = daysLeft < 0 ? 'rose' : daysLeft <= 30 ? 'amber' : 'emerald'
  const label = daysLeft > 1 ? `${daysLeft} days left` : daysLeft === 1 ? '1 day left' : daysLeft === 0 ? 'Expires today' : `Expired ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`
  return { daysLeft, elapsed, tone, label }
}

const VALIDITY_TONES = {
  emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-600', bar: 'bg-amber-500' },
  rose: { text: 'text-rose-600', bar: 'bg-rose-500' },
}

const SECTION_TONES = {
  blue: { wrap: 'from-blue-50 to-sky-50 border-blue-200', badge: 'bg-blue-600' },
  sky: { wrap: 'from-sky-50 to-cyan-50 border-sky-200', badge: 'bg-sky-600' },
  emerald: { wrap: 'from-emerald-50 to-teal-50 border-emerald-200', badge: 'bg-emerald-600' },
  slate: { wrap: 'from-slate-50 to-blue-50 border-slate-300', badge: 'bg-slate-700' },
  indigo: { wrap: 'from-indigo-50 to-blue-50 border-indigo-200', badge: 'bg-indigo-600' },
  amber: { wrap: 'from-amber-50 to-orange-50 border-amber-200', badge: 'bg-amber-500' },
}

const Section = ({ n, title, tone = 'blue', action, children }) => (
  <section className={`rounded-xl border-2 bg-gradient-to-r p-3 md:p-5 ${SECTION_TONES[tone].wrap}`}>
    <div className='mb-3 flex flex-wrap items-center justify-between gap-2 md:mb-4'>
      <h3 className='flex items-center gap-2 text-base font-bold text-gray-800 md:text-lg'>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white md:h-8 md:w-8 md:text-sm ${SECTION_TONES[tone].badge}`}>{n}</span>
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
)

const Tile = ({ label, value, valueClass = 'text-slate-800', sub }) => (
  <div className='rounded-lg border border-white bg-white/90 px-3.5 py-3 shadow-sm'>
    <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>{label}</p>
    <p className={`mt-1 break-words text-sm font-bold md:text-base ${valueClass}`}>{value}</p>
    {sub && <p className='mt-0.5 text-[11px] font-medium text-slate-400'>{sub}</p>}
  </div>
)

const btnLight = 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'

const DocPreview = ({ url, filename, accent = 'blue', actions }) => {
  const [loaded, setLoaded] = useState(false)
  const pdf = isPdf(url)
  return (
    <div className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
            <Icon d={FILE_ICON} className='h-4 w-4' />
          </span>
          <div className='min-w-0'>
            <p className='truncate text-xs font-semibold text-slate-700'>{filename || (pdf ? 'Document.pdf' : 'Document image')}</p>
            <p className='text-[10px] font-medium uppercase tracking-wide text-slate-400'>{pdf ? 'PDF' : 'Image'}</p>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>{actions}</div>
      </div>
      {pdf ? (
        <iframe src={url} title={filename || 'Document PDF'} className='w-full border-none bg-slate-50' style={{ height: '60vh', minHeight: '380px' }} />
      ) : (
        <div className='relative flex min-h-[200px] items-center justify-center bg-slate-50 p-3'>
          {!loaded && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-r-transparent' />
            </div>
          )}
          <img
            src={url}
            alt={filename || 'Document'}
            className={`w-full rounded-md object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ maxHeight: '480px' }}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </div>
      )}
    </div>
  )
}

const downloadUrl = async (url, filename) => {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename || `document.${blob.type.split('/')[1] || 'pdf'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

// --- Component ---
// Shows full document details in a popup instead of navigating to a dedicated page.
const DocumentDetailModal = ({ type, id, onClose, onChanged }) => {
  const { user } = useAuth()
  const { features } = useCurrentPlan()
  const canPersonalized = features.customizedPolicyDownload === true
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showEditModal && !showDeleteConfirm) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showEditModal, showDeleteConfirm])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await axios.delete(`${API_URL}/api/${config.apiPath}/${id}`, { withCredentials: true })
      if (res.data.success) {
        toast.success(`${type === 'Tax' ? 'Road Tax' : type} record deleted`)
        setShowDeleteConfirm(false)
        onChanged?.()
        onClose()
      } else {
        toast.error('Failed to delete record')
      }
    } catch {
      toast.error('Failed to delete record')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSubmit = async (updatedData) => {
    try {
      await axios.put(`${API_URL}/api/${config.apiPath}/${id}`, updatedData, { withCredentials: true })
      toast.success('Record updated successfully')
      setShowEditModal(false)
      fetchRecord()
      onChanged?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update record')
    }
  }

  if (!config) {
    return (
      <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4' onClick={onClose}>
        <div className='rounded-2xl bg-white p-6 shadow-xl' onClick={(e) => e.stopPropagation()}>
          <p className='font-semibold text-slate-500'>Unknown document type.</p>
        </div>
      </div>
    )
  }

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
        const origBytes = new Uint8Array(await blob.arrayBuffer())
        try {
          const mergedBytes = await prependCoverPage(origBytes, user, record)
          const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' })
          const blobUrl = URL.createObjectURL(mergedBlob)
          const link = document.createElement('a')
          link.href = blobUrl
          const baseName = displayFilename ? displayFilename.replace(/\.[^/.]+$/, '') : 'insurance_policy'
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

  const typeLabel = type === 'Tax' ? 'Road Tax' : type
  const isInsurance = (type || '').toLowerCase() === 'insurance'
  const validity = record && config.fromField && config.toField ? getValidity(record[config.fromField], record[config.toField]) : null
  const vTone = validity ? VALIDITY_TONES[validity.tone] : null
  const clientKey = record ? ['policyHolderName', 'ownerName', 'name'].find((k) => record[k]) : null
  const clientLabel = { policyHolderName: 'Policy Holder', ownerName: 'Owner Name', name: 'Name' }[clientKey] || 'Client'
  const clientName = clientKey ? record[clientKey] : null
  const referenceName = isInsurance ? record?.reference : null
  const mobile = record?.mobileNumber ? String(record.mobileNumber) : null
  const mobileDigits = mobile ? mobile.replace(/\D/g, '') : ''
  const waNumber = mobileDigits.length === 10 ? `91${mobileDigits}` : mobileDigits
  const shownInMainCard = new Set([clientKey, 'mobileNumber', referenceName ? 'reference' : null])
  const infoFields = detailFields.filter((f) => !f.prefix && !shownInMainCard.has(f.key))
  const moneyFields = detailFields.filter((f) => f.prefix)
  const paidPct = feeInfo && feeInfo.total > 0 ? Math.min(100, Math.round((feeInfo.paid / feeInfo.total) * 100)) : 0
  const hasFeeBreakup = Array.isArray(record?.feeBreakup) && record.feeBreakup.length > 0
  const rcImages = type === 'RC' && record
    ? [
        { url: record.rcFrontImage, label: 'Front Side' },
        { url: record.rcBackImage, label: 'Back Side' },
      ]
        .filter((i) => i.url)
        .map((i) => ({ ...i, url: i.url.startsWith('http') || i.url.startsWith('data:') ? i.url : `${API_URL}${i.url}` }))
    : []
  const hasDocs = rcImages.length > 0 || (type !== 'RC' && fullDocUrl) || (isInsurance && fullEndorsementUrls.length > 0)

  let sectionNo = 0
  const nextNo = () => ++sectionNo

  const formatValue = (key, val, prefix) => {
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (prefix === '₹') return formatCurrency(val)
    if (prefix) return `${prefix}${val}`
    if (/Date$/.test(key)) return prettyDate(val)
    return val
  }

  return (
    <>
      <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-2 md:p-4' onClick={onClose}>
        <div
          className='relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:max-h-[95vh] md:rounded-2xl'
          style={{ fontFamily: "'Poppins', sans-serif" }}
          onClick={(e) => e.stopPropagation()}
          role='dialog'
          aria-modal='true'
          aria-label={`${typeLabel} details`}
        >
          {/* Header */}
          <div className='flex-shrink-0 bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-3 text-white md:p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex min-w-0 items-center gap-3'>
                <span className='hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 sm:flex md:h-12 md:w-12'>
                  <Icon d={config.icon} className='h-6 w-6' />
                </span>
                <div className='min-w-0'>
                  <h2 className='text-lg font-bold md:text-2xl'>{typeLabel} Details</h2>
                  <div className='mt-1.5 flex flex-wrap items-center gap-2'>
                    {record && (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusStyle.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusStyle.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className='cursor-pointer rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2' aria-label='Close'>
                <Icon d={CLOSE_ICON} className='h-5 w-5 md:h-6 md:w-6' />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className='flex-1 overflow-y-auto p-3 md:p-6'>
            {loading && (
              <div className='flex flex-col items-center gap-4 py-16'>
                <div className='h-9 w-9 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent' />
                <p className='text-sm font-medium text-slate-400'>Loading record…</p>
              </div>
            )}

            {!loading && error && (
              <div className='py-16 text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500'>
                  <Icon d={WARN_ICON} className='h-8 w-8' />
                </div>
                <h3 className='text-base font-semibold text-slate-800'>{error}</h3>
              </div>
            )}

            {!loading && !error && record && (
              <div className='space-y-4 md:space-y-6'>
                {/* Vehicle & client */}
                <Section n={nextNo()} title='Vehicle & Client' tone='blue'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='rounded-lg border border-white bg-white/90 p-4 shadow-sm'>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Vehicle Number</p>
                      {record.vehicleNumber ? (
                        <span className='mt-2 inline-block rounded-md border-2 border-slate-800 bg-amber-300 px-3 py-1 font-mono text-xl font-bold tracking-widest text-slate-900 shadow-sm md:text-2xl'>
                          {record.vehicleNumber}
                        </span>
                      ) : (
                        <p className='mt-1 text-base font-bold text-slate-400'>—</p>
                      )}
                    </div>
                    <div className='rounded-lg border border-white bg-white/90 p-4 shadow-sm'>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>{clientLabel}</p>
                      <p className='mt-1 break-words text-lg font-bold text-slate-900 md:text-xl'>{clientName || '—'}</p>
                      {mobile && (
                        <div className='mt-2 flex flex-wrap items-center gap-2'>
                          <span className='text-sm font-semibold text-slate-600'>{mobile}</span>
                          <a href={`tel:${mobileDigits}`} className='inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100'>
                            <Icon d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' className='h-3 w-3' />
                            Call
                          </a>
                          {waNumber && (
                            <a href={`https://wa.me/${waNumber}`} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100'>
                              <Icon d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' className='h-3 w-3' />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                      {referenceName && (
                        <p className='mt-2 text-xs text-slate-500'>
                          Client Name: <span className='font-semibold text-slate-700'>{referenceName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </Section>

                {/* Validity */}
                {config.fromField && config.toField && (
                  <Section n={nextNo()} title='Validity' tone='sky'>
                    <div className={`grid grid-cols-2 gap-3 ${record.workDate ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                      {record.workDate && <Tile label='Date of Work' value={prettyDate(record.workDate)} />}
                      <Tile label='Valid From' value={prettyDate(record[config.fromField])} />
                      <Tile label='Valid To' value={prettyDate(record[config.toField])} valueClass={vTone ? vTone.text : 'text-slate-800'} />
                      {validity && (
                        <div className='col-span-2 md:col-span-1'>
                          <Tile label='Time Remaining' value={validity.label} valueClass={vTone.text} />
                        </div>
                      )}
                    </div>
                    {validity && (
                      <div className='mt-3'>
                        <div className='h-2 w-full overflow-hidden rounded-full bg-white shadow-inner'>
                          <div className={`h-full rounded-full ${vTone.bar}`} style={{ width: `${validity.elapsed}%` }} />
                        </div>
                        <div className='mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-400'>
                          <span>Start</span>
                          <span>{Math.round(validity.elapsed)}% of validity used</span>
                          <span>Expiry</span>
                        </div>
                      </div>
                    )}
                  </Section>
                )}

                {/* Premium / amounts */}
                {moneyFields.length > 0 && (
                  <Section n={nextNo()} title={isInsurance ? 'Premium' : 'Amount'} tone='emerald'>
                    <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                      {moneyFields.map(({ label, key, prefix }) => (
                        <Tile
                          key={key}
                          label={label}
                          value={formatValue(key, record[key], prefix)}
                          valueClass={key === 'premium' ? 'text-emerald-700' : 'text-slate-800'}
                        />
                      ))}
                    </div>
                  </Section>
                )}

                {/* Payment */}
                {(feeInfo || hasFeeBreakup) && (
                  <Section
                    n={nextNo()}
                    title='Payment Summary'
                    tone='emerald'
                    action={
                      feeInfo && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${feeInfo.pending > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          <Icon d={feeInfo.pending > 0 ? WARN_ICON : CHECK_CIRCLE_ICON} className='h-3.5 w-3.5' />
                          {feeInfo.pending > 0 ? `${formatCurrency(feeInfo.pending)} due` : 'Fully paid'}
                        </span>
                      )
                    }
                  >
                    {feeInfo && (
                      <>
                        <div className='grid grid-cols-3 gap-3'>
                          <Tile label='Total Fee' value={formatCurrency(feeInfo.total)} />
                          <Tile label='Paid' value={formatCurrency(feeInfo.paid)} valueClass='text-emerald-600' />
                          <Tile label='Pending' value={formatCurrency(feeInfo.pending)} valueClass={feeInfo.pending > 0 ? 'text-rose-600' : 'text-slate-800'} />
                        </div>
                        <div className='mt-3'>
                          <div className='h-2 w-full overflow-hidden rounded-full bg-white shadow-inner'>
                            <div className='h-full rounded-full bg-emerald-500' style={{ width: `${paidPct}%` }} />
                          </div>
                          <p className='mt-1 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400'>{paidPct}% paid</p>
                        </div>
                      </>
                    )}
                    {hasFeeBreakup && (
                      <div className={`${feeInfo ? 'mt-3' : ''} overflow-hidden rounded-lg border border-white bg-white/90 shadow-sm`}>
                        <p className='border-b border-slate-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Fee Breakup</p>
                        <div className='divide-y divide-slate-100 px-3.5'>
                          {record.feeBreakup.map((item, i) => (
                            <div key={i} className='flex items-center justify-between py-2.5 text-sm'>
                              <p className='font-medium text-slate-600'>{item.name}</p>
                              <p className='font-semibold text-slate-800'>{formatCurrency(item.amount)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Section>
                )}

                {/* Details */}
                {infoFields.length > 0 && (
                  <Section n={nextNo()} title={type === 'RC' ? 'Vehicle Details' : isInsurance ? 'Policy Details' : 'Other Details'} tone='slate'>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3'>
                      {infoFields.map(({ label, key }) => {
                        const val = record[key]
                        return (
                          <Tile
                            key={key}
                            label={label}
                            value={formatValue(key, val)}
                            valueClass={key === 'claimRaised' ? (val ? 'text-emerald-600' : 'text-slate-500') : 'text-slate-800'}
                          />
                        )
                      })}
                    </div>
                  </Section>
                )}

                {/* Documents */}
                {hasDocs && (
                  <Section n={nextNo()} title={type === 'RC' ? 'RC Images' : 'Documents'} tone='indigo'>
                    <div className='space-y-4'>
                      {rcImages.map((img) => (
                        <DocPreview
                          key={img.label}
                          url={img.url}
                          filename={`RC ${img.label}`}
                          actions={
                            <button onClick={() => downloadUrl(img.url, `RC_${img.label.replace(/\s/g, '_')}`)} className={btnLight}>
                              <Icon d={DOWNLOAD_ICON} className='h-3.5 w-3.5' />
                              Download
                            </button>
                          }
                        />
                      ))}

                      {type !== 'RC' && fullDocUrl && (
                        <DocPreview
                          url={fullDocUrl}
                          filename={displayFilename}
                          actions={
                            isInsurance ? (
                              <>
                                <button
                                  onClick={() => (canPersonalized ? handleDownload(true) : setShowUpgradePopup(true))}
                                  className={canPersonalized
                                    ? 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700'
                                    : 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100'}
                                  title={canPersonalized ? 'Download PDF with personalized cover page' : 'Upgrade to download the personalized PDF'}
                                >
                                  <Icon d={canPersonalized ? DOWNLOAD_ICON : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'} className='h-3.5 w-3.5' />
                                  Personalized PDF
                                </button>
                                <button onClick={() => handleDownload(false)} className={btnLight} title='Download original document without cover page'>
                                  Original PDF
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleDownload()} className={btnLight}>
                                <Icon d={DOWNLOAD_ICON} className='h-3.5 w-3.5' />
                                Download
                              </button>
                            )
                          }
                        />
                      )}

                      {isInsurance && fullEndorsementUrls.map((url, idx) => {
                        const filename = !url.startsWith('data:') ? url.split('/').pop() : null
                        return (
                          <div key={url + idx}>
                            <p className='mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700'>
                              <Icon d={CLIP_ICON} className='h-3.5 w-3.5' />
                              Endorsement{fullEndorsementUrls.length > 1 ? ` #${idx + 1}` : ''}
                            </p>
                            <DocPreview
                              url={url}
                              filename={filename}
                              accent='amber'
                              actions={
                                <button onClick={() => handleEndorsementDownload(url)} className={btnLight}>
                                  <Icon d={DOWNLOAD_ICON} className='h-3.5 w-3.5' />
                                  Download
                                </button>
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && record && (
            <div className='flex flex-shrink-0 flex-col-reverse items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 p-3 md:flex-row md:p-4'>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className='inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 md:w-auto'
              >
                <Icon d={TRASH_ICON} className='h-4 w-4' />
                Delete
              </button>
              <div className='flex w-full gap-2 md:w-auto md:gap-3'>
                <button onClick={onClose} className='flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-6'>
                  Close
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  className='flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-2 font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 md:flex-none md:px-8'
                >
                  <Icon d={EDIT_ICON} className='h-4 w-4' />
                  Edit {typeLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl'>
            <div className='mb-4 flex items-center gap-3 text-red-600'>
              <svg className='h-8 w-8' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
              </svg>
              <h3 className='text-xl font-bold text-slate-800'>Delete Record</h3>
            </div>
            <p className='mb-6 text-sm text-slate-600'>
              Are you sure you want to delete this {type === 'Tax' ? 'Road Tax' : type} record for <span className='font-bold'>{record?.vehicleNumber}</span>? This action cannot be undone.
            </p>
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className='cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className='cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50'
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
            onChanged?.()
          }}
          fitness={record}
        />
      )}
      {showEditModal && type === 'Tax' && (
        <EditTaxModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSubmit={() => { setShowEditModal(false); fetchRecord(); onChanged?.() }} tax={record} />
      )}
      {showEditModal && type === 'PUC' && (
        <EditPucModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSubmit={handleEditSubmit} puc={record} />
      )}
      {showEditModal && type === 'GPS' && (
        <EditGpsModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSubmit={handleEditSubmit} gps={record} />
      )}
      {showEditModal && type === 'Permit' && (
        <EditPermitModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSubmit={() => { setShowEditModal(false); fetchRecord(); onChanged?.() }} permit={record} />
      )}
      {showEditModal && type === 'RC' && (
        <EditRcModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSubmit={handleEditSubmit} rc={record} />
      )}
      {showEditModal && type === 'Insurance' && (
        <AddInsuranceModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={async () => {
            setShowEditModal(false)
            fetchRecord()
            onChanged?.()
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
    </>
  )
}

export default DocumentDetailModal
