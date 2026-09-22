import { useNavigate } from 'react-router-dom'

const TermsAndConditions = () => {
  const navigate = useNavigate()

  const sections = [
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      border: 'border-blue-100',
      bg: 'from-blue-50/50',
      title: 'Acceptance of Terms',
      content: [
        'By accessing or using BimaOne, you confirm that you are at least 18 years of age or have parental/guardian consent.',
        'By using our services, you agree to be bound by these Terms and Conditions and our Privacy Policy.',
        'If you do not agree to these terms, please discontinue use of the platform immediately.',
        'We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
        </svg>
      ),
      color: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      border: 'border-emerald-100',
      bg: 'from-emerald-50/50',
      title: 'Use of the Platform',
      content: [
        'BimaOne is a vehicle insurance and document management tool for personal and professional use.',
        'You are solely responsible for the accuracy of information you enter into the system.',
        'You may not use the platform to upload unlawful, fraudulent, or misleading information.',
        'You agree not to attempt to gain unauthorized access to our systems, servers, or databases.',
        'You must not use automated tools, bots, or scrapers to extract data from the platform.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/20',
      border: 'border-purple-100',
      bg: 'from-purple-50/50',
      title: 'User Accounts',
      content: [
        'You are responsible for maintaining the confidentiality of your account credentials.',
        'You must notify us immediately of any unauthorized use of your account.',
        'You are responsible for all activities that occur under your account.',
        'We reserve the right to suspend or terminate accounts that violate these terms.',
        'One person or entity may not maintain more than one active account without prior authorization.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
        </svg>
      ),
      color: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/20',
      border: 'border-orange-100',
      bg: 'from-orange-50/50',
      title: 'Intellectual Property',
      content: [
        'All content, design, logos, and software on BimaOne are the intellectual property of BimaOne and its licensors.',
        'You may not copy, reproduce, distribute, or create derivative works without explicit written permission.',
        'The BimaOne name and logo are registered trademarks and may not be used without authorization.',
        'User-submitted data remains your property. By submitting data, you grant us a limited license to process it to provide our services.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' />
        </svg>
      ),
      color: 'from-rose-500 to-rose-600',
      shadow: 'shadow-rose-500/20',
      border: 'border-rose-100',
      bg: 'from-rose-50/50',
      title: 'Limitation of Liability',
      content: [
        'BimaOne is provided "as is" without warranties of any kind, express or implied.',
        'We do not guarantee that the service will be uninterrupted, error-free, or completely secure.',
        'BimaOne is not liable for any direct, indirect, incidental, or consequential damages arising from use of the platform.',
        'Insurance decisions should always be made in consultation with a licensed insurance professional.',
        'We are not responsible for any penalties arising from missed renewals or incorrect data entry.',
      ],
    },
    {
      icon: (
        <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
        </svg>
      ),
      color: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/20',
      border: 'border-indigo-100',
      bg: 'from-indigo-50/50',
      title: 'Governing Law',
      content: [
        'These Terms and Conditions are governed by and construed in accordance with the laws of India.',
        'Any disputes arising from these terms shall be subject to the exclusive jurisdiction of courts in Bhopal, Madhya Pradesh.',
        'Any claims must be brought within one year of the cause of action arising.',
        'If any provision of these terms is found invalid, the remaining provisions continue to be in effect.',
      ],
    },
  ]

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 pb-10 pt-6 md:px-6 lg:px-8'>
      <div className='mx-auto max-w-2xl'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/25'>
              <svg className='h-5 w-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-black text-slate-900'>Terms &amp; Conditions</h1>
              <p className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>BimaOne · Last Updated June 2025</p>
            </div>
          </div>
          <div className='mt-3 flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3'>
            <svg className='h-4 w-4 text-amber-500 shrink-0 mt-0.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
            </svg>
            <p className='text-xs text-amber-700 leading-relaxed font-medium'>
              Please read these Terms and Conditions carefully before using BimaOne. By using our platform, you agree to be bound by these terms.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className='space-y-4'>
          {sections.map((section, i) => (
            <div key={i} className={`rounded-[28px] border ${section.border} bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.2)] overflow-hidden`}>
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${section.border} bg-gradient-to-r ${section.bg} to-white`}>
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shrink-0 shadow-md ${section.shadow}`}>
                  {section.icon}
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-[10px] font-black text-slate-300'>0{i + 1}</span>
                  <h2 className='text-sm font-black text-slate-800'>{section.title}</h2>
                </div>
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

        {/* Agreement Box */}
        <div className='mt-6 rounded-[28px] bg-gradient-to-br from-indigo-600 to-purple-700 p-5 shadow-xl shadow-indigo-500/25'>
          <p className='text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1'>Agreement</p>
          <p className='text-white font-black text-base mb-1'>By using BimaOne, you agree</p>
          <p className='text-indigo-200 text-xs mb-3'>to all the terms and conditions stated above.</p>
          <a
            href='mailto:bimaoneofficial@gmail.com'
            className='inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all'
          >
            <svg className='h-3.5 w-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
            Have a question?
          </a>
        </div>

        <p className='text-center text-[10px] text-slate-400 font-medium mt-6'>
          © 2025 BimaOne. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default TermsAndConditions
