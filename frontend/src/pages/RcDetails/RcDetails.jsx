import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Search, History, Truck, Shield, FileText, User, Phone, Calendar, Clock, CheckCircle2,
  Copy, Check, Download, Share2, RefreshCw, Car, FileCheck, Building2, Fuel,
  Activity, X, Trash2, Eye, Database, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const HISTORY_LIMIT = 10

const isExpired = (dateStr) => {
  if (!dateStr || dateStr === 'NA') return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime()) && d < new Date()
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const saveBlob = (blob, vno) => {
  const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `RC-${String(vno || 'vehicle').replace(/[^A-Za-z0-9]/g, '')}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

const Card = ({ icon: Icon, iconClass, title, badge, badgeClass, children }) => (
  <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
    <div className='mb-4 flex items-center justify-between border-b border-slate-100 pb-3'>
      <h3 className='flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base'>
        <Icon className={`h-4 w-4 ${iconClass}`} />
        {title}
      </h3>
      {badge && <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>{badge}</span>}
    </div>
    <div className='space-y-3 text-xs sm:text-sm'>{children}</div>
  </div>
)

const Row = ({ label, value }) => (
  <div className='flex items-center justify-between gap-3 border-b border-slate-50 py-1 last:border-0'>
    <span className='font-medium text-slate-500'>{label}</span>
    <span className='text-right font-semibold text-slate-800'>{value || 'NA'}</span>
  </div>
)

const ValidityRow = ({ label, value, expiredText = 'Expired', validText = 'Valid' }) => (
  <div className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-2.5'>
    <div>
      <span className='block text-[10px] font-semibold uppercase text-slate-400'>{label}</span>
      <span className='font-bold text-slate-900'>{value || 'NA'}</span>
    </div>
    {value && value !== 'NA' && (
      isExpired(value)
        ? <span className='rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700'>{expiredText}</span>
        : <span className='rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700'>{validText}</span>
    )}
  </div>
)

const RcDetails = () => {
  const [vehicleNo, setVehicleNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [vehicleData, setVehicleData] = useState(null)
  const [source, setSource] = useState(null) // { saved: boolean, at: string }
  const [copiedField, setCopiedField] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [historyPdfId, setHistoryPdfId] = useState(null)
  const resultsTopRef = useRef(null)

  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPagination, setHistoryPagination] = useState({ total: 0, totalPages: 1 })
  const [deletingId, setDeletingId] = useState(null)

  const fetchHistory = async (page = historyPage, search = historySearch) => {
    try {
      setHistoryLoading(true)
      const res = await axios.get(`${API_URL}/api/vehicle-info/history`, {
        withCredentials: true,
        params: { page, limit: HISTORY_LIMIT, search: search || undefined },
      })
      if (res.data.success) {
        setHistoryList(res.data.data || [])
        setHistoryPagination(res.data.pagination || { total: 0, totalPages: 1 })
      }
    } catch (err) {
      console.error('Error fetching RC search history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Debounce history filter + page changes
  useEffect(() => {
    const t = setTimeout(() => fetchHistory(historyPage, historySearch), historySearch ? 300 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, historySearch])

  const scrollToResults = () => resultsTopRef.current?.scrollIntoView({ behavior: 'smooth' })

  const handleLiveSearch = async (targetVno) => {
    const vno = (targetVno || vehicleNo).trim().replace(/[\s-]/g, '').toUpperCase()
    if (!vno) {
      toast.warn('Please enter a vehicle registration number')
      return
    }

    setLoading(true)
    setVehicleData(null)
    setSource(null)
    try {
      const res = await axios.get(`${API_URL}/api/vehicle-info/lookup`, { withCredentials: true, params: { vno } })
      if (res.data.success && res.data.data) {
        setVehicleData(res.data.data)
        setSource({ saved: false, at: new Date().toISOString() })
        toast.success(`RC details loaded for ${res.data.data.REGN_NO || vno}`)
        if (historyPage === 1 && !historySearch) fetchHistory(1, '')
        else { setHistorySearch(''); setHistoryPage(1) }
        scrollToResults()
      } else {
        toast.error(res.data.message || 'Vehicle details not found')
      }
    } catch (err) {
      console.error('Vehicle lookup error:', err)
      toast.error(err.response?.data?.message || 'Failed to fetch vehicle details')
    } finally {
      setLoading(false)
    }
  }

  const handleViewSaved = async (item) => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/vehicle-info/history/${item._id}`, { withCredentials: true })
      if (res.data.success && res.data.data) {
        setVehicleData(res.data.data)
        setVehicleNo(res.data.historyMeta?.vehicleNumber || item.vehicleNumber)
        setSource({ saved: true, at: res.data.historyMeta?.lastSearchedAt })
        scrollToResults()
      } else {
        toast.error('Could not load saved record')
      }
    } catch (err) {
      console.error('Error loading saved RC:', err)
      toast.error('Failed to load saved record')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.vehicleNumber} from your RC search history?`)) return
    try {
      setDeletingId(item._id)
      await axios.delete(`${API_URL}/api/vehicle-info/history/${item._id}`, { withCredentials: true })
      toast.success(`Deleted ${item.vehicleNumber} from history`)
      const lastOnPage = historyList.length === 1 && historyPage > 1
      if (lastOnPage) setHistoryPage(historyPage - 1)
      else fetchHistory()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete record')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopy = (text, fieldKey) => {
    if (!text || text === 'NA') return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleCopySummary = () => {
    const v = vehicleData
    const text = [
      '*VEHICLE RC DETAILS*',
      `Reg No: ${v.REGN_NO || 'NA'}`,
      `Owner: ${v.OWNER_NAME || 'NA'}`,
      `Father: ${v.F_NAME || 'NA'}`,
      `Mobile: ${v.MOBILE_NO || 'NA'}`,
      `RTO: ${v.REGISTERED_AT || 'NA'}`,
      `Reg Date: ${v.REGN_DT || 'NA'} (Valid upto ${v.REGN_UPTO || 'NA'})`,
      `Maker/Model: ${`${v.MAKER_DESC || ''} ${v.MAKER_MODEL || ''}`.trim() || 'NA'}`,
      `Color / Fuel: ${v.COLOR || 'NA'} | ${v.FUEL_DESC || 'NA'}`,
      `Chassis No: ${v.CHASI_NO || 'NA'}`,
      `Engine No: ${v.ENG_NO || 'NA'}`,
      `Insurance: ${v.INSURANCE_COMP || 'NA'} (Upto ${v.INSURANCE_UPTO || 'NA'})`,
      `Policy No: ${v.INS_POLICY_NO || v.POLICY_NO || 'NA'}`,
      `Fitness Upto: ${v.FIT_UPTO || 'NA'}`,
      `Tax Upto: ${v.TAX_UPTO || 'NA'}`,
      `PUC Upto: ${v.PUCC_UPTO || v.PUC_UPTO || 'NA'}`,
      `Financer: ${v.FINANCER_DETAILS || 'NA'}`,
      `Address: ${v.PRESENT_ADDRESS || v.PERMANENT_ADDRESS || 'NA'}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    toast.success('RC summary copied')
  }

  const handleShareWhatsApp = () => {
    const v = vehicleData
    const summary = `*VEHICLE RC DETAILS: ${v.REGN_NO || ''}*\nOwner: ${v.OWNER_NAME || 'NA'}\nModel: ${v.MAKER_MODEL || 'NA'}\nFitness: ${v.FIT_UPTO || 'NA'}\nInsurance: ${v.INSURANCE_UPTO || 'NA'}\nTax: ${v.TAX_UPTO || 'NA'}\nPUC: ${v.PUCC_UPTO || v.PUC_UPTO || 'NA'}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`, '_blank')
  }

  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true)
      const res = await axios.post(`${API_URL}/api/vehicle-info/rc-pdf`, { data: vehicleData }, { withCredentials: true, responseType: 'blob' })
      saveBlob(res.data, vehicleData.REGN_NO)
    } catch (err) {
      console.error('RC PDF error:', err)
      toast.error('Failed to generate RC PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadHistoryPdf = async (item) => {
    try {
      setHistoryPdfId(item._id)
      const res = await axios.get(`${API_URL}/api/vehicle-info/history/${item._id}/rc-pdf`, { withCredentials: true, responseType: 'blob' })
      saveBlob(res.data, item.vehicleNumber)
    } catch (err) {
      console.error('RC PDF error:', err)
      toast.error('Failed to generate RC PDF')
    } finally {
      setHistoryPdfId(null)
    }
  }

  const CopyBtn = ({ text, field }) => (
    <button onClick={() => handleCopy(text, field)} className='shrink-0 cursor-pointer text-slate-400 hover:text-blue-600' title={`Copy ${field}`}>
      {copiedField === field ? <Check className='h-3.5 w-3.5 text-emerald-600' /> : <Copy className='h-3.5 w-3.5' />}
    </button>
  )

  const v = vehicleData

  return (
    <div className='min-h-screen bg-slate-50 text-slate-800'>
      <div className='w-full space-y-6 px-3 py-6 sm:px-6'>
        {/* Header */}
        <div ref={resultsTopRef} className='flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
          <div>
            <h1 className='flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl'>
              <Truck className='h-6 w-6 text-blue-600' />
              RC Details
            </h1>
            <p className='mt-0.5 text-xs text-slate-500 sm:text-sm'>
              Search any vehicle number for live RC details. Every search is saved to your history.
            </p>
          </div>

          {v && (
            <div className='flex flex-wrap items-center gap-2'>
              <button onClick={handleCopySummary} className='inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50'>
                <Copy className='h-4 w-4 text-slate-500' /> Copy Summary
              </button>
              <button onClick={handleShareWhatsApp} className='inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100'>
                <Share2 className='h-4 w-4' /> WhatsApp
              </button>
              <button onClick={handleDownloadPdf} disabled={pdfLoading} className='inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60'>
                <Download className='h-4 w-4' /> {pdfLoading ? 'Generating...' : 'RC PDF'}
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6'>
          <form onSubmit={(e) => { e.preventDefault(); handleLiveSearch() }} className='flex flex-col items-stretch gap-3 md:flex-row md:items-center'>
            <div className='relative flex flex-1 items-center rounded-xl border-2 border-slate-300 bg-slate-50 shadow-inner transition focus-within:border-blue-500 focus-within:bg-white'>
              <div className='flex select-none flex-col items-center rounded-l-[10px] border-r border-slate-300 bg-slate-200/80 px-3 py-2.5 text-[11px] font-black leading-none text-blue-900'>
                <span>🇮🇳</span>
                <span>IND</span>
              </div>
              <input
                type='text'
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                placeholder='Enter vehicle number (e.g. CG12BU5574)'
                className='w-full bg-transparent px-3.5 py-3 font-mono text-base font-bold uppercase tracking-wider text-slate-900 outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 sm:text-lg'
                autoFocus
              />
              {vehicleNo && (
                <button type='button' onClick={() => { setVehicleNo(''); setVehicleData(null); setSource(null) }} className='mr-2 cursor-pointer p-2 text-slate-400 hover:text-slate-600'>
                  <X className='h-5 w-5' />
                </button>
              )}
            </div>
            <button
              type='submit'
              disabled={loading || !vehicleNo.trim()}
              className='flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 sm:text-base'
            >
              {loading ? <RefreshCw className='h-5 w-5 animate-spin' /> : <Search className='h-5 w-5' />}
              <span>{loading ? 'Searching...' : 'Get RC Details'}</span>
            </button>
          </form>
        </div>

        {/* Data source notice */}
        {v && source && !loading && (
          <div className={`flex flex-col items-start justify-between gap-3 rounded-xl border p-3.5 text-xs sm:flex-row sm:items-center ${source.saved ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            <div className='flex items-center gap-2'>
              {source.saved ? <Database className='h-4 w-4 shrink-0' /> : <Sparkles className='h-4 w-4 shrink-0' />}
              <span>
                <strong>{source.saved ? 'Saved record' : 'Live RTO data'}</strong>
                {' '}({source.saved ? 'searched' : 'fetched'} {formatDate(source.at)} {formatTime(source.at)})
              </span>
            </div>
            {source.saved && (
              <button onClick={() => handleLiveSearch(v.REGN_NO || vehicleNo)} className='inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 font-bold text-white shadow-sm transition hover:bg-amber-700'>
                <RefreshCw className='h-3.5 w-3.5' /> Refresh live
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className='rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm'>
            <div className='mb-4 inline-flex animate-bounce rounded-2xl bg-blue-50 p-4 text-blue-600'>
              <Truck className='h-10 w-10' />
            </div>
            <h3 className='mb-1 text-lg font-bold text-slate-800'>Fetching RC details</h3>
            <p className='mx-auto max-w-md text-sm text-slate-500'>Getting owner, registration, insurance, fitness and tax records...</p>
          </div>
        )}

        {/* Results */}
        {v && !loading && (
          <div className='space-y-6'>
            <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1f48] to-[#070f26] p-5 text-white shadow-xl sm:p-7'>
              <div className='pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl' />
              <div className='relative flex flex-col justify-between gap-6 md:flex-row md:items-center'>
                <div className='space-y-3'>
                  <div className='inline-flex items-center overflow-hidden rounded-lg border-2 border-slate-950 bg-white text-slate-900 shadow-md'>
                    <div className='flex flex-col items-center bg-blue-800 px-2 py-1.5 text-[10px] font-black leading-tight text-white'>
                      <span>🇮🇳</span>
                      <span>IND</span>
                    </div>
                    <span className='px-4 py-1.5 font-mono text-xl font-black tracking-widest sm:text-2xl'>{v.REGN_NO || 'UNKNOWN'}</span>
                    <span className='border-l border-slate-200 px-2.5 py-2'><CopyBtn text={v.REGN_NO} field='Reg No' /></span>
                  </div>
                  <div>
                    <h2 className='text-xl font-bold tracking-tight sm:text-2xl'>{v.MAKER_DESC || ''} {v.MAKER_MODEL || ''}</h2>
                    <p className='mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-300 sm:text-sm'>
                      <span>Owner: <strong className='font-semibold text-white'>{v.OWNER_NAME || 'NA'}</strong></span>
                      {v.OWNER_SERIAL_NO && <span className='rounded bg-white/10 px-2 py-0.5 text-xs'>Owner #{v.OWNER_SERIAL_NO}</span>}
                    </p>
                  </div>
                </div>

                <div className='flex flex-wrap gap-2 md:flex-col md:items-end'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${!v.STATUS || v.STATUS === 'ACTIVE' ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300' : 'border-red-500/30 bg-red-500/20 text-red-300'}`}>
                      <CheckCircle2 className='h-3.5 w-3.5' /> {v.STATUS || 'ACTIVE'}
                    </span>
                    <span className='rounded-full border border-blue-400/30 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200'>
                      {v.VEHICLE_CLASS || v.BODY_TYPE_DESC || 'Vehicle'}
                    </span>
                  </div>
                  <div className='flex items-center gap-2 text-xs text-slate-300'>
                    <span className='flex items-center gap-1'><Fuel className='h-3.5 w-3.5 text-amber-400' />{v.FUEL_DESC || 'NA'}</span>
                    <span>•</span>
                    <span>{v.COLOR || 'NA'}</span>
                    <span>•</span>
                    <span>{v.IS_COMMERCIAL === 'TRUE' ? 'Commercial' : 'Private'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              <Card icon={User} iconClass='text-blue-600' title='Owner & Contact' badge='Identity' badgeClass='bg-blue-50 text-blue-700'>
                <div>
                  <span className='block text-[11px] font-medium text-slate-400'>Owner Name</span>
                  <div className='mt-0.5 flex items-center justify-between font-bold text-slate-900'>
                    <span>{v.OWNER_NAME || 'NA'}</span>
                    <CopyBtn text={v.OWNER_NAME} field='Owner Name' />
                  </div>
                </div>
                <div>
                  <span className='block text-[11px] font-medium text-slate-400'>Father's / Husband's Name</span>
                  <span className='mt-0.5 block font-semibold text-slate-800'>{v.F_NAME || 'NA'}</span>
                </div>
                <div>
                  <span className='block text-[11px] font-medium text-slate-400'>Mobile Number</span>
                  <div className='mt-0.5 flex items-center justify-between font-semibold text-slate-800'>
                    <span className='flex items-center gap-1'><Phone className='h-3.5 w-3.5 text-slate-400' />{v.MOBILE_NO || 'NA'}</span>
                    {v.MOBILE_NO && v.MOBILE_NO !== 'NA' && <CopyBtn text={v.MOBILE_NO} field='Mobile' />}
                  </div>
                </div>
                <div>
                  <span className='block text-[11px] font-medium text-slate-400'>Present Address</span>
                  <div className='mt-0.5 flex items-start justify-between gap-2 text-slate-700'>
                    <span className='text-xs leading-relaxed'>{v.PRESENT_ADDRESS || 'NA'}</span>
                    <CopyBtn text={v.PRESENT_ADDRESS} field='Address' />
                  </div>
                </div>
                {v.PERMANENT_ADDRESS && v.PERMANENT_ADDRESS !== v.PRESENT_ADDRESS && (
                  <div>
                    <span className='block text-[11px] font-medium text-slate-400'>Permanent Address</span>
                    <span className='mt-0.5 block text-xs leading-relaxed text-slate-700'>{v.PERMANENT_ADDRESS}</span>
                  </div>
                )}
              </Card>

              <Card icon={Building2} iconClass='text-emerald-600' title='Registration' badge='RTO Record' badgeClass='bg-emerald-50 text-emerald-700'>
                <Row label='Registered At' value={v.REGISTERED_AT} />
                <Row label='Registration Date' value={v.REGN_DT} />
                <Row label='Valid Upto' value={v.REGN_UPTO} />
                <Row label='State / RTO Code' value={`${v.STATE_CD || 'NA'} - ${v.RTO_CD || 'NA'}`} />
                <Row label='Category' value={`${v.VEHICLE_CATEGORY || 'NA'} (${v.VEHICLE_CLASS || 'NA'})`} />
                <Row label='Record As On' value={v.STATUS_AS_ON || 'Current'} />
              </Card>

              <Card icon={Activity} iconClass='text-sky-600' title='Engine & Specs' badge='Specs' badgeClass='bg-sky-50 text-sky-700'>
                {[['Chassis Number', v.CHASI_NO, 'Chassis No'], ['Engine Number', v.ENG_NO, 'Engine No']].map(([label, value, field]) => (
                  <div key={field} className='space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[11px] font-medium text-slate-500'>{label}</span>
                      <CopyBtn text={value} field={field} />
                    </div>
                    <div className='break-all font-mono text-xs font-bold tracking-wider text-slate-900 sm:text-sm'>{value || 'NA'}</div>
                  </div>
                ))}
                <div className='grid grid-cols-2 gap-2 text-xs'>
                  {[
                    ['Cubic Capacity', v.CUBIC_CAPACITY ? `${v.CUBIC_CAPACITY} cc` : ''],
                    ['Fuel Norms', v.FUEL_NORMS],
                    ['Mfg Month/Year', v.MANU_MONTH_YR],
                    ['Seats / Weight', `${v.SEATING_CAPACITY || 'NA'} / ${v.UNLADEN_WEIGHT ? `${v.UNLADEN_WEIGHT} kg` : 'NA'}`],
                  ].map(([label, value]) => (
                    <div key={label} className='rounded-lg bg-slate-50 p-2'>
                      <span className='block text-[10px] text-slate-400'>{label}</span>
                      <span className='font-bold text-slate-800'>{value || 'NA'}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                icon={Shield}
                iconClass='text-blue-600'
                title='Insurance'
                badge={isExpired(v.INSURANCE_UPTO) ? 'Expired' : 'Active'}
                badgeClass={isExpired(v.INSURANCE_UPTO) ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}
              >
                <div>
                  <span className='block text-[11px] font-medium text-slate-400'>Insurance Company</span>
                  <span className='mt-0.5 block font-bold text-slate-900'>{v.INSURANCE_COMP || 'NA'}</span>
                </div>
                <div>
                  <span className='block text-[11px] font-medium text-slate-400'>Policy Number</span>
                  <div className='mt-0.5 flex items-center justify-between font-mono font-semibold text-slate-800'>
                    <span>{v.INS_POLICY_NO || v.POLICY_NO || 'NA'}</span>
                    {(v.INS_POLICY_NO || v.POLICY_NO) && <CopyBtn text={v.INS_POLICY_NO || v.POLICY_NO} field='Policy No' />}
                  </div>
                </div>
                <ValidityRow label='Insurance Valid Upto' value={v.INSURANCE_UPTO} validText='Covered' />
              </Card>

              <Card icon={FileCheck} iconClass='text-emerald-600' title='Fitness, Tax & PUC' badge='Compliance' badgeClass='bg-emerald-50 text-emerald-700'>
                <ValidityRow label='Fitness Valid Upto' value={v.FIT_UPTO} />
                <ValidityRow label='Road Tax Paid Upto' value={v.TAX_UPTO} expiredText='Due' validText='Paid' />
                <ValidityRow label={v.PUCC_NO ? `PUC ${v.PUCC_NO} Upto` : 'PUC Valid Upto'} value={v.PUCC_UPTO || v.PUC_UPTO} />
              </Card>

              <Card icon={FileText} iconClass='text-amber-600' title='Financer & Permit' badge='Hypothecation' badgeClass='bg-amber-50 text-amber-700'>
                <div>
                  <span className='block text-[11px] font-medium text-slate-400'>Financer / Bank</span>
                  <span className='mt-0.5 block font-bold text-slate-900'>{v.FINANCER_DETAILS || 'No Hypothecation'}</span>
                </div>
                <Row label='Permit Number' value={v.PERMIT_NO} />
                <Row label='Permit Issue Date' value={v.PERMIT_ISSUE_DATE} />
                <Row label='National Permit' value={v.RC_NP_NO} />
                <Row label='Blacklist Status' value={v.BLACKLIST_STATUS || 'Clean'} />
                <Row label='NOC Details' value={v.NOC_DETAILS} />
              </Card>
            </div>
          </div>
        )}

        {!v && !loading && (
          <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10'>
            <div className='mb-4 inline-flex rounded-2xl bg-blue-50 p-4 text-blue-600'>
              <Car className='h-10 w-10' />
            </div>
            <h3 className='mb-1 text-lg font-bold text-slate-800'>Search a vehicle or open one from history</h3>
            <p className='mx-auto max-w-lg text-xs text-slate-500 sm:text-sm'>
              Enter a registration number above for live RC details, or click View on any vehicle in your history below
              to see its saved details without a new lookup.
            </p>
          </div>
        )}

        {/* Search History */}
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
          <div className='mb-5 flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center'>
            <div className='flex items-center gap-2.5'>
              <div className='rounded-xl bg-blue-50 p-2.5 text-blue-600'>
                <History className='h-5 w-5' />
              </div>
              <div>
                <h3 className='flex items-center gap-2 text-base font-bold text-slate-900'>
                  RC Search History
                  <span className='rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600'>
                    {historyPagination.total} saved
                  </span>
                </h3>
                <p className='text-xs text-slate-500'>View opens saved details without a new lookup.</p>
              </div>
            </div>
            <button onClick={() => fetchHistory()} className='cursor-pointer self-end rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 sm:self-auto' title='Refresh'>
              <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className='relative mb-4'>
            <Search className='absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              value={historySearch}
              onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1) }}
              placeholder='Filter by vehicle number, owner, mobile, model, RTO...'
              className='w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs outline-none transition focus:border-blue-500 focus:bg-white sm:text-sm'
            />
            {historySearch && (
              <button type='button' onClick={() => { setHistorySearch(''); setHistoryPage(1) }} className='absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600'>
                <X className='h-4 w-4' />
              </button>
            )}
          </div>

          {historyLoading && historyList.length === 0 ? (
            <div className='p-8 text-center text-sm text-slate-500'>
              <RefreshCw className='mx-auto mb-2 h-6 w-6 animate-spin text-blue-600' />
              Loading history...
            </div>
          ) : historyList.length === 0 ? (
            <div className='rounded-xl border border-slate-100 bg-slate-50 p-8 text-center'>
              <p className='text-sm font-semibold text-slate-700'>No searches found</p>
              <p className='mt-0.5 text-xs text-slate-400'>
                {historySearch ? 'Nothing in your history matches this filter.' : 'Vehicles you search will be saved here automatically.'}
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='overflow-x-auto rounded-xl border border-slate-200'>
                <table className='w-full border-collapse text-left text-xs sm:text-sm'>
                  <thead className='border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500'>
                    <tr>
                      <th className='px-4 py-3'>Vehicle & Owner</th>
                      <th className='hidden px-4 py-3 md:table-cell'>Maker & Model</th>
                      <th className='hidden px-4 py-3 lg:table-cell'>Fitness / Ins. Upto</th>
                      <th className='px-4 py-3'>Searched</th>
                      <th className='px-4 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {historyList.map((item) => (
                      <tr key={item._id} className='transition hover:bg-blue-50/40'>
                        <td className='px-4 py-3'>
                          <div className='flex flex-col items-start gap-1'>
                            <span className='inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white'>
                              <span className='font-sans text-[9px] text-blue-300'>IND</span>
                              {item.vehicleNumber}
                            </span>
                            <span className='flex items-center gap-1 text-xs font-semibold text-slate-900'>
                              <User className='h-3 w-3 shrink-0 text-blue-500' />
                              <span className='line-clamp-1'>{item.ownerName || 'NA'}</span>
                            </span>
                            {item.mobileNo && item.mobileNo !== 'NA' && (
                              <span className='flex items-center gap-1 text-[11px] font-medium text-slate-500'>
                                <Phone className='h-3 w-3 shrink-0 text-slate-400' />{item.mobileNo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='hidden px-4 py-3 text-slate-600 md:table-cell'>
                          <span className='block max-w-[220px] whitespace-normal break-words text-xs font-medium'>{item.makerModel || 'NA'}</span>
                        </td>
                        <td className='hidden px-4 py-3 text-xs text-slate-600 lg:table-cell'>
                          <div>Fit: <span className='font-medium text-slate-800'>{item.fitnessUpto || 'NA'}</span></div>
                          <div>Ins: <span className='font-medium text-slate-800'>{item.insuranceUpto || 'NA'}</span></div>
                        </td>
                        <td className='px-4 py-3 text-xs'>
                          <div className='flex flex-col items-start gap-0.5 whitespace-nowrap'>
                            <span className='flex items-center gap-1 font-semibold text-slate-800'>
                              <Calendar className='h-3.5 w-3.5 shrink-0 text-blue-500' />{formatDate(item.lastSearchedAt || item.updatedAt)}
                            </span>
                            <span className='flex items-center gap-1 text-[11px] font-medium text-slate-500'>
                              <Clock className='h-3 w-3 shrink-0 text-slate-400' />{formatTime(item.lastSearchedAt || item.updatedAt)}
                            </span>
                          </div>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <button onClick={() => handleViewSaved(item)} className='inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700' title='View saved details'>
                              <Eye className='h-3.5 w-3.5' /> View
                            </button>
                            <button onClick={() => handleDownloadHistoryPdf(item)} disabled={historyPdfId === item._id} className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50' title='Download RC PDF'>
                              {historyPdfId === item._id ? <RefreshCw className='h-3.5 w-3.5 animate-spin' /> : <Download className='h-3.5 w-3.5' />}
                              PDF
                            </button>
                            <button onClick={() => handleDelete(item)} disabled={deletingId === item._id} className='cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600' title='Delete from history'>
                              <Trash2 className='h-3.5 w-3.5' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {historyPagination.totalPages > 1 && (
                <div className='flex items-center justify-between gap-3 text-xs'>
                  <span className='text-slate-500'>
                    Page {historyPage} of {historyPagination.totalPages} · {historyPagination.total} vehicles
                  </span>
                  <div className='flex items-center gap-2'>
                    <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage <= 1} className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'>
                      <ChevronLeft className='h-4 w-4' /> Prev
                    </button>
                    <button onClick={() => setHistoryPage((p) => Math.min(historyPagination.totalPages, p + 1))} disabled={historyPage >= historyPagination.totalPages} className='inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'>
                      Next <ChevronRight className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RcDetails
