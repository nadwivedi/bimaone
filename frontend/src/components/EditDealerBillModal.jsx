import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const EditDealerBillModal = ({ isOpen, onClose, onSuccess, billData }) => {
  const [billDate, setBillDate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState([
    { description: '', quantity: '', rate: '', amount: '' },
    { description: '', quantity: '', rate: '', amount: '' },
    { description: '', quantity: '', rate: '', amount: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userInfo, setUserInfo] = useState(null)

  // Fetch user profile when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

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

  // Populate form with bill data when modal opens
  useEffect(() => {
    if (billData && isOpen) {
      setBillDate(billData.billDate || new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }))
      setCustomerName(billData.customerName || '')

      // Load items or use default empty rows
      if (billData.items && billData.items.length > 0) {
        const loadedItems = billData.items.map(item => ({
          description: item.description || '',
          quantity: item.quantity || '',
          rate: item.rate || '',
          amount: item.amount || ''
        }))
        setItems(loadedItems)
      }
    }
  }, [billData, isOpen])

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
      newItems[emptyIndex] = { description, quantity: '', rate: '', amount: '' }
      setItems(newItems)
    } else {
      // All rows filled, add new row
      setItems([...items, { description, quantity: '', rate: '', amount: '' }])
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

  // Add new custom item row
  const addItem = () => {
    setItems([...items, { description: '', quantity: '', rate: '', amount: '' }])
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
      const response = await axios.put(`${API_BASE_URL}/api/custom-bills/${billData._id}`, {
        billDate,
        customerName: customerName.trim(),
        items: filledItems.map(item => ({
          description: item.description.trim(),
          quantity: item.quantity ? parseFloat(item.quantity) : '',
          rate: item.rate ? parseFloat(item.rate) : '',
          amount: item.amount ? parseFloat(item.amount) : ''
        })),
        totalAmount: calculateTotal()
      }, {
        withCredentials: true
      })

      const data = response.data

      if (!data.success) {
        throw new Error(data.message || 'Failed to update dealer bill')
      }

      alert('Dealer bill updated successfully! Bill number: ' + data.data.billNumber)

      onSuccess && onSuccess(data.data)
      onClose()
    } catch (err) {
      console.error('Error updating dealer bill:', err)
      setError(err.message || 'Failed to update dealer bill. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-0 md:p-4 overflow-y-auto'>
      <div className='bg-white rounded-none md:rounded-3xl shadow-2xl w-[95%] md:max-w-5xl md:w-full my-0 md:my-8 h-full md:h-auto md:max-h-[95vh] flex flex-col'>
        {/* Header */}
        <div className='bg-gradient-to-r from-orange-600 to-red-600 px-3 sm:px-6 py-2 sm:py-3 text-white flex-shrink-0 rounded-t-none md:rounded-t-3xl'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4'>
            <div className='flex items-center justify-between w-full sm:w-auto'>
              <div>
                <h2 className='text-base sm:text-lg font-bold'>Edit Dealer Bill - {billData?.billNumber}</h2>
                <p className='text-xs sm:text-sm text-orange-100'>Update bill details</p>
              </div>
              <button
                type='button'
                onClick={onClose}
                className='w-7 h-7 sm:w-8 sm:h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all sm:hidden'
              >
                <svg className='w-4 h-4 sm:w-5 sm:h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            {/* Quick Add Buttons */}
            <div className='flex gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap sm:flex-1 justify-start sm:justify-center w-full sm:w-auto'>
              <button type='button' onClick={() => quickAddItem('Permit')} className='px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] sm:text-xs font-semibold transition-all cursor-pointer'>+ Permit</button>
              <button type='button' onClick={() => quickAddItem('Fitness')} className='px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] sm:text-xs font-semibold transition-all cursor-pointer'>+ Fitness</button>
              <button type='button' onClick={() => quickAddItem('Vehicle')} className='px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] sm:text-xs font-semibold transition-all cursor-pointer'>+ V.Regt</button>
              <button type='button' onClick={() => quickAddItem('Temporary Registration')} className='px-2 sm:px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] sm:text-xs font-semibold transition-all cursor-pointer'>+ T.Regt</button>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='hidden sm:flex w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg items-center justify-center transition-all flex-shrink-0 cursor-pointer'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Bill Form styled like actual bill */}
        <form onSubmit={handleSubmit} className='flex-1 flex flex-col md:block'>
          {/* Scrollable Bill Content */}
          <div className='flex-1 overflow-y-auto p-2 md:p-4 pb-2 md:pb-0'>
            {/* Bill Preview */}
            <div className='w-full'>
              <div className='border-2 border-black p-4 md:p-6 bg-white w-full' style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Bill Header */}
            <div className='text-center mb-6'>
              <div className='flex justify-between items-start mb-3'>
                <div className='flex-1'></div>
                <div className='flex-1 text-center'>
                  <div className='inline-block bg-gray-800 text-white px-2 md:px-4 py-1 rounded-full text-[9px] md:text-xs font-bold mb-3 whitespace-nowrap'>
                    BILL / CASH MEMO
                  </div>
                </div>
                <div className='flex-1 text-right text-[9px] md:text-xs font-bold'>
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
                <h1 className='text-lg md:text-4xl font-bold italic mb-1' style={{ whiteSpace: 'nowrap' }}>
                  {userInfo?.billName ? userInfo.billName.toUpperCase() : (userInfo?.name ? userInfo.name.toUpperCase() : 'ASHOK KUMAR')}
                </h1>
                <p className='text-[10px] md:text-sm italic mb-2'>
                  {userInfo?.billDescription ? `(${userInfo.billDescription})` : '(Transport Consultant)'}
                </p>
                <p className='text-[9px] md:text-xs mb-3'>
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
            <div className='flex justify-between mb-4 text-[10px] md:text-sm'>
              <div>
                <span className='font-bold'>No.</span>
                <span className='ml-2 text-red-700 font-bold text-lg'>{billData?.billNumber || 'N/A'}</span>
              </div>
              <div>
                <span className='font-bold'>Date</span>
                <input
                  type='text'
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className='ml-2 border-b border-black px-2 py-0.5 text-[10px] md:text-sm w-20 md:w-32'
                  placeholder='DD/MM/YYYY'
                />
              </div>
            </div>

            {/* Customer Name */}
            <div className='mb-4 pb-2 border-b border-black flex items-baseline gap-2'>
              <label className='text-[10px] md:text-sm font-bold whitespace-nowrap'>M/s.</label>
              <input
                type='text'
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value.toUpperCase())}
                className='flex-1 border-b border-black px-2 py-0.5 text-[10px] md:text-sm uppercase'
                placeholder='Customer Name'
                required
              />
            </div>

            {/* Items Table */}
            <table className='w-full border-2 border-black mb-4' style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className='bg-gray-200'>
                  <th className='border border-black px-2 py-2 text-xs font-bold text-center' style={{ width: '8%' }}>
                    SI<br />No.
                  </th>
                  <th className='border border-black px-2 py-2 text-xs font-bold text-center' style={{ width: '52%' }}>
                    DESCRIPTION
                  </th>
                  <th className='border border-black px-2 py-2 text-xs font-bold text-center' style={{ width: '10%' }}>
                    Qty.
                  </th>
                  <th className='border border-black px-2 py-2 text-xs font-bold text-center' style={{ width: '15%' }}>
                    Rate
                  </th>
                  <th className='border border-black px-2 py-2 text-xs font-bold text-center' style={{ width: '15%' }}>
                    AMOUNT<br />Rs.
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className='border border-black px-2 text-center align-top pt-2 text-sm font-bold text-blue-600'>
                      {index + 1}
                    </td>
                    <td className='border border-black px-2 align-top pt-2'>
                      <textarea
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value.toUpperCase())}
                        className='w-full text-sm px-1 py-0.5 focus:outline-none focus:bg-yellow-50 resize-none overflow-hidden uppercase'
                        rows={1}
                        style={{
                          lineHeight: '1.4',
                          height: 'auto',
                          minHeight: '24px'
                        }}
                        onInput={(e) => {
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                      />
                    </td>
                    <td className='border border-black px-2 text-center align-top pt-2'>
                      <input
                        type='number'
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className='w-full text-sm text-center px-1 py-0.5 focus:outline-none focus:bg-yellow-50'
                        min='0'
                        step='1'
                      />
                    </td>
                    <td className='border border-black px-2 text-right align-top pt-2'>
                      <input
                        type='number'
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className='w-full text-sm text-right px-1 py-0.5 focus:outline-none focus:bg-yellow-50'
                        placeholder='0'
                        min='0'
                        step='0.01'
                      />
                    </td>
                    <td className='border border-black px-2 text-right align-top pt-2'>
                      <input
                        type='number'
                        value={item.amount}
                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                        className='w-full text-sm text-right px-1 py-0.5 focus:outline-none focus:bg-yellow-50'
                        placeholder='0'
                        min='0'
                        step='0.01'
                      />
                    </td>
                  </tr>
                ))}
                <tr className='bg-gray-100'>
                  <td colSpan='4' className='border border-black px-2 py-2 text-right font-bold text-sm'>
                    TOTAL
                  </td>
                  <td className='border border-black px-2 py-2 text-right font-bold text-sm'>
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
                className='flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold text-sm md:text-base cursor-pointer'
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={loading || !customerName.trim()}
                className='flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base cursor-pointer'
              >
                {loading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <svg className='animate-spin h-5 w-5' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Dealer Bill'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditDealerBillModal

