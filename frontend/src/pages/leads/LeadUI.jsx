import {
  ICON_PATHS, INSURANCE_TYPES, LEAD_STATUSES, LOST_REASONS, PRIORITIES, SOURCES,
  addDays, focusNextOnEnter, formatDate, formatTime, inputCls, isClosedStatus, labelCls,
  priorityInfo, statusInfo, toISODate, todayISO, typeInfo,
} from './leadUtils'

export const Icon = ({ d, className = 'h-4 w-4', strokeWidth = 2 }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={strokeWidth} d={d} />
  </svg>
)

export const StatusPill = ({ status, short = false, className = '' }) => {
  const st = statusInfo(status)
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset ${st.cls} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      {short ? st.short : st.label}
    </span>
  )
}

export const TypeBadge = ({ type, className = '' }) => {
  const t = typeInfo(type)
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold ${t.cls} ${className}`}>
      <span className='leading-none'>{t.icon}</span>{type || 'Other'}
    </span>
  )
}

export const PriorityDot = ({ priority }) => (
  <span title={priorityInfo(priority).label} className='text-xs leading-none'>
    {priority === 'hot' ? '🔥' : priority === 'cold' ? '❄️' : '☀️'}
  </span>
)

export const PlateChip = ({ value }) => (value ? (
  <span className='inline-block rounded-md border border-stone-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-stone-800'>{value}</span>
) : null)

export const ContactButtons = ({ lead, size = 'sm' }) => {
  if (!lead.mobile) return null
  const cls = size === 'sm'
    ? 'flex h-8 w-8 items-center justify-center rounded-lg transition-colors'
    : 'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors'
  return (
    <>
      <a href={`tel:+91${lead.mobile}`} onClick={(e) => e.stopPropagation()} className={`${cls} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} title='Call'>
        <Icon d={ICON_PATHS.phone} />
        {size !== 'sm' && 'Call'}
      </a>
      <a
        href={`https://wa.me/91${lead.mobile}`}
        target='_blank'
        rel='noopener noreferrer'
        onClick={(e) => e.stopPropagation()}
        className={`${cls} bg-green-50 text-green-700 hover:bg-green-100`}
        title='WhatsApp'
      >
        <Icon d={ICON_PATHS.chat} />
        {size !== 'sm' && 'WhatsApp'}
      </a>
    </>
  )
}

export const Modal = ({ title, onClose, children, footer, onKeyDown }) => (
  <div className='fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4' onClick={onClose}>
    <div
      className='flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl'
      onClick={(e) => e.stopPropagation()}
    >
      <div className='flex items-center justify-between border-b border-stone-100 px-5 py-4'>
        <h2 className='text-base font-black text-stone-900'>{title}</h2>
        <button type='button' onClick={onClose} className='rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600'>
          <Icon d={ICON_PATHS.close} className='h-5 w-5' />
        </button>
      </div>
      <div className='flex-1 overflow-y-auto px-5 py-4' onKeyDown={onKeyDown}>{children}</div>
      {footer && <div className='border-t border-stone-100 px-5 py-3'>{footer}</div>}
    </div>
  </div>
)

const QuickPicks = ({ options, value, onChange }) => (
  <div className='mt-2 flex flex-wrap gap-1.5'>
    {options.map((q) => (
      <button
        key={q.label}
        type='button'
        tabIndex={-1}
        onClick={() => onChange(q.v)}
        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${value === q.v ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-violet-50 hover:text-violet-700'}`}
      >
        {q.label}
      </button>
    ))}
  </div>
)

const FollowUpDateTime = ({ label, date, time, onDate, onTime }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <div className='grid grid-cols-[1.4fr_1fr] gap-2'>
      <input type='date' className={inputCls} value={date} onChange={(e) => onDate(e.target.value)} enterKeyHint='next' />
      <input type='time' className={inputCls} value={time} onChange={(e) => onTime(e.target.value)} disabled={!date} enterKeyHint='next' />
    </div>
    <QuickPicks
      value={date}
      onChange={onDate}
      options={[
        { label: 'Today', v: todayISO() },
        { label: 'Tomorrow', v: addDays(1) },
        { label: '3 days', v: addDays(3) },
        { label: '1 week', v: addDays(7) },
        { label: '2 weeks', v: addDays(14) },
        { label: '1 month', v: addDays(30) },
      ]}
    />
    {date && (
      <QuickPicks
        value={time}
        onChange={onTime}
        options={[
          { label: 'Any time', v: '' },
          { label: '10 AM', v: '10:00' },
          { label: '12 PM', v: '12:00' },
          { label: '3 PM', v: '15:00' },
          { label: '5 PM', v: '17:00' },
          { label: '7 PM', v: '19:00' },
        ]}
      />
    )}
  </div>
)

// ---------- Lead details (used in a popup, or inline in the split view) ----------

export const LeadDetail = ({ leads: L, lead }) => {
  const closed = isClosedStatus(lead.status)
  return (
    <div className='space-y-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <h3 className='truncate text-lg font-black text-stone-900'>{lead.name}</h3>
            <PriorityDot priority={lead.priority} />
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-1.5'>
            <StatusPill status={lead.status} />
            <TypeBadge type={lead.insuranceType} />
            <PlateChip value={lead.vehicleNumber} />
          </div>
          <p className='mt-1.5 text-[11px] text-stone-400'>Added {formatDate(toISODate(new Date(lead.createdAt)))}{lead.source ? ` · via ${lead.source}` : ''}</p>
        </div>
        <button type='button' onClick={() => L.openEdit(lead)} className='flex shrink-0 items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-violet-50 hover:text-violet-700'>
          <Icon d={ICON_PATHS.edit} className='h-3.5 w-3.5' />Edit
        </button>
      </div>

      {lead.mobile && <div className='flex gap-2'><ContactButtons lead={lead} size='lg' /></div>}

      <div className='grid grid-cols-2 gap-2 text-sm'>
        {[
          ['Mobile', lead.mobile],
          ['Email', lead.email],
          ['City', lead.city],
          ['Next Follow-up', lead.nextFollowUpDate ? `${formatDate(lead.nextFollowUpDate)}${lead.nextFollowUpTime ? `, ${formatTime(lead.nextFollowUpTime)}` : ''}` : ''],
          ['Expected Premium', lead.expectedPremium != null ? `₹${Number(lead.expectedPremium).toLocaleString('en-IN')}` : ''],
          ['Existing Policy', lead.hasExistingPolicy ? [lead.currentInsurer || 'Yes', lead.policyExpiryDate && `exp ${formatDate(lead.policyExpiryDate)}`].filter(Boolean).join(' · ') : 'No'],
          ['Priority', priorityInfo(lead.priority).label],
        ].map(([k, v]) => (
          <div key={k} className='rounded-xl bg-stone-50 px-3 py-2'>
            <p className='text-[10px] font-bold uppercase tracking-wider text-stone-400'>{k}</p>
            <p className='truncate font-semibold text-stone-800' title={v || ''}>{v || '—'}</p>
          </div>
        ))}
      </div>

      {lead.notes && (
        <div className='rounded-xl bg-amber-50/60 px-3 py-2 text-sm text-stone-700 ring-1 ring-inset ring-amber-100'>{lead.notes}</div>
      )}

      {!closed ? (
        <div className='grid grid-cols-3 gap-2'>
          <button type='button' onClick={() => L.openFollowUp(lead)} className='rounded-xl bg-stone-900 py-2 text-xs font-bold text-white hover:bg-violet-700'>Log Follow-up</button>
          <button type='button' onClick={() => L.updateStatus(lead, 'converted')} className='rounded-xl bg-emerald-50 py-2 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100'>Converted</button>
          <button type='button' onClick={() => L.openLost(lead)} className='rounded-xl bg-stone-50 py-2 text-xs font-bold text-stone-600 ring-1 ring-inset ring-stone-200 hover:bg-stone-100'>Lost</button>
        </div>
      ) : (
        <div className='flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5'>
          <span className={`text-sm font-bold ${lead.status === 'converted' ? 'text-emerald-700' : 'text-stone-600'}`}>
            {lead.status === 'converted' ? '✓ Converted' : `Lost${lead.lostReason ? ` · ${lead.lostReason}` : ''}`}
          </span>
          <button type='button' onClick={() => L.updateStatus(lead, 'in_progress')} className='text-xs font-bold text-violet-600 hover:text-violet-800'>Reopen</button>
        </div>
      )}

      <div>
        <p className='mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400'>Follow-up History ({lead.followUps?.length || 0})</p>
        {lead.followUps?.length ? (
          <ol className='relative space-y-3 border-l-2 border-stone-100 pl-4'>
            {[...lead.followUps].reverse().map((f) => (
              <li key={f._id} className='relative'>
                <span className='absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-violet-500' />
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-xs font-black text-stone-800'>{f.outcome || 'Follow-up'}</p>
                  <p className='text-[10px] font-semibold text-stone-400'>{formatDate(f.date)}</p>
                </div>
                {f.note && <p className='mt-0.5 text-xs text-stone-600'>{f.note}</p>}
                {f.nextFollowUpDate && <p className='mt-0.5 text-[10px] font-semibold text-violet-600'>Next: {formatDate(f.nextFollowUpDate)}{f.nextFollowUpTime ? `, ${formatTime(f.nextFollowUpTime)}` : ''}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className='text-xs text-stone-400'>No follow-ups logged yet.</p>
        )}
      </div>

      <button type='button' onClick={() => L.handleDelete(lead)} className='w-full rounded-xl py-2 text-xs font-bold text-stone-400 hover:bg-rose-50 hover:text-rose-600'>
        Delete Lead
      </button>
    </div>
  )
}

// ---------- Popups shared by all layouts ----------

export const LeadModals = ({ leads: L }) => {
  const { form, setForm, followUp, setFollowUp } = L
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <>
      {L.formOpen && (
        <Modal
          title={L.editingId ? 'Edit Lead' : 'Add New Lead'}
          onClose={() => L.setFormOpen(false)}
          onKeyDown={focusNextOnEnter(L.handleSave)}
          footer={
            <div className='flex gap-2'>
              <button type='button' onClick={() => L.setFormOpen(false)} className='flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-200'>Cancel</button>
              <button type='button' onClick={L.handleSave} disabled={L.saving} className='flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50'>
                {L.saving ? 'Saving...' : L.editingId ? 'Save Changes' : 'Add Lead'}
              </button>
            </div>
          }
        >
          <div className='space-y-3.5'>
            <div>
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={form.name} onChange={setField('name')} placeholder='Customer name' autoFocus enterKeyHint='next' />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className={labelCls}>Mobile</label>
                <input
                  className={inputCls}
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder='10-digit number'
                  inputMode='numeric'
                  enterKeyHint='next'
                />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls} value={form.city} onChange={setField('city')} placeholder='City' enterKeyHint='next' />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type='email' className={inputCls} value={form.email} onChange={setField('email')} placeholder='Optional' inputMode='email' enterKeyHint='next' />
            </div>
            <div>
              <label className={labelCls}>Lead Type</label>
              <div className='grid grid-cols-4 gap-2'>
                {INSURANCE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type='button'
                    tabIndex={-1}
                    onClick={() => setForm((f) => ({ ...f, insuranceType: t.value, vehicleNumber: t.value === 'Motor' ? f.vehicleNumber : '' }))}
                    className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-bold ring-1 ring-inset transition-all ${form.insuranceType === t.value ? 'bg-violet-50 text-violet-700 ring-2 ring-violet-500' : 'bg-white text-stone-500 ring-stone-200 hover:ring-violet-300'}`}
                  >
                    <span className='text-base leading-none'>{t.icon}</span>
                    {t.value}
                  </button>
                ))}
              </div>
            </div>
            <div className='rounded-2xl bg-stone-50 p-3 ring-1 ring-inset ring-stone-100'>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-xs font-bold text-stone-700'>Existing {form.insuranceType.toLowerCase()} policy?</span>
                <div className='flex rounded-lg bg-white p-0.5 ring-1 ring-stone-200'>
                  {[{ v: false, l: 'No' }, { v: true, l: 'Yes' }].map((o) => (
                    <button
                      key={o.l}
                      type='button'
                      tabIndex={-1}
                      onClick={() => setForm((f) => ({ ...f, hasExistingPolicy: o.v, ...(o.v ? {} : { currentInsurer: '', policyExpiryDate: '' }) }))}
                      className={`rounded-md px-4 py-1 text-xs font-bold transition-colors ${form.hasExistingPolicy === o.v ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'}`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              {form.hasExistingPolicy && (
                <div className='mt-3 grid grid-cols-2 gap-3'>
                  <div>
                    <label className={labelCls}>Current Insurer</label>
                    <input className={inputCls} value={form.currentInsurer} onChange={setField('currentInsurer')} placeholder='e.g. ICICI Lombard' enterKeyHint='next' />
                  </div>
                  <div>
                    <label className={labelCls}>Policy Expiry</label>
                    <input type='date' className={inputCls} value={form.policyExpiryDate} onChange={setField('policyExpiryDate')} enterKeyHint='next' />
                  </div>
                </div>
              )}
            </div>
            {form.insuranceType === 'Motor' && (
              <div>
                <label className={labelCls}>Vehicle No.</label>
                <input className={`${inputCls} uppercase`} value={form.vehicleNumber} onChange={setField('vehicleNumber')} placeholder='e.g. CG04AB1234' enterKeyHint='next' />
              </div>
            )}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className={labelCls}>Expected Premium (₹)</label>
                <input className={inputCls} value={form.expectedPremium} onChange={(e) => setForm((f) => ({ ...f, expectedPremium: e.target.value.replace(/[^\d.]/g, '') }))} placeholder='Optional' inputMode='decimal' enterKeyHint='next' />
              </div>
              <div>
                <label className={labelCls}>Source</label>
                <select className={inputCls} value={form.source} onChange={setField('source')}>
                  <option value=''>Select source</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <div className='grid grid-cols-3 gap-2'>
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type='button'
                    tabIndex={-1}
                    onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                    className={`rounded-xl py-2 text-xs font-black uppercase ring-1 ring-inset transition-all ${form.priority === p.value ? `${p.cls} ring-2` : 'bg-white text-stone-400 ring-stone-200'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Lead Status</label>
              <select className={inputCls} value={form.status} onChange={setField('status')}>
                {LEAD_STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
              </select>
            </div>
            {!isClosedStatus(form.status) && (
              <FollowUpDateTime
                label={L.editingId ? 'Next Follow-up (date & time)' : 'First Follow-up (date & time)'}
                date={form.nextFollowUpDate}
                time={form.nextFollowUpTime}
                onDate={(v) => setForm((f) => ({ ...f, nextFollowUpDate: v, nextFollowUpTime: v ? f.nextFollowUpTime : '' }))}
                onTime={(v) => setForm((f) => ({ ...f, nextFollowUpTime: v }))}
              />
            )}
            <div>
              <label className={labelCls}>Notes</label>
              <textarea className={`${inputCls} min-h-[70px]`} value={form.notes} onChange={setField('notes')} placeholder='Requirement, family members, vehicle details...' />
            </div>
          </div>
        </Modal>
      )}

      {L.followUpLead && (
        <Modal
          title={`Follow-up · ${L.followUpLead.name}`}
          onClose={() => L.setFollowUpLead(null)}
          onKeyDown={focusNextOnEnter(L.handleLogFollowUp)}
          footer={
            <div className='flex gap-2'>
              <button type='button' onClick={() => L.setFollowUpLead(null)} className='flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-200'>Cancel</button>
              <button type='button' onClick={L.handleLogFollowUp} disabled={L.saving} className='flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50'>
                {L.saving ? 'Saving...' : 'Save Follow-up'}
              </button>
            </div>
          }
        >
          <div className='space-y-4'>
            {L.followUpLead.mobile && (
              <div className='flex gap-2'>
                <ContactButtons lead={L.followUpLead} size='lg' />
              </div>
            )}
            <div>
              <label className={labelCls}>Lead Status</label>
              <div className='flex flex-wrap gap-1.5'>
                {LEAD_STATUSES.filter((st) => st.value !== 'new').map((st) => (
                  <button
                    key={st.value}
                    type='button'
                    tabIndex={-1}
                    onClick={() => setFollowUp((f) => ({ ...f, status: st.value }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition-all ${followUp.status === st.value ? `${st.cls} ring-2` : 'bg-white text-stone-500 ring-stone-200 hover:ring-stone-300'}`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>What happened?</label>
              <textarea
                className={`${inputCls} min-h-[80px]`}
                value={followUp.note}
                onChange={(e) => setFollowUp((f) => ({ ...f, note: e.target.value }))}
                placeholder='e.g. Shared quote for ICICI comprehensive, will confirm after discussing with family'
              />
            </div>
            {!isClosedStatus(followUp.status) && (
              <div>
                <FollowUpDateTime
                  label='Next Follow-up (date & time)'
                  date={followUp.nextFollowUpDate}
                  time={followUp.nextFollowUpTime}
                  onDate={(v) => setFollowUp((f) => ({ ...f, nextFollowUpDate: v, nextFollowUpTime: v ? f.nextFollowUpTime : '' }))}
                  onTime={(v) => setFollowUp((f) => ({ ...f, nextFollowUpTime: v }))}
                />
                <p className='mt-1.5 text-[11px] text-stone-400'>Time is optional. Leave the date empty if no further follow-up is planned.</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {L.lostLead && (
        <Modal
          title={`Mark lost · ${L.lostLead.name}`}
          onClose={() => L.setLostLead(null)}
          footer={
            <div className='flex gap-2'>
              <button type='button' onClick={() => L.setLostLead(null)} className='flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-200'>Cancel</button>
              <button type='button' onClick={L.confirmLost} className='flex-1 rounded-xl bg-stone-900 py-2.5 text-sm font-bold text-white hover:bg-stone-800'>Mark as Lost</button>
            </div>
          }
        >
          <label className={labelCls}>Reason</label>
          <div className='flex flex-wrap gap-1.5'>
            {LOST_REASONS.map((r) => (
              <button
                key={r}
                type='button'
                onClick={() => L.setLostReason(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${L.lostReason === r ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <input className={`${inputCls} mt-3`} value={L.lostReason} onChange={(e) => L.setLostReason(e.target.value)} placeholder='Or type a reason' />
        </Modal>
      )}

      {L.detailLead && (
        <Modal title='Lead Details' onClose={() => L.setDetailLead(null)}>
          <LeadDetail leads={L} lead={L.detailLead} />
        </Modal>
      )}
    </>
  )
}

