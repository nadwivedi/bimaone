import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact-us', label: 'Contact' },
]

const linkCls = ({ isActive }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-brand' : 'text-slate-600 hover:text-ink'}`

const Navbar = () => {
  const [open, setOpen] = useState(false)

  return (
    <header className='fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md'>
      <nav className='mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 md:px-8'>
        <Link to='/' className='flex items-center' onClick={() => setOpen(false)}>
          <img src='/bimaone%20logo.png' alt='BimaOne - Insurance Agent Software' className='h-[52px] md:h-[54px] w-auto' />
        </Link>

        <div className='hidden md:flex items-center gap-8'>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className='flex items-center gap-2'>
          <Link
            to='/login'
            className='hidden sm:inline-flex items-center rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark'
          >
            Login
          </Link>
          <button
            type='button'
            onClick={() => setOpen(!open)}
            className='md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100'
            aria-label='Toggle menu'
            aria-expanded={open}
          >
            <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className='md:hidden border-t border-slate-100 bg-white px-4 py-3'>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-brand-soft text-brand' : 'text-slate-700 hover:bg-slate-50'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link
            to='/login'
            onClick={() => setOpen(false)}
            className='mt-2 block rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white'
          >
            Login
          </Link>
        </div>
      )}
    </header>
  )
}

export default Navbar
