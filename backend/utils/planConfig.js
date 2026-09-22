// Static backend plan definitions used ONLY for server-side enforcement and
// payment. Plan details (pricing, features, limits) are managed in the
// frontend config (frontend/src/config/plansConfig.js). This map must be kept
// in sync with that config for enforcement/expiry/price validation.
const BACKEND_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    durationDays: 365,
    features: {
      aiDocuments: 20,
      manualDocuments: 20,
      desktopAccess: true,
      mobileAppAccess: true,
      excelDownload: false,
      clientLimit: 20,
      appNotificationRenewal: true,
      whatsappRenewal: false,
      customizedPolicyDownload: false,
      personalisedQuotation: false,
      processingSpeed: 'Standard',
      support: 'Standard',
    },
  },
  go: {
    name: 'Go',
    price: 99,
    durationDays: 90,
    features: {
      aiDocuments: 50,
      manualDocuments: 50,
      desktopAccess: true,
      mobileAppAccess: true,
      excelDownload: true,
      clientLimit: 50,
      appNotificationRenewal: true,
      whatsappRenewal: false,
      customizedPolicyDownload: false,
      personalisedQuotation: false,
      processingSpeed: 'Fast',
      support: 'Standard',
    },
  },
  plus: {
    name: 'Plus',
    price: 199,
    durationDays: 90,
    features: {
      aiDocuments: 200,
      manualDocuments: 200,
      desktopAccess: true,
      mobileAppAccess: true,
      excelDownload: true,
      clientLimit: 200,
      appNotificationRenewal: true,
      whatsappRenewal: true,
      customizedPolicyDownload: true,
      personalisedQuotation: true,
      processingSpeed: 'Accelerated',
      support: 'Priority',
    },
  },
  pro: {
    name: 'Pro',
    price: 499,
    durationDays: 90,
    features: {
      aiDocuments: 500,
      manualDocuments: 500,
      desktopAccess: true,
      mobileAppAccess: true,
      excelDownload: true,
      clientLimit: 0,
      appNotificationRenewal: true,
      whatsappRenewal: true,
      customizedPolicyDownload: true,
      personalisedQuotation: true,
      processingSpeed: 'Highest',
      support: 'Priority',
    },
  },
  // Current yearly plans. Go/Plus/Pro above are legacy and kept only so
  // existing subscribers keep resolving until they renew.
  basic: {
    name: 'Basic',
    price: 899,
    billing: 'yearly',
    durationDays: 365,
    features: {
      aiUpload: false,
      aiDocuments: 0,
      manualDocuments: 0,
      desktopAccess: true,
      mobileAppAccess: true,
      excelDownload: true,
      clientLimit: 0,
      appNotificationRenewal: true,
      whatsappRenewal: true,
      customizedPolicyDownload: true,
      personalisedQuotation: true,
      clientApp: true,
      leadManagement: false,
      advancedVehicleSearch: false,
      rcDownload: false,
      processingSpeed: 'Standard',
      support: 'Standard',
    },
  },
  standard: {
    name: 'Standard',
    price: 1999,
    billing: 'yearly',
    durationDays: 365,
    features: {
      aiUpload: true,
      aiDocuments: 200,
      manualDocuments: 0,
      desktopAccess: true,
      mobileAppAccess: true,
      excelDownload: true,
      clientLimit: 0,
      appNotificationRenewal: true,
      whatsappRenewal: true,
      customizedPolicyDownload: true,
      personalisedQuotation: true,
      clientApp: true,
      leadManagement: true,
      advancedVehicleSearch: false,
      rcDownload: false,
      processingSpeed: 'Fast',
      support: 'Priority',
    },
  },
  premium: {
    name: 'Premium',
    price: 4999,
    billing: 'yearly',
    durationDays: 365,
    features: {
      aiUpload: true,
      aiDocuments: 0,
      manualDocuments: 0,
      desktopAccess: true,
      mobileAppAccess: true,
      excelDownload: true,
      clientLimit: 0,
      appNotificationRenewal: true,
      whatsappRenewal: true,
      customizedPolicyDownload: true,
      personalisedQuotation: true,
      clientApp: true,
      leadManagement: true,
      advancedVehicleSearch: true,
      rcDownload: true,
      processingSpeed: 'Highest',
      support: 'Priority',
    },
  },
}

const getPlan = (planKey) => (planKey && BACKEND_PLANS[planKey]) || null

const isYearlyPlan = (plan) => plan?.billing === 'yearly'

const ALLOWED_DURATIONS = [3, 6, 9, 12]
const MONTHS_TO_DAYS = 30
const ANNUAL_DISCOUNT = 0.1

// User-selectable subscription durations (months). 12-month (1 year) plans get
// a 10% discount.
const isAllowedDuration = (months) => ALLOWED_DURATIONS.includes(Number(months))

const computePlanPricePaise = (planKey, months) => {
  const plan = getPlan(planKey)
  if (!plan) return 0
  if (isYearlyPlan(plan)) return Math.round(plan.price * 100)
  const m = Number(months) || 3
  const base = plan.price || 0
  const gross = base * (m / 3)
  const net = m === 12 ? gross * (1 - ANNUAL_DISCOUNT) : gross
  return Math.round(net * 100)
}

const computePlanDurationDays = (months) => {
  const m = Number(months) || 3
  return m * MONTHS_TO_DAYS
}

module.exports = {
  BACKEND_PLANS,
  getPlan,
  isYearlyPlan,
  ALLOWED_DURATIONS,
  isAllowedDuration,
  computePlanPricePaise,
  computePlanDurationDays,
}
