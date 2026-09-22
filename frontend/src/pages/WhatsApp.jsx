import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

const API = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/wa`
const req = { withCredentials: true }

const ICON = {
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  send: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
  pause: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  phone: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
}

const Svg = ({ d, className = 'h-5 w-5', strokeWidth = 2 }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={strokeWidth} d={d} />
  </svg>
)

const Spinner = ({ className = 'h-4 w-4 border-2' }) => (
  <span className={`inline-block animate-spin rounded-full border-current border-r-transparent ${className}`} />
)

const DOC_LABELS = { Insurance: 'Insurance', Tax: 'Road Tax', Puc: 'PUC', Gps: 'GPS', Fitness: 'Fitness', Test: 'Test' }

const STATUS_BADGE = {
  sent: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
}

const TONES = {
  emerald: { card: 'from-emerald-50 to-teal-50 border-emerald-200', icon: 'bg-emerald-600', value: 'text-emerald-700' },
  amber: { card: 'from-amber-50 to-orange-50 border-amber-200', icon: 'bg-amber-500', value: 'text-amber-700' },
  rose: { card: 'from-rose-50 to-pink-50 border-rose-200', icon: 'bg-rose-600', value: 'text-rose-700' },
}

const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'

// What the connection card shows for each backend state.
const describe = (s) => {
  if (!s) return { tone: 'slate', label: 'Loading…' }
  switch (s.status) {
    case 'authenticated': return { tone: 'emerald', label: 'Connected' }
    case 'qr_ready': return { tone: 'blue', label: 'Scan the QR code' }
    case 'initializing': return { tone: 'blue', label: s.initStage === 'waiting' ? 'Waiting for a free slot…' : 'Connecting…' }
    case 'syncing': return { tone: 'blue', label: 'Finishing login…' }
    case 'stopped': return { tone: 'amber', label: 'Paused' }
    case 'needs_qr': return { tone: 'rose', label: 'Not connected' }
    default: return s.hasSavedSession ? { tone: 'emerald', label: 'Linked · standby' } : { tone: 'slate', label: 'Not connected' }
  }
}

const PILL = {
  emerald: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  blue: 'bg-sky-400/15 text-sky-200 ring-sky-300/30',
  amber: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
  rose: 'bg-rose-400/15 text-rose-200 ring-rose-300/30',
  slate: 'bg-white/10 text-slate-200 ring-white/20',
}

const WhatsApp = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState('')
  const [logs, setLogs] = useState([])
  const [logMeta, setLogMeta] = useState({ page: 1, totalPages: 1, total: 0, counts: { pending: 0, sent: 0, failed: 0 } })
  const [logFilter, setLogFilter] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [logPage, setLogPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [settings, setSettings] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [testNumber, setTestNumber] = useState(user?.mobile || '')
  const pollRef = useRef(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/status`, { ...req, params: { watch: 1 } })
      setStatus(res.data.data)
    } catch { /* keep last known status */ }
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/logs`, { ...req, params: { page: logPage, limit: 15, status: logFilter || undefined, search: logSearch || undefined } })
      setLogs(res.data.data.logs)
      setLogMeta(res.data.data)
    } catch {
      toast.error('Could not load messages')
    } finally {
      setLogsLoading(false)
    }
  }, [logPage, logFilter, logSearch])

  useEffect(() => { loadStatus() }, [loadStatus])
  useEffect(() => {
    const t = setTimeout(loadLogs, logSearch ? 300 : 0)
    return () => clearTimeout(t)
  }, [loadLogs, logSearch])

  // Poll fast while a QR / connection is in progress, slowly otherwise.
  const active = ['initializing', 'qr_ready', 'syncing'].includes(status?.status)
  useEffect(() => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      loadStatus()
      if (!active) loadLogs()
    }, active ? 2500 : 20000)
    return () => clearInterval(pollRef.current)
  }, [active, loadStatus, loadLogs])

  const run = async (key, fn, { refreshLogs = false } = {}) => {
    setBusy(key)
    try {
      const res = await fn()
      if (res?.data?.message) toast.success(res.data.message)
      await loadStatus()
      if (refreshLogs) await loadLogs()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setBusy('')
    }
  }

  const post = (path, body) => () => axios.post(`${API}${path}`, body, req)
  const connect = () => run('connect', post('/connect'))
  const cancel = () => run('cancel', post('/cancel'))
  const renewQr = () => run('renew', post('/renew-qr'))
  const pause = () => run('pause', post('/stop'))
  const logout = () => {
    if (!window.confirm('Disconnect this WhatsApp number? You will need to scan the QR code again to reconnect.')) return
    run('logout', post('/logout'))
  }
  const scan = () => run('scan', post('/scan'), { refreshLogs: true })
  const sendTest = (e) => {
    e.preventDefault()
    run('test', post('/test', { number: testNumber }), { refreshLogs: true })
  }
  const retry = (id) => run(`retry-${id}`, post(`/logs/${id}/retry`), { refreshLogs: true })
  const remove = (id) => run(`del-${id}`, () => axios.delete(`${API}/logs/${id}`, req), { refreshLogs: true })

  const openSettings = () => {
    setSettings(null)
    setShowSettings(true)
    axios.get(`${API}/settings`, req)
      .then((r) => setSettings(r.data.data))
      .catch(() => { toast.error('Could not load WhatsApp settings'); setShowSettings(false) })
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await axios.put(`${API}/settings`, settings, req)
      setSettings(res.data.data)
      setShowSettings(false)
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const setRule = (key, patch) => setSettings((s) => ({ ...s, alertRules: { ...s.alertRules, [key]: { ...s.alertRules[key], ...patch } } }))

  const state = describe(status)
  const linked = status?.status === 'authenticated' || status?.hasSavedSession
  const counts = status?.counts || { pending: 0, failed: 0, sentToday: 0 }
  const qrExpires = status?.qrExpiresAt ? Math.max(0, Math.round((new Date(status.qrExpiresAt) - Date.now()) / 1000)) : null

  const statCards = [
    { key: 'sent', label: 'Sent today', value: counts.sentToday, icon: ICON.check, tone: TONES.emerald },
    { key: 'pending', label: 'Waiting to send', value: counts.pending, icon: ICON.clock, tone: TONES.amber },
    { key: 'failed', label: 'Failed', value: counts.failed, icon: ICON.alert, tone: TONES.rose },
  ]

  return (
    <div className='min-h-screen bg-slate-50' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <main className='w-full space-y-4 px-3 pt-4 pb-8 md:space-y-5 lg:px-6 lg:pt-5'>
        {/* Header */}
        <section className='overflow-hidden rounded-2xl bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 py-4 text-white shadow-sm md:px-6 md:py-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-300/30'>
                <Svg d={ICON.chat} className='h-6 w-6' />
              </span>
              <div>
                <h1 className='text-lg font-bold md:text-2xl'>WhatsApp Automation</h1>
                <p className='text-xs text-slate-300 md:text-sm'>Renewal reminders go to your clients from your own WhatsApp number</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${PILL[state.tone]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${state.tone === 'emerald' ? 'bg-emerald-400' : state.tone === 'rose' ? 'bg-rose-400' : state.tone === 'amber' ? 'bg-amber-400' : 'bg-sky-400'}`} />
              {state.label}
            </span>
            <button
              type='button'
              onClick={openSettings}
              className='inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-white/20 transition hover:bg-white/25 md:text-sm'
            >
              <Svg d={ICON.cog} className='h-4 w-4' />
              Settings
            </button>
            </div>
          </div>
        </section>

        <div className='grid gap-4 md:gap-5 xl:grid-cols-3'>
          {/* Connection */}
          <section className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 xl:col-span-1'>
            <div className='border-b border-slate-100 px-4 py-3 md:px-5'>
              <h2 className='font-semibold text-slate-900'>Your WhatsApp</h2>
            </div>
            <div className='p-4 md:p-5'>
              {!status ? (
                <div className='flex justify-center py-10 text-blue-600'><Spinner className='h-8 w-8 border-4' /></div>
              ) : status.status === 'qr_ready' && status.qrCodeDataUrl ? (
                <div className='text-center'>
                  <div className='mx-auto w-fit rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-3'>
                    <img src={status.qrCodeDataUrl} alt='WhatsApp QR code' className='h-56 w-56 rounded-lg bg-white' />
                  </div>
                  {qrExpires !== null && <p className='mt-2 text-xs text-slate-500'>QR code expires in {Math.floor(qrExpires / 60)}:{String(qrExpires % 60).padStart(2, '0')}</p>}
                  <ol className='mx-auto mt-4 max-w-xs space-y-1.5 text-left text-sm text-slate-600'>
                    <li><span className='font-semibold text-slate-800'>1.</span> Open WhatsApp on your phone</li>
                    <li><span className='font-semibold text-slate-800'>2.</span> Tap <b>⋮ Menu</b> or <b>Settings</b> → <b>Linked devices</b></li>
                    <li><span className='font-semibold text-slate-800'>3.</span> Tap <b>Link a device</b> and scan this code</li>
                  </ol>
                  <div className='mt-4 flex justify-center gap-2'>
                    <button type='button' onClick={renewQr} disabled={!!busy} className={btnGhost}>{busy === 'renew' ? <Spinner /> : <Svg d={ICON.refresh} className='h-4 w-4' />}New code</button>
                    <button type='button' onClick={cancel} disabled={!!busy} className={btnGhost}>Cancel</button>
                  </div>
                </div>
              ) : ['initializing', 'syncing'].includes(status.status) ? (
                <div className='flex flex-col items-center py-8 text-center'>
                  <span className='text-blue-600'><Spinner className='h-10 w-10 border-4' /></span>
                  <p className='mt-4 font-semibold text-slate-800'>{state.label}</p>
                  <p className='mt-1 text-sm text-slate-500'>{status.status === 'syncing' ? 'QR scanned. This takes a few seconds.' : 'Please keep this page open.'}</p>
                  <button type='button' onClick={cancel} disabled={!!busy} className={`${btnGhost} mt-4`}>Cancel</button>
                </div>
              ) : linked && status.status !== 'stopped' && status.status !== 'needs_qr' ? (
                <div>
                  <div className='flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3'>
                    <span className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white'><Svg d={ICON.check} /></span>
                    <div className='min-w-0'>
                      <p className='font-semibold text-slate-900'>{status.phoneNumber ? `+${status.phoneNumber}` : 'WhatsApp linked'}</p>
                      <p className='text-xs text-slate-600'>
                        {status.status === 'authenticated' ? 'Connected now' : 'Connects automatically when a reminder is due'}
                      </p>
                    </div>
                  </div>
                  <p className='mt-3 text-xs leading-relaxed text-slate-500'>
                    To save server memory, BimaOne connects only while sending and disconnects when idle. Your login stays saved — no need to scan again.
                  </p>
                  <div className='mt-4 grid grid-cols-2 gap-2'>
                    <button type='button' onClick={pause} disabled={!!busy} className={btnGhost}>{busy === 'pause' ? <Spinner /> : <Svg d={ICON.pause} className='h-4 w-4' />}Pause</button>
                    <button type='button' onClick={logout} disabled={!!busy} className={`${btnGhost} text-rose-600 hover:bg-rose-50`}>{busy === 'logout' ? <Spinner /> : <Svg d={ICON.logout} className='h-4 w-4' />}Disconnect</button>
                  </div>
                </div>
              ) : (
                <div className='text-center'>
                  <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${status.status === 'stopped' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Svg d={status.status === 'stopped' ? ICON.pause : ICON.chat} className='h-7 w-7' />
                  </span>
                  <p className='mt-3 font-semibold text-slate-900'>{status.status === 'stopped' ? 'Sending is paused' : 'Connect your WhatsApp'}</p>
                  <p className='mx-auto mt-1 max-w-xs text-sm text-slate-500'>
                    {status.status === 'stopped'
                      ? 'Reminders are waiting. Resume to start sending again.'
                      : 'Link your WhatsApp once by scanning a QR code. Reminders are then sent to clients automatically.'}
                  </p>
                  <button type='button' onClick={connect} disabled={!!busy} className={`${btnPrimary} mt-4 w-full`}>
                    {busy === 'connect' ? <Spinner /> : <Svg d={ICON.bolt} className='h-4 w-4' />}
                    {status.status === 'stopped' ? 'Resume sending' : 'Connect WhatsApp'}
                  </button>
                  {status.status === 'stopped' && status.hasSavedSession && (
                    <button type='button' onClick={logout} disabled={!!busy} className='mt-2 text-xs font-semibold text-rose-600 hover:underline'>Disconnect this number</button>
                  )}
                </div>
              )}

              {status?.lastError && !['qr_ready', 'initializing', 'syncing'].includes(status.status) && (
                <p className='mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>{status.lastError}</p>
              )}

              {linked && (
                <form onSubmit={sendTest} className='mt-5 border-t border-slate-100 pt-4'>
                  <label className='mb-1.5 block text-xs font-semibold text-slate-600'>Send a test message</label>
                  <div className='flex gap-2'>
                    <input
                      type='tel'
                      inputMode='numeric'
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder='10-digit mobile number'
                      className={inputCls}
                    />
                    <button type='submit' disabled={!!busy || testNumber.length < 10} className={`${btnPrimary} shrink-0 px-3`}>
                      {busy === 'test' ? <Spinner /> : <Svg d={ICON.send} className='h-4 w-4' />}
                      <span className='hidden sm:inline'>Send</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* Stats + messages */}
          <div className='space-y-4 md:space-y-5 xl:col-span-2'>
            <section className='grid grid-cols-3 gap-2.5 md:gap-4'>
              {statCards.map((s) => (
                <button
                  key={s.key}
                  type='button'
                  onClick={() => { setLogFilter(s.key === 'sent' ? 'sent' : s.key); setLogPage(1) }}
                  className={`rounded-xl border-2 bg-gradient-to-r p-3 text-left transition hover:shadow-md md:px-4 md:py-4 ${s.tone.card} ${logFilter === s.key ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                >
                  <div className='flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3'>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white md:h-11 md:w-11 ${s.tone.icon}`}>
                      <Svg d={s.icon} />
                    </span>
                    <div className='min-w-0'>
                      <p className={`text-xl font-bold leading-none md:text-2xl ${s.tone.value}`}>{status ? s.value : '…'}</p>
                      <p className='mt-1 truncate text-xs font-semibold text-slate-700 md:text-sm'>{s.label}</p>
                    </div>
                  </div>
                </button>
              ))}
            </section>

            <section className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
              <div className='space-y-3 border-b border-slate-100 px-4 py-3.5 md:px-5'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='inline-flex rounded-lg bg-slate-100 p-1'>
                    {[
                      { key: '', label: 'All', n: logMeta.counts.pending + logMeta.counts.sent + logMeta.counts.failed },
                      { key: 'sent', label: 'Sent', n: logMeta.counts.sent },
                      { key: 'pending', label: 'Pending', n: logMeta.counts.pending },
                      { key: 'failed', label: 'Failed', n: logMeta.counts.failed },
                    ].map((t) => (
                      <button
                        key={t.label}
                        type='button'
                        onClick={() => { setLogFilter(t.key); setLogPage(1) }}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition md:px-3 md:text-sm ${logFilter === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {t.label} <span className='text-slate-400'>{t.n}</span>
                      </button>
                    ))}
                  </div>
                  <button type='button' onClick={scan} disabled={!!busy} className={btnPrimary} title='Check all documents now and queue reminders that are due'>
                    {busy === 'scan' ? <Spinner /> : <Svg d={ICON.refresh} className='h-4 w-4' />}
                    Check & send now
                  </button>
                </div>
                <label className='relative block'>
                  <span className='pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400'><Svg d={ICON.search} className='h-4 w-4' /></span>
                  <input
                    type='search'
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setLogPage(1) }}
                    placeholder='Search client name, mobile or vehicle'
                    className={`${inputCls} pl-9`}
                  />
                </label>
              </div>

              {logsLoading ? (
                <div className='flex justify-center py-16 text-blue-600'><Spinner className='h-8 w-8 border-4' /></div>
              ) : logs.length === 0 ? (
                <div className='flex flex-col items-center gap-2 px-6 py-14 text-center'>
                  <span className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'><Svg d={ICON.chat} className='h-7 w-7' /></span>
                  <p className='font-semibold text-slate-800'>{logFilter || logSearch ? 'No matching messages' : 'No messages yet'}</p>
                  <p className='max-w-sm text-sm text-slate-500'>
                    {logFilter || logSearch ? 'Try another filter or search.' : 'Reminders appear here once documents with a client mobile number are close to expiry.'}
                  </p>
                </div>
              ) : (
                <ul className='divide-y divide-slate-100'>
                  {logs.map((m) => {
                    const open = expanded === m._id
                    return (
                      <li key={m._id} className='px-4 py-3 md:px-5'>
                        <div className='flex items-start gap-3'>
                          <button type='button' onClick={() => setExpanded(open ? null : m._id)} className='min-w-0 flex-1 text-left'>
                            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                              <span className='truncate text-sm font-semibold text-slate-900'>{m.ownerName || 'Client'}</span>
                              <span className='rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600'>{DOC_LABELS[m.documentType] || m.documentType}</span>
                              {m.vehicleNumber && (
                                <span className='rounded border-2 border-slate-800 bg-amber-300 px-1 font-mono text-[10px] font-bold tracking-wider text-slate-900'>{m.vehicleNumber}</span>
                              )}
                            </div>
                            <p className='mt-0.5 text-xs text-slate-500'>+91 {String(m.targetNumber).replace(/^91(?=\d{10}$)/, '')}</p>
                            <p className={`mt-1 whitespace-pre-line text-xs text-slate-600 ${open ? '' : 'line-clamp-2'}`}>{m.messageBody}</p>
                            {m.errorReason && (
                              <p className={`mt-1 text-xs ${m.status === 'failed' ? 'text-rose-600' : 'text-amber-700'}`}>{m.errorReason}</p>
                            )}
                          </button>
                          <div className='flex shrink-0 flex-col items-end gap-1.5'>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                            <span className='text-[11px] text-slate-400'>{fmtTime(m.sentAt || m.createdAt)}</span>
                            <div className='flex'>
                              {m.status === 'failed' && (
                                <button type='button' onClick={() => retry(m._id)} disabled={!!busy} className='flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700' title='Try again' aria-label='Try again'>
                                  <Svg d={ICON.refresh} className='h-4 w-4' />
                                </button>
                              )}
                              <button type='button' onClick={() => remove(m._id)} disabled={!!busy} className='flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600' title='Delete' aria-label='Delete'>
                                <Svg d={ICON.trash} className='h-4 w-4' />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {logMeta.totalPages > 1 && (
                <div className='flex items-center justify-between border-t border-slate-100 bg-gray-50 px-4 py-2.5 text-xs text-slate-500 md:px-5'>
                  <span>Page {logMeta.page} of {logMeta.totalPages}</span>
                  <div className='flex gap-1.5'>
                    <button type='button' disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40'>Previous</button>
                    <button type='button' disabled={logPage >= logMeta.totalPages} onClick={() => setLogPage((p) => p + 1)} className='rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40'>Next</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

      </main>

      {/* Settings popup */}
      {showSettings && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-2 md:p-4' onClick={() => !savingSettings && setShowSettings(false)}>
          <div
            className='flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-label='WhatsApp settings'
          >
            <div className='flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-3 text-white md:p-4'>
              <div className='flex items-center gap-3'>
                <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/15'><Svg d={ICON.cog} /></span>
                <div>
                  <h2 className='text-lg font-bold md:text-xl'>WhatsApp Settings</h2>
                  <p className='text-xs text-slate-300 md:text-sm'>Choose when and how reminders are sent</p>
                </div>
              </div>
              <button type='button' onClick={() => setShowSettings(false)} disabled={savingSettings} className='rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2' aria-label='Close'>
                <svg className='h-5 w-5 md:h-6 md:w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg>
              </button>
            </div>

            {!settings ? (
              <div className='flex justify-center py-16 text-blue-600'><Spinner className='h-8 w-8 border-4' /></div>
            ) : (
              <div className='flex-1 space-y-4 overflow-y-auto p-3 md:space-y-5 md:p-6'>
                {/* 1. General */}
                <section className='rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3 md:p-5'>
                  <div className='mb-3 flex flex-wrap items-center justify-between gap-2 md:mb-4'>
                    <h3 className='flex items-center gap-2 text-base font-bold text-gray-800 md:text-lg'>
                      <span className='flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white md:h-8 md:w-8 md:text-sm'>1</span>
                      General
                    </h3>
                    <label className='inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm'>
                      <input
                        type='checkbox'
                        checked={settings.automationEnabled !== false}
                        onChange={(e) => setSettings((s) => ({ ...s, automationEnabled: e.target.checked }))}
                        className='h-4 w-4 accent-emerald-600'
                      />
                      Automatic reminders {settings.automationEnabled !== false ? 'on' : 'off'}
                    </label>
                  </div>
                  <div className='grid gap-3 sm:grid-cols-3'>
                    <label className='block'>
                      <span className='mb-1 block text-xs font-semibold text-gray-700 md:text-sm'>Message language</span>
                      <select value={settings.messageLanguage} onChange={(e) => setSettings((s) => ({ ...s, messageLanguage: e.target.value }))} className={`${inputCls} cursor-pointer`}>
                        <option value='english'>English</option>
                        <option value='hindi'>Hindi</option>
                        <option value='both'>English + Hindi</option>
                      </select>
                    </label>
                    <label className='block'>
                      <span className='mb-1 block text-xs font-semibold text-gray-700 md:text-sm'>Max messages per day</span>
                      <input type='number' min='1' max='200' value={settings.maxMessagesPerDay} onChange={(e) => setSettings((s) => ({ ...s, maxMessagesPerDay: e.target.value }))} className={inputCls} />
                    </label>
                    <label className='block'>
                      <span className='mb-1 block text-xs font-semibold text-gray-700 md:text-sm'>Max messages per hour</span>
                      <input type='number' min='1' max='60' value={settings.maxMessagesPerHour} onChange={(e) => setSettings((s) => ({ ...s, maxMessagesPerHour: e.target.value }))} className={inputCls} />
                    </label>
                  </div>
                  <p className='mt-2.5 text-xs text-slate-600'>Messages go out between 7 AM and 9 PM with a short random gap, so your number isn't flagged as spam.</p>
                </section>

                {/* 2. Reminders per document */}
                <section className='rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-3 md:p-5'>
                  <h3 className='mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg'>
                    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white md:h-8 md:w-8 md:text-sm'>2</span>
                    When to remind clients
                  </h3>
                  <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
                    {settings.services.map((svc) => {
                      const rule = settings.alertRules[svc.key]
                      return (
                        <div key={svc.key} className={`rounded-lg bg-white p-3.5 shadow-sm ring-1 transition ${rule.enabled ? 'ring-blue-200' : 'opacity-60 ring-slate-200'}`}>
                          <label className='flex cursor-pointer items-center justify-between gap-2'>
                            <span className='font-semibold text-slate-900'>{svc.label}</span>
                            <input type='checkbox' checked={rule.enabled} onChange={(e) => setRule(svc.key, { enabled: e.target.checked })} className='h-4 w-4 accent-blue-600' />
                          </label>
                          <div className='mt-3 space-y-2.5'>
                            <label className='block'>
                              <span className='mb-1 block text-[11px] font-semibold text-slate-600'>Days before expiry (comma separated)</span>
                              <input
                                value={Array.isArray(rule.beforeDays) ? rule.beforeDays.join(', ') : rule.beforeDays}
                                onChange={(e) => setRule(svc.key, { beforeDays: e.target.value })}
                                disabled={!rule.enabled}
                                placeholder='15, 7, 1'
                                className={inputCls}
                              />
                            </label>
                            <label className='flex items-center gap-2 text-xs text-slate-700'>
                              <input type='checkbox' checked={rule.sendOnExpiryDay} onChange={(e) => setRule(svc.key, { sendOnExpiryDay: e.target.checked })} disabled={!rule.enabled} className='h-4 w-4 accent-blue-600' />
                              Remind on the expiry day
                            </label>
                            <label className='flex items-center gap-2 text-xs text-slate-700'>
                              <input type='checkbox' checked={rule.sendAfterExpiry} onChange={(e) => setRule(svc.key, { sendAfterExpiry: e.target.checked })} disabled={!rule.enabled} className='h-4 w-4 accent-blue-600' />
                              Remind after expiry
                            </label>
                            {rule.sendAfterExpiry && rule.enabled && (
                              <input
                                value={Array.isArray(rule.afterDays) ? rule.afterDays.join(', ') : rule.afterDays}
                                onChange={(e) => setRule(svc.key, { afterDays: e.target.value })}
                                placeholder='Days after expiry, e.g. 3, 7'
                                className={inputCls}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>
            )}

            <div className='flex flex-shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 p-3 md:gap-3 md:p-4'>
              <button type='button' onClick={() => setShowSettings(false)} disabled={savingSettings} className='rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-100 md:px-6'>
                Cancel
              </button>
              <button type='button' onClick={saveSettings} disabled={savingSettings || !settings} className={`${btnPrimary} md:px-8`}>
                {savingSettings && <Spinner />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WhatsApp
