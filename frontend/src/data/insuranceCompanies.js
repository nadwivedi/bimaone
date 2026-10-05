// IRDAI-registered insurers operating in India (verified Sep 2026).
// Hardcoded on purpose — used for simple pick-lists that don't need the DB-backed company records.
// Names use current brands (e.g. Bajaj Allianz → Bajaj General, Future Generali → Generali Central).

export const GENERAL_INSURERS = [
  'Acko General Insurance',
  'Bajaj General Insurance',
  'Cholamandalam MS General Insurance',
  'Generali Central Insurance',
  'Go Digit General Insurance',
  'HDFC ERGO General Insurance',
  'ICICI Lombard General Insurance',
  'IFFCO Tokio General Insurance',
  'Kiwi General Insurance',
  'Kshema General Insurance',
  'Liberty General Insurance',
  'Magma General Insurance',
  'National Insurance Company',
  'Navi General Insurance',
  'New India Assurance',
  'Oriental Insurance Company',
  'ProTec General Insurance',
  'Raheja QBE General Insurance',
  'Reliance General Insurance',
  'Royal Sundaram General Insurance',
  'SBI General Insurance',
  'Shriram General Insurance',
  'Tata AIG General Insurance',
  'United India Insurance',
  'Universal Sompo General Insurance',
  'Zuno General Insurance',
  'Zurich Kotak General Insurance',
]

export const HEALTH_INSURERS = [
  'Aditya Birla Health Insurance',
  'Care Health Insurance',
  'Galaxy Health Insurance',
  'ManipalCigna Health Insurance',
  'Narayana Health Insurance',
  'Niva Bupa Health Insurance',
  'Prudential HCL Health Insurance',
  'Star Health and Allied Insurance',
]

export const LIFE_INSURERS = [
  'Acko Life Insurance',
  'Aditya Birla Sun Life Insurance',
  'Ageas Federal Life Insurance',
  'Aviva Life Insurance',
  'Axis Max Life Insurance',
  'Bajaj Life Insurance',
  'Bandhan Life Insurance',
  'Bharti AXA Life Insurance',
  'Canara HSBC Life Insurance',
  'CreditAccess Life Insurance',
  'Edelweiss Life Insurance',
  'Generali Central Life Insurance',
  'Go Digit Life Insurance',
  'HDFC Life Insurance',
  'ICICI Prudential Life Insurance',
  'IndiaFirst Life Insurance',
  'Kotak Mahindra Life Insurance',
  'LIC (Life Insurance Corporation of India)',
  'PNB MetLife India Insurance',
  'Pramerica Life Insurance',
  'Reliance Nippon Life Insurance',
  'Sahara India Life Insurance',
  'SBI Life Insurance',
  'Shriram Life Insurance',
  'Star Union Dai-ichi Life Insurance',
  'Tata AIA Life Insurance',
]

export const SPECIALISED_INSURERS = [
  'Agriculture Insurance Company of India',
  'ECGC Limited',
]

const GROUPS = {
  general: { label: 'General Insurers', items: GENERAL_INSURERS },
  health: { label: 'Standalone Health Insurers', items: HEALTH_INSURERS },
  life: { label: 'Life Insurers', items: LIFE_INSURERS },
  specialised: { label: 'Specialised Insurers', items: SPECIALISED_INSURERS },
}

// Motor → general insurers only; Health → health + general (both sell health); Life → life only; Other → everything.
const GROUP_ORDER = {
  Motor: ['general'],
  Health: ['health', 'general'],
  Life: ['life'],
  Other: ['general', 'health', 'life', 'specialised'],
}

export const insurerGroupsFor = (insuranceType) =>
  (GROUP_ORDER[insuranceType] || GROUP_ORDER.Other).map((key) => GROUPS[key])
