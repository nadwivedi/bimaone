export const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

// Local calendar date as YYYY-MM-DD (the backend compares follow-up dates against this).
export const toISODate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export const todayISO = () => toISODate(new Date())
export const addDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toISODate(d)
}
export const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}
export const daysFromToday = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}
export const formatTime = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}
export const followUpLabel = (iso, time) => {
  const diff = daysFromToday(iso)
  if (diff === null) return 'No follow-up'
  const at = time ? ` · ${formatTime(time)}` : ''
  if (diff === 0) return `Today${at}`
  if (diff === 1) return `Tomorrow${at}`
  if (diff === -1) return `Yesterday${at}`
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  return `${formatDate(iso)}${at}`
}
// Tailwind text colour for a follow-up date: overdue, today, later, none.
export const followUpTone = (iso) => {
  const diff = daysFromToday(iso)
  if (diff === null) return 'text-stone-400'
  if (diff < 0) return 'text-orange-600'
  if (diff === 0) return 'text-violet-700'
  return 'text-stone-600'
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

export const ICON_PATHS = {
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  plus: 'M12 4v16m8-8H4',
  arrow: 'M13 7l5 5m0 0l-5 5m5-5H6',
  check: 'M5 13l4 4L19 7',
  minus: 'M18 12H6',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  close: 'M6 18L18 6M6 6l12 12',
  phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  edit: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  chevron: 'M9 5l7 7-7 7',
}

export const BUCKETS = [
  { key: 'today', label: 'Today', long: 'Follow-up Today', icon: ICON_PATHS.calendar, chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { key: 'overdue', label: 'Overdue', long: 'Overdue', icon: ICON_PATHS.clock, chip: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { key: 'new', label: 'New', long: 'New Leads', icon: ICON_PATHS.plus, chip: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  { key: 'upcoming', label: 'Upcoming', long: 'Upcoming', icon: ICON_PATHS.arrow, chip: 'bg-stone-200 text-stone-700', dot: 'bg-stone-400' },
  { key: 'converted', label: 'Converted', long: 'Converted', icon: ICON_PATHS.check, chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'lost', label: 'Lost', long: 'Lost', icon: ICON_PATHS.minus, chip: 'bg-stone-200 text-stone-600', dot: 'bg-stone-300' },
]

export const INSURANCE_TYPES = [
  { value: 'Motor', icon: '🚗', cls: 'bg-blue-50 text-blue-700' },
  { value: 'Health', icon: '🩺', cls: 'bg-rose-50 text-rose-700' },
  { value: 'Life', icon: '🛡️', cls: 'bg-teal-50 text-teal-700' },
  { value: 'Other', icon: '📄', cls: 'bg-stone-100 text-stone-700' },
]
export const typeInfo = (value) => INSURANCE_TYPES.find((t) => t.value === value) || INSURANCE_TYPES[3]

export const LEAD_STATUSES = [
  { value: 'new', label: 'New', short: 'New', cls: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  { value: 'in_progress', label: 'In Progress', short: 'In Progress', cls: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  { value: 'call_back', label: 'Call Back', short: 'Call Back', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  { value: 'not_connected', label: 'Not Connected', short: 'Not Connected', cls: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  { value: 'waiting_quotation', label: 'Waiting for Quotation', short: 'Waiting Quote', cls: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', dot: 'bg-fuchsia-500' },
  { value: 'quotation_sent', label: 'Quotation Sent', short: 'Quote Sent', cls: 'bg-teal-50 text-teal-700 ring-teal-200', dot: 'bg-teal-500' },
  { value: 'converted', label: 'Converted', short: 'Converted', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  { value: 'lost', label: 'Lost – Not Interested', short: 'Lost', cls: 'bg-stone-100 text-stone-600 ring-stone-200', dot: 'bg-stone-400' },
]
export const statusInfo = (value) =>
  LEAD_STATUSES.find((st) => st.value === value) || (value === 'follow_up' ? LEAD_STATUSES[1] : LEAD_STATUSES[0])
export const isClosedStatus = (value) => value === 'converted' || value === 'lost'
// Legacy 'follow_up' leads behave as 'in_progress'.
export const normalizeStatus = (value) => (value === 'follow_up' ? 'in_progress' : value || 'new')

export const SOURCES = ['Walk-in', 'Referral', 'Phone Call', 'WhatsApp', 'Social Media', 'Existing Customer', 'Other']
export const LOST_REASONS = ['Price too high', 'Bought elsewhere', 'Not interested', 'Not reachable', 'Vehicle sold', 'Other']
export const PRIORITIES = [
  { value: 'hot', label: '🔥 Hot', cls: 'bg-rose-50 text-rose-600 ring-rose-200' },
  { value: 'warm', label: '☀️ Warm', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { value: 'cold', label: '❄️ Cold', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
]
export const priorityInfo = (value) => PRIORITIES.find((p) => p.value === value) || PRIORITIES[1]

export const EMPTY_FORM = {
  name: '', mobile: '', email: '', city: '', vehicleNumber: '', insuranceType: 'Motor',
  hasExistingPolicy: false, currentInsurer: '', policyExpiryDate: '',
  expectedPremium: '', source: '', priority: 'warm', status: 'new', notes: '', nextFollowUpDate: '', nextFollowUpTime: '',
}
export const EMPTY_FILTERS = { type: '', status: '', priority: '', source: '', createdFrom: '', createdTo: '' }

export const inputCls = 'w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-sm text-stone-900 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/10 transition-all'
export const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-stone-500'

// Pressing Enter in a text/select field jumps to the next field (textareas keep Enter for new lines).
// On the last field it runs onLast (e.g. save).
export const focusNextOnEnter = (onLast) => (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return
  const t = e.target
  if (!['INPUT', 'SELECT'].includes(t.tagName)) return
  e.preventDefault()
  const fields = Array.from(e.currentTarget.querySelectorAll('input, select, textarea'))
    .filter((el) => !el.disabled && el.type !== 'hidden' && el.offsetParent !== null)
  const next = fields[fields.indexOf(t) + 1]
  if (next) next.focus()
  else if (onLast) onLast()
}
