import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navIcons = {
  home: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' />
    </svg>
  ),
  search: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
    </svg>
  ),
  kyc: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2' />
    </svg>
  ),
  reference: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
    </svg>
  ),
  client: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4.418 0-8 2.239-8 5v1a1 1 0 001 1h14a1 1 0 001-1v-1c0-2.761-3.582-5-8-5z' />
    </svg>
  ),
  agent: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 7a2 2 0 012-2h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z' />
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 5V4a1 1 0 011-1h6a1 1 0 011 1v1M12 13a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM8.5 17c.5-1.5 1.941-2.5 3.5-2.5s3 1 3.5 2.5' />
    </svg>
  ),
  premium: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
    </svg>
  ),
  renewal: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
    </svg>
  ),
  leads: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' />
    </svg>
  ),
  rc: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 17h14M5 17a2 2 0 01-2-2v-3l2-5a2 2 0 011.9-1.4h10.2A2 2 0 0119 7l2 5v3a2 2 0 01-2 2M5 17v2m14-2v2M3 12h18M7.5 14.5h.01M16.5 14.5h.01' />
    </svg>
  ),
  rto: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
    </svg>
  ),
  settings: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
    </svg>
  ),
  referral: (
    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
    </svg>
  ),
}

const navSections = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: navIcons.home },
      { name: 'Search', path: '/search', icon: navIcons.search },
      { name: 'Renewals', path: '/renewals', icon: navIcons.renewal },
      { name: 'Leads', path: '/leads', icon: navIcons.leads },
    ],
  },
  {
    title: 'Tools',
    items: [
      { name: 'RC Details', path: '/rc-details', icon: navIcons.rc },
      { name: 'Premium Calculator', path: '/premium-calculator', icon: navIcons.premium },
    ],
  },
  {
    title: 'Manage',
    items: [
      { name: 'Client Name', path: '/client-name', icon: navIcons.client },
      { name: 'Agent Name', path: '/agent-name', icon: navIcons.agent },
      // { name: 'Refer & Earn', path: '/refer-and-earn', icon: navIcons.referral },
    ],
  },
  {
    title: 'Other Documents',
    items: [
      { name: 'RTO Documents', path: '/rto-documents', icon: navIcons.rto },
      { name: 'KYC', path: '/kyc', icon: navIcons.kyc },
    ],
  },
]

const NavLink = ({ item, isActive }) => (
  <Link
    to={item.path}
    className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
  >
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive
          ? 'bg-white/20 text-white'
          : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-600'
        }`}
    >
      {item.icon}
    </span>
    <span className='truncate'>{item.name}</span>
  </Link>
)

const Sidebar = ({ mobileOpen = false, onClose }) => {
  const location = useLocation()
  const isActivePath = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)

  useEffect(() => {
    onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen, onClose])

  const content = (
    <div className='relative flex h-full flex-col'>
      <div className='flex-none px-4 pb-4 pt-5'>
        <div className='flex items-center justify-center'>
          <Link to='/dashboard' className='flex items-center justify-center'>
            <img src='/bimaone%20logo.png' alt='BimaOne - Insurance Agent Software' className='h-14 w-auto' />
          </Link>
          <button
            type='button'
            onClick={onClose}
            className='absolute right-3 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden'
            aria-label='Close menu'
          >
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
      </div>

        <div className='mx-5 h-px bg-slate-200' />

        <div className='flex-1 space-y-6 overflow-y-auto px-3 py-5 [&::-webkit-scrollbar]:hidden'>
          {navSections.map((section) => (
            <div key={section.title}>
              <p className='mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400'>{section.title}</p>
              <nav className='space-y-1'>
                {section.items.map((item) => (
                  <NavLink key={item.path} item={item} isActive={isActivePath(item.path)} />
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className='flex-none space-y-2 border-t border-slate-200 p-3'>
          <NavLink item={{ name: 'Settings', path: '/setting', icon: navIcons.settings }} isActive={isActivePath('/setting')} />
        </div>
    </div>
  )

  return (
    <>
      <aside className='fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-200 bg-white lg:flex'>
        {content}
      </aside>

      <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role='dialog'
          aria-modal='true'
          aria-label='Menu'
        >
          {content}
        </aside>
      </div>
    </>
  )
}

export default Sidebar
