import PublicLayout from '../components/PublicLayout'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'
import { featureGroups } from '../data/features'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const Features = () => {
  const total = featureGroups.reduce((n, g) => n + g.features.length, 0)

  return (
    <PublicLayout>
      <section className='bg-canvas border-b border-slate-100 px-4 md:px-8 py-16 md:py-24'>
        <div className='mx-auto max-w-3xl text-center'>
          <p className='text-sm font-semibold text-leaf'>Features</p>
          <h1 className='mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-ink leading-[1.15]'>
            Everything an insurance agent needs, in one app
          </h1>
          <p className='mt-6 text-base md:text-lg leading-relaxed text-slate-500'>
            {total}+ features to manage policies, clients, vehicle documents and renewals — without the paperwork.
          </p>
          <div className='mt-8 flex flex-wrap justify-center gap-2'>
            {featureGroups.map((g) => (
              <a
                key={g.title}
                href={`#${slug(g.title)}`}
                className='rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-brand hover:text-brand'
              >
                {g.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className='px-4 md:px-8 py-16 md:py-20'>
        <div className='mx-auto max-w-6xl space-y-20'>
          {featureGroups.map((group, gi) => (
            <section key={group.title} id={slug(group.title)} className='scroll-mt-24'>
              <div className='grid gap-10 lg:grid-cols-12'>
                <div className='lg:col-span-4'>
                  <span className='text-sm font-semibold text-brand'>0{gi + 1}</span>
                  <h2 className='mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-ink'>{group.title}</h2>
                  <p className='mt-3 leading-relaxed text-slate-500'>{group.description}</p>
                </div>
                <div className='lg:col-span-8 grid gap-4 sm:grid-cols-2'>
                  {group.features.map((f) => (
                    <div key={f.title} className='rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand/30 hover:bg-canvas'>
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${gi % 2 === 0 ? 'bg-brand-soft text-brand' : 'bg-leaf-soft text-leaf'}`}>
                        <Icon name={f.icon} className='h-5 w-5' />
                      </span>
                      <h3 className='mt-4 text-base font-semibold text-ink'>{f.title}</h3>
                      <p className='mt-1.5 text-sm leading-relaxed text-slate-500'>{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      <CtaBanner />
    </PublicLayout>
  )
}

export default Features
