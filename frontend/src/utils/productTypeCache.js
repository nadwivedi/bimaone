/**
 * Product Type Cache & Synchronization Utility
 *
 * Provides optimistic instant UI loads via localStorage caching combined with
 * Stale-While-Revalidate background fetching and cross-tab event broadcasting.
 *
 * Cache key: bimaone_product_types
 * Cache shape: { date: "YYYY-MM-DD", timestamp: 123456789, data: [...productTypes] }
 */

const CACHE_KEY = 'bimaone_product_types'
const EVENT_NAME = 'product_types_updated'
const CHANNEL_NAME = 'bimaone_product_types_channel'

const DEFAULT_FALLBACK_PRODUCTS = [
  { name: 'GCV' }, { name: 'GCV-3W' }, { name: 'Pvt. Car' }, { name: 'Taxi' },
  { name: 'Two Wheeler' }, { name: 'Mis-D' }, { name: 'PCV' }, { name: 'PCV-3W' },
  { name: 'Health' }, { name: 'Life' }, { name: 'Fire' }, { name: 'Burglary' },
  { name: 'WC' }, { name: 'CPM' }, { name: 'Travel' }, { name: 'Marine' },
  { name: 'GPA' }, { name: 'GMC' }, { name: 'CAR' }, { name: 'IAR' },
  { name: 'EAR' }, { name: 'SCHOOL BUS' }, { name: 'LIABILITY' }, { name: 'SECURITY BOND' }
]

const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const broadcastUpdate = (productTypes) => {
  if (typeof window === 'undefined') return

  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: productTypes }))
  } catch {}

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel(CHANNEL_NAME)
      bc.postMessage({ type: EVENT_NAME, data: productTypes })
      bc.close()
    } catch {}
  }
}

const writeCache = (productTypes) => {
  try {
    const currentCached = readCache()
    const isDifferent = JSON.stringify(currentCached?.data) !== JSON.stringify(productTypes)

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ date: todayStr(), timestamp: Date.now(), data: productTypes })
    )

    if (isDifferent) {
      broadcastUpdate(productTypes)
    }
  } catch {}
}

export const refreshProductTypesCache = async (apiUrl) => {
  if (!apiUrl) return getProductTypesSync()
  try {
    const res = await fetch(`${apiUrl}/api/product-types`, {
      credentials: 'include',
    })
    const json = await res.json()
    if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
      writeCache(json.data)
      return json.data
    }
  } catch (err) {
    console.warn('[ProductTypeCache] Fetch failed:', err.message)
  }
  return getProductTypesSync()
}

export const getProductTypes = async (apiUrl, forceFetch = false) => {
  const cached = readCache()
  if (cached && Array.isArray(cached.data) && cached.data.length > 0 && !forceFetch) {
    refreshProductTypesCache(apiUrl).catch(() => {})
    return cached.data
  }
  return refreshProductTypesCache(apiUrl)
}

export const getProductTypesSync = () => {
  const cached = readCache()
  if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
    return cached.data
  }
  return DEFAULT_FALLBACK_PRODUCTS
}

export const invalidateProductTypeCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY)
    broadcastUpdate([])
  } catch {}
}

export const subscribeProductTypes = (callback) => {
  if (typeof window === 'undefined') return () => {}

  const handleCustomEvent = (e) => {
    if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
      callback(e.detail)
    } else {
      callback(getProductTypesSync())
    }
  }

  const handleStorageEvent = (e) => {
    if (e.key === CACHE_KEY) {
      callback(getProductTypesSync())
    }
  }

  window.addEventListener(EVENT_NAME, handleCustomEvent)
  window.addEventListener('storage', handleStorageEvent)

  let bc
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(CHANNEL_NAME)
      bc.onmessage = (e) => {
        if (e.data?.type === EVENT_NAME && Array.isArray(e.data?.data) && e.data.data.length > 0) {
          callback(e.data.data)
        } else {
          callback(getProductTypesSync())
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

const schedulePeriodicRefresh = (apiUrl) => {
  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0)
  const msUntilMidnight = midnight.getTime() - now.getTime()

  setTimeout(async () => {
    if (!apiUrl) return
    try {
      await refreshProductTypesCache(apiUrl)
    } catch {}
    schedulePeriodicRefresh(apiUrl)
  }, msUntilMidnight)
}

export const initProductTypeCache = (apiUrl) => {
  schedulePeriodicRefresh(apiUrl)
}
