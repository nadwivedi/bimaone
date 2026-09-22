import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PublicLayout from '../components/PublicLayout'
import Icon from '../components/Icon'
import usePageMeta from '../hooks/usePageMeta'
import { PAGE_META } from '../data/pageMeta'
import { SUPPORT_WHATSAPP_URL } from '../data/contact'

const WHATSAPP_NUMBER = '919202469725'

const whatsappIcon = (
  <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
    <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
  </svg>
)

const channels = [
  {
    key: 'phone',
    icon: <Icon name='phone' className='h-5 w-5' />,
    tone: 'bg-brand-soft text-brand',
    label: 'Call us',
    value: '+91 9202469725',
    note: 'Mon–Sat, 9 AM – 6 PM',
    href: 'tel:+919202469725',
    action: 'Call now',
  },
  {
    key: 'email',
    icon: (
      <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
      </svg>
    ),
    tone: 'bg-brand-soft text-brand',
    label: 'Email us',
    value: 'bimaoneofficial@gmail.com',
    note: 'We reply within 24 hours',
    href: 'mailto:bimaoneofficial@gmail.com',
    action: 'Send email',
  },
]

const faqs = [
  {
    q: 'How do I renew my vehicle insurance through BimaOne?',
    a: 'BimaOne sends you renewal reminders. You can manage records in the app, but actual insurance purchase/renewal must be done through a licensed insurer or broker.',
  },
  {
    q: 'Is my data safe on BimaOne?',
    a: 'Yes. We use SSL/TLS encryption and follow strict data security practices. Your data is never sold to third parties. See our Privacy Policy for details.',
  },
  {
    q: 'Can I use BimaOne for multiple vehicles?',
    a: 'Absolutely! BimaOne is designed to manage any number of vehicle records — insurance, tax, PUC, fitness, GPS and more.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Contact us at bimaoneofficial@gmail.com with your registered email and we will process your account deletion within 7 working days.',
  },
]

const socials = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?viewas=100000686899395&id=61590698249898',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
]

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10'

const ContactUs = () => {
  const { user } = useAuth()
  const [copied, setCopied] = useState(null)

  usePageMeta({
    ...PAGE_META['/contact-us'],
    path: '/contact-us',
  })
  const [form, setForm] = useState({ name: '', phone: '', message: '' })

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const sendOnWhatsApp = (e) => {
    e.preventDefault()
    const details = [
      form.name.trim() && `Name: ${form.name.trim()}`,
      form.phone.trim() && `Phone: ${form.phone.trim()}`,
    ].filter(Boolean)
    const lines = ['Hi BimaOne,', form.message.trim(), ...(details.length ? ['', ...details] : [])]
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const content = (
    <div className='font-poppins text-ink'>
      {/* Header */}
      <section className='bg-canvas border-b border-slate-100 px-4 md:px-8 py-14 md:py-20'>
        <div className='mx-auto max-w-3xl text-center'>
          <p className='text-sm font-semibold text-leaf'>Contact us</p>
          <h1 className='mt-3 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.15]'>We're here to help</h1>
          <p className='mt-5 text-base md:text-lg leading-relaxed text-slate-500'>
            Questions about BimaOne, plans or your account? Talk to a real person — we usually reply within a few hours.
          </p>
        </div>
      </section>

      {/* Channels + form */}
      <section className='px-4 md:px-8 py-14 md:py-20'>
        <div className='mx-auto grid max-w-6xl gap-8 lg:grid-cols-5'>
          <div className='space-y-4 lg:col-span-2'>
            <a
              href={SUPPORT_WHATSAPP_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='group flex items-center gap-4 rounded-2xl bg-leaf p-6 text-white transition-colors hover:bg-leaf-dark'
            >
              <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15'>{whatsappIcon}</span>
              <div className='min-w-0 flex-1'>
                <p className='text-sm text-green-50'>Fastest reply</p>
                <p className='text-lg font-semibold'>Chat on WhatsApp</p>
                <p className='text-sm text-green-50'>+91 9202469725</p>
              </div>
              <Icon name='arrow' className='h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1' />
            </a>

            {channels.map((c) => (
              <div key={c.key} className='rounded-2xl border border-slate-200 bg-white p-6'>
                <div className='flex items-start gap-4'>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>{c.icon}</span>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm text-slate-500'>{c.label}</p>
                    <p className='truncate text-base font-semibold'>{c.value}</p>
                    <p className='mt-0.5 text-xs text-slate-400'>{c.note}</p>
                  </div>
                </div>
                <div className='mt-4 flex gap-2'>
                  <a
                    href={c.href}
                    className='flex-1 rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-dark'
                  >
                    {c.action}
                  </a>
                  <button
                    type='button'
                    onClick={() => copy(c.value, c.key)}
                    className='rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400'
                  >
                    {copied === c.key ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}

            <div className='rounded-2xl border border-slate-200 bg-white p-6'>
              <div className='flex items-start gap-4'>
                <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-leaf-soft text-leaf'>
                  <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                  </svg>
                </span>
                <div>
                  <p className='text-sm text-slate-500'>Office</p>
                  <p className='text-base font-semibold'>Bhopal, Madhya Pradesh, India</p>
                  <p className='mt-0.5 text-xs text-slate-400'>Support hours: Mon–Sat, 9 AM – 6 PM IST</p>
                </div>
              </div>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-6 md:p-8 lg:col-span-3'>
            <h2 className='text-xl font-semibold'>Send us a message</h2>
            <p className='mt-1 text-sm text-slate-500'>Fill this in and we'll open WhatsApp with your message ready to send.</p>
            <form onSubmit={sendOnWhatsApp} className='mt-6 space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='block'>
                  <span className='mb-1.5 block text-sm font-medium text-slate-600'>Your name</span>
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder='e.g. Ramesh Kumar'
                  />
                </label>
                <label className='block'>
                  <span className='mb-1.5 block text-sm font-medium text-slate-600'>Mobile number</span>
                  <input
                    type='tel'
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder='10-digit mobile number'
                  />
                </label>
              </div>
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium text-slate-600'>How can we help?</span>
                <textarea
                  required
                  rows={6}
                  className={`${inputCls} resize-none`}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder='Tell us about your question, a plan you are interested in, or an issue you are facing.'
                />
              </label>
              <button
                type='submit'
                className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-leaf px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-leaf-dark sm:w-auto'
              >
                {whatsappIcon}
                Send on WhatsApp
              </button>
            </form>

            <div className='mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6'>
              <span className='text-sm text-slate-500'>Follow us</span>
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand hover:text-brand'
                >
                  <svg className='h-4 w-4' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                    <path d={s.path} />
                  </svg>
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className='bg-canvas px-4 md:px-8 py-14 md:py-20'>
        <div className='mx-auto max-w-3xl'>
          <div className='text-center'>
            <p className='text-sm font-semibold text-leaf'>FAQ</p>
            <h2 className='mt-2 text-2xl md:text-3xl font-semibold tracking-tight'>Frequently asked questions</h2>
          </div>
          <div className='mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white'>
            {faqs.map((f, i) => (
              <details key={f.q} className='group px-6' open={i === 0}>
                <summary className='flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium [&::-webkit-details-marker]:hidden'>
                  {f.q}
                  <svg className='h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-45' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                  </svg>
                </summary>
                <p className='-mt-1 pb-5 text-sm leading-relaxed text-slate-500'>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )

  return user ? <div className='min-h-screen bg-white pb-10 lg:pb-0'>{content}</div> : <PublicLayout>{content}</PublicLayout>
}

export default ContactUs
