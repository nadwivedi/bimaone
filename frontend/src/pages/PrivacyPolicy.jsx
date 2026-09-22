import { useNavigate } from 'react-router-dom'

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  const sections = [
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      border: 'border-blue-100',
      bg: 'from-blue-50/50',
      title: 'Information We Collect',
      content: [
        'Personal Information: Name, email address, mobile number provided during registration.',
        'Vehicle Data: Vehicle registration numbers, owner details, insurance records, tax, PUC, fitness, and GPS information you enter into the app.',
        'Usage Data: Information about how you use BimaOne, including pages visited, features used, and time spent.',
        'Device Information: Browser type, operating system, IP address, and other technical identifiers.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
        </svg>
      ),
      color: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      border: 'border-emerald-100',
      bg: 'from-emerald-50/50',
      title: 'How We Use Your Information',
      content: [
        'To provide, operate, and maintain the BimaOne platform and all its features.',
        'To send renewal reminders and important notifications about your vehicle documents.',
        'To improve our services based on usage patterns and user feedback.',
        'To communicate with you about updates, new features, and support requests.',
        'To comply with legal obligations and enforce our terms of service.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/20',
      border: 'border-purple-100',
      bg: 'from-purple-50/50',
      title: 'Data Security',
      content: [
        'We implement industry-standard encryption (SSL/TLS) to protect your data in transit.',
        'Your data is stored on secure servers with restricted access controls.',
        'We regularly audit our security practices and update them as needed.',
        'We do not sell, trade, or rent your personal information to third parties.',
        'In case of a data breach, we will notify affected users within 72 hours.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
        </svg>
      ),
      color: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/20',
      border: 'border-orange-100',
      bg: 'from-orange-50/50',
      title: 'Data Sharing',
      content: [
        'We do not share your personal data with advertisers or marketing agencies.',
        'We may share data with trusted service providers who help us operate our platform under strict confidentiality agreements.',
        'We may disclose information if required by law, court order, or government authority.',
        'Aggregate, anonymized data (with no personally identifiable information) may be used for analytics.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
        </svg>
      ),
      color: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/20',
      border: 'border-indigo-100',
      bg: 'from-indigo-50/50',
      title: 'Your Rights',
      content: [
        'Access: You can request a copy of the personal data we hold about you at any time.',
        'Correction: You can update or correct your personal information from the Settings page.',
        'Deletion: You can request deletion of your account and associated data by contacting us.',
        'Portability: You can request your data in a portable format for transfer to another service.',
        'Opt-out: You can opt out of non-essential communications at any time.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
        </svg>
      ),
      color: 'from-rose-500 to-rose-600',
      shadow: 'shadow-rose-500/20',
      border: 'border-rose-100',
      bg: 'from-rose-50/50',
      title: 'Data Retention',
      content: [
        'We retain your personal data for as long as your account is active or as needed to provide services.',
        'Vehicle and policy records are retained for as long as required for compliance purposes.',
        'Upon account deletion, personal data is removed within 30 days from active systems.',
        'Backup copies may be retained for up to 90 days before permanent deletion.',
      ],
    },
  ]

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-10 pt-6 md:px-6 lg:px-8'>
      <div className='mx-auto max-w-2xl'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25'>
              <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-black text-slate-900'>Privacy Policy</h1>
              <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>BimaOne · Last Updated June 2025</p>
            </div>
          </div>
          <p className='text-sm text-slate-500 leading-relaxed mt-3'>
            At BimaOne, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information when you use our platform.
          </p>
        </div>

        {/* Sections */}
        <div className='space-y-4'>
          {sections.map((section, i) => (
            <div key={i} className={`rounded-[28px] border ${section.border} bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.2)] overflow-hidden`}>
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${section.border} bg-gradient-to-r ${section.bg} to-white`}>
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shrink-0 shadow-md ${section.shadow}`}>
                  {section.icon}
                </div>
                <h2 className='text-sm font-black text-slate-800'>{section.title}</h2>
              </div>
              <div className='px-5 py-4 space-y-2.5'>
                {section.content.map((point, j) => (
                  <div key={j} className='flex items-start gap-2.5'>
                    <div className='mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0' />
                    <p className='text-xs text-slate-600 leading-relaxed'>{point}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Box */}
        <div className='mt-6 rounded-[28px] bg-gradient-to-br from-blue-600 to-indigo-700 p-5 shadow-xl shadow-blue-500/25'>
          <p className='text-xs font-bold text-blue-100 uppercase tracking-wider mb-1'>Questions about Privacy?</p>
          <p className='text-white font-black text-base mb-3'>We're here to help</p>
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

export default PrivacyPolicy
