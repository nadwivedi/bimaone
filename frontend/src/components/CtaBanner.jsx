import { Link } from 'react-router-dom'
import Icon from './Icon'

const CtaBanner = ({ to = '/login' }) => (
  <section className='px-4 md:px-8 py-20'>
    <div className='mx-auto max-w-6xl rounded-3xl bg-ink px-6 py-14 md:px-14 md:py-16'>
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-8'>
        <div className='max-w-xl'>
          <h2 className='text-2xl md:text-3xl font-semibold text-white leading-snug'>
            Spend less time on paperwork and more time with your clients.
          </h2>
          <p className='mt-3 text-slate-300'>Start free today. No credit card required.</p>
        </div>
        <div className='flex flex-col sm:flex-row gap-3 shrink-0'>
          <Link
            to={to}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-leaf px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-leaf-dark'
          >
            Get Started Free
            <Icon name='arrow' className='h-4 w-4' />
          </Link>
          <a
            href='https://wa.me/919202469725'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10'
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  </section>
)

export default CtaBanner
