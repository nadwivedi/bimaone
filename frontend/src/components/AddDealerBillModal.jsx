import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const AddDealerBillModal = ({ isOpen, onClose, onSuccess }) => {
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }))
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState([
    { slNo: '1', description: '', quantity: '', rate: '', amount: '' },
    { slNo: '2', description: '', quantity: '', rate: '', amount: '' },
    { slNo: '3', description: '', quantity: '', rate: '', amount: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userInfo, setUserInfo] = useState(null)

  // Refs for navigation
  const customerNameRef = useRef(null)
  const descriptionRefs = useRef([])
  const amountRefs = useRef([])

  // Fetch user profile when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

  // Autofocus on customer name when modal opens
  useEffect(() => {
    if (isOpen && customerNameRef.current) {
      setTimeout(() => {
        customerNameRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Keyboard shortcut for closing the modal
  useEffect(() => {
    const handleModalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleModalKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleModalKeyDown)
    }
  }, [isOpen, onClose])

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
        withCredentials: true
      })
      if (response.data.success && response.data.data.user) {
        setUserInfo(response.data.data.user)
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
    }
  }

  // Quick add predefined items
  const quickAddItem = (description) => {
    // Check if item already exists
    const exists = items.some(item => item.description === description)
    if (exists) return

    // Find first empty row
    const emptyIndex = items.findIndex(item => !item.description || item.description.trim() === '')

    if (emptyIndex !== -1) {
      // Fill the empty row
      const newItems = [...items]
      newItems[emptyIndex] = { slNo: (emptyIndex + 1).toString(), description, quantity: '', rate: '', amount: '' }
      setItems(newItems)
    } else {
      // All rows filled, add new row
      setItems([...items, { slNo: (items.length + 1).toString(), description, quantity: '', rate: '', amount: '' }])
    }
  }

  // Calculate total amount
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0
      return sum + amount
    }, 0)
  }

  // Handle item change
  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value

    // Auto-calculate amount if quantity and rate are provided
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(field === 'quantity' ? value : newItems[index].quantity) || 0
      const rate = parseFloat(field === 'rate' ? value : newItems[index].rate) || 0
      newItems[index].amount = (quantity * rate).toString()
    }

    setItems(newItems)
    setError('')
  }

  // Handle Enter key navigation
  const handleKeyDown = (e, type, index) => {
    if (e.key === 'Enter') {
      e.preventDefault()

      if (type === 'customerName') {
        // Move to first description
        descriptionRefs.current[0]?.focus()
      } else if (type === 'description') {
        // Move to next description or first amount
        if (index < 2) {
          descriptionRefs.current[index + 1]?.focus()
        } else {
          amountRefs.current[0]?.focus()
        }
      } else if (type === 'amount') {
        // Move to next amount or submit
        if (index < 2) {
          amountRefs.current[index + 1]?.focus()
        } else {
          // Submit the form
          handleSubmit(e)
        }
      }
    }
  }

  // Add new custom item row
  const addItem = () => {
    setItems([...items, { slNo: (items.length + 1).toString(), description: '', quantity: '', rate: '', amount: '' }])
  }

  // Remove item row
  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      setItems(newItems)
    }
  }

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!customerName || customerName.trim() === '') {
      setError('Customer name is required')
      return
    }

    // Filter out empty items
    const filledItems = items.filter(item => item.description && item.description.trim() !== '')

    if (filledItems.length === 0) {
      setError('At least one item with description is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE_URL}/api/custom-bills`, {
        billDate,
        customerName: customerName.trim(),
        items: filledItems.map(item => ({
          slNo: item.slNo,
          description: item.description.trim(),
          quantity: item.quantity ? parseFloat(item.quantity) : '',
          rate: item.rate ? parseFloat(item.rate) : '',
          amount: item.amount ? parseFloat(item.amount) : ''
        })),
        totalAmount: calculateTotal()
      }, {
        withCredentials: true
      })

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create dealer bill')
      }

      const data = response.data

      alert('Dealer bill created successfully! Bill number: ' + data.data.billNumber)

      // Reset form
      setBillDate(new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }))
      setCustomerName('')
      setItems([
        { slNo: '1', description: '', quantity: '', rate: '', amount: '' },
        { slNo: '2', description: '', quantity: '', rate: '', amount: '' },
        { slNo: '3', description: '', quantity: '', rate: '', amount: '' }
      ])

      onSuccess && onSuccess(data.data)
      onClose()
    } catch (err) {
      console.error('Error submitting dealer bill:', err)
      setError(err.message || 'Failed to create dealer bill. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-0 md:p-4 overflow-y-auto'>
      <div className='bg-white rounded-none md:rounded-3xl shadow-2xl w-[95%] md:max-w-4xl 2xl:max-w-5xl md:w-full my-0 md:my-8 h-full md:h-auto md:max-h-[95vh] flex flex-col'>
        {/* Header */}
        <div className='bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-4 2xl:px-6 py-1.5 2xl:py-3 text-white flex-shrink-0 rounded-t-none md:rounded-t-3xl'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 2xl:gap-4'>
            <div className='flex items-center justify-between w-full sm:w-auto'>
              <h2 className='text-sm 2xl:text-lg font-bold'>Dealer Bill Generator</h2>
              <button
                type='button'
                onClick={onClose}
                className='w-6 h-6 2xl:w-8 2xl:h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all sm:hidden'
              >
                <svg className='w-3.5 h-3.5 2xl:w-5 2xl:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            {/* Quick Add Buttons */}
            <div className='flex gap-1 2xl:gap-2 flex-wrap sm:flex-nowrap sm:flex-1 justify-start sm:justify-center w-full sm:w-auto'>
              <button type='button' onClick={() => quickAddItem('Permit')} className='px-2 2xl:px-3 py-0.5 2xl:py-1 bg-white/20 hover:bg-white/30 rounded text-[9px] 2xl:text-xs font-semibold transition-all cursor-pointer'>+ Permit</button>
              <button type='button' onClick={() => quickAddItem('Fitness')} className='px-2 2xl:px-3 py-0.5 2xl:py-1 bg-white/20 hover:bg-white/30 rounded text-[9px] 2xl:text-xs font-semibold transition-all cursor-pointer'>+ Fitness</button>
              <button type='button' onClick={() => quickAddItem('Vehicle')} className='px-2 2xl:px-3 py-0.5 2xl:py-1 bg-white/20 hover:bg-white/30 rounded text-[9px] 2xl:text-xs font-semibold transition-all cursor-pointer'>+ V.Regt</button>
              <button type='button' onClick={() => quickAddItem('Temporary Registration')} className='px-2 2xl:px-3 py-0.5 2xl:py-1 bg-white/20 hover:bg-white/30 rounded text-[9px] 2xl:text-xs font-semibold transition-all cursor-pointer'>+ T.Regt</button>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='hidden sm:flex w-7 h-7 2xl:w-8 2xl:h-8 bg-white/20 hover:bg-white/30 rounded-lg items-center justify-center transition-all flex-shrink-0 cursor-pointer'
            >
              <svg className='w-4 h-4 2xl:w-5 2xl:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Bill Form styled like actual bill */}
        <form onSubmit={handleSubmit} className='flex-1 flex flex-col md:block'>
          {/* Scrollable Bill Content */}
          <div className='flex-1 overflow-y-auto p-2 md:p-3 2xl:p-4 pb-2 md:pb-0'>
            {/* Bill Preview - Scaled down */}
            <div className='w-full'>
              <div className='border-2 border-black p-3 2xl:p-6 bg-white w-full' style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Bill Header */}
            <div className='text-center mb-4 2xl:mb-6'>
              <div className='flex justify-between items-start mb-2.5 2xl:mb-3'>
                <div className='flex-1'></div>
                <div className='flex-1 text-center'>
                  <div className='inline-block bg-gray-800 text-white px-2.5 2xl:px-4 py-1 2xl:py-1 rounded-full text-[8.5px] 2xl:text-xs font-bold mb-2 2xl:mb-3 whitespace-nowrap'>
                    BILL / CASH MEMO
                  </div>
                </div>
                <div className='flex-1 text-right text-[8.5px] 2xl:text-xs font-bold'>
                  {userInfo?.mobile1 ? (
                    <>
                      Mob.: {userInfo.mobile1}<br />
                      {userInfo?.mobile2 && `        ${userInfo.mobile2}`}
                    </>
                  ) : (
                    'Mob.: __________'
                  )}
                </div>
              </div>
              <div>
                <h1 className='text-xl 2xl:text-4xl font-bold italic mb-1 2xl:mb-1' style={{ whiteSpace: 'nowrap' }}>
                  {userInfo?.billName ? userInfo.billName.toUpperCase() : (userInfo?.name ? userInfo.name.toUpperCase() : 'ASHOK KUMAR')}
                </h1>
                <p className='text-[9.5px] 2xl:text-sm italic mb-1.5 2xl:mb-2'>
                  {userInfo?.billDescription ? `(${userInfo.billDescription})` : '(Transport Consultant)'}
                </p>
                <p className='text-[8.5px] 2xl:text-xs mb-2.5 2xl:mb-3'>
                  {userInfo?.address}
                  {userInfo?.email && (
                    <>
                      <br />
                      Email : {userInfo.email}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Bill No and Date */}
            <div className='flex justify-between mb-2.5 2xl:mb-4 text-[9.5px] 2xl:text-sm'>
              <div>
                <span className='font-bold'>No.</span>
                <span className='ml-2 text-red-700 font-bold'>PENDING</span>
              </div>
              <div>
                <span className='font-bold'>Date</span>
                <input
                  type='text'
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className='ml-2 border-b border-black px-1.5 2xl:px-2 py-0.5 text-[9.5px] 2xl:text-sm w-20 2xl:w-32'
                  placeholder='DD/MM/YYYY'
                />
              </div>
            </div>

            {/* Customer Name */}
            <div className='mb-1 pb-1.5 2xl:pb-2 border-b border-black flex items-baseline gap-2'>
              <label className='text-[9.5px] 2xl:text-sm font-bold whitespace-nowrap'>M/s.</label>
              <input
                ref={customerNameRef}
                type='text'
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value.toUpperCase())}
                onKeyDown={(e) => handleKeyDown(e, 'customerName')}
                className='flex-1 border-none outline-none px-1.5 2xl:px-2 py-0.5 text-[9.5px] 2xl:text-sm uppercase'
                placeholder='Customer Name'
                required
              />
            </div>

            {/* Items Table */}
            <table className='w-full border-2 border-black mb-2.5 2xl:mb-4' style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className='bg-gray-200'>
                  <th className='border border-black px-1.5 2xl:px-2 py-1.5 2xl:py-2 text-[9.5px] 2xl:text-xs font-bold text-center' style={{ width: '8%' }}>
                    SI<br />No.
                  </th>
                  <th className='border border-black px-1.5 2xl:px-2 py-1.5 2xl:py-2 text-[9.5px] 2xl:text-xs font-bold text-center' style={{ width: '52%' }}>
                    DESCRIPTION
                  </th>
                  <th className='border border-black px-1.5 2xl:px-2 py-1.5 2xl:py-2 text-[9.5px] 2xl:text-xs font-bold text-center' style={{ width: '10%' }}>
                    Qty.
                  </th>
                  <th className='border border-black px-1.5 2xl:px-2 py-1.5 2xl:py-2 text-[9.5px] 2xl:text-xs font-bold text-center' style={{ width: '15%' }}>
                    Rate
                  </th>
                  <th className='border border-black px-1.5 2xl:px-2 py-1.5 2xl:py-2 text-[9.5px] 2xl:text-xs font-bold text-center' style={{ width: '15%' }}>
                    AMOUNT<br />Rs.
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className='border border-black px-1.5 2xl:px-2 text-center align-top pt-1.5 2xl:pt-2'>
                      <input
                        type='text'
                        value={item.slNo}
                        onChange={(e) => handleItemChange(index, 'slNo', e.target.value)}
                        className='w-full text-[10.5px] 2xl:text-sm text-center px-1 py-0.5 focus:outline-none focus:bg-yellow-50 font-bold text-blue-600'
                      />
                    </td>
                    <td className='border border-black px-1.5 2xl:px-2 align-top pt-1.5 2xl:pt-2'>
                      <textarea
                        ref={(el) => (descriptionRefs.current[index] = el)}
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value.toUpperCase())}
                        onKeyDown={(e) => handleKeyDown(e, 'description', index)}
                        className='w-full text-[10.5px] 2xl:text-sm px-1 py-0.5 focus:outline-none focus:bg-yellow-50 resize-none overflow-hidden uppercase'
                        rows={1}
                        style={{
                          lineHeight: '1.4',
                          height: 'auto',
                          minHeight: '20px'
                        }}
                        onInput={(e) => {
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                      />
                    </td>
                    <td className='border border-black px-1.5 2xl:px-2 text-center align-top pt-1.5 2xl:pt-2'>
                      <input
                        type='number'
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className='w-full text-[10.5px] 2xl:text-sm text-center px-1 py-0.5 focus:outline-none focus:bg-yellow-50'
                        min='0'
                        step='1'
                      />
                    </td>
                    <td className='border border-black px-1.5 2xl:px-2 text-right align-top pt-1.5 2xl:pt-2'>
                      <input
                        type='number'
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className='w-full text-[10.5px] 2xl:text-sm text-right px-1 py-0.5 focus:outline-none focus:bg-yellow-50'
                        placeholder='0'
                        min='0'
                        step='0.01'
                      />
                    </td>
                    <td className='border border-black px-1.5 2xl:px-2 text-right align-top pt-1.5 2xl:pt-2'>
                      <input
                        ref={(el) => (amountRefs.current[index] = el)}
                        type='number'
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'amount', index)}
                        className='w-full text-[10.5px] 2xl:text-sm text-right px-1 py-0.5 focus:outline-none focus:bg-yellow-50'
                        placeholder='0'
                        min='0'
                        step='0.01'
                      />
                    </td>
                  </tr>
                ))}
                <tr className='bg-gray-100'>
                  <td colSpan='4' className='border border-black px-1.5 2xl:px-2 py-1.5 2xl:py-2 text-right font-bold text-[10.5px] 2xl:text-sm'>
                    TOTAL
                  </td>
                  <td className='border border-black px-1.5 2xl:px-2 py-1.5 2xl:py-2 text-right font-bold text-[10.5px] 2xl:text-sm'>
                    ₹{calculateTotal().toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Add/Remove Item Buttons */}
            <div className='flex gap-2 mb-4'>
              <button
                type='button'
                onClick={addItem}
                className='px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors cursor-pointer'
              >
                + Add Row
              </button>
              {items.length > 1 && (
                <button
                  type='button'
                  onClick={() => removeItem(items.length - 1)}
                  className='px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors cursor-pointer'
                >
                  - Remove Last Row
                </button>
              )}
            </div>

            {/* Amount in Words */}
            <div className='mb-6 text-[10px] md:text-sm'>
              <span className='font-bold'>Rs</span>
              <span className='ml-2 border-b border-black inline-block px-2' style={{ minWidth: '200px' }}>
                {/* Amount in words will be shown on PDF */}
              </span>
            </div>

            {/* Signature */}
            <div className='text-right mt-8 md:mt-12'>
              <div className='text-[10px] md:text-sm font-bold'>
                For, {userInfo?.name ? userInfo.name.toUpperCase() : 'ASHOK KUMAR'}
              </div>
              </div>
              </div>
            </div>
          </div>

          {/* Fixed Bottom Section - Error and Buttons */}
          <div className='flex-shrink-0 bg-white border-t border-gray-200 md:border-0 p-2 md:p-0 md:px-8 md:pb-8'>
            {/* Error Message */}
            {error && (
              <div className='bg-red-50 border-2 border-red-500 rounded-xl p-2 md:p-4 mb-2 md:mt-4 md:mb-0'>
                <p className='text-xs md:text-sm text-red-700 font-semibold'>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className='flex gap-2 md:gap-3 mt-0 md:mt-6'>
              <button
                type='button'
                onClick={onClose}
                className='flex-1 px-3 2xl:px-6 py-2 2xl:py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold text-xs 2xl:text-base cursor-pointer'
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={loading || !customerName.trim()}
                className='flex-1 px-3 2xl:px-6 py-2 2xl:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-xs 2xl:text-base cursor-pointer'
              >
              {loading ? (
                <span className='flex items-center justify-center gap-2'>
                  <svg className='animate-spin h-4 2xl:h-5 w-4 2xl:w-5' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none'></circle>
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Generate Dealer Bill'
              )}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDealerBillModal

