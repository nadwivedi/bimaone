import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import axios from 'axios'
import { enforceMobileNumberFormat } from '../utils/contactValidation'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const Reference = () => {
  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newMobile, setNewMobile] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newReferenceVal, setNewReferenceVal] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newOtherInfo, setNewOtherInfo] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editReferenceVal, setEditReferenceVal] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editOtherInfo, setEditOtherInfo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReferences()
  }, [])

  const fetchReferences = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/references`, { withCredentials: true })
      if (res.data.success) setReferences(res.data.data)
    } catch {
      toast.error('Failed to load client names')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    const name = newName.trim()
    const mobile = newMobile.trim()
    const email = newEmail.trim()
    const reference = newReferenceVal.trim()
    const address = newAddress.trim()
    const otherInfo = newOtherInfo.trim()
    
    if (!name && !mobile && !email && !reference && !address && !otherInfo) {
      toast.error('Please fill at least one field')
      return
    }
    try {
      const res = await axios.post(`${API_URL}/api/references`, {
        name,
        mobile,
        email,
        reference,
        address,
        otherInfo
      }, { withCredentials: true })
      if (res.data.success) {
        setReferences(prev => {
          const exists = prev.find(r => r._id === res.data.data._id)
          return exists ? prev.map(r => r._id === res.data.data._id ? res.data.data : r) : [...prev, res.data.data].sort((a, b) => a.name.localeCompare(b.name))
        })
        setNewName('')
        setNewMobile('')
        setNewEmail('')
        setNewReferenceVal('')
        setNewAddress('')
        setNewOtherInfo('')
        setShowAddModal(false)
        toast.success('Client Name added')
      }
    } catch {
      toast.error('Failed to add Client Name')
    }
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    setNewName('')
    setNewMobile('')
    setNewEmail('')
    setNewReferenceVal('')
    setNewAddress('')
    setNewOtherInfo('')
  }

  const openViewModal = (ref) => {
    setViewItem(ref)
    setShowViewModal(true)
  }

  const closeViewModal = () => {
    setShowViewModal(false)
    setViewItem(null)
  }

  const openEditModal = (ref) => {
    setEditItem(ref)
    setEditName(ref.name || '')
    setEditMobile(ref.mobile || '')
    setEditEmail(ref.email || '')
    setEditReferenceVal(ref.reference || '')
    setEditAddress(ref.address || '')
    setEditOtherInfo(ref.otherInfo || '')
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditItem(null)
    setEditReferenceVal('')
    setEditAddress('')
    setEditOtherInfo('')
  }

  const handleSaveEdit = async () => {
    if (!editItem) return
    const name = editName.trim()
    const mobile = editMobile.trim()
    const email = editEmail.trim()
    const reference = editReferenceVal.trim()
    const address = editAddress.trim()
    const otherInfo = editOtherInfo.trim()
    
    if (!name && !mobile && !email && !reference && !address && !otherInfo) {
      toast.error('Please fill at least one field')
      return
    }
    setSaving(true)
    try {
      const res = await axios.put(`${API_URL}/api/references/${editItem._id}`, {
        name,
        mobile,
        email,
        reference,
        address,
        otherInfo
      }, { withCredentials: true })
      if (res.data.success) {
        setReferences(prev => prev.map(r => r._id === editItem._id ? res.data.data : r))
        closeEditModal()
        toast.success('Client Name updated')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update Client Name')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Client Name?')) return
    try {
      await axios.delete(`${API_URL}/api/references/${id}`, { withCredentials: true })
      setReferences(prev => prev.filter(r => r._id !== id))
      toast.success('Client Name deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete Client Name')
    }
  }

  const filteredReferences = references.filter((ref) =>
    (ref.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f0f9ff,_#f8fafc_45%,_#ffffff_100%)]'>
      <main className='px-2 pt-3 pb-32 lg:px-8 lg:pt-4'>
        <section className='w-full'>
          <div className='w-full'>
            <div className='rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.25)] md:p-5 lg:p-6'>
              <h1 className='text-xl font-black text-slate-900 mb-6'>Client Name</h1>

              <div className='flex gap-2 mb-4'>
                <div className='relative flex-1'>
                  <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
                    <svg className='w-4 h-4 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                    </svg>
                  </div>
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Search client by name...'
                    className='w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm'
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className='absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-rose-500 transition-colors'
                      title='Clear search'
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className='flex items-center gap-1.5 px-4 md:px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition cursor-pointer flex-shrink-0'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 4v16m8-8H4' />
                  </svg>
                  <span className='hidden sm:inline'>Add</span>
                </button>
              </div>

              {loading ? (
                <div className='text-center py-12'>
                  <div className='animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto'></div>
                </div>
              ) : references.length === 0 ? (
                <div className='text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200'>
                  <p className='text-sm font-bold text-slate-500'>No Client Names yet.</p>
                </div>
              ) : filteredReferences.length === 0 ? (
                <div className='text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200'>
                  <p className='text-sm font-bold text-slate-500'>No clients match "{searchQuery}".</p>
                </div>
              ) : (
                <div className='space-y-2'>
                  {filteredReferences.map((ref) => (
                    <div key={ref._id} className='flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-indigo-200 transition'>
                      <div className='min-w-0 flex-1'>
                        <span className='text-sm font-semibold text-slate-700'>{ref.name || 'Unnamed'}</span>
                      </div>
                      <div className='flex gap-1 flex-shrink-0 ml-2'>
                        <button onClick={() => openViewModal(ref)} className='p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer' title='View details'>
                          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                          </svg>
                        </button>
                        <button onClick={() => openEditModal(ref)} className='p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer' title='Edit'>
                          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(ref._id)} className='p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer' title='Delete'>
                          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4' onClick={closeAddModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden' onClick={e => e.stopPropagation()}>
            <div className='bg-gradient-to-r from-indigo-600 to-blue-600 p-4 text-white'>
              <div className='flex justify-between items-center'>
                <div>
                  <h2 className='text-lg font-bold'>Add Client Name</h2>
                  <p className='text-indigo-100 text-xs mt-0.5'>Add a new client</p>
                </div>
                <button onClick={closeAddModal} className='text-white hover:bg-white/20 rounded-lg p-1.5 transition cursor-pointer'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            </div>
            <div className='p-5 space-y-4 max-h-[60vh] overflow-y-auto'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Name</label>
                <input
                  type='text'
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder='Client name (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Mobile</label>
                <input
                  type='text'
                  value={newMobile}
                  onChange={(e) => setNewMobile(enforceMobileNumberFormat(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder='Mobile number (optional)'
                  maxLength={10}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Email</label>
                <input
                  type='email'
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder='Email address (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Reference</label>
                <input
                  type='text'
                  value={newReferenceVal}
                  onChange={(e) => setNewReferenceVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder='Reference (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Address</label>
                <input
                  type='text'
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder='Address (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Other Info</label>
                <input
                  type='text'
                  value={newOtherInfo}
                  onChange={(e) => setNewOtherInfo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder='Other Info (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
            </div>
            <div className='border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3'>
              <button type='button' onClick={closeAddModal} className='px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 cursor-pointer'>Cancel</button>
              <button
                type='button'
                onClick={handleAdd}
                className='px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-lg hover:shadow-lg transition cursor-pointer'
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Client Details Modal */}
      {showViewModal && viewItem && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4' onClick={closeViewModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden' onClick={e => e.stopPropagation()}>
            <div className='bg-gradient-to-r from-indigo-600 to-blue-600 p-4 text-white'>
              <div className='flex justify-between items-center'>
                <div>
                  <h2 className='text-lg font-bold'>{viewItem.name || 'Client Details'}</h2>
                  <p className='text-indigo-100 text-xs mt-0.5'>Client details</p>
                </div>
                <button onClick={closeViewModal} className='text-white hover:bg-white/20 rounded-lg p-1.5 transition cursor-pointer'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            </div>
            <div className='p-5 space-y-3 max-h-[60vh] overflow-y-auto'>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-0.5'>Name</label>
                <p className='text-sm text-slate-700'>{viewItem.name || '—'}</p>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-0.5'>Mobile</label>
                <p className='text-sm text-slate-700'>{viewItem.mobile ? viewItem.mobile.replace(/(\d{5})(\d{5})/, '$1 $2') : '—'}</p>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-0.5'>Email</label>
                <p className='text-sm text-slate-700'>{viewItem.email || '—'}</p>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-0.5'>Reference</label>
                <p className='text-sm text-slate-700'>{viewItem.reference || '—'}</p>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-0.5'>Address</label>
                <p className='text-sm text-slate-700'>{viewItem.address || '—'}</p>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-0.5'>Other Info</label>
                <p className='text-sm text-slate-700'>{viewItem.otherInfo || '—'}</p>
              </div>
            </div>
            <div className='border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3'>
              <button type='button' onClick={closeViewModal} className='px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 cursor-pointer'>Close</button>
              <button
                type='button'
                onClick={() => { closeViewModal(); openEditModal(viewItem) }}
                className='px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-lg hover:shadow-lg transition cursor-pointer'
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Name Modal */}
      {showEditModal && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4' onClick={closeEditModal}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden' onClick={e => e.stopPropagation()}>
            <div className='bg-gradient-to-r from-indigo-600 to-blue-600 p-4 text-white'>
              <div className='flex justify-between items-center'>
                <div>
                  <h2 className='text-lg font-bold'>Edit Client Name</h2>
                  <p className='text-indigo-100 text-xs mt-0.5'>Update client details</p>
                </div>
                <button onClick={closeEditModal} className='text-white hover:bg-white/20 rounded-lg p-1.5 transition cursor-pointer'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            </div>
            <div className='p-5 space-y-4 max-h-[60vh] overflow-y-auto'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Name</label>
                <input
                  type='text'
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder='Client name (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Mobile</label>
                <input
                  type='text'
                  value={editMobile}
                  onChange={(e) => setEditMobile(enforceMobileNumberFormat(e.target.value))}
                  placeholder='Mobile number (optional)'
                  maxLength={10}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Email</label>
                <input
                  type='email'
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder='Email address (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Reference</label>
                <input
                  type='text'
                  value={editReferenceVal}
                  onChange={(e) => setEditReferenceVal(e.target.value)}
                  placeholder='Reference (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Address</label>
                <input
                  type='text'
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder='Address (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>Other Info</label>
                <input
                  type='text'
                  value={editOtherInfo}
                  onChange={(e) => setEditOtherInfo(e.target.value)}
                  placeholder='Other Info (optional)'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm'
                />
              </div>
            </div>
            <div className='border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3'>
              <button type='button' onClick={closeEditModal} className='px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 cursor-pointer'>Cancel</button>
              <button
                type='button'
                onClick={handleSaveEdit}
                disabled={saving}
                className='px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-lg hover:shadow-lg transition disabled:opacity-50 cursor-pointer'
              >
                {saving ? (
                  <span className='flex items-center gap-2'>
                    <svg className='h-4 w-4 animate-spin' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                    </svg>
                    Saving...
                  </span>
                ) : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reference
