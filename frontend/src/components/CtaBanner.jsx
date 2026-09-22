import { Link } from 'react-router-dom'
import Icon from './Icon'
import { SUPPORT_WHATSAPP_URL } from '../data/contact'

const CtaBanner = ({ to = '/login' }) => (
  <section className='px-4 pb-16 md:px-8 md:pb-24'>
    <div className='mx-auto max-w-6xl rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-6 md:p-10'>
      <div className='flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left'>
        <div className='max-w-xl'>
          <h2 className='text-2xl font-bold leading-snug text-slate-900 md:text-3xl'>
            Spend less time on paperwork and more time with your clients.
          </h2>
          <p className='mt-2 text-sm text-slate-600 md:text-base'>Start free today. No credit card required.</p>
        </div>
        <div className='flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row'>
          <Link
            to={to}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition hover:from-blue-800 hover:to-blue-700'
          >
            Get Started Free
            <Icon name='arrow' className='h-4 w-4' />
          </Link>
          <a
            href={SUPPORT_WHATSAPP_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50'
          >
            <Icon name='chat' className='h-4 w-4' />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  </section>
)

export default CtaBanner
