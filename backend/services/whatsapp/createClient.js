const { BaileysClient } = require('./baileysClient')

// One lightweight WebSocket connection per session (no browser).
function createClient({ sessionId }) {
  return new BaileysClient({ sessionId })
}

module.exports = createClient
