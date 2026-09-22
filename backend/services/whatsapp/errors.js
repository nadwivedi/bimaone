// WhatsApp can't send right now (not connected, paused, needs a QR scan, browser restarting).
// The message should stay pending and be retried later — it is not the message's fault.
class WaUnavailableError extends Error {
  constructor(message, reason = 'unavailable') {
    super(message)
    this.name = 'WaUnavailableError'
    this.code = 'WA_UNAVAILABLE'
    this.reason = reason
  }
}

// The message itself can never be delivered (number not on WhatsApp, invalid number).
class WaRecipientError extends Error {
  constructor(message) {
    super(message)
    this.name = 'WaRecipientError'
    this.code = 'WA_RECIPIENT'
  }
}

function withTimeout(promise, ms, label = 'operation') {
  let timer
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    }),
  ])
}

module.exports = { WaUnavailableError, WaRecipientError, withTimeout }
