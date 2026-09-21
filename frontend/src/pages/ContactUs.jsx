import { useState } from 'react'

const ContactUs = () => {
  const [copiedItem, setCopiedItem] = useState(null)

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(key)
      setTimeout(() => setCopiedItem(null), 2000)
    })
  }

  const contactMethods = [
    {
      key: 'email',
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      hoverBorder: 'hover:border-blue-200',
      hoverBg: 'hover:from-blue-50/50',
      hoverText: 'group-hover:text-blue-700',
      label: 'Email Us',
      sublabel: 'We reply within 24 hours',
      value: 'mybimabox@gmail.com',
      href: 'mailto:mybimabox@gmail.com',
      action: 'Send Email',
      copyable: true,
    },
    {
      key: 'phone',
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
        </svg>
      ),
      color: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      hoverBorder: 'hover:border-emerald-200',
      hoverBg: 'hover:from-emerald-50/50',
      hoverText: 'group-hover:text-emerald-700',
      label: 'Call Us',
      sublabel: 'Mon–Sat, 9 AM – 6 PM',
      value: '+91 7004534508',
      href: 'tel:+917004534508',
      action: 'Call Now',
      copyable: true,
    },
    {
      key: 'whatsapp',
      icon: (
        <svg className='h-5 w-5 text-white' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      shadow: 'shadow-green-500/20',
      hoverBorder: 'hover:border-green-200',
      hoverBg: 'hover:from-green-50/50',
      hoverText: 'group-hover:text-green-700',
      label: 'WhatsApp',
      sublabel: 'Quick chat support',
      value: '+91 7004534508',
      href: 'https://wa.me/917004534508',
      action: 'Chat Now',
      copyable: false,
      external: true,
    },
  ]

  const socialLinks = [
    {
      key: 'instagram',
      href: 'https://www.instagram.com/bimabox.in/',
      label: 'Instagram',
      color: 'hover:border-pink-200 hover:from-pink-50 hover:text-pink-600 hover:shadow-pink-500/15',
      icon: (
        <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' />
        </svg>
      ),
    },
    {
      key: 'facebook',
      href: 'https://www.facebook.com/profile.php?viewas=100000686899395&id=61590698249898',
      label: 'Facebook',
      color: 'hover:border-blue-200 hover:from-blue-50 hover:text-blue-600 hover:shadow-blue-500/15',
      icon: (
        <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
        </svg>
      ),
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
      a: 'Contact us at mybimabox@gmail.com with your registered email and we will process your account deletion within 7 working days.',
    },
  ]

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-32 pt-6 md:px-6 lg:px-8'>
      <div className='mx-auto max-w-2xl'>

        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25'>
              <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-black text-slate-900'>Contact Us</h1>
              <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>BimaOne Support Team</p>
            </div>
          </div>
          <p className='text-sm text-slate-500 leading-relaxed mt-3'>
            Have a question, feedback, or need help? We'd love to hear from you. Reach out through any of the channels below.
          </p>
        </div>

        {/* Contact Methods */}
        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='h-1.5 w-1.5 rounded-full bg-slate-300' />
            <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Reach Out</p>
          </div>
          <div className='space-y-3'>
            {contactMethods.map((method) => (
              <div key={method.key} className={`group rounded-[24px] border border-slate-100 bg-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.18)] overflow-hidden ${method.hoverBorder} bg-gradient-to-r from-white hover:${method.hoverBg} to-white transition-all duration-200`}>
                <div className='flex items-center gap-4 px-5 py-4'>
                  <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${method.color} flex items-center justify-center shrink-0 shadow-md ${method.shadow}`}>
                    {method.icon}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-[9px] font-bold uppercase tracking-wider text-slate-400'>{method.label}</p>
                    <p className={`text-sm font-bold text-slate-900 ${method.hoverText} transition-colors truncate`}>{method.value}</p>
                    <p className='text-[9px] text-slate-400 font-medium mt-0.5'>{method.sublabel}</p>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    {method.copyable && (
                      <button
                        onClick={() => handleCopy(method.value, method.key)}
                        className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all cursor-pointer'
                        title='Copy'
                      >
                        {copiedItem === method.key ? (
                          <>
                            <svg className='h-3 w-3 text-emerald-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                            </svg>
                            <span className='text-emerald-600'>Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    )}
                    <a
                      href={method.href}
                      target={method.external ? '_blank' : undefined}
                      rel={method.external ? 'noopener noreferrer' : undefined}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r ${method.color} text-white text-[10px] font-bold shadow-sm transition-all hover:shadow-md cursor-pointer`}
                    >
                      {method.action}
                      <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Office Info */}
        <div className='mb-6 rounded-[28px] border border-slate-100 bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.2)] overflow-hidden'>
          <div className='flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white'>
            <div className='h-9 w-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 shadow-md shadow-slate-500/20'>
              <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
              </svg>
            </div>
            <h2 className='text-sm font-black text-slate-800'>Our Location</h2>
          </div>
          <div className='px-5 py-4'>
            <p className='text-sm font-bold text-slate-800'>BimaOne</p>
            <p className='text-xs text-slate-500 mt-1 leading-relaxed'>Raipur, Chhattisgarh, India</p>
            <div className='flex items-center gap-2 mt-3'>
              <div className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
              <p className='text-[9px] font-bold text-emerald-600 uppercase tracking-wider'>Support Hours: Mon–Sat, 9 AM – 6 PM IST</p>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='h-1.5 w-1.5 rounded-full bg-slate-300' />
            <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Follow Us</p>
          </div>
          <div className='flex gap-3'>
            {socialLinks.map((social) => (
              <a
                key={social.key}
                href={social.href}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={social.label}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-500 shadow-sm hover:shadow-lg transition-all duration-200 active:scale-95 ${social.color}`}
              >
                {social.icon}
                <span className='text-xs font-bold'>{social.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-3'>
            <div className='h-1.5 w-1.5 rounded-full bg-slate-300' />
            <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Frequently Asked Questions</p>
          </div>
          <div className='space-y-3'>
            {faqs.map((faq, i) => (
              <div key={i} className='rounded-[24px] border border-slate-100 bg-white shadow-[0_12px_32px_-20px_rgba(15,23,42,0.15)] overflow-hidden'>
                <div className='px-5 py-4'>
                  <div className='flex items-start gap-3'>
                    <div className='h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20 mt-0.5'>
                      <span className='text-[9px] font-black text-white'>Q</span>
                    </div>
                    <p className='text-xs font-bold text-slate-800 leading-relaxed'>{faq.q}</p>
                  </div>
                  <div className='flex items-start gap-3 mt-3'>
                    <div className='h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20 mt-0.5'>
                      <span className='text-[9px] font-black text-white'>A</span>
                    </div>
                    <p className='text-xs text-slate-500 leading-relaxed'>{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className='rounded-[28px] bg-gradient-to-br from-rose-500 to-pink-600 p-5 shadow-xl shadow-rose-500/25'>
          <p className='text-xs font-bold text-rose-100 uppercase tracking-wider mb-1'>Still need help?</p>
          <p className='text-white font-black text-base mb-3'>Drop us a message anytime</p>
          <a
            href='mailto:mybimabox@gmail.com'
            className='inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all'
          >
            <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
            </svg>
            mybimabox@gmail.com
          </a>
        </div>

        <p className='text-center text-[10px] text-slate-400 font-medium mt-6'>
          © 2025 BimaOne. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default ContactUs
