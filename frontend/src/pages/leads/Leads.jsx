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

const VIEWS = [
  { key: 'all', label: 'All Leads' },
  ...BUCKETS.map((b) => ({ key: b.key, label: b.long })),
]

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
    { label: 'Total Leads', value: counts.all ?? 0, note: `${counts.open ?? 0} open`, icon: ICON_PATHS.users, circle: 'bg-blue-100 text-blue-600' },
    { label: 'New Leads', value: counts.new ?? 0, note: `${counts.today ?? 0} follow-ups today`, icon: ICON_PATHS.plus, circle: 'bg-emerald-100 text-emerald-600' },
    { label: 'In Progress', value: inProgress, note: counts.overdue ? `${counts.overdue} overdue` : 'None overdue', icon: ICON_PATHS.clock, circle: 'bg-amber-100 text-amber-600', warn: !!counts.overdue },
    { label: 'Converted', value: counts.converted ?? 0, note: `${winRate}% win rate`, icon: ICON_PATHS.check, circle: 'bg-purple-100 text-purple-600' },
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
    <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
      <div className='mb-5 flex items-center justify-between'>
        <h2 className='text-lg font-bold text-slate-900'>Filters</h2>
        <button type='button' onClick={() => setShowFilters(false)} className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800' aria-label='Close filters'>
          <Icon d={ICON_PATHS.close} className='h-4 w-4' strokeWidth={2.5} />
        </button>
      </div>
      <div className='space-y-4'>
        <div>
          <label className={panelLabel}>Insurance Type</label>
          <PanelSelect value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
            <option value=''>All Types</option>
            {INSURANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.value}</option>)}
          </PanelSelect>
        </div>
        <div>
          <label className={panelLabel}>Status</label>
          <PanelSelect value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))}>
            <option value=''>All Statuses</option>
            {LEAD_STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
          </PanelSelect>
        </div>
        <div>
          <label className={panelLabel}>Source</label>
          <PanelSelect value={draft.source} onChange={(v) => setDraft((d) => ({ ...d, source: v }))}>
            <option value=''>All Sources</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </PanelSelect>
        </div>
        <div>
          <label className={panelLabel}>Lead Type (Hot / Warm / Cold)</label>
          <div className='flex flex-wrap gap-2'>
            {LEAD_TEMPS.map((t) => (
              <button key={t.value || 'all'} type='button' onClick={() => setDraft((d) => ({ ...d, priority: t.value }))} className={tempChip(draft.priority === t.value, t.active)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={panelLabel}>Created Date</label>
          <div className='grid grid-cols-2 gap-2'>
            <input type='date' value={draft.dateFrom} max={draft.dateTo || undefined} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} className={`${panelInput} px-2`} title='From' />
            <input type='date' value={draft.dateTo} min={draft.dateFrom || undefined} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} className={`${panelInput} px-2`} title='To' />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-2 pt-1'>
          <button type='button' onClick={resetPanel} className='rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
            Reset
          </button>
          <button type='button' onClick={applyPanel} className='rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700'>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className='min-h-screen bg-slate-50'>
      <main className='px-3 pt-4 pb-32 lg:px-6 lg:pt-6'>
        <div className='w-full'>
          {/* Header */}
          <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h1 className='text-2xl font-bold text-slate-900 md:text-[28px]'>Lead Management</h1>
              <p className='mt-1 text-sm text-slate-500'>Track, manage and convert your insurance leads into loyal customers.</p>
            </div>
            <div className='flex items-center gap-2'>
              <button type='button' onClick={L.openAdd} className='flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700'>
                <Icon d={ICON_PATHS.plus} strokeWidth={2.5} />Add New Lead
              </button>
            </div>
          </div>

          <div>
            <div className='min-w-0 space-y-5'>
              {/* Stat cards */}
              <div className='grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4'>
                {stats.map((s) => (
                  <div key={s.label} className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:gap-4 md:p-5'>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full md:h-14 md:w-14 ${s.circle}`}>
                      <Icon d={s.icon} className='h-5 w-5 md:h-6 md:w-6' strokeWidth={2.2} />
                    </div>
                    <div className='min-w-0'>
                      <p className='truncate text-xs font-medium text-slate-600 md:text-sm'>{s.label}</p>
                      <p className='text-2xl font-bold leading-tight text-slate-900 md:text-[28px]'>{s.value}</p>
                      <p className={`truncate text-[11px] font-medium md:text-xs ${s.warn ? 'text-orange-600' : 'text-emerald-600'}`}>{s.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Leads table */}
              <div className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
                <div className='flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-4 md:px-5'>
                  <h2 className='mr-auto text-lg font-bold text-slate-900'>Leads</h2>
                  <div className='w-full sm:w-44'>
                    <PanelSelect value={L.bucket} onChange={L.setBucket}>
                      {VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label} ({counts[v.key] ?? 0})</option>)}
                    </PanelSelect>
                  </div>
                  <div className='flex w-full items-center gap-2 sm:w-auto'>
                    <div className='relative flex-1 sm:w-80 sm:flex-none'>
                      <Icon d={ICON_PATHS.search} className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      <input
                        value={L.search}
                        onChange={(e) => { L.setSearch(e.target.value); setDraft((d) => ({ ...d, search: e.target.value })) }}
                        placeholder='Search by name, phone, vehicle...'
                        className={`${panelInput} pl-9`}
                      />
                    </div>
                    <div className='relative'>
                      <button
                        type='button'
                        onClick={() => setShowFilters((v) => !v)}
                        className={`relative flex h-[42px] w-[42px] items-center justify-center rounded-lg border transition-colors ${showFilters || panelFilterCount
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600'}`}
                        title='Filters'
                        aria-label='Filters'
                      >
                        <Icon d={ICON_PATHS.filter} className='h-[18px] w-[18px]' />
                        {panelFilterCount > 0 && (
                          <span className='absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white'>
                            {panelFilterCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2.5 [&::-webkit-scrollbar]:hidden md:px-5'>
                  <span className='shrink-0 text-xs font-semibold text-slate-500'>Lead type:</span>
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

                {selected.size > 0 && (
                  <div className='flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2.5 md:px-5'>
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
                  <div className='py-16 text-center'>
                    <div className='mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent' />
                  </div>
                ) : leads.length === 0 ? (
                  <div className='py-16 text-center'>
                    <p className='text-sm font-semibold text-slate-500'>{L.activeFilterCount ? 'No leads match these filters.' : 'No leads yet.'}</p>
                    <button type='button' onClick={L.activeFilterCount ? () => { setDraft(EMPTY_DRAFT); L.clearFilters() } : L.openAdd} className='mt-2 text-sm font-semibold text-blue-600 hover:underline'>
                      {L.activeFilterCount ? 'Reset filters' : '+ Add your first lead'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className='hidden overflow-x-auto md:block'>
                      <table className='w-full min-w-[900px] text-left'>
                        <thead>
                          <tr className='border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-700'>
                            <th className='w-10 py-3 pl-5 pr-2'>
                              <input type='checkbox' checked={allOnPageSelected} onChange={toggleAll} className='h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600' />
                            </th>
                            <th className='px-3 py-3'>Name</th>
                            <th className='px-3 py-3'>Contact</th>
                            <th className='px-3 py-3'>Insurance Type</th>
                            <th className='px-3 py-3'>Source</th>
                            <th className='px-3 py-3'>Status</th>
                            <th className='px-3 py-3'>Next Follow-up</th>
                            <th className='px-3 py-3'>Created At</th>
                            <th className='px-5 py-3 text-center'>Actions</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-slate-100'>
                          {pageLeads.map((lead) => {
                            const created = formatCreated(lead.createdAt)
                            const isChecked = selected.has(lead._id)
                            return (
                              <tr key={lead._id} onClick={() => L.setDetailLead(lead)} className={`cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                                <td className='py-3.5 pl-5 pr-2' onClick={(e) => e.stopPropagation()}>
                                  <input type='checkbox' checked={isChecked} onChange={() => toggleOne(lead._id)} className='h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600' />
                                </td>
                                <td className='px-3 py-3.5'>
                                  <div className='flex items-center gap-3'>
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(lead.name)}`}>{initials(lead.name)}</div>
                                    <div className='min-w-0'>
                                      <p className='truncate text-sm font-semibold text-slate-900'>{lead.name}</p>
                                      <p className='text-xs text-slate-400'>{[lead.city, lead.priority && lead.priority[0].toUpperCase() + lead.priority.slice(1)].filter(Boolean).join(' · ')}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className='max-w-[220px] px-3 py-3.5'>
                                  <p className='whitespace-nowrap text-sm text-slate-700'>{lead.mobile ? `+91 ${lead.mobile.replace(/(\d{5})(\d{5})/, '$1 $2')}` : '—'}</p>
                                  {lead.email && <p className='truncate text-xs text-slate-400' title={lead.email}>{lead.email}</p>}
                                </td>
                                <td className='px-3 py-3.5 text-sm text-slate-700'>
                                  {lead.insuranceType}
                                  {lead.vehicleNumber && <p className='font-mono text-[11px] text-slate-400'>{lead.vehicleNumber}</p>}
                                </td>
                                <td className='px-3 py-3.5'>
                                  {lead.source ? (
                                    <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${SOURCE_STYLES[lead.source] || SOURCE_STYLES.Other}`}>{lead.source}</span>
                                  ) : <span className='text-sm text-slate-300'>—</span>}
                                </td>
                                <td className='px-3 py-3.5'><StatusTag status={lead.status} /></td>
                                <td className={`whitespace-nowrap px-3 py-3.5 text-xs font-semibold ${isClosedStatus(lead.status) ? 'text-slate-300' : followUpTone(lead.nextFollowUpDate)}`}>
                                  {isClosedStatus(lead.status) ? '—' : followUpLabel(lead.nextFollowUpDate, lead.nextFollowUpTime)}
                                </td>
                                <td className='whitespace-nowrap px-3 py-3.5 text-xs text-slate-600'>
                                  {created.date}<p className='text-slate-400'>{created.time}</p>
                                </td>
                                <td className='relative px-5 py-3.5 text-center' onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type='button'
                                    onClick={() => setMenuFor(menuFor === lead._id ? null : lead._id)}
                                    className='rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                    aria-label='Actions'
                                  >
                                    <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 24 24'><circle cx='12' cy='5' r='1.8' /><circle cx='12' cy='12' r='1.8' /><circle cx='12' cy='19' r='1.8' /></svg>
                                  </button>
                                  {menuFor === lead._id && (
                                    <div ref={menuRef} className='absolute right-8 top-10 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg'>
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
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile list */}
                    <div className='divide-y divide-slate-100 md:hidden'>
                      {pageLeads.map((lead) => (
                        <div key={lead._id} onClick={() => L.setDetailLead(lead)} className='flex items-start gap-3 px-4 py-3.5 active:bg-slate-50'>
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(lead.name)}`}>{initials(lead.name)}</div>
                          <div className='min-w-0 flex-1'>
                            <div className='flex items-start justify-between gap-2'>
                              <p className='truncate text-sm font-semibold text-slate-900'>{lead.name}</p>
                              <StatusTag status={lead.status} />
                            </div>
                            <p className='text-xs text-slate-500'>{[lead.mobile && `+91 ${lead.mobile}`, lead.insuranceType].filter(Boolean).join(' · ')}</p>
                            {lead.email && <p className='truncate text-xs text-slate-400'>{lead.email}</p>}
                            <div className='mt-1.5 flex items-center justify-between gap-2'>
                              {lead.source ? (
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${SOURCE_STYLES[lead.source] || SOURCE_STYLES.Other}`}>{lead.source}</span>
                              ) : <span />}
                              {!isClosedStatus(lead.status) && (
                                <span className={`text-[11px] font-semibold ${followUpTone(lead.nextFollowUpDate)}`}>{followUpLabel(lead.nextFollowUpDate, lead.nextFollowUpTime)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div className='flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3.5 md:px-5'>
                      <p className='text-xs text-slate-500'>
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leads.length)} of {leads.length} leads
                      </p>
                      <div className='flex items-center gap-1.5'>
                        <button type='button' disabled={page === 1} onClick={() => setPage((p) => p - 1)} className='flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40'>
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
                        </button>
                        {pageNumbers.map((n, i) => (n === '…' ? (
                          <span key={`gap-${i}`} className='flex h-8 w-8 items-center justify-center text-sm text-slate-400'>…</span>
                        ) : (
                          <button
                            key={n}
                            type='button'
                            onClick={() => setPage(n)}
                            className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-medium ${n === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                          >
                            {n}
                          </button>
                        )))}
                        <button type='button' disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className='flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40'>
                          <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' /></svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      {showFilters && (
        <div
          className='fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm'
          onClick={() => setShowFilters(false)}
        >
          {filtersPanel}
        </div>
      )}
      <LeadModals leads={L} />
    </div>
  )
}

export default Leads
