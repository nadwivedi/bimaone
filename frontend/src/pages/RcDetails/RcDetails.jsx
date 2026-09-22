import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Search, History, Truck, Shield, FileText, User, Phone, CheckCircle2,
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

const TONES = {
  blue: { card: 'from-blue-50 to-sky-50 border-blue-200', icon: 'bg-blue-600' },
  emerald: { card: 'from-emerald-50 to-teal-50 border-emerald-200', icon: 'bg-emerald-600' },
  sky: { card: 'from-sky-50 to-cyan-50 border-sky-200', icon: 'bg-sky-600' },
  violet: { card: 'from-violet-50 to-purple-50 border-violet-200', icon: 'bg-violet-600' },
  amber: { card: 'from-amber-50 to-orange-50 border-amber-200', icon: 'bg-amber-500' },
}

// Tinted section card, same look as the Add Insurance popup sections.
const Card = ({ icon: Icon, tone = 'blue', title, badge, badgeClass = 'bg-white/80 text-slate-600', children }) => {
  const t = TONES[tone]
  return (
    <section className={`rounded-xl border-2 bg-gradient-to-r p-3.5 md:p-4 ${t.card}`}>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <h3 className='flex items-center gap-2 text-sm font-bold text-slate-900 md:text-base'>
          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${t.icon}`}>
            <Icon className='h-4 w-4' />
          </span>
          {title}
        </h3>
        {badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>{badge}</span>}
      </div>
      <div className='space-y-2 rounded-lg bg-white/90 p-3 text-xs shadow-sm sm:text-sm'>{children}</div>
    </section>
  )
}

const Row = ({ label, value }) => (
  <div className='flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0'>
    <span className='text-slate-500'>{label}</span>
    <span className='text-right font-semibold text-slate-800'>{value || 'NA'}</span>
  </div>
)

const Field = ({ label, children }) => (
  <div className='border-b border-slate-100 pb-2 last:border-0 last:pb-0'>
    <span className='block text-[11px] font-medium text-slate-400'>{label}</span>
    <div className='mt-0.5 font-semibold text-slate-800'>{children}</div>
  </div>
)

// Big coloured tile for each validity date (green while valid, red once expired).
const ValidityTile = ({ label, value, validText = 'Valid', expiredText = 'Expired', icon: Icon }) => {
  const known = value && value !== 'NA'
  const expired = known && isExpired(value)
  const cls = !known
    ? 'from-slate-50 to-slate-100 border-slate-200'
    : expired ? 'from-rose-50 to-pink-50 border-rose-200' : 'from-emerald-50 to-teal-50 border-emerald-200'
  const dot = !known ? 'bg-slate-400' : expired ? 'bg-rose-600' : 'bg-emerald-600'
  const txt = !known ? 'text-slate-500' : expired ? 'text-rose-700' : 'text-emerald-700'
  return (
    <div className={`rounded-xl border-2 bg-gradient-to-r p-3 md:p-4 ${cls}`}>
      <div className='flex items-center gap-2.5'>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${dot}`}>
          <Icon className='h-4 w-4' />
        </span>
        <div className='min-w-0'>
          <p className='truncate text-xs font-semibold text-slate-600'>{label}</p>
          <p className='text-sm font-bold text-slate-900 md:text-base'>{known ? value : 'Not available'}</p>
        </div>
      </div>
      {known && <p className={`mt-2 text-xs font-bold ${txt}`}>{expired ? expiredText : validText}</p>}
    </div>
  )
}

const Plate = ({ value, large = false }) => (
  <span className={`inline-flex items-center overflow-hidden rounded-md border-2 border-slate-800 bg-amber-300 font-mono font-bold text-slate-900 ${large ? 'text-xl tracking-widest sm:text-2xl' : 'text-xs tracking-wider'}`}>
    <span className={`flex flex-col items-center bg-blue-800 font-sans font-black leading-tight text-white ${large ? 'px-2 py-1 text-[10px]' : 'px-1 py-0.5 text-[8px]'}`}>IND</span>
    <span className={large ? 'px-3 py-1' : 'px-1.5 py-0.5'}>{value || '—'}</span>
  </span>
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
    <button type='button' onClick={() => handleCopy(text, field)} className='shrink-0 rounded p-0.5 text-slate-400 hover:text-blue-600' title={`Copy ${field}`} aria-label={`Copy ${field}`}>
      {copiedField === field ? <Check className='h-3.5 w-3.5 text-emerald-600' /> : <Copy className='h-3.5 w-3.5' />}
    </button>
  )

  const v = vehicleData
  const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
  const btnGlass = 'inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/25 disabled:opacity-60'

  return (
    <div className='min-h-screen bg-slate-50 text-slate-800' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <main className='w-full space-y-4 px-3 pt-4 pb-8 md:space-y-5 lg:px-6 lg:pt-5'>
        {/* Header + search */}
        <section ref={resultsTopRef} className='scroll-mt-20 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
          <div className='bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 py-4 text-white md:px-6'>
            <div className='flex items-center gap-3'>
              <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20'>
                <Truck className='h-6 w-6' />
              </span>
              <div>
                <h1 className='text-lg font-bold md:text-2xl'>RC Details</h1>
                <p className='text-xs text-slate-300 md:text-sm'>Live registration details for any vehicle number · every search is saved to your history</p>
              </div>
            </div>
          </div>
          <div className='p-3 md:p-5'>
            <form
              onSubmit={(e) => { e.preventDefault(); handleLiveSearch() }}
              className='flex flex-col gap-3 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-3 md:flex-row md:items-center'
            >
              <div className='relative flex flex-1 items-center overflow-hidden rounded-lg border-2 border-slate-800 bg-amber-300 shadow-sm focus-within:ring-4 focus-within:ring-blue-600/20'>
                <span className='flex select-none flex-col items-center self-stretch justify-center bg-blue-800 px-2.5 text-[10px] font-black leading-tight text-white'>
                  <span>🇮🇳</span>
                  <span>IND</span>
                </span>
                <input
                  type='text'
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder='CG12BU5574'
                  aria-label='Vehicle number'
                  className='w-full bg-transparent px-3.5 py-3 font-mono text-lg font-bold uppercase tracking-widest text-slate-900 outline-none placeholder:text-slate-700/40 sm:text-xl'
                  autoFocus
                />
                {vehicleNo && (
                  <button type='button' onClick={() => { setVehicleNo(''); setVehicleData(null); setSource(null) }} className='mr-1 p-2 text-slate-700 hover:text-slate-900' aria-label='Clear'>
                    <X className='h-5 w-5' />
                  </button>
                )}
              </div>
              <button type='submit' disabled={loading || !vehicleNo.trim()} className={`${btnPrimary} shrink-0 py-3.5 md:px-6`}>
                {loading ? <RefreshCw className='h-5 w-5 animate-spin' /> : <Search className='h-5 w-5' />}
                {loading ? 'Searching…' : 'Get RC Details'}
              </button>
            </form>
          </div>
        </section>

        {loading && (
          <div className='flex flex-col items-center gap-3 rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-slate-200'>
            <span className='inline-flex animate-bounce rounded-2xl bg-blue-50 p-4 text-blue-600'><Truck className='h-9 w-9' /></span>
            <p className='font-semibold text-slate-800'>Fetching RC details…</p>
            <p className='max-w-md px-4 text-sm text-slate-500'>Getting owner, registration, insurance, fitness and tax records</p>
          </div>
        )}

        {/* Results */}
        {v && !loading && (
          <div className='space-y-4 md:space-y-5'>
            <section className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] p-4 text-white shadow-md md:p-6'>
              <div className='pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl' />
              <div className='relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                <div className='space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Plate value={v.REGN_NO || 'UNKNOWN'} large />
                    <button onClick={() => handleCopy(v.REGN_NO, 'Reg No')} className='rounded-lg p-2 text-white/80 transition hover:bg-white/15' title='Copy number' aria-label='Copy vehicle number'>
                      {copiedField === 'Reg No' ? <Check className='h-4 w-4 text-emerald-300' /> : <Copy className='h-4 w-4' />}
                    </button>
                  </div>
                  <div>
                    <h2 className='text-xl font-bold tracking-tight md:text-2xl'>{`${v.MAKER_DESC || ''} ${v.MAKER_MODEL || ''}`.trim() || 'Vehicle'}</h2>
                    <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 md:text-sm'>
                      <span>Owner <strong className='font-semibold text-white'>{v.OWNER_NAME || 'NA'}</strong></span>
                      {v.OWNER_SERIAL_NO && <span className='rounded-full bg-white/10 px-2 py-0.5 text-xs'>Owner #{v.OWNER_SERIAL_NO}</span>}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2 text-xs'>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset ${!v.STATUS || v.STATUS === 'ACTIVE' ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30' : 'bg-rose-400/15 text-rose-200 ring-rose-300/30'}`}>
                      <CheckCircle2 className='h-3.5 w-3.5' />{v.STATUS || 'ACTIVE'}
                    </span>
                    <span className='rounded-full bg-sky-400/15 px-2.5 py-1 font-semibold text-sky-200 ring-1 ring-inset ring-sky-300/30'>{v.VEHICLE_CLASS || v.BODY_TYPE_DESC || 'Vehicle'}</span>
                    <span className='inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-slate-200'><Fuel className='h-3.5 w-3.5 text-amber-300' />{v.FUEL_DESC || 'NA'}</span>
                    <span className='rounded-full bg-white/10 px-2.5 py-1 text-slate-200'>{v.COLOR || 'NA'}</span>
                    <span className='rounded-full bg-white/10 px-2.5 py-1 text-slate-200'>{v.IS_COMMERCIAL === 'TRUE' ? 'Commercial' : 'Private'}</span>
                  </div>
                </div>

                <div className='flex flex-wrap gap-2 lg:flex-col lg:items-stretch'>
                  <button onClick={handleDownloadPdf} disabled={pdfLoading} className='inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-md transition hover:bg-blue-50 disabled:opacity-60 md:text-sm'>
                    {pdfLoading ? <RefreshCw className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
                    {pdfLoading ? 'Generating…' : 'Download RC PDF'}
                  </button>
                  <button onClick={handleShareWhatsApp} className={btnGlass}><Share2 className='h-4 w-4' />Share on WhatsApp</button>
                  <button onClick={handleCopySummary} className={btnGlass}><Copy className='h-4 w-4' />Copy summary</button>
                </div>
              </div>

              {source && (
                <div className='relative mt-4 flex flex-col gap-2 border-t border-white/10 pt-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between'>
                  <span className='flex items-center gap-1.5'>
                    {source.saved ? <Database className='h-4 w-4 text-amber-300' /> : <Sparkles className='h-4 w-4 text-emerald-300' />}
                    <strong className='text-white'>{source.saved ? 'Saved record' : 'Live RTO data'}</strong>
                    · {source.saved ? 'searched' : 'fetched'} {formatDate(source.at)} {formatTime(source.at)}
                  </span>
                  {source.saved && (
                    <button onClick={() => handleLiveSearch(v.REGN_NO || vehicleNo)} className='inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 font-semibold text-slate-900 transition hover:bg-amber-300'>
                      <RefreshCw className='h-3.5 w-3.5' />Refresh live data
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Validity at a glance */}
            <section className='grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4'>
              <ValidityTile label='Insurance' value={v.INSURANCE_UPTO} validText='Covered' icon={Shield} />
              <ValidityTile label='Fitness' value={v.FIT_UPTO} icon={FileCheck} />
              <ValidityTile label='Road Tax' value={v.TAX_UPTO} validText='Paid' expiredText='Due' icon={FileText} />
              <ValidityTile label='PUC' value={v.PUCC_UPTO || v.PUC_UPTO} icon={Activity} />
            </section>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3'>
              <Card icon={User} tone='blue' title='Owner & Contact'>
                <Field label='Owner Name'>
                  <div className='flex items-center justify-between gap-2'><span className='font-bold text-slate-900'>{v.OWNER_NAME || 'NA'}</span><CopyBtn text={v.OWNER_NAME} field='Owner Name' /></div>
                </Field>
                <Field label="Father's / Husband's Name">{v.F_NAME || 'NA'}</Field>
                <Field label='Mobile Number'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='flex items-center gap-1'><Phone className='h-3.5 w-3.5 text-slate-400' />{v.MOBILE_NO || 'NA'}</span>
                    {v.MOBILE_NO && v.MOBILE_NO !== 'NA' && <CopyBtn text={v.MOBILE_NO} field='Mobile' />}
                  </div>
                </Field>
                <Field label='Present Address'>
                  <div className='flex items-start justify-between gap-2'><span className='text-xs font-medium leading-relaxed text-slate-700'>{v.PRESENT_ADDRESS || 'NA'}</span><CopyBtn text={v.PRESENT_ADDRESS} field='Address' /></div>
                </Field>
                {v.PERMANENT_ADDRESS && v.PERMANENT_ADDRESS !== v.PRESENT_ADDRESS && (
                  <Field label='Permanent Address'><span className='text-xs font-medium leading-relaxed text-slate-700'>{v.PERMANENT_ADDRESS}</span></Field>
                )}
              </Card>

              <Card icon={Building2} tone='emerald' title='Registration' badge='RTO record'>
                <Row label='Registered At' value={v.REGISTERED_AT} />
                <Row label='Registration Date' value={v.REGN_DT} />
                <Row label='Valid Upto' value={v.REGN_UPTO} />
                <Row label='State / RTO Code' value={`${v.STATE_CD || 'NA'} - ${v.RTO_CD || 'NA'}`} />
                <Row label='Category' value={`${v.VEHICLE_CATEGORY || 'NA'} (${v.VEHICLE_CLASS || 'NA'})`} />
                <Row label='Record As On' value={v.STATUS_AS_ON || 'Current'} />
              </Card>

              <Card icon={Activity} tone='sky' title='Engine & Specs'>
                {[['Chassis Number', v.CHASI_NO, 'Chassis No'], ['Engine Number', v.ENG_NO, 'Engine No']].map(([label, value, field]) => (
                  <Field key={field} label={label}>
                    <div className='flex items-center justify-between gap-2'>
                      <span className='break-all font-mono text-xs font-bold tracking-wider text-slate-900 sm:text-sm'>{value || 'NA'}</span>
                      <CopyBtn text={value} field={field} />
                    </div>
                  </Field>
                ))}
                <div className='grid grid-cols-2 gap-2 pt-1 text-xs'>
                  {[
                    ['Cubic Capacity', v.CUBIC_CAPACITY ? `${v.CUBIC_CAPACITY} cc` : ''],
                    ['Fuel Norms', v.FUEL_NORMS],
                    ['Mfg Month/Year', v.MANU_MONTH_YR],
                    ['Seats / Weight', `${v.SEATING_CAPACITY || 'NA'} / ${v.UNLADEN_WEIGHT ? `${v.UNLADEN_WEIGHT} kg` : 'NA'}`],
                  ].map(([label, value]) => (
                    <div key={label} className='rounded-lg bg-slate-50 p-2 ring-1 ring-inset ring-slate-100'>
                      <span className='block text-[10px] text-slate-400'>{label}</span>
                      <span className='font-bold text-slate-800'>{value || 'NA'}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                icon={Shield}
                tone='violet'
                title='Insurance'
                badge={v.INSURANCE_UPTO && v.INSURANCE_UPTO !== 'NA' ? (isExpired(v.INSURANCE_UPTO) ? 'Expired' : 'Active') : null}
                badgeClass={isExpired(v.INSURANCE_UPTO) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}
              >
                <Field label='Insurance Company'><span className='font-bold text-slate-900'>{v.INSURANCE_COMP || 'NA'}</span></Field>
                <Field label='Policy Number'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-mono'>{v.INS_POLICY_NO || v.POLICY_NO || 'NA'}</span>
                    {(v.INS_POLICY_NO || v.POLICY_NO) && <CopyBtn text={v.INS_POLICY_NO || v.POLICY_NO} field='Policy No' />}
                  </div>
                </Field>
                <Field label='Valid Upto'>{v.INSURANCE_UPTO || 'NA'}</Field>
              </Card>

              <Card icon={FileText} tone='amber' title='Financer & Permit'>
                <Field label='Financer / Bank'><span className='font-bold text-slate-900'>{v.FINANCER_DETAILS || 'No hypothecation'}</span></Field>
                <Row label='Permit Number' value={v.PERMIT_NO} />
                <Row label='Permit Issue Date' value={v.PERMIT_ISSUE_DATE} />
                <Row label='National Permit' value={v.RC_NP_NO} />
                <Row label='Blacklist Status' value={v.BLACKLIST_STATUS || 'Clean'} />
                <Row label='NOC Details' value={v.NOC_DETAILS} />
              </Card>

              <Card icon={FileCheck} tone='emerald' title='Fitness, Tax & PUC'>
                <Row label='Fitness Valid Upto' value={v.FIT_UPTO} />
                <Row label='Road Tax Paid Upto' value={v.TAX_UPTO} />
                <Row label={v.PUCC_NO ? `PUC ${v.PUCC_NO}` : 'PUC Valid Upto'} value={v.PUCC_UPTO || v.PUC_UPTO} />
              </Card>
            </div>
          </div>
        )}

        {!v && !loading && (
          <div className='flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-200'>
            <span className='rounded-2xl bg-blue-50 p-4 text-blue-600'><Car className='h-9 w-9' /></span>
            <p className='font-semibold text-slate-800'>Search a vehicle or open one from your history</p>
            <p className='max-w-lg text-sm text-slate-500'>Enter a registration number above for live RC details, or tap any vehicle below to see its saved details without a new lookup.</p>
          </div>
        )}

        {/* History */}
        <section className='md:overflow-hidden md:rounded-2xl md:bg-white md:shadow-sm md:ring-1 md:ring-slate-200'>
          <div className='mb-3 space-y-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 md:mb-0 md:rounded-none md:border-b md:border-slate-100 md:px-5 md:py-4 md:shadow-none md:ring-0'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2.5'>
                <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600'><History className='h-5 w-5' /></span>
                <div>
                  <h2 className='font-semibold text-slate-900'>Search history</h2>
                  <p className='text-xs text-slate-500'>{historyPagination.total} saved vehicle{historyPagination.total === 1 ? '' : 's'}</p>
                </div>
              </div>
              <button onClick={() => fetchHistory()} className='rounded-lg p-2 text-slate-500 transition hover:bg-slate-100' title='Refresh' aria-label='Refresh history'>
                <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <label className='relative block'>
              <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <input
                type='search'
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1) }}
                placeholder='Filter by vehicle, owner, mobile, model or RTO'
                className='w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
              />
            </label>
          </div>

          {historyLoading && historyList.length === 0 ? (
            <div className='flex justify-center rounded-2xl bg-white py-12 text-blue-600 ring-1 ring-slate-200 md:rounded-none md:ring-0'><RefreshCw className='h-7 w-7 animate-spin' /></div>
          ) : historyList.length === 0 ? (
            <div className='rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-200 md:rounded-none md:ring-0'>
              <p className='font-semibold text-slate-800'>No searches found</p>
              <p className='mt-1 text-sm text-slate-500'>{historySearch ? 'Nothing in your history matches this filter.' : 'Vehicles you search are saved here automatically.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className='hidden overflow-x-auto md:block'>
                <table className='w-full text-left text-sm'>
                  <thead>
                    <tr className='bg-gradient-to-r from-slate-50 to-blue-50 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                      <th className='px-5 py-3'>Owner &amp; Vehicle</th>
                      <th className='px-5 py-3'>Maker &amp; Model</th>
                      <th className='hidden px-5 py-3 lg:table-cell'>Fitness / Insurance</th>
                      <th className='px-5 py-3'>Searched</th>
                      <th className='px-5 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {historyList.map((item) => (
                      <tr key={item._id} onClick={() => handleViewSaved(item)} className='cursor-pointer transition hover:bg-blue-50/40'>
                        <td className='px-5 py-3'>
                          <p className='mb-1 max-w-[220px] truncate font-semibold text-slate-800'>{item.ownerName || 'NA'}</p>
                          <div className='flex items-center gap-2'>
                            <Plate value={item.vehicleNumber} />
                            {item.mobileNo && item.mobileNo !== 'NA' && <span className='text-xs text-slate-400'>{item.mobileNo}</span>}
                          </div>
                        </td>
                        <td className='px-5 py-3'><span className='block max-w-[240px] text-xs font-medium text-slate-600'>{item.makerModel || 'NA'}</span></td>
                        <td className='hidden px-5 py-3 text-xs text-slate-600 lg:table-cell'>
                          <div>Fitness <span className='font-semibold text-slate-800'>{item.fitnessUpto || 'NA'}</span></div>
                          <div>Insurance <span className='font-semibold text-slate-800'>{item.insuranceUpto || 'NA'}</span></div>
                        </td>
                        <td className='whitespace-nowrap px-5 py-3 text-xs'>
                          <div className='font-semibold text-slate-800'>{formatDate(item.lastSearchedAt || item.updatedAt)}</div>
                          <div className='text-slate-400'>{formatTime(item.lastSearchedAt || item.updatedAt)}</div>
                        </td>
                        <td className='px-5 py-3' onClick={(e) => e.stopPropagation()}>
                          <div className='flex items-center justify-end gap-0.5'>
                            <button onClick={() => handleViewSaved(item)} className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700' title='View' aria-label='View saved details'><Eye className='h-4 w-4' /></button>
                            <button onClick={() => handleDownloadHistoryPdf(item)} disabled={historyPdfId === item._id} className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50' title='Download RC PDF' aria-label='Download RC PDF'>
                              {historyPdfId === item._id ? <RefreshCw className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
                            </button>
                            <button onClick={() => handleDelete(item)} disabled={deletingId === item._id} className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600' title='Delete' aria-label='Delete from history'><Trash2 className='h-4 w-4' /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className='space-y-3 md:hidden'>
                {historyList.map((item) => (
                  <li key={item._id} className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70'>
                    <button type='button' onClick={() => handleViewSaved(item)} className='block w-full p-3.5 text-left active:bg-slate-50'>
                      <span className='block truncate text-[15px] font-semibold text-slate-900'>{item.ownerName || 'NA'}</span>
                      <span className='mt-1 flex items-center gap-2'>
                        <Plate value={item.vehicleNumber} />
                        {item.mobileNo && item.mobileNo !== 'NA' && <span className='text-xs text-slate-400'>{item.mobileNo}</span>}
                      </span>
                      {item.makerModel && <span className='mt-2 block text-xs text-slate-600'>{item.makerModel}</span>}
                    </button>
                    <div className='flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 py-1.5 pl-3.5 pr-1.5'>
                      <span className='text-xs text-slate-500'>{formatDate(item.lastSearchedAt || item.updatedAt)} · {formatTime(item.lastSearchedAt || item.updatedAt)}</span>
                      <span className='flex'>
                        <button onClick={() => handleDownloadHistoryPdf(item)} disabled={historyPdfId === item._id} className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-700' aria-label='Download RC PDF'>
                          {historyPdfId === item._id ? <RefreshCw className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
                        </button>
                        <button onClick={() => handleDelete(item)} disabled={deletingId === item._id} className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600' aria-label='Delete from history'><Trash2 className='h-4 w-4' /></button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {historyPagination.totalPages > 1 && (
                <div className='mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-xs text-slate-500 ring-1 ring-slate-200 md:mt-0 md:rounded-none md:border-t md:border-slate-100 md:bg-gray-50 md:px-5 md:ring-0'>
                  <span>Page {historyPage} of {historyPagination.totalPages}</span>
                  <div className='flex gap-1.5'>
                    <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage <= 1} className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40'>
                      <ChevronLeft className='h-4 w-4' />Prev
                    </button>
                    <button onClick={() => setHistoryPage((p) => Math.min(historyPagination.totalPages, p + 1))} disabled={historyPage >= historyPagination.totalPages} className='inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40'>
                      Next<ChevronRight className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default RcDetails
