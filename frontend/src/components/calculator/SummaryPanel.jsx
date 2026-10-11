import { TbCircleCheck, TbBolt, TbFileText, TbReceipt, TbCalculator } from 'react-icons/tb'
import { CarShield } from './Illustrations'

const PERKS = [
  { icon: TbCircleCheck, tone: 'bg-emerald-50 text-emerald-600', title: 'IMT Tariff Rates', sub: 'Indian Motor Tariff, WEF 1 June 2022' },
  { icon: TbBolt, tone: 'bg-amber-50 text-amber-500', title: 'Instant Results', sub: 'Premium updates as you type' },
  { icon: TbFileText, tone: 'bg-blue-50 text-blue-600', title: 'Branded Quotation', sub: 'Share a PDF quote with your client' },
  { icon: TbReceipt, tone: 'bg-violet-50 text-violet-600', title: 'GST Included', sub: '18% GST, 5% on goods-vehicle TP' },
]

export const EmptyEstimate = () => (
  <div className='rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-5 text-center'>
    <span className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'>
      <TbCalculator className='h-5 w-5' />
    </span>
    <p className='mt-2 text-xs font-medium text-slate-600 sm:text-sm'>Estimated Premium</p>
    <p className='mt-1 text-2xl font-bold text-slate-300'>₹ —</p>
    <p className='mt-1 text-[11px] text-slate-500 sm:text-xs'>Select the RTO zone and vehicle age to see the premium</p>
  </div>
)

const SummaryPanel = ({ hasResult, children }) => (
  <aside className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
    <div className='hidden bg-gradient-to-b from-blue-50/80 to-white px-5 pt-5 lg:block'>
      <CarShield className='mx-auto h-32 w-auto' />
    </div>
    <div className='px-3 pt-3 sm:px-4 sm:pt-4 lg:px-5'>
      <h2 className='text-[15px] font-bold text-[#0f1f4b] sm:text-lg'>Your Premium Summary</h2>
      <p className='text-[11px] text-slate-500 sm:text-xs'>
        {hasResult ? 'Live estimate from the details you entered' : 'Complete the details to get your premium quote'}
      </p>
    </div>
    <div className='p-3 sm:p-4 lg:px-5'>{children}</div>
    <ul className='hidden space-y-3.5 border-t border-slate-100 px-5 py-4 lg:block'>
      {PERKS.map(({ icon: Icon, tone, title, sub }) => (
        <li key={title} className='flex items-center gap-3'>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>
            <Icon className='h-[18px] w-[18px]' />
          </span>
          <div>
            <p className='text-[13px] font-semibold text-slate-800'>{title}</p>
            <p className='text-xs text-slate-500'>{sub}</p>
          </div>
        </li>
      ))}
    </ul>
  </aside>
)

export default SummaryPanel
