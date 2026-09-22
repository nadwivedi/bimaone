import PublicLayout from '../components/PublicLayout'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'
import { featureGroups, TONES, GROUP_TONES } from '../data/features'
import usePageMeta from '../hooks/usePageMeta'
import { PAGE_META } from '../data/pageMeta'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const faqs = [
  {
    q: 'Does BimaOne work for health and life insurance?',
    a: 'Yes. BimaOne works for every line of insurance an agent sells — motor (private car, two wheeler, commercial vehicles, taxi), health, life, travel, fire, marine, GPA, GMC, liability and more. Track all of them in one insurance CRM with their own renewal dates.',
  },
  {
    q: 'Can I send WhatsApp renewal reminders automatically?',
    a: 'Yes. Connect your own WhatsApp once by scanning a QR code, and BimaOne sends renewal reminders to your clients before their policy, PUC, tax, fitness or GPS expires. You choose the days (for example 15 and 7 days before), see every message that was sent or failed, and it is included in every plan.',
  },
  {
    q: 'Can I import my Excel data?',
    a: 'You can export any list — policies, renewals or RTO documents — to Excel at any time. To move your existing Excel records into BimaOne, send us your sheet on WhatsApp and our team will help you bring it in. New policies can also be added in seconds with AI upload.',
  },
  {
    q: 'Is my client data secure?',
    a: 'Yes. Your clients, policies and documents are private to your account — no other agent can see them — and all data travels over a secure HTTPS connection. We never sell or share your client data.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'Yes. BimaOne works in the browser on any Android phone, iPhone, tablet or computer, so you can check renewals and client details wherever you meet clients. Nothing needs to be installed.',
  },
  {
    q: 'Is BimaOne suitable for POSP agents and agencies?',
    a: 'Yes. BimaOne is insurance agency management software for individual agents, POSP agents and small agencies. It works with policies from any insurer, and you can tag every policy with a client name and agent (IMD) name to keep your business organised.',
  },
]

const FEATURES_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

const Features = () => {
  const total = featureGroups.reduce((n, g) => n + g.features.length, 0)

  usePageMeta({
    ...PAGE_META['/features'],
    path: '/features',
    jsonLd: FEATURES_JSON_LD,
  })

  return (
    <PublicLayout>
      <div className='bg-slate-50'>
        {/* Header */}
        <section className='relative overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 pb-20 pt-12 text-white md:px-8 md:pb-24 md:pt-16'>
          <div className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl' />
          <div className='relative mx-auto max-w-3xl text-center'>
            <span className='inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>
              {total}+ features
            </span>
            <h1 className='mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl'>Insurance management software with everything an agent needs</h1>
            <p className='mt-4 text-sm leading-relaxed text-slate-300 md:text-lg'>
              The complete <strong className='font-semibold text-white'>insurance agent software</strong> and <strong className='font-semibold text-white'>insurance agency management software</strong> to manage policies, clients, vehicle documents and renewals — without the paperwork.
            </p>
          </div>
        </section>

        {/* Category jump cards, overlapping the header */}
        <section className='relative z-10 -mt-12 px-4 md:px-8'>
          <div className='mx-auto grid max-w-6xl grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4'>
            {featureGroups.map((g, gi) => {
              const t = TONES[GROUP_TONES[gi % GROUP_TONES.length]]
              return (
                <a
                  key={g.title}
                  href={`#${slug(g.title)}`}
                  className={`rounded-xl border-2 bg-gradient-to-r p-3 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 md:p-4 ${t.card}`}
                >
                  <div className='flex items-center gap-3'>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:h-10 md:w-10 ${t.icon}`}>{gi + 1}</span>
                    <div className='min-w-0'>
                      <p className='text-sm font-bold leading-tight text-slate-900'>{g.title}</p>
                      <p className={`text-xs font-semibold ${t.text}`}>{g.features.length} features</p>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </section>

        {/* Groups */}
        <div className='px-4 py-12 md:px-8 md:py-16'>
          <div className='mx-auto max-w-6xl space-y-6 md:space-y-8'>
            {featureGroups.map((group, gi) => {
              const t = TONES[GROUP_TONES[gi % GROUP_TONES.length]]
              return (
                <section
                  key={group.title}
                  id={slug(group.title)}
                  className={`scroll-mt-24 rounded-2xl border-2 bg-gradient-to-r p-4 md:p-8 ${t.card}`}
                >
                  <div className='mb-5 flex items-start gap-3 md:mb-6'>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:h-10 md:w-10 ${t.icon}`}>{gi + 1}</span>
                    <div>
                      <h2 className='text-xl font-bold text-slate-900 md:text-2xl'>{group.heading || group.title}</h2>
                      <p className='mt-1 text-sm text-slate-600'>{group.description}</p>
                    </div>
                  </div>
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4'>
                    {group.features.map((f) => (
                      <div key={f.title} className='rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md md:p-5'>
                        <div className='flex items-start gap-3'>
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${t.icon}`}>
                            <Icon name={f.icon} className='h-5 w-5' />
                          </span>
                          <div className='min-w-0'>
                            <h3 className='text-sm font-bold text-slate-900 md:text-base'>{f.title}</h3>
                            <p className='mt-1 text-xs leading-relaxed text-slate-500 md:text-sm'>{f.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {/* FAQ */}
        <section className='px-4 pb-12 md:px-8 md:pb-16'>
          <div className='mx-auto max-w-3xl'>
            <div className='mb-6 text-center md:mb-8'>
              <span className='inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200'>FAQ</span>
              <h2 className='mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl'>Questions about BimaOne features</h2>
            </div>
            <div className='divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200'>
              {faqs.map((f, i) => (
                <details key={f.q} className='group px-5 md:px-6' open={i === 0}>
                  <summary className='flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left [&::-webkit-details-marker]:hidden'>
                    <h3 className='text-sm font-semibold text-slate-900 md:text-base'>{f.q}</h3>
                    <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-transform group-open:rotate-45'>
                      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 4v16m8-8H4' />
                      </svg>
                    </span>
                  </summary>
                  <p className='-mt-1 pb-4 text-sm leading-relaxed text-slate-600'>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <CtaBanner />
      </div>
    </PublicLayout>
  )
}

export default Features
