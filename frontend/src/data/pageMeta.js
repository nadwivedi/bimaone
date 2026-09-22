// Title and description of the main public pages. Read by the pages at runtime (usePageMeta)
// and by the build step in vite.config.js that writes a static HTML file per page.
// Keep titles under 60 characters and descriptions under 160 so Google shows them in full.

export const PAGE_META = {
  '/': {
    title: 'BimaOne – Insurance Agent & Management Software India',
    description: 'Insurance agent software and insurance management software for Indian agents. Policies, renewals, leads, RTO documents and automated WhatsApp reminders.',
  },
  '/features': {
    title: 'Features – Insurance Management Software | BimaOne',
    description: 'All BimaOne features: policy tracking, renewal alerts, leads, KYC, RTO documents, AI upload, commission tracking and WhatsApp reminders for agents.',
  },
  '/pricing': {
    title: 'Pricing – Insurance Agent Software from ₹899/year | BimaOne',
    description: 'BimaOne insurance agent software plans: Basic ₹899, Standard ₹1,999 and Premium ₹4,999 per year, GST included. WhatsApp reminders in every plan.',
  },
  '/about': {
    title: 'About BimaOne – Insurance Agent Software Since 2020',
    description: 'BimaOne is insurance agent software built in 2020 for Indian insurance agents. Six years of making insurance agents’ work easy.',
  },
  '/contact-us': {
    title: 'Contact BimaOne – Insurance Agent Software Support',
    description: 'Talk to the BimaOne team about our insurance agent software. Reach us on WhatsApp, phone or email — Bhopal, Madhya Pradesh.',
  },
}
