import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const EditRcModal = ({ isOpen, onClose, onSubmit, rc }) => {
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    chassisNo: '',
    engineNo: '',
    make: '',
    model: '',
  })
  const [rcFrontFile, setRcFrontFile] = useState(null)
  const [rcBackFile, setRcBackFile] = useState(null)
  const [rcFrontPreview, setRcFrontPreview] = useState(null)
  const [rcBackPreview, setRcBackPreview] = useState(null)

  useEffect(() => {
    if (rc) {
      setFormData({
        vehicleNumber: rc.vehicleNumber || '',
        chassisNo: rc.chassisNo || '',
        engineNo: rc.engineNo || '',
        make: rc.make || '',
        model: rc.model || '',
      })
      setRcFrontPreview(null)
      setRcBackPreview(null)
      setRcFrontFile(null)
      setRcBackFile(null)
    }
  }, [rc])

  useEffect(() => {
    return () => {
      if (rcFrontPreview?.startsWith('blob:')) URL.revokeObjectURL(rcFrontPreview)
      if (rcBackPreview?.startsWith('blob:')) URL.revokeObjectURL(rcBackPreview)
    }
  }, [rcFrontPreview, rcBackPreview])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'vehicleNumber') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }))
      return
    }
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (e, side) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      if (file) alert('Please upload an image file.')
      return
    }
    if (side === 'front') {
      if (rcFrontPreview?.startsWith('blob:')) URL.revokeObjectURL(rcFrontPreview)
      setRcFrontFile(file)
      setRcFrontPreview(URL.createObjectURL(file))
    } else {
      if (rcBackPreview?.startsWith('blob:')) URL.revokeObjectURL(rcBackPreview)
      setRcBackFile(file)
      setRcBackPreview(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  const removeImage = (side) => {
    if (side === 'front') {
      if (rcFrontPreview?.startsWith('blob:')) URL.revokeObjectURL(rcFrontPreview)
      setRcFrontFile(null)
      setRcFrontPreview(null)
    } else {
      if (rcBackPreview?.startsWith('blob:')) URL.revokeObjectURL(rcBackPreview)
      setRcBackFile(null)
      setRcBackPreview(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.vehicleNumber.trim()) {
      alert('Vehicle number is required')
      return
    }
    if (onSubmit) {
      const toBase64 = (file) => new Promise((resolve) => {
        if (!file) return resolve('')
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(file)
      })
      const rcFrontImageData = await toBase64(rcFrontFile)
      const rcBackImageData = await toBase64(rcBackFile)
      onSubmit({ ...formData, rcFrontImageData, rcBackImageData })
    }
    onClose()
  }

  if (!isOpen) return null

  const getFullUrl = (path) => {
    if (!path) return null
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path
    return `${API_URL}${path}`
  }

  return (
    <div className='fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-2 md:p-4'>
      <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col'>
        <div className='bg-gradient-to-r from-orange-600 to-amber-600 p-3 md:p-4 text-white flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <div>
              <h2 className='text-lg md:text-2xl font-bold'>Edit RC</h2>
              <p className='text-orange-100 text-xs md:text-sm mt-1'>Update registration certificate details</p>
            </div>
            <button onClick={onClose} className='text-white hover:bg-white/20 rounded-lg p-1.5 md:p-2 transition cursor-pointer'>
              <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex-1 overflow-y-auto p-3 md:p-6'>
            <div className='bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-slate-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                RC Details
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Vehicle Number <span className='text-red-500'>*</span></label>
                  <input
                    type='text'
                    name='vehicleNumber'
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    placeholder='CG04AA1234'
                    maxLength='10'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono'
                    required
                  />
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Make</label>
                  <input
                    type='text'
                    name='make'
                    value={formData.make}
                    onChange={handleChange}
                    placeholder='e.g. Tata, Ashok Leyland'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  />
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Model</label>
                  <input
                    type='text'
                    name='model'
                    value={formData.model}
                    onChange={handleChange}
                    placeholder='e.g. 2518TC, 4018'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  />
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Chassis No</label>
                  <input
                    type='text'
                    name='chassisNo'
                    value={formData.chassisNo}
                    onChange={handleChange}
                    placeholder='Chassis number'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  />
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Engine No</label>
                  <input
                    type='text'
                    name='engineNo'
                    value={formData.engineNo}
                    onChange={handleChange}
                    placeholder='Engine number'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  />
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-orange-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
                RC Images
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Front Image */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-2'>Front Side</label>
                  {rcFrontPreview ? (
                    <div className='relative rounded-xl border-2 border-orange-200 overflow-hidden bg-white'>
                      <img src={rcFrontPreview} alt='RC Front' className='w-full h-40 object-contain' />
                      <button
                        type='button'
                        onClick={() => removeImage('front')}
                        className='absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition cursor-pointer'
                      >
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </div>
                  ) : rc?.rcFrontImage ? (
                    <div className='relative rounded-xl border-2 border-orange-200 overflow-hidden bg-white'>
                      <img src={getFullUrl(rc.rcFrontImage)} alt='RC Front' className='w-full h-40 object-contain' />
                      <label className='absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition cursor-pointer group'>
                        <span className='text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition'>Click to change</span>
                        <input type='file' accept='image/*' className='hidden' onChange={(e) => handleImageUpload(e, 'front')} />
                      </label>
                    </div>
                  ) : (
                    <label className='flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition'>
                      <svg className='w-8 h-8 text-slate-400 mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                      </svg>
                      <span className='text-xs font-semibold text-slate-500'>Upload Front Image</span>
                      <input type='file' accept='image/*' className='hidden' onChange={(e) => handleImageUpload(e, 'front')} />
                    </label>
                  )}
                </div>

                {/* Back Image */}
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-2'>Back Side</label>
                  {rcBackPreview ? (
                    <div className='relative rounded-xl border-2 border-orange-200 overflow-hidden bg-white'>
                      <img src={rcBackPreview} alt='RC Back' className='w-full h-40 object-contain' />
                      <button
                        type='button'
                        onClick={() => removeImage('back')}
                        className='absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition cursor-pointer'
                      >
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </div>
                  ) : rc?.rcBackImage ? (
                    <div className='relative rounded-xl border-2 border-orange-200 overflow-hidden bg-white'>
                      <img src={getFullUrl(rc.rcBackImage)} alt='RC Back' className='w-full h-40 object-contain' />
                      <label className='absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition cursor-pointer group'>
                        <span className='text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition'>Click to change</span>
                        <input type='file' accept='image/*' className='hidden' onChange={(e) => handleImageUpload(e, 'back')} />
                      </label>
                    </div>
                  ) : (
                    <label className='flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition'>
                      <svg className='w-8 h-8 text-slate-400 mb-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                      </svg>
                      <span className='text-xs font-semibold text-slate-500'>Upload Back Image</span>
                      <input type='file' accept='image/*' className='hidden' onChange={(e) => handleImageUpload(e, 'back')} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className='border-t border-gray-200 p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-end items-center gap-3 flex-shrink-0'>
            <div className='flex gap-2 md:gap-3 w-full md:w-auto'>
              <button type='button' onClick={onClose} className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition cursor-pointer'>
                Cancel
              </button>
              <button type='submit' className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2 cursor-pointer'>
                Update RC
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditRcModal
