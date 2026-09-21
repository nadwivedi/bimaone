/**
 * Helper to dynamically load Razorpay Checkout SDK Script
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true)
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Open Razorpay Standard Checkout Modal
 */
export const openRazorpayCheckout = async ({
  order_id,
  amount,
  currency = 'INR',
  key_id,
  name = 'BimaOne',
  description = 'Subscription Plan Purchase',
  image = '/bimalogo.png',
  prefill = {},
  theme = { color: '#003afd' },
  onSuccess,
  onFailure,
  onDismiss,
}) => {
  const isLoaded = await loadRazorpayScript()
  if (!isLoaded) {
    if (onFailure) {
      onFailure(new Error('Failed to load Razorpay SDK. Please check your internet connection.'))
    }
    return
  }

  const razorpayKey = key_id || import.meta.env.VITE_RAZORPAY_KEY_ID

  if (!razorpayKey) {
    if (onFailure) {
      onFailure(new Error('Razorpay key is not configured. Please set VITE_RAZORPAY_KEY_ID.'))
    }
    return
  }

  const options = {
    key: razorpayKey,
    amount: amount, // in paise
    currency: currency,
    name: name,
    description: description,
    image: image,
    order_id: order_id,
    prefill: {
      name: prefill.name || '',
      email: prefill.email || '',
      contact: prefill.contact || prefill.mobile || '',
    },
    theme: theme,
    handler: function (response) {
      if (onSuccess) {
        onSuccess({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        })
      }
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) {
          onDismiss()
        }
      },
    },
  }

  const rzp = new window.Razorpay(options)

  rzp.on('payment.failed', function (response) {
    if (onFailure) {
      onFailure(response.error)
    }
  })

  rzp.open()
}
