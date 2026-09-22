import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const KycDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewTitle, setPreviewTitle] = useState('')

  useEffect(() => {
    fetchRecord()
  }, [id])

  const fetchRecord = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/kyc/${id}`, { withCredentials: true })
      if (res.data.success) setRecord(res.data.data)
    } catch (error) {
      console.error('Error fetching KYC record:', error)
      toast.error('Failed to load KYC record')
    } finally {
      setLoading(false)
    }
  }

  const getRecordDocs = (rec) => {
    if (!rec) return []
    if (rec.documents && rec.documents.length > 0) return rec.documents
    const doc = {
      documentType: rec.documentType || '',
      otherDocumentType: rec.otherDocumentType || '',
      documentNumber: rec.documentNumber || '',
      documentFrontImg: rec.documentFrontImg || rec.documentImage || '',
      documentBackImg: rec.documentBackImg || ''
    }
    return doc.documentType ? [doc] : []
  }

  const openPreview = (url, title) => {
    setPreviewUrl(url)
    setPreviewTitle(title)
  }

  const resolveUrl = (url) => (url.startsWith('http') || url.startsWith('data:') ? url : `${API_URL}${url}`)

  if (loading) {
    return (
      <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f0f9ff,_#f8fafc_45%,_#ffffff_100%)] flex items-center justify-center py-24'>
        <div className='animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full'></div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f0f9ff,_#f8fafc_45%,_#ffffff_100%)]'>
        <main className='px-2 pt-3 pb-10 lg:px-8 lg:pt-4'>
          <div className='max-w-3xl mx-auto text-center py-24'>
            <p className='text-sm font-bold text-slate-500'>KYC record not found.</p>
            <button onClick={() => navigate('/kyc')} className='mt-4 px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition cursor-pointer'>
              Back to KYC Records
            </button>
          </div>
        </main>
      </div>
    )
  }

  const docs = getRecordDocs(record)

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f0f9ff,_#f8fafc_45%,_#ffffff_100%)]'>
      <main className='px-2 pt-3 pb-10 lg:px-8 lg:pt-4'>
        <section className='w-full'>
          <div className='max-w-3xl mx-auto'>
            <div className='rounded-[32px] border border-slate-200 bg-white p-4 shadow-[0_28px_60px_-34px_rgba(15,23,42,0.25)] md:p-5 lg:p-6'>
              <div className='flex items-start justify-between gap-3 mb-6'>
                <div className='min-w-0'>
                  <button onClick={() => navigate('/kyc')} className='flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition mb-2 cursor-pointer'>
                    <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M15 19l-7-7 7-7' />
                    </svg>
                    Back to KYC Records
                  </button>
                  <h1 className='text-xl font-black text-slate-900 truncate'>{record.name}</h1>
                  {record.remarks && <p className='text-xs text-slate-400 mt-1'>{record.remarks}</p>}
                </div>
                <button
                  onClick={() => navigate('/kyc', { state: { editId: record._id } })}
                  className='flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition cursor-pointer'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                  </svg>
                  Edit
                </button>
              </div>

              {docs.length === 0 ? (
                <div className='text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200'>
                  <p className='text-sm font-bold text-slate-500'>No documents added.</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {docs.map((d, i) => (
                    <div key={i} className='rounded-xl border border-slate-200 p-4'>
                      <div className='flex items-center justify-between mb-3'>
                        <span className='text-sm font-bold text-slate-700'>
                          {d.documentType}{d.documentType === 'Other' && d.otherDocumentType ? ` (${d.otherDocumentType})` : ''}
                        </span>
                        {d.documentNumber && <span className='text-xs font-mono text-slate-500'>{d.documentNumber}</span>}
                      </div>
                      <div className='flex gap-3'>
                        {d.documentFrontImg ? (
                          <button onClick={() => openPreview(resolveUrl(d.documentFrontImg), `${d.documentType} Front`)} className='flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg text-xs text-indigo-600 font-semibold hover:bg-indigo-100 transition cursor-pointer'>
                            Front
                            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                            </svg>
                          </button>
                        ) : (
                          <span className='px-3 py-1.5 text-xs text-slate-300'>No front image</span>
                        )}
                        {d.documentBackImg ? (
                          <button onClick={() => openPreview(resolveUrl(d.documentBackImg), `${d.documentType} Back`)} className='flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg text-xs text-indigo-600 font-semibold hover:bg-indigo-100 transition cursor-pointer'>
                            Back
                            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                            </svg>
                          </button>
                        ) : (
                          <span className='px-3 py-1.5 text-xs text-slate-300'>No back image</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

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

export default KycDetail
