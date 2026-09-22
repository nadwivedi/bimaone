function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10)
  return Number.isFinite(v) && v >= 0 ? v : fallback
}

function envBool(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase())
}

const config = {
  // Default (on-demand): WhatsApp is connected only to send pending messages and disconnected
  // afterwards; the login stays saved on disk. Set WHATSAPP_KEEP_ALIVE=true to keep sessions
  // connected permanently instead (a Baileys connection is only ~20-80 MB).
  keepAlive: envBool('WHATSAPP_KEEP_ALIVE', false),
  // On-demand mode: disconnect once idle (nothing sent) for this long.
  idleCloseMs: envInt('WHATSAPP_IDLE_CLOSE_SEC', 60) * 1000,

  // Connecting (and finishing a QR login) must complete within this time.
  launchTimeoutMs: envInt('WHATSAPP_LAUNCH_TIMEOUT_SEC', 90) * 1000,
  // How many WhatsApp connections may be open at the same time across ALL users. A session holds
  // its slot for its whole life (connect, QR scan, login, sending) until it disconnects; other
  // users wait in a queue. Default 1 = one user at a time. With WHATSAPP_KEEP_ALIVE=true raise this
  // to the number of users, otherwise the first connected user blocks everyone else.
  maxActiveSessions: Math.max(1, envInt('WHATSAPP_MAX_ACTIVE_SESSIONS', 1)),

  // QR screen: closed when nobody has polled the page for qrIdleMs, or after qrMaxMs in total.
  qrIdleMs: envInt('WHATSAPP_QR_IDLE_SEC', 90) * 1000,
  qrMaxMs: envInt('WHATSAPP_QR_MAX_SEC', 300) * 1000,

  // Health check of running sessions.
  watchdogIntervalMs: envInt('WHATSAPP_WATCHDOG_SEC', 60) * 1000,
  // Consecutive failed health checks before the connection is restarted.
  watchdogFailLimit: 2,

  // Automatic reconnect delays after a crash / transient disconnect (ms).
  reconnectDelaysMs: [15e3, 60e3, 2 * 60e3, 5 * 60e3, 10 * 60e3],

  sendTimeoutMs: 60 * 1000,
  // How long a send waits for a (re)connecting session (incl. waiting for a free slot).
  sendWaitReadyMs: envInt('WHATSAPP_SEND_WAIT_READY_SEC', 180) * 1000,

  // Delay between boot-time session restores (keep-alive mode).
  bootStaggerMs: 5 * 1000,
}

module.exports = config