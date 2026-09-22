import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import useLeads from './useLeads'
import { Icon, LeadModals } from './LeadUI'
import {
  API_URL, BUCKETS, ICON_PATHS, INSURANCE_TYPES, LEAD_STATUSES, SOURCES,
  followUpLabel, followUpTone, initials, isClosedStatus, statusInfo,
} from './leadUtils'

// Lead Management: stat cards, leads table with checkboxes + pagination, filters panel on the right.
const PAGE_SIZE = 10

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700',
  'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700', 'bg-lime-100 text-lime-700',
]
const avatarColor = (name = '') => AVATAR_COLORS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

const SOURCE_STYLES = {
  'Walk-in': 'bg-sky-50 text-sky-700',
  Referral: 'bg-emerald-50 text-emerald-700',
  'Phone Call': 'bg-orange-50 text-orange-700',
  WhatsApp: 'bg-green-50 text-green-700',
  'Social Media': 'bg-pink-50 text-pink-700',
  'Existing Customer': 'bg-blue-50 text-blue-700',
  Other: 'bg-slate-100 text-slate-600',
}

// Status pills in this layout are soft rounded rectangles without the dot.
const StatusTag = ({ status }) => {
  const st = statusInfo(status)
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${st.cls}`}>{st.short}</span>
}

const formatCreated = (value) => {
  if (!value) return { date: '—', time: '' }
  const d = new Date(value)
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
  }
}

// Local start/end of a YYYY-MM-DD day as ISO timestamps for the created-date filter.
const dayBoundary = (iso, end = false) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return (end ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d)).toISOString()
}

const LEAD_TEMPS = [
  { value: '', label: 'All Leads', active: 'bg-slate-900 text-white border-slate-900' },
  { value: 'hot', label: '🔥 Hot', active: 'bg-rose-50 text-rose-700 border-rose-400' },
  { value: 'warm', label: '☀️ Warm', active: 'bg-amber-50 text-amber-700 border-amber-400' },
  { value: 'cold', label: '❄️ Cold', active: 'bg-sky-50 text-sky-700 border-sky-400' },
]
const tempChip = (isActive, activeCls) =>
  `whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${isActive ? activeCls : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`

const EMPTY_DRAFT = { type: '', status: '', source: '', priority: '', dateFrom: '', dateTo: '', search: '' }

const panelLabel = 'mb-1.5 block text-xs font-semibold text-slate-700'
const panelInput = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15'

const PanelSelect = ({ value, onChange, children }) => (
  <div className='relative'>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${panelInput} appearance-none pr-9 cursor-pointer`}>
      {children}
    </select>
    <svg className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
    </svg>
  </div>
)

const STAT_TONES = {
  blue: { card: 'from-blue-50 to-sky-50 border-blue-200', icon: 'bg-blue-600', value: 'text-blue-700' },
  emerald: { card: 'from-emerald-50 to-teal-50 border-emerald-200', icon: 'bg-emerald-600', value: 'text-emerald-700' },
  amber: { card: 'from-amber-50 to-orange-50 border-amber-200', icon: 'bg-amber-500', value: 'text-amber-700' },
  violet: { card: 'from-violet-50 to-purple-50 border-violet-200', icon: 'bg-violet-600', value: 'text-violet-700' },
}

const Plate = ({ value, small = false }) => (
  <span className={`inline-block rounded-md border-2 border-slate-800 bg-amber-300 font-mono font-bold text-slate-900 ${small ? 'px-1.5 text-[11px] tracking-wider' : 'px-1.5 py-0.5 text-[11px] tracking-widest'}`}>
    {value}
  </span>
)

const Leads = () => {
  const L = useLeads({ initialBucket: 'all' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const [menuFor, setMenuFor] = useState(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [showFilters, setShowFilters] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const menuRef = useRef(null)

  const { leads, counts } = L
  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE))
  const pageLeads = useMemo(() => leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [leads, page])

  // Back to page 1 and clear selection whenever the result set changes.
  useEffect(() => { setPage(1); setSelected(new Set()) }, [L.bucket, L.search, L.filters])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  useEffect(() => {
    if (!menuFor) return
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuFor(null) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuFor])

  useEffect(() => {
    if (!showFilters) return
    const onKey = (e) => { if (e.key === 'Escape') setShowFilters(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showFilters])

  // Filters applied from the panel (search has its own box, so it isn't counted here).
  const panelFilterCount = ['type', 'status', 'source', 'priority'].filter((k) => L.filters[k]).length
    + (L.filters.createdFrom || L.filters.createdTo ? 1 : 0)

  const applyPanel = () => {
    L.applyFilters({
      type: draft.type,
      status: draft.status,
      source: draft.source,
      priority: draft.priority,
      createdFrom: dayBoundary(draft.dateFrom),
      createdTo: dayBoundary(draft.dateTo, true),
    })
    setShowFilters(false)
  }
  const resetPanel = () => {
    setDraft((d) => ({ ...EMPTY_DRAFT, search: d.search }))
    L.applyFilters({})
  }

  const allOnPageSelected = pageLeads.length > 0 && pageLeads.every((l) => selected.has(l._id))
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev)
    if (allOnPageSelected) pageLeads.forEach((l) => next.delete(l._id))
    else pageLeads.forEach((l) => next.add(l._id))
    return next
  })
  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const bulkStatus = async (status) => {
    if (!status || !selected.size) return
    setBulkBusy(true)
    try {
      await Promise.all([...selected].map((id) => axios.patch(`${API_URL}/api/leads/${id}/status`, { status }, { withCredentials: true })))
      toast.success(`${selected.size} lead${selected.size > 1 ? 's' : ''} set to ${statusInfo(status).short}`)
      setSelected(new Set())
      L.fetchLeads()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update some leads')
      L.fetchLeads()
    } finally {
      setBulkBusy(false)
    }
  }
  const bulkDelete = async () => {
    if (!selected.size || !window.confirm(`Delete ${selected.size} selected lead(s)? This cannot be undone.`)) return
    setBulkBusy(true)
    try {
      await Promise.all([...selected].map((id) => axios.delete(`${API_URL}/api/leads/${id}`, { withCredentials: true })))
      toast.success('Leads deleted')
      setSelected(new Set())
      L.fetchLeads()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete some leads')
      L.fetchLeads()
    } finally {
      setBulkBusy(false)
    }
  }

  const closed = (counts.converted ?? 0) + (counts.lost ?? 0)
  const winRate = closed ? Math.round(((counts.converted ?? 0) / closed) * 100) : 0
  const inProgress = Math.max(0, (counts.open ?? 0) - (counts.new ?? 0))
  const stats = [
    { label: 'Total Leads', value: counts.all ?? 0, note: `${counts.open ?? 0} open`, icon: ICON_PATHS.users, tone: STAT_TONES.blue },
    { label: 'New Leads', value: counts.new ?? 0, note: `${counts.today ?? 0} follow-ups today`, icon: ICON_PATHS.plus, tone: STAT_TONES.emerald },
    { label: 'In Progress', value: inProgress, note: counts.overdue ? `${counts.overdue} overdue` : 'None overdue', icon: ICON_PATHS.clock, tone: STAT_TONES.amber, warn: !!counts.overdue },
    { label: 'Converted', value: counts.converted ?? 0, note: `${winRate}% win rate`, icon: ICON_PATHS.check, tone: STAT_TONES.violet },
  ]

  // Page numbers with ellipsis, e.g. 1 2 3 4 5 … 25
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const set = new Set([1, totalPages, page - 1, page, page + 1])
    if (page <= 4) [2, 3, 4, 5].forEach((n) => set.add(n))
    if (page >= totalPages - 3) [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => set.add(n))
    const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
    return nums.flatMap((n, i) => (i > 0 && n - nums[i - 1] > 1 ? ['…', n] : [n]))
  }, [page, totalPages])

  const filtersPanel = (
    <div
      className='flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:rounded-2xl'
      onClick={(e) => e.stopPropagation()}
      role='dialog'
      aria-modal='true'
      aria-label='Filter leads'
    >
      <div className='flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] p-3 text-white md:p-4'>
        <div>
          <h2 className='text-lg font-bold md:text-xl'>Filter Leads</h2>
          <p className='text-xs text-slate-300 md:text-sm'>Narrow down who to follow up with</p>
        </div>
        <button type='button' onClick={() => setShowFilters(false)} className='rounded-lg p-1.5 text-white transition hover:bg-white/20 md:p-2' aria-label='Close filters'>
          <Icon d={ICON_PATHS.close} className='h-5 w-5 md:h-6 md:w-6' />
        </button>
      </div>

      <div className='flex-1 space-y-4 overflow-y-auto p-3 md:p-6'>
        <section className='rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-3 md:p-5'>
          <h3 className='mb-3 flex items-center gap-2 text-base font-bold text-gray-800'>
            <span className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white md:h-7 md:w-7'>1</span>
            Lead
          </h3>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div>
              <label className={panelLabel}>Insurance Type</label>
              <PanelSelect value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
                <option value=''>All types</option>
                {INSURANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
              </PanelSelect>
            </div>
            <div>
              <label className={panelLabel}>Status</label>
              <PanelSelect value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))}>
                <option value=''>All statuses</option>
                {LEAD_STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
              </PanelSelect>
            </div>
            <div className='sm:col-span-2'>
              <label className={panelLabel}>Source</label>
              <PanelSelect value={draft.source} onChange={(v) => setDraft((d) => ({ ...d, source: v }))}>
                <option value=''>All sources</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </PanelSelect>
            </div>
          </div>
        </section>

        <section className='rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 md:p-5'>
          <h3 className='mb-3 flex items-center gap-2 text-base font-bold text-gray-800'>
            <span className='flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white md:h-7 md:w-7'>2</span>
            Priority &amp; Date
          </h3>
          <label className={panelLabel}>Lead Type</label>
          <div className='mb-4 flex flex-wrap gap-2'>
            {LEAD_TEMPS.map((t) => (
              <button key={t.value || 'all'} type='button' onClick={() => setDraft((d) => ({ ...d, priority: t.value }))} className={tempChip(draft.priority === t.value, t.active)}>
                {t.label}
              </button>
            ))}
          </div>
          <label className={panelLabel}>Created Date</label>
          <div className='grid grid-cols-2 gap-2'>
            <input type='date' value={draft.dateFrom} max={draft.dateTo || undefined} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} className={panelInput} title='From' />
            <input type='date' value={draft.dateTo} min={draft.dateFrom || undefined} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} className={panelInput} title='To' />
          </div>
        </section>
      </div>

      <div className='flex flex-shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 p-3 md:p-4'>
        <button type='button' onClick={resetPanel} className='rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50'>
          Reset
        </button>
        <button type='button' onClick={applyPanel} className='rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-2 font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 md:px-8'>
          Apply Filters
        </button>
      </div>
    </div>
  )

  const RowMenu = ({ lead, ctx }) => (
    <div className='relative' onClick={(e) => e.stopPropagation()}>
      <button
        type='button'
        onClick={() => setMenuFor(menuFor === `${ctx}:${lead._id}` ? null : `${ctx}:${lead._id}`)}
        className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700'
        aria-label='Actions'
      >
        <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 24 24'><circle cx='12' cy='5' r='1.8' /><circle cx='12' cy='12' r='1.8' /><circle cx='12' cy='19' r='1.8' /></svg>
      </button>
      {menuFor === `${ctx}:${lead._id}` && (
        <div ref={menuRef} className='absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl'>
          {[
            { label: 'View details', run: () => L.setDetailLead(lead) },
            !isClosedStatus(lead.status) && { label: 'Log follow-up', run: () => L.openFollowUp(lead) },
            { label: 'Edit lead', run: () => L.openEdit(lead) },
            lead.mobile && { label: 'Call', run: () => { window.location.href = `tel:+91${lead.mobile}` } },
            lead.mobile && { label: 'WhatsApp', run: () => window.open(`https://wa.me/91${lead.mobile}`, '_blank', 'noopener') },
            !isClosedStatus(lead.status) && { label: 'Mark converted', run: () => L.updateStatus(lead, 'converted') },
            { label: 'Delete', run: () => L.handleDelete(lead), danger: true },
          ].filter(Boolean).map((item) => (
            <button
              key={item.label}
              type='button'
              onClick={() => { setMenuFor(null); item.run() }}
              className={`block w-full px-3.5 py-2 text-left text-sm ${item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const phoneText = (mobile) => (mobile ? `+91 ${mobile.replace(/(\d{5})(\d{5})/, '$1 $2')}` : '')

  return (
    <div className='min-h-screen bg-slate-50' style={{ fontFamily: "'Poppins', sans-serif" }}>
      <main className='w-full space-y-4 px-3 pt-4 pb-10 md:space-y-5 lg:px-8 lg:pt-6'>
        {/* Header card */}
        <section className='overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
          <div className='bg-gradient-to-r from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 pt-4 text-white md:px-6'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h1 className='text-lg font-bold md:text-2xl'>Lead Management</h1>
                <p className='text-xs text-slate-300 md:text-sm'>
                  {counts.overdue ? `${counts.overdue} follow-up${counts.overdue > 1 ? 's' : ''} overdue — call them first` : 'Track, follow up and convert your insurance leads'}
                </p>
              </div>
              <button
                type='button'
                onClick={L.openAdd}
                className='inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-blue-50'
              >
                <Icon d={ICON_PATHS.plus} strokeWidth={2.5} className='h-4 w-4' />
                Add New Lead
              </button>
            </div>

            <div className='-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden'>
              {[{ key: 'all', label: 'All' }, ...BUCKETS.map((b) => ({ key: b.key, label: b.label }))].map((v) => {
                const active = L.bucket === v.key
                return (
                  <button
                    key={v.key}
                    type='button'
                    onClick={() => L.setBucket(v.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  >
                    {v.label}
                    <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-slate-100 text-slate-600' : v.key === 'overdue' && counts.overdue ? 'bg-orange-500 text-white' : 'bg-white/15 text-slate-200'}`}>
                      {counts[v.key] ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className='p-3 md:p-5'>
            <div className='space-y-3 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-3'>
              <div className='flex gap-2'>
                <label className='relative block flex-1'>
                  <span className='pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400'>
                    <Icon d={ICON_PATHS.search} className='h-5 w-5' />
                  </span>
                  <input
                    type='search'
                    value={L.search}
                    onChange={(e) => { L.setSearch(e.target.value); setDraft((d) => ({ ...d, search: e.target.value })) }}
                    placeholder='Search by name, phone or vehicle number'
                    className='w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-3 text-[15px] font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'
                  />
                </label>
                <button
                  type='button'
                  onClick={() => setShowFilters(true)}
                  className='inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-3.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700 md:px-5'
                >
                  <Icon d={ICON_PATHS.filter} className='h-4 w-4' />
                  <span className='hidden sm:inline'>Filters</span>
                  {panelFilterCount > 0 && (
                    <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-blue-700'>{panelFilterCount}</span>
                  )}
                </button>
              </div>
              <div className='flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden'>
                <span className='shrink-0 text-xs font-semibold text-slate-500'>Lead type</span>
                {LEAD_TEMPS.map((t) => (
                  <button
                    key={t.value || 'all'}
                    type='button'
                    onClick={() => { L.setFilter('priority', t.value); setDraft((d) => ({ ...d, priority: t.value })) }}
                    className={`shrink-0 ${tempChip(L.filters.priority === t.value, t.active)}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <section className='grid grid-cols-2 gap-2.5 lg:grid-cols-4 md:gap-4'>
          {stats.map((s) => (
            <div key={s.label} className={`rounded-xl border-2 bg-gradient-to-r p-3 md:p-4 ${s.tone.card}`}>
              <div className='flex items-center gap-3'>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white md:h-11 md:w-11 ${s.tone.icon}`}>
                  <Icon d={s.icon} className='h-5 w-5' strokeWidth={2.2} />
                </span>
                <div className='min-w-0'>
                  <p className={`text-xl font-bold leading-none md:text-2xl ${s.tone.value}`}>{s.value}</p>
                  <p className='mt-1 truncate text-xs font-semibold text-slate-700 md:text-sm'>{s.label}</p>
                  <p className={`truncate text-[11px] font-medium ${s.warn ? 'text-orange-600' : 'text-slate-500'}`}>{s.note}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Leads */}
        <section className='md:overflow-visible md:rounded-2xl md:bg-white md:shadow-sm md:ring-1 md:ring-slate-200'>
          {selected.size > 0 && (
            <div className='mb-3 flex flex-wrap items-center gap-2 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 px-4 py-2.5 md:mb-0 md:rounded-none md:rounded-t-2xl md:border-0 md:border-b md:border-blue-100 md:px-6'>
              <span className='text-sm font-semibold text-blue-800'>{selected.size} selected</span>
              <div className='w-48'>
                <PanelSelect value='' onChange={bulkStatus}>
                  <option value=''>Change status…</option>
                  {LEAD_STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                </PanelSelect>
              </div>
              <button type='button' disabled={bulkBusy} onClick={bulkDelete} className='rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50'>Delete</button>
              <button type='button' onClick={() => setSelected(new Set())} className='ml-auto text-sm font-semibold text-blue-700 hover:underline'>Clear</button>
            </div>
          )}

          {L.loading && leads.length === 0 ? (
            <div className='flex flex-col items-center gap-3 rounded-2xl bg-white py-20 ring-1 ring-slate-200 md:rounded-none md:ring-0'>
              <div className='h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-r-transparent' />
              <p className='text-sm text-slate-400'>Loading leads…</p>
            </div>
          ) : leads.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-20 text-center ring-1 ring-slate-200 md:rounded-none md:ring-0'>
              <span className='flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500'>
                <Icon d={ICON_PATHS.users} className='h-7 w-7' />
              </span>
              <p className='font-semibold text-slate-800'>{L.activeFilterCount ? 'No leads match these filters' : 'No leads yet'}</p>
              <p className='text-sm text-slate-500'>{L.activeFilterCount ? 'Try removing some filters.' : 'Add your first lead to start tracking follow-ups.'}</p>
              <button
                type='button'
                onClick={L.activeFilterCount ? () => { setDraft(EMPTY_DRAFT); L.clearFilters() } : L.openAdd}
                className='mt-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-700/20'
              >
                {L.activeFilterCount ? 'Reset filters' : '+ Add New Lead'}
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className='hidden md:block'>
                <table className='w-full text-left'>
                  <thead>
                    <tr className={`bg-gradient-to-r from-slate-50 to-blue-50 text-xs font-semibold uppercase tracking-wide text-slate-500 ${selected.size ? '' : '[&>th:first-child]:rounded-tl-2xl [&>th:last-child]:rounded-tr-2xl'}`}>
                      <th className='w-10 py-3 pl-6 pr-2'>
                        <input type='checkbox' checked={allOnPageSelected} onChange={toggleAll} className='h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600' aria-label='Select all on page' />
                      </th>
                      <th className='px-3 py-3'>Lead</th>
                      <th className='px-3 py-3'>Interested In</th>
                      <th className='px-3 py-3'>Status</th>
                      <th className='px-3 py-3'>Next Follow-up</th>
                      <th className='px-3 py-3'>Created</th>
                      <th className='w-16 px-4 py-3' />
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {pageLeads.map((lead) => {
                      const created = formatCreated(lead.createdAt)
                      const isChecked = selected.has(lead._id)
                      return (
                        <tr key={lead._id} onClick={() => L.setDetailLead(lead)} className={`cursor-pointer transition ${isChecked ? 'bg-blue-50/60' : 'hover:bg-blue-50/40'}`}>
                          <td className='py-3.5 pl-6 pr-2' onClick={(e) => e.stopPropagation()}>
                            <input type='checkbox' checked={isChecked} onChange={() => toggleOne(lead._id)} className='h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600' aria-label={`Select ${lead.name}`} />
                          </td>
                          <td className='px-3 py-3.5'>
                            <div className='flex items-center gap-3'>
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(lead.name)}`}>{initials(lead.name)}</div>
                              <div className='min-w-0'>
                                <p className='max-w-[220px] truncate text-sm font-semibold text-slate-800'>{lead.name}</p>
                                <p className='text-xs text-slate-500'>{phoneText(lead.mobile) || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className='px-3 py-3.5'>
                            <p className='text-sm text-slate-700'>{lead.insuranceType || '—'}</p>
                            <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                              {lead.vehicleNumber && <Plate value={lead.vehicleNumber} />}
                              {lead.source && (
                                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${SOURCE_STYLES[lead.source] || SOURCE_STYLES.Other}`}>{lead.source}</span>
                              )}
                            </div>
                          </td>
                          <td className='px-3 py-3.5'><StatusTag status={lead.status} /></td>
                          <td className={`whitespace-nowrap px-3 py-3.5 text-xs font-semibold ${isClosedStatus(lead.status) ? 'text-slate-300' : followUpTone(lead.nextFollowUpDate)}`}>
                            {isClosedStatus(lead.status) ? '—' : followUpLabel(lead.nextFollowUpDate, lead.nextFollowUpTime)}
                          </td>
                          <td className='whitespace-nowrap px-3 py-3.5 text-xs text-slate-600'>
                            {created.date}<p className='text-slate-400'>{created.time}</p>
                          </td>
                          <td className='px-4 py-3.5'>
                            <RowMenu lead={lead} ctx='table' />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className='space-y-3 md:hidden'>
                {pageLeads.map((lead) => (
                  <li key={lead._id} className='rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70'>
                    <button type='button' onClick={() => L.setDetailLead(lead)} className='block w-full rounded-t-xl p-3.5 text-left active:bg-slate-50'>
                      <span className='flex items-start gap-3'>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(lead.name)}`}>{initials(lead.name)}</span>
                        <span className='min-w-0 flex-1'>
                          <span className='flex items-start justify-between gap-2'>
                            <span className='truncate text-[15px] font-semibold text-slate-900'>{lead.name}</span>
                            <StatusTag status={lead.status} />
                          </span>
                          <span className='block text-xs text-slate-500'>{phoneText(lead.mobile)}</span>
                          <span className='mt-1.5 flex flex-wrap items-center gap-1.5'>
                            {lead.insuranceType && <span className='text-xs font-medium text-slate-700'>{lead.insuranceType}</span>}
                            {lead.vehicleNumber && <Plate value={lead.vehicleNumber} small />}
                            {lead.source && (
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${SOURCE_STYLES[lead.source] || SOURCE_STYLES.Other}`}>{lead.source}</span>
                            )}
                          </span>
                        </span>
                      </span>
                    </button>
                    <div className='flex items-center justify-between gap-2 rounded-b-xl border-t border-slate-100 bg-slate-50/60 py-1.5 pl-3.5 pr-1.5'>
                      <span className={`min-w-0 truncate text-xs font-semibold ${isClosedStatus(lead.status) ? 'text-slate-400' : followUpTone(lead.nextFollowUpDate)}`}>
                        {isClosedStatus(lead.status) ? 'Closed' : followUpLabel(lead.nextFollowUpDate, lead.nextFollowUpTime)}
                      </span>
                      <span className='flex shrink-0 items-center'>
                        {lead.mobile && (
                          <a href={`tel:+91${lead.mobile}`} className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-700' aria-label='Call'>
                            <Icon d={ICON_PATHS.phone} className='h-4 w-4' />
                          </a>
                        )}
                        {lead.mobile && (
                          <a href={`https://wa.me/91${lead.mobile}`} target='_blank' rel='noopener noreferrer' className='flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600' aria-label='WhatsApp'>
                            <Icon d={ICON_PATHS.chat} className='h-4 w-4' />
                          </a>
                        )}
                        <RowMenu lead={lead} ctx='card' />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              <div className='mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200 md:mt-0 md:rounded-none md:rounded-b-2xl md:border-t md:border-slate-100 md:bg-gray-50 md:px-6 md:ring-0'>
                <p className='text-xs text-slate-500'>
                  Showing <span className='font-semibold text-slate-700'>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leads.length)}</span> of{' '}
                  <span className='font-semibold text-slate-700'>{leads.length}</span> leads
                </p>
                {totalPages > 1 && (
                  <div className='flex items-center gap-1.5'>
                    <button type='button' disabled={page === 1} onClick={() => setPage((p) => p - 1)} className='flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40' aria-label='Previous page'>
                      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
                    </button>
                    {pageNumbers.map((n, i) => (n === '…' ? (
                      <span key={`gap-${i}`} className='flex h-8 w-8 items-center justify-center text-sm text-slate-400'>…</span>
                    ) : (
                      <button
                        key={n}
                        type='button'
                        onClick={() => setPage(n)}
                        className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${n === page ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-md shadow-blue-700/20' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        {n}
                      </button>
                    )))}
                    <button type='button' disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className='flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40' aria-label='Next page'>
                      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' /></svg>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
      {showFilters && (
        <div className='fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-2 md:p-4' onClick={() => setShowFilters(false)}>
          {filtersPanel}
        </div>
      )}
      <LeadModals leads={L} />
    </div>
  )
}

export default Leads
