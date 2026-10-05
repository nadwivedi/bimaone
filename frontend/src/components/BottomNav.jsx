import { Link, useLocation } from 'react-router-dom'
import { navIcons } from './Sidebar'

const items = [
  { name: 'Home', path: '/dashboard', icon: navIcons.home },
  { name: 'Search', path: '/search', icon: navIcons.search },
  { name: 'Renewals', path: '/renewals', icon: navIcons.renewal },
  { name: 'Leads', path: '/leads', icon: navIcons.leads },
  { name: 'Calculator', path: '/premium-calculator', icon: navIcons.premium },
]

// Mobile-only shortcut bar; the full menu stays in the sidebar drawer
const BottomNav = () => {
  const location = useLocation()
  const isActivePath = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)

  return (
    <nav
      className='fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white shadow-[0_-2px_10px_rgba(15,23,42,0.06)] lg:hidden'
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label='Quick navigation'
    >
      {items.map((item) => {
        const active = isActivePath(item.path)
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-0 flex-col items-center gap-0.5 px-0.5 pb-1.5 pt-2 transition ${active ? 'text-blue-700' : 'text-slate-500 active:bg-slate-50'}`}
          >
            <span className={`flex h-7 w-10 items-center justify-center rounded-full ${active ? 'bg-blue-50' : ''}`}>{item.icon}</span>
            <span className={`w-full truncate text-center text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default BottomNav
