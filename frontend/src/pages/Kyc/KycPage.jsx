import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const DOCUMENT_TYPES = ['Aadhar', 'PAN', 'GST', 'Other']

const emptyDoc = () => ({
  documentType: 'Aadhar',
  otherDocumentType: '',
  documentNumber: '',
  frontFile: null,
  backFile: null,
  _id: null,
  existingFrontUrl: '',
  existingBackUrl: ''
})

const KycPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewTitle, setPreviewTitle] = useState('')

  const [form, setForm] = useState({
    name: '',
    documents: [emptyDoc()],
    remarks: ''
  })

  useEffect(() => {
    fetchRecords()
  }, [search])

  useEffect(() => {
    const editId = location.state?.editId
    if (!editId || records.length === 0) return
    const record = records.find(r => r._id === editId)
    if (record) openEditModal(record)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, records])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search.trim()) params.search = search.trim()
      const response = await axios.get(`${API_URL}/api/kyc`, { params, withCredentials: true })
      if (response.data.success) {
        setRecords(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching KYC records:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingRecord(null)
    setForm({
      name: '',
      documents: [emptyDoc()],
      remarks: ''
    })
    setShowModal(true)
  }

  const openEditModal = (record) => {
    setEditingRecord(record)
    const docs = (record.documents && record.documents.length > 0)
      ? record.documents.map(d => ({
          documentType: d.documentType || 'Aadhar',
          otherDocumentType: d.otherDocumentType || '',
          documentNumber: d.documentNumber || '',
          frontFile: null,
          backFile: null,
          _id: d._id || null,
          existingFrontUrl: d.documentFrontImg || '',
          existingBackUrl: d.documentBackImg || ''
        }))
      : [{
          documentType: record.documentType || 'Aadhar',
          otherDocumentType: record.otherDocumentType || '',
          documentNumber: record.documentNumber || '',
          frontFile: null,
          backFile: null,
          _id: null,
          existingFrontUrl: record.documentFrontImg || record.documentImage || '',
          existingBackUrl: record.documentBackImg || ''
        }]
    setForm({
      name: record.name || '',
      documents: docs,
      remarks: record.remarks || ''
    })
    setShowModal(true)
  }

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        name: form.name,
        remarks: form.remarks,
        documents: []
      }

      for (const doc of form.documents) {
        const entry = {
          documentType: doc.documentType,
          otherDocumentType: doc.documentType === 'Other' ? doc.otherDocumentType : '',
          documentNumber: doc.documentNumber,
          documentFrontImg: doc.frontFile ? await toBase64(doc.frontFile) : (doc.existingFrontUrl || ''),
          documentBackImg: doc.backFile ? await toBase64(doc.backFile) : (doc.existingBackUrl || '')
        }
        payload.documents.push(entry)
      }

      if (editingRecord) {
        await axios.put(`${API_URL}/api/kyc/${editingRecord._id}`, payload, { withCredentials: true })
      } else {
        await axios.post(`${API_URL}/api/kyc`, payload, { withCredentials: true })
      }

      setShowModal(false)
      fetchRecords()
      toast.success(editingRecord ? 'KYC updated successfully!' : 'KYC added successfully!', { autoClose: 1500 })
    } catch (error) {
      console.error('Error saving KYC record:', error)
      toast.error(error.response?.data?.message || 'Failed to save KYC record', { autoClose: 1500 })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this KYC record?')) return
    try {
      await axios.delete(`${API_URL}/api/kyc/${id}`, { withCredentials: true })
      fetchRecords()
    } catch (error) {
      console.error('Error deleting KYC record:', error)
    }
  }

  const openPreview = (url, title) => {
    setPreviewUrl(url)
    setPreviewTitle(title)
  }

  const getDocUrl = (doc, side) => {
    const url = side === 'front' ? doc.existingFrontUrl : doc.existingBackUrl
    if (!url) return null
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return `${API_URL}${url}`
  }

  const addDocumentEntry = () => {
    setForm(prev => ({ ...prev, documents: [...prev.documents, emptyDoc()] }))
  }

  const removeDocumentEntry = (index) => {
    setForm(prev => {
      const docs = prev.documents.filter((_, i) => i !== index)
      return { ...prev, documents: docs.length === 0 ? [emptyDoc()] : docs }
    })
  }

  const updateDocumentEntry = (index, updates) => {
    setForm(prev => {
      const docs = [...prev.documents]
      docs[index] = { ...docs[index], ...updates }
      return { ...prev, documents: docs }
    })
  }

  const getRecordDocs = (record) => {
    if (record.documents && record.documents.length > 0) return record.documents
    const doc = {
      documentType: record.documentType || '',
      otherDocumentType: record.otherDocumentType || '',
      documentNumber: record.documentNumber || '',
      documentFrontImg: record.documentFrontImg || record.documentImage || '',
      documentBackImg: record.documentBackImg || ''
    }
    return doc.documentType ? [doc] : []
  }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f0f9ff,_#f8fafc_45%,_#ffffff_100%)]'>
      <main className='px-2 pt-3 pb-10 lg:px-8 lg:pt-4'>
        <section className='w-full'>
          <div className='w-full'>
            <div className='rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.25)] md:p-5 lg:p-6'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
                <h1 className='text-xl font-black text-slate-900'>KYC Records</h1>
                <button
                  type='button'
                  onClick={openAddModal}
                  className='px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition cursor-pointer'
                >
                  + Add KYC
                </button>
              </div>

              <div className='mb-4'>
                <input
                  type='text'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search by name...'
                  className='w-full max-w-xs px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm'
                />
              </div>

              {loading ? (
                <div className='text-center py-12'>
                  <div className='animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto'></div>
                </div>
              ) : records.length === 0 ? (
                <div className='text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200'>
                  <p className='text-sm font-bold text-slate-500'>No KYC records found.</p>
                </div>
              ) : (
                <>
                  <div className='space-y-2 lg:hidden'>
                    {records.map((record) => {
                      const docs = getRecordDocs(record)
                      return (
                        <div key={record._id} className='flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-indigo-200 transition'>
                          <div className='min-w-0 flex-1'>
                            <p className='text-sm font-bold text-slate-800 truncate'>{record.name}</p>
                            <p className='text-[11px] text-slate-400 mt-0.5'>{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className='flex gap-1 flex-shrink-0 ml-2'>
                            <button onClick={() => navigate(`/kyc/${record._id}`)} className='p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer' title='View details'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                              </svg>
                            </button>
                            <button onClick={() => openEditModal(record)} className='p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer' title='Edit'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(record._id)} className='p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer' title='Delete'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className='hidden lg:grid lg:grid-cols-3 lg:gap-4'>
                    {records.map((record) => {
                      const docs = getRecordDocs(record)
                      return (
                        <div key={record._id} className='flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 transition'>
                          <div className='min-w-0 flex-1'>
                            <p className='text-sm font-bold text-slate-800 truncate'>{record.name}</p>
                            <p className='text-[11px] text-slate-400 mt-0.5'>{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className='flex gap-1 flex-shrink-0 ml-2'>
                            <button onClick={() => navigate(`/kyc/${record._id}`)} className='p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer' title='View details'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                              </svg>
                            </button>
                            <button onClick={() => openEditModal(record)} className='p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer' title='Edit'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(record._id)} className='p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer' title='Delete'>
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {showModal && (
        <div className='fixed inset-0 bg-black/60 z-[60] flex items-start md:items-center justify-center p-3 pt-16 md:p-4'>
          <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] md:max-h-[95vh] overflow-hidden flex flex-col'>
            <div className='bg-gradient-to-r from-indigo-600 to-blue-600 p-3 md:p-4 text-white flex-shrink-0'>
              <div className='flex justify-between items-center'>
                <div>
                  <h2 className='text-lg md:text-2xl font-bold'>{editingRecord ? 'Edit KYC' : 'Add New KYC'}</h2>
                  <p className='text-indigo-100 text-xs md:text-sm mt-1'>{editingRecord ? 'Update KYC record' : 'Add new KYC record'}</p>
                </div>
                <button onClick={() => setShowModal(false)} className='text-white hover:bg-white/20 rounded-lg p-1.5 md:p-2 transition cursor-pointer'>
                  <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
              <div className='flex-1 overflow-y-auto p-3 md:p-6'>
                <div className='bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                  <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                    <span className='bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                    Client Name
                  </h3>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Full Name <span className='text-red-500'>*</span></label>
                    <input type='text' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder='Enter client full name' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white' required />
                  </div>
                </div>

                {form.documents.map((doc, index) => (
                  <div key={index} className='bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6 relative'>
                    <div className='flex items-center justify-between mb-3 md:mb-4'>
                      <h3 className='text-base md:text-lg font-bold text-gray-800 flex items-center gap-2'>
                        <span className='bg-purple-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>{index + 2}</span>
                        Document {index + 1}
                      </h3>
                      {form.documents.length > 1 && (
                        <button type='button' onClick={() => removeDocumentEntry(index)} className='text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition cursor-pointer' title='Remove document'>
                          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4'>
                      <div>
                        <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Document Type <span className='text-red-500'>*</span></label>
                        <select value={doc.documentType} onChange={(e) => updateDocumentEntry(index, { documentType: e.target.value })} className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-sm'>
                          {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Document Number</label>
                        <input type='text' value={doc.documentNumber} onChange={(e) => updateDocumentEntry(index, { documentNumber: e.target.value })} placeholder='Document number' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm bg-white' />
                      </div>
                      {doc.documentType === 'Other' && (
                        <div>
                          <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Specify Type <span className='text-red-500'>*</span></label>
                          <input type='text' value={doc.otherDocumentType} onChange={(e) => updateDocumentEntry(index, { otherDocumentType: e.target.value })} placeholder='e.g. Driving License' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white' />
                        </div>
                      )}
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                      <div>
                        <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Front Side</label>
                        {doc.existingFrontUrl && !doc.frontFile && (
                          <p className='text-[10px] text-green-600 font-semibold mb-1'>Existing file kept</p>
                        )}
                        <div className='relative overflow-hidden'>
                          <button type='button' className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 text-left bg-white hover:border-purple-400 transition cursor-pointer truncate'>
                            <span className='flex items-center gap-2'>
                              <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' />
                              </svg>
                              {doc.frontFile ? doc.frontFile.name : 'Upload Front'}
                            </span>
                          </button>
                          <input type='file' accept='image/*,application/pdf' onChange={(e) => updateDocumentEntry(index, { frontFile: e.target.files[0] })} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer' />
                        </div>
                      </div>
                      <div>
                        <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Back Side</label>
                        {doc.existingBackUrl && !doc.backFile && (
                          <p className='text-[10px] text-green-600 font-semibold mb-1'>Existing file kept</p>
                        )}
                        <div className='relative overflow-hidden'>
                          <button type='button' className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 text-left bg-white hover:border-purple-400 transition cursor-pointer truncate'>
                            <span className='flex items-center gap-2'>
                              <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' />
                              </svg>
                              {doc.backFile ? doc.backFile.name : 'Upload Back'}
                            </span>
                          </button>
                          <input type='file' accept='image/*,application/pdf' onChange={(e) => updateDocumentEntry(index, { backFile: e.target.files[0] })} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer' />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button type='button' onClick={addDocumentEntry} className='w-full mb-4 md:mb-6 py-2.5 border-2 border-dashed border-purple-300 rounded-xl text-sm font-bold text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition cursor-pointer flex items-center justify-center gap-2'>
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                  </svg>
                  Add Another Document
                </button>

                <div className='bg-gradient-to-r from-slate-50 to-indigo-50 border-2 border-slate-200 rounded-xl p-3 md:p-6'>
                  <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                    <span className='bg-slate-700 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>{form.documents.length + 2}</span>
                    Additional
                  </h3>
                  <div>
                    <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Remarks</label>
                    <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows='2' placeholder='Optional remarks...' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none bg-white' />
                  </div>
                </div>
              </div>

              <div className='border-t border-gray-200 p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-end items-center gap-3 flex-shrink-0'>
                <div className='flex gap-2 md:gap-3 w-full md:w-auto'>
                  <button type='button' onClick={() => setShowModal(false)} className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition cursor-pointer'>Cancel</button>
                  <button type='submit' className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2 cursor-pointer'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                    </svg>
                    {editingRecord ? 'Update KYC' : 'Add KYC'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className='fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4' onClick={() => setPreviewUrl(null)}>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center p-4 border-b border-slate-200'>
              <h3 className='text-sm font-bold text-slate-800'>{previewTitle}</h3>
              <button onClick={() => setPreviewUrl(null)} className='text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            <div className='p-4'>
              {previewUrl.toLowerCase().includes('.pdf') ? (
                <iframe src={previewUrl} title={previewTitle} className='w-full h-96 rounded-xl border border-slate-200' />
              ) : (
                <img src={previewUrl} alt={previewTitle} className='w-full max-h-96 object-contain rounded-xl' />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KycPage
