// Which documents get automatic WhatsApp reminders, and when. One rule per document type.
const WHATSAPP_ALERT_SERVICES = [
  { key: 'insurance', label: 'Insurance' },
  { key: 'tax', label: 'Road Tax' },
  { key: 'puc', label: 'PUC' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'gps', label: 'GPS' },
]

const DEFAULT_RULES = {
  insurance: { beforeDays: [15, 7] },
}

const baseRule = (key) => ({
  enabled: true,
  beforeDays: DEFAULT_RULES[key]?.beforeDays || [7],
  sendOnExpiryDay: true,
  sendAfterExpiry: false,
  afterDays: [7],
  customMessage: '',
})

const normalizeDays = (value, fallback) => {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',').map((v) => v.trim())
  const days = [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 365))]
  return (days.length ? days : [...fallback]).sort((a, b) => a - b)
}

const normalizeRule = (key, rule = {}) => {
  const base = baseRule(key)
  return {
    enabled: rule.enabled !== undefined ? rule.enabled !== false : base.enabled,
    beforeDays: normalizeDays(rule.beforeDays, base.beforeDays),
    sendOnExpiryDay: rule.sendOnExpiryDay !== undefined ? rule.sendOnExpiryDay === true : base.sendOnExpiryDay,
    sendAfterExpiry: rule.sendAfterExpiry !== undefined ? rule.sendAfterExpiry === true : base.sendAfterExpiry,
    afterDays: normalizeDays(rule.afterDays, base.afterDays),
    customMessage: typeof rule.customMessage === 'string' ? rule.customMessage.slice(0, 1500) : '',
  }
}

const normalizeAlertSettings = (setting = {}) => {
  const rules = setting.alertRules || {}
  const alertRules = {}
  for (const s of WHATSAPP_ALERT_SERVICES) alertRules[s.key] = normalizeRule(s.key, rules[s.key])
  return { ...setting, alertRules, services: WHATSAPP_ALERT_SERVICES }
}

module.exports = { WHATSAPP_ALERT_SERVICES, normalizeAlertSettings }
