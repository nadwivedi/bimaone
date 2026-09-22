// WhatsApp activity log: console + one file per IST day in backend/logs/whatsapp/.
const fs = require('fs')
const os = require('os')
const path = require('path')

const LOGS_DIR = path.join(__dirname, '../logs/whatsapp')
try { fs.mkdirSync(LOGS_DIR, { recursive: true }) } catch (_) {}

const ist = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000)
const stamp = () => ist().toISOString().replace('T', ' ').slice(0, 19)
const fileFor = () => path.join(LOGS_DIR, `whatsapp-${ist().toISOString().slice(0, 10)}.log`)

const write = (level, userId, event, message, err) => {
  const line = `[${stamp()} IST] ${level.padEnd(5)} ${userId ? `[user:${userId}] ` : ''}${event}${message ? ` — ${message}` : ''}${err?.stack ? `\n${err.stack}` : ''}`
  if (level === 'ERROR') console.error(`[WHATSAPP] ${line}`)
  else if (level === 'WARN') console.warn(`[WHATSAPP] ${line}`)
  else console.log(`[WHATSAPP] ${line}`)
  fs.appendFile(fileFor(), `${line}\n`, () => {})
}

module.exports = {
  info: (userId, event, message) => write('INFO', userId, event, message),
  warn: (userId, event, message) => write('WARN', userId, event, message),
  error: (userId, event, message, err) => write('ERROR', userId, event, message, err),
  cronStart: (users) => write('INFO', '', 'SENDER_RUN', `${users} user(s) have pending messages`),
  cronUserSkip: (userId, reason) => write('INFO', userId, 'SENDER_SKIP', reason),
  cronUserQueued: (userId, count) => write('INFO', userId, 'SENDER_BATCH', `Sending ${count} message(s)`),
  messageFailed: (userId, number, err) => write('WARN', userId, 'MSG_FAILED', `${number}: ${err?.message || 'unknown error'}`),
  getSystemRamStats: () => {
    const total = os.totalmem()
    const free = os.freemem()
    return { totalMb: Math.round(total / 1048576), freeMb: Math.round(free / 1048576), freePercent: Math.round((free / total) * 100) }
  },
}
