import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { handleDateBlur as utilHandleDateBlur, handleSmartDateInput } from '../../../utils/dateFormatter'
import { validateVehicleNumberRealtime } from '../../../utils/vehicleNoCheck'
import { handlePaymentCalculation } from '../../../utils/paymentValidation'
import DocumentScannerPreview from '../../../components/DocumentScannerPreview'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const EditPermitModal = ({ isOpen, onClose, onSubmit, permit }) => {
  const [fetchingVehicle, setFetchingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const [vehicleValidation, setVehicleValidation] = useState({ isValid: false, message: '' })

  const [vehicleMatches, setVehicleMatches] = useState([])
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(0)
  const dropdownItemRefs = useRef([])

  const [formData, setFormData] = useState({
    vehicleNumber: '',
    name: '',
    workDate: '',
    validFrom: '',
    validTo: '',
    totalFee: '',
    paid: '',
    balance: '',
    permitDocumentData: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanningFile, setScanningFile] = useState(null)
  const [isExtractingPermit, setIsExtractingPermit] = useState(false)
  const [uploadedPermitDocument, setUploadedPermitDocument] = useState(null)
  const [uploadedPermitFile, setUploadedPermitFile] = useState(null)

  useEffect(() => {
    return () => {
      if (uploadedPermitDocument?.revokeOnCleanup && uploadedPermitDocument.previewUrl) {
        URL.revokeObjectURL(uploadedPermitDocument.previewUrl)
      }
    }
  }, [uploadedPermitDocument])

  useEffect(() => {
    if (permit) {
      setFormData({
        vehicleNumber: permit.vehicleNumber || '',
        name: permit.name || '',
        workDate: permit.workDate || '',
        validFrom: permit.validFrom || '',
        validTo: permit.validTo || '',
        totalFee: permit.totalFee?.toString() || '0',
        paid: permit.paid?.toString() || '0',
        balance: permit.balance?.toString() || '0',
        permitDocumentData: ''
      })
      if (permit.vehicleNumber) {
        setVehicleValidation(validateVehicleNumberRealtime(permit.vehicleNumber))
      }
    }
  }, [permit])

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        vehicleNumber: '',
        name: '',
        workDate: '',
        validFrom: '',
        validTo: '',
        totalFee: '',
        paid: '',
        balance: '',
        permitDocumentData: ''
      })
      setVehicleValidation({ isValid: false, message: '' })
      setFetchingVehicle(false)
      setVehicleError('')
      setVehicleMatches([])
      setShowVehicleDropdown(false)
      setSelectedDropdownIndex(0)
      setScanningFile(null)
      setIsExtractingPermit(false)
      setUploadedPermitDocument(prev => {
        if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return null
      })
      setUploadedPermitFile(null)
    }
  }, [isOpen])

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      const searchInput = formData.vehicleNumber.trim()
      if (searchInput.length < 4) {
        setVehicleError('')
        setVehicleMatches([])
        setShowVehicleDropdown(false)
        return
      }

      setFetchingVehicle(true)
      setVehicleError('')

      try {
        const response = await axios.get(`${API_URL}/api/vehicle/search/${searchInput}`, {
          withCredentials: true
        })

        if (response.data.success) {
          if (response.data.multiple) {
            setVehicleMatches(response.data.data)
            setShowVehicleDropdown(true)
            setSelectedDropdownIndex(0)
            setVehicleError('')
          } else {
            const vehicleData = response.data.data
            setFormData(prev => ({
              ...prev,
              vehicleNumber: vehicleData.registrationNumber,
              name: vehicleData.ownerName || prev.name,
            }))
            const validation = validateVehicleNumberRealtime(vehicleData.registrationNumber)
            setVehicleValidation(validation)
            setVehicleError('')
            setVehicleMatches([])
            setShowVehicleDropdown(false)
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setVehicleError('No vehicles found matching the search')
        } else {
          setVehicleError('Error fetching vehicle details')
        }
        setVehicleMatches([])
        setShowVehicleDropdown(false)
      } finally {
        setFetchingVehicle(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (formData.vehicleNumber) {
        fetchVehicleDetails()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.vehicleNumber])

  const handleVehicleSelect = (vehicle) => {
    setFormData(prev => ({
      ...prev,
      vehicleNumber: vehicle.registrationNumber,
      name: vehicle.ownerName || prev.name,
    }))
    setShowVehicleDropdown(false)
    setVehicleMatches([])
    setVehicleError('')
    setSelectedDropdownIndex(0)

    const validation = validateVehicleNumberRealtime(vehicle.registrationNumber)
    setVehicleValidation(validation)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'vehicleNumber') {
      const upperValue = value.toUpperCase()
      const validation = (upperValue.length === 9 || upperValue.length === 10)
        ? validateVehicleNumberRealtime(upperValue)
        : { isValid: false, message: '' }
      setVehicleValidation(validation)
      setFormData(prev => ({ ...prev, [name]: upperValue }))
      return
    }

    if (name === 'workDate' || name === 'validFrom' || name === 'validTo') {
      const formatted = handleSmartDateInput(value, formData[name] || '')
      if (formatted !== null) {
        setFormData(prev => ({ ...prev, [name]: formatted }))
      }
      return
    }

    if (name === 'totalFee' || name === 'paid') {
      setFormData(prev => {
        const paymentResult = handlePaymentCalculation(name, value, prev)
        return {
          ...prev,
          totalFee: name === 'totalFee' ? value : prev.totalFee,
          paid: paymentResult.paid,
          balance: paymentResult.balance
        }
      })
      return
    }

    const uppercaseFields = ['name']
    const finalValue = uppercaseFields.includes(name) ? value.toUpperCase() : value
    setFormData(prev => ({ ...prev, [name]: finalValue }))
  }

  const handleDateBlur = (e) => {
    utilHandleDateBlur(e, setFormData)
  }

  const processExtraction = async (fileToProcess) => {
    setIsExtractingPermit(true)

    setTimeout(() => {
      setUploadedPermitDocument(prev => {
        if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return {
          name: fileToProcess.name || 'permit-document',
          type: fileToProcess.type === 'application/pdf' ? 'pdf' : 'image',
          previewUrl: URL.createObjectURL(fileToProcess),
          revokeOnCleanup: true
        }
      })
      setIsExtractingPermit(false)
    }, 500)
  }

  const handleManualDocumentUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      setUploadedPermitFile(file)
      setUploadedPermitDocument(prev => {
        if (prev?.revokeOnCleanup && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl)
        return {
          name: file.name || 'permit-document',
          type: file.type === 'application/pdf' ? 'pdf' : 'image',
          previewUrl: URL.createObjectURL(file),
          revokeOnCleanup: true
        }
      })
      e.target.value = ''
      return
    }
    alert('Please upload an image or PDF file.')
  }

  const handleScannerConfirm = async (processedImageFile) => {
    setScanningFile(null)
    setUploadedPermitFile(processedImageFile)
    await processExtraction(processedImageFile)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!vehicleValidation.isValid && formData.vehicleNumber) {
      alert('Please enter a valid vehicle number in the format: CG04AA1234')
      return
    }

    setIsSubmitting(true)

    try {
      let permitDocumentData = ''
      if (uploadedPermitFile) {
        permitDocumentData = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(uploadedPermitFile)
        })
      }

      const submitData = {
        ...formData,
        permitDocumentData
      }

      await axios.put(`${API_URL}/api/permit/${permit._id}`, submitData, { withCredentials: true })
      if (onSubmit) {
        onSubmit(submitData)
      }
      onClose()
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.message || 'Failed to update permit')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-2 md:p-4'>
      <div className='bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col'>
        <div className='bg-gradient-to-r from-teal-600 to-emerald-600 p-3 md:p-4 text-white flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <div>
              <h2 className='text-lg md:text-2xl font-bold'>Edit Permit</h2>
              <p className='text-teal-100 text-xs md:text-sm mt-1'>Update vehicle permit record</p>
            </div>
            <div className='flex items-center gap-3'>
              <div className='relative overflow-hidden'>
                <button type='button' className='relative px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 max-w-full'>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Document
                </button>
                <input type='file' accept='image/*, application/pdf' onChange={handleManualDocumentUpload} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer' />
              </div>
              <button onClick={onClose} className='text-white hover:bg-white/20 rounded-lg p-1.5 md:p-2 transition cursor-pointer'>
                <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
          <div className='flex-1 overflow-y-auto p-3 md:p-6'>
            <div className='bg-gradient-to-r from-slate-50 to-gray-50 border-2 border-slate-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-slate-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>1</span>
                Permit Details
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Date of Work</label>
                  <input
                    type='text'
                    name='workDate'
                    value={formData.workDate}
                    onChange={handleChange}
                    onBlur={handleDateBlur}
                    placeholder='DD-MM-YYYY'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Vehicle Number <span className='text-red-500'>*</span></label>
                  <div className='relative'>
                    <input
                      type='text'
                      name='vehicleNumber'
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      placeholder='CG04AA1234'
                      maxLength='10'
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:border-transparent font-mono ${formData.vehicleNumber && !vehicleValidation.isValid ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                        }`}
                      required
                    />
                    {fetchingVehicle && (
                      <div className='absolute right-3 top-2.5'>
                        <svg className='animate-spin h-5 w-5 text-teal-600' fill='none' viewBox='0 0 24 24'>
                          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                        </svg>
                      </div>
                    )}
                    {showVehicleDropdown && vehicleMatches.length > 0 && (
                      <div className='absolute z-50 w-full mt-1 bg-white border border-teal-300 rounded-lg shadow-xl max-h-60 overflow-y-auto'>
                        {vehicleMatches.map((vehicle, index) => (
                          <div
                            key={vehicle._id}
                            ref={(el) => (dropdownItemRefs.current[index] = el)}
                            onClick={() => handleVehicleSelect(vehicle)}
                            className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-teal-50 transition ${index === selectedDropdownIndex ? 'bg-teal-100 border-l-4 border-l-teal-600' : ''
                              }`}
                          >
                            <div className='font-mono font-bold text-teal-700'>{vehicle.registrationNumber}</div>
                            <div className='text-xs text-gray-600 mt-1'>Owner: {vehicle.ownerName || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {vehicleValidation.message && (
                    <p className={`text-xs mt-1 ${vehicleValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicleValidation.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Name</label>
                  <input
                    type='text'
                    name='name'
                    value={formData.name}
                    onChange={handleChange}
                    placeholder='Enter name'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  />
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-teal-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>2</span>
                Validity Period
              </h3>

              <div className='grid grid-cols-2 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid From <span className='text-red-500'>*</span></label>
                  <input
                    type='text'
                    name='validFrom'
                    value={formData.validFrom}
                    onChange={handleChange}
                    onBlur={handleDateBlur}
                    placeholder='DD-MM-YYYY'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                    required
                  />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Valid To <span className='text-red-500'>*</span></label>
                  <input
                    type='text'
                    name='validTo'
                    value={formData.validTo}
                    onChange={handleChange}
                    onBlur={handleDateBlur}
                    placeholder='DD-MM-YYYY'
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                    required
                  />
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
              <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                <span className='bg-purple-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>3</span>
                Payment Information
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Total Fee (₹)</label>
                  <input type='number' name='totalFee' value={formData.totalFee} onChange={handleChange} placeholder='0' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold bg-white' />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Paid (₹)</label>
                  <input type='number' name='paid' value={formData.paid} onChange={handleChange} placeholder='0' className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold bg-white' />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-semibold text-gray-700 mb-1'>Balance (₹) <span className='text-xs text-gray-500'>(Auto)</span></label>
                  <input type='number' name='balance' value={formData.balance} readOnly className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-purple-50 font-semibold text-gray-700' />
                </div>
              </div>
              {parseFloat(formData.balance) > 0 && parseFloat(formData.paid) > 0 && (
                <div className='mt-3 bg-amber-50 border-l-4 border-amber-500 p-2 md:p-3 rounded'>
                  <p className='text-xs md:text-sm font-semibold text-amber-700'>Partial Payment - Balance: ₹{formData.balance}</p>
                </div>
              )}
              {parseFloat(formData.balance) === 0 && parseFloat(formData.totalFee) > 0 && (
                <div className='mt-3 bg-green-50 border-l-4 border-green-500 p-2 md:p-3 rounded'>
                  <p className='text-xs md:text-sm font-semibold text-green-700'>Fully Paid</p>
                </div>
              )}
            </div>

            {uploadedPermitDocument && (
              <div className='bg-gradient-to-r from-slate-50 to-teal-50 border-2 border-slate-200 rounded-xl p-3 md:p-6 mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2'>
                  <span className='bg-slate-700 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm'>4</span>
                  Uploaded Permit Document
                </h3>
                <div className='mb-3 flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 border border-slate-200'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-slate-800 truncate'>{uploadedPermitDocument.name}</p>
                    <p className='text-xs text-slate-500'>{uploadedPermitDocument.type === 'pdf' ? 'PDF preview' : 'Image preview'}</p>
                  </div>
                </div>
                {uploadedPermitDocument.type === 'pdf' ? (
                  <iframe src={uploadedPermitDocument.previewUrl} title='Uploaded Permit PDF' className='w-full h-80 rounded-xl border border-slate-200 bg-white' />
                ) : (
                  <div className='rounded-xl border border-slate-200 bg-white p-2'>
                    <img src={uploadedPermitDocument.previewUrl} alt='Uploaded Permit document' className='w-full max-h-80 object-contain rounded-lg' />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className='border-t border-gray-200 p-3 md:p-4 bg-gray-50 flex flex-col md:flex-row justify-end items-center gap-3 flex-shrink-0'>
            <div className='flex gap-2 md:gap-3 w-full md:w-auto'>
              <button type='button' onClick={onClose} className='flex-1 md:flex-none px-4 md:px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition cursor-pointer'>
                Cancel
              </button>
              <button type='submit' disabled={isSubmitting} className='flex-1 md:flex-none px-6 md:px-8 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>
                {isSubmitting ? 'Saving...' : 'Update Permit'}
              </button>
            </div>
          </div>
        </form>
      </div>
      {scanningFile && (
        <DocumentScannerPreview
          file={scanningFile}
          onCancel={() => setScanningFile(null)}
          onConfirm={handleScannerConfirm}
        />
      )}
    </div>
  )
}

export default EditPermitModal
