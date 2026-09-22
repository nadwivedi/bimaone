import PublicLayout from '../components/PublicLayout'
import CtaBanner from '../components/CtaBanner'
import Icon from '../components/Icon'

const values = [
  { icon: 'heart', title: 'Made for agents', description: 'BimaOne is built only for insurance agents. Every screen is designed around how agents actually work.' },
  { icon: 'bolt', title: 'Simple to use', description: 'No training needed. If you can use WhatsApp, you can use BimaOne from day one.' },
  { icon: 'lock', title: 'Safe with us', description: 'Your client data and documents are stored securely and stay private to you.' },
  { icon: 'users', title: 'Here to help', description: 'Real people on WhatsApp and phone whenever you need help getting things done.' },
]

const problems = [
  'Renewal dates written in diaries and forgotten',
  'Client documents lost in files and phone galleries',
  'Hours spent typing policy details by hand',
  'No clear view of how the business is doing',
]

const About = () => {
  return (
    <PublicLayout>
      {/* Header */}
      <section className='bg-canvas border-b border-slate-100 px-4 md:px-8 py-16 md:py-24'>
        <div className='mx-auto max-w-3xl text-center'>
          <p className='text-sm font-semibold text-leaf'>About BimaOne</p>
          <h1 className='mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-ink leading-[1.15]'>
            Insurance agent software, made for insurance agents
          </h1>
          <p className='mt-6 text-base md:text-lg leading-relaxed text-slate-500'>
            BimaOne was developed in 2020 with one simple goal — to make the work of an insurance agent easy.
            For the last 6 years, we have been serving insurance agents across India.
          </p>
        </div>
      </section>

      {/* Numbers */}
      <section className='px-4 md:px-8 -mt-10'>
        <div className='mx-auto grid max-w-4xl grid-cols-3 rounded-2xl border border-slate-200 bg-white shadow-sm'>
          {[
            { value: '2020', label: 'Founded' },
            { value: '6+ years', label: 'Serving agents' },
            { value: '500+', label: 'Agents on BimaOne' },
          ].map((s, i) => (
            <div key={s.label} className={`px-4 py-6 text-center ${i > 0 ? 'border-l border-slate-100' : ''}`}>
              <p className='text-xl md:text-3xl font-semibold text-brand'>{s.value}</p>
              <p className='mt-1 text-xs md:text-sm text-slate-500'>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className='px-4 md:px-8 py-20 md:py-24'>
        <div className='mx-auto grid max-w-6xl gap-12 lg:grid-cols-2'>
          <div>
            <p className='text-sm font-semibold text-leaf'>Our story</p>
            <h2 className='mt-2 text-3xl font-semibold tracking-tight text-ink'>Why we built BimaOne</h2>
            <div className='mt-5 space-y-4 leading-relaxed text-slate-500'>
              <p>
                An insurance agent's day is full of follow-ups, renewals, documents and paperwork. In 2020 we saw
                agents managing all of this with diaries, paper files and scattered spreadsheets — and losing
                business simply because a renewal date was missed.
              </p>
              <p>
                So we built BimaOne: one place to keep every policy, every client document and every renewal date.
                Over six years we have kept improving it with feedback from agents — adding vehicle documents,
                AI auto entry, premium calculator, WhatsApp reminders and much more.
              </p>
              <p>
                Today BimaOne helps agents save hours every week, serve their clients better and grow their business
                with confidence.
              </p>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-canvas p-8'>
            <h3 className='text-lg font-semibold text-ink'>The problems we solve</h3>
            <ul className='mt-5 space-y-4'>
              {problems.map((p) => (
                <li key={p} className='flex items-start gap-3'>
                  <span className='mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf'>
                    <Icon name='check' className='h-3.5 w-3.5' strokeWidth={3} />
                  </span>
                  <span className='text-sm text-slate-600'>{p}</span>
                </li>
              ))}
            </ul>

            <div className='mt-8 border-t border-slate-200 pt-6'>
              <div className='flex items-center gap-4'>
                <div className='text-center'>
                  <p className='text-2xl font-semibold text-brand'>2020</p>
                  <p className='text-xs text-slate-400'>BimaOne launched</p>
                </div>
                <div className='h-px flex-1 bg-gradient-to-r from-brand to-leaf' />
                <div className='text-center'>
                  <p className='text-2xl font-semibold text-leaf'>Today</p>
                  <p className='text-xs text-slate-400'>6 years of serving agents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className='bg-canvas px-4 md:px-8 py-20 md:py-24'>
        <div className='mx-auto max-w-6xl'>
          <div className='max-w-xl mb-12'>
            <p className='text-sm font-semibold text-leaf'>What we believe</p>
            <h2 className='mt-2 text-3xl font-semibold tracking-tight text-ink'>Our promise to every agent</h2>
          </div>
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
            {values.map((v) => (
              <div key={v.title} className='rounded-2xl border border-slate-200 bg-white p-7'>
                <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand'>
                  <Icon name={v.icon} className='h-5 w-5' />
                </span>
                <h3 className='mt-5 text-base font-semibold text-ink'>{v.title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-slate-500'>{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </PublicLayout>
  )
}

export default About
