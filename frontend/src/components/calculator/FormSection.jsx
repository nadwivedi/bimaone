const TONES = {
  blue: { head: 'bg-blue-50/80', badge: 'from-blue-500 to-blue-700' },
  violet: { head: 'bg-violet-50/80', badge: 'from-violet-500 to-violet-700' },
  emerald: { head: 'bg-emerald-50/80', badge: 'from-emerald-500 to-emerald-700' },
  amber: { head: 'bg-amber-50/80', badge: 'from-amber-400 to-amber-600' },
}

/** Numbered card section: tinted header strip with a round step badge, optional action on the right. */
const FormSection = ({ step, tone = 'blue', title, subtitle, action, children }) => (
  <section className='rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:p-2'>
    <div className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 sm:gap-3 sm:px-3.5 sm:py-3 ${TONES[tone].head}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:text-base ${TONES[tone].badge}`}>
        {step}
      </span>
      <div className='min-w-0 flex-1'>
        <h2 className='truncate text-[14px] font-semibold text-[#0f1f4b] sm:text-[15px]'>{title}</h2>
        {subtitle && <p className='truncate text-[11px] text-slate-500 sm:text-xs'>{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className='px-1.5 pb-1.5 pt-3 sm:px-2.5 sm:pb-2.5 sm:pt-4'>{children}</div>
  </section>
)

export default FormSection
