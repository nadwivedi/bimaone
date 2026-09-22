import { Link } from 'react-router-dom'
import { landingPages } from '../data/landingPages'

const columns = [
  {
    title: 'Product',
    links: [
      { to: '/features', label: 'Features' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/login', label: 'Login' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About Us' },
      { to: '/contact-us', label: 'Contact Us' },
      { to: '/privacy-policy', label: 'Privacy Policy' },
      { to: '/terms-and-conditions', label: 'Terms & Conditions' },
    ],
  },
  {
    title: 'Solutions',
    span: 'md:col-span-3',
    links: landingPages.map((p) => ({ to: `/${p.slug}`, label: p.nav })),
  },
]

const Footer = () => {
  return (
    <footer className='border-t border-slate-200 bg-white'>
      <div className='mx-auto max-w-6xl px-4 md:px-8 py-14'>
        <div className='grid grid-cols-2 md:grid-cols-12 gap-10'>
          <div className='col-span-2 md:col-span-3 space-y-4'>
            <img src='/bimaone%20logo.png' alt='BimaOne - Insurance Agent Software' className='h-12 md:h-14 w-auto' />
            <p className='text-sm text-slate-500 leading-relaxed max-w-sm'>
              Insurance agent software made for insurance agents. Serving agents across India since 2020.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title} className={col.span || 'md:col-span-2'}>
              <h4 className='text-xs font-semibold uppercase tracking-wider text-ink mb-4'>{col.title}</h4>
              <ul className='space-y-3'>
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className='text-sm text-slate-500 hover:text-brand transition-colors'>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className='col-span-2 md:col-span-2'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-ink mb-4'>Contact</h4>
            <ul className='space-y-3 text-sm text-slate-500 [overflow-wrap:anywhere]'>
              <li><a href='mailto:bimaoneofficial@gmail.com' className='hover:text-brand transition-colors'>bimaoneofficial@gmail.com</a></li>
              <li><a href='tel:+919202469725' className='hover:text-brand transition-colors'>+91 9202469725</a></li>
              <li><a href='https://wa.me/919202469725' target='_blank' rel='noopener noreferrer' className='hover:text-leaf transition-colors'>WhatsApp: +91 9202469725</a></li>
              <li>Bhopal, Madhya Pradesh</li>
            </ul>
          </div>
        </div>

        <div className='mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4'>
          <p className='text-xs text-slate-400'>&copy; {new Date().getFullYear()} BimaOne. All rights reserved.</p>
          <div className='flex items-center gap-4'>
            <a
              href='https://www.facebook.com/profile.php?viewas=100000686899395&id=61590698249898'
              target='_blank'
              rel='noopener noreferrer'
              className='text-slate-400 hover:text-brand transition-colors'
              aria-label='Facebook'
            >
              <svg className='h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
