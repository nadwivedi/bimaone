import PublicLayout from '../components/PublicLayout'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'
import { featureGroups, TONES, GROUP_TONES } from '../data/features'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const Features = () => {
  const total = featureGroups.reduce((n, g) => n + g.features.length, 0)

  return (
    <PublicLayout>
      <div className='bg-slate-50'>
        {/* Header */}
        <section className='relative overflow-hidden bg-gradient-to-br from-[#1f2a3c] via-[#27374f] to-[#314866] px-4 pb-20 pt-12 text-white md:px-8 md:pb-24 md:pt-16'>
          <div className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl' />
          <div className='relative mx-auto max-w-3xl text-center'>
            <span className='inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/20'>
              {total}+ features
            </span>
            <h1 className='mt-4 text-3xl font-bold leading-tight tracking-tight md:text-5xl'>Everything an insurance agent needs, in one app</h1>
            <p className='mt-4 text-sm leading-relaxed text-slate-300 md:text-lg'>
              Manage policies, clients, vehicle documents and renewals — without the paperwork.
            </p>
          </div>
        </section>

        {/* Category jump cards, overlapping the header */}
        <section className='relative z-10 -mt-12 px-4 md:px-8'>
          <div className='mx-auto grid max-w-6xl grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4'>
            {featureGroups.map((g, gi) => {
              const t = TONES[GROUP_TONES[gi % GROUP_TONES.length]]
              return (
                <a
                  key={g.title}
                  href={`#${slug(g.title)}`}
                  className={`rounded-xl border-2 bg-gradient-to-r p-3 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 md:p-4 ${t.card}`}
                >
                  <div className='flex items-center gap-3'>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:h-10 md:w-10 ${t.icon}`}>{gi + 1}</span>
                    <div className='min-w-0'>
                      <p className='text-sm font-bold leading-tight text-slate-900'>{g.title}</p>
                      <p className={`text-xs font-semibold ${t.text}`}>{g.features.length} features</p>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </section>

        {/* Groups */}
        <div className='px-4 py-12 md:px-8 md:py-16'>
          <div className='mx-auto max-w-6xl space-y-6 md:space-y-8'>
            {featureGroups.map((group, gi) => {
              const t = TONES[GROUP_TONES[gi % GROUP_TONES.length]]
              return (
                <section
                  key={group.title}
                  id={slug(group.title)}
                  className={`scroll-mt-24 rounded-2xl border-2 bg-gradient-to-r p-4 md:p-8 ${t.card}`}
                >
                  <div className='mb-5 flex items-start gap-3 md:mb-6'>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:h-10 md:w-10 ${t.icon}`}>{gi + 1}</span>
                    <div>
                      <h2 className='text-xl font-bold text-slate-900 md:text-2xl'>{group.title}</h2>
                      <p className='mt-1 text-sm text-slate-600'>{group.description}</p>
                    </div>
                  </div>
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4'>
                    {group.features.map((f) => (
                      <div key={f.title} className='rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:shadow-md md:p-5'>
                        <div className='flex items-start gap-3'>
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${t.icon}`}>
                            <Icon name={f.icon} className='h-5 w-5' />
                          </span>
                          <div className='min-w-0'>
                            <h3 className='text-sm font-bold text-slate-900 md:text-base'>{f.title}</h3>
                            <p className='mt-1 text-xs leading-relaxed text-slate-500 md:text-sm'>{f.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        <CtaBanner />
      </div>
    </PublicLayout>
  )
}

export default Features
