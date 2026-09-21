/**
 * Insurance Company Cache & Synchronization Utility
 *
 * Provides optimistic instant UI loads via localStorage caching combined with
 * Stale-While-Revalidate background fetching and cross-tab event broadcasting.
 *
 * Cache key: bimaone_insurance_companies
 * Cache shape: { date: "YYYY-MM-DD", timestamp: 123456789, data: [...companies] }
 */

const CACHE_KEY = 'bimaone_insurance_companies'
const EVENT_NAME = 'insurance_companies_updated'
const CHANNEL_NAME = 'bimaone_insurance_companies_channel'

/** Returns today's date string in YYYY-MM-DD format (local time). */
const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Read cache from localStorage. Returns null if absent or unparseable. */
const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Notify open windows and subscribers that insurance companies changed. */
const broadcastUpdate = (companies) => {
  if (typeof window === 'undefined') return

  // 1. Dispatch custom DOM event in current tab
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: companies }))
  } catch {
    // ignore
  }

  // 2. Broadcast across tabs via BroadcastChannel if available
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel(CHANNEL_NAME)
      bc.postMessage({ type: EVENT_NAME, data: companies })
      bc.close()
    } catch {
      // ignore
    }
  }
}

/** Write a fresh cache entry to localStorage and broadcast event. */
const writeCache = (companies) => {
  try {
    const currentCached = readCache()
    const isDifferent = JSON.stringify(currentCached?.data) !== JSON.stringify(companies)

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ date: todayStr(), timestamp: Date.now(), data: companies })
    )

    if (isDifferent) {
      broadcastUpdate(companies)
    }
  } catch {
    // localStorage may be full or disabled — silently ignore
  }
}

/** Force-fetch companies from the backend, update cache, and broadcast update. */
export const refreshInsuranceCompaniesCache = async (apiUrl) => {
  if (!apiUrl) return getInsuranceCompaniesSync()
  try {
    const res = await fetch(`${apiUrl}/api/insurance-companies`, {
      credentials: 'include',
    })
    const json = await res.json()
    if (json?.success && Array.isArray(json.data)) {
      writeCache(json.data)
      return json.data
    }
  } catch (err) {
    console.warn('[InsuranceCompanyCache] Fetch failed:', err.message)
  }
  return getInsuranceCompaniesSync()
}

/**
 * Returns the insurance companies list.
 *
 * Uses Stale-While-Revalidate:
 * - If cached data exists, returns it immediately for fast UI rendering,
 *   while revalidating in the background to fetch any updates.
 * - If no cache exists or forceFetch is true, awaits fresh data from the server.
 *
 * @param {string} apiUrl Backend base URL
 * @param {boolean} forceFetch Force immediate network fetch
 * @returns {Promise<Array>}
 */
export const getInsuranceCompanies = async (apiUrl, forceFetch = false) => {
  const cached = readCache()
  if (cached && Array.isArray(cached.data) && cached.data.length > 0 && !forceFetch) {
    // Trigger background revalidation asynchronously
    refreshInsuranceCompaniesCache(apiUrl).catch(() => {})
    return cached.data
  }
  return refreshInsuranceCompaniesCache(apiUrl)
}

/**
 * Returns the cached list synchronously (returns [] if empty or uninitialized).
 */
export const getInsuranceCompaniesSync = () => {
  const cached = readCache()
  if (cached && Array.isArray(cached.data)) {
    return cached.data
  }
  return []
}

/**
 * Invalidate local cache explicitly.
 */
export const invalidateInsuranceCompanyCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY)
    broadcastUpdate([])
  } catch {}
}

/**
 * Subscribe to real-time updates when the insurance company list is updated.
 *
 * @param {Function} callback Called with fresh companies list when updated
 * @returns {Function} Unsubscribe function
 */
export const subscribeInsuranceCompanies = (callback) => {
  if (typeof window === 'undefined') return () => {}

  const handleCustomEvent = (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      callback(e.detail)
    } else {
      callback(getInsuranceCompaniesSync())
    }
  }

  const handleStorageEvent = (e) => {
    if (e.key === CACHE_KEY) {
      callback(getInsuranceCompaniesSync())
    }
  }

  window.addEventListener(EVENT_NAME, handleCustomEvent)
  window.addEventListener('storage', handleStorageEvent)

  let bc
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(CHANNEL_NAME)
      bc.onmessage = (e) => {
        if (e.data?.type === EVENT_NAME && Array.isArray(e.data?.data)) {
          callback(e.data.data)
        } else {
          callback(getInsuranceCompaniesSync())
        }
      }
    } catch {}
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent)
    window.removeEventListener('storage', handleStorageEvent)
    if (bc) {
      try { bc.close() } catch {}
    }
  }
}

/**
 * Schedule a periodic cache refresh.
 * Keeps cache up to date automatically.
 */
const schedulePeriodicRefresh = (apiUrl) => {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0)
  const msUntilMidnight = midnight.getTime() - now.getTime()

  setTimeout(async () => {
    if (!apiUrl) return
    try {
      await refreshInsuranceCompaniesCache(apiUrl)
    } catch {}
    schedulePeriodicRefresh(apiUrl)
  }, msUntilMidnight)
}

export const initInsuranceCompanyCache = (apiUrl) => {
  schedulePeriodicRefresh(apiUrl)
}
