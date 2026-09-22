// MongoDB-backed Baileys auth state (the docs advise against useMultiFileAuthState in production).
// Same logic as Baileys' useMultiFileAuthState, with one document per file.
const WaAuthKey = require('../../models/WaAuthKey')
const WaSentMessage = require('../../models/WaSentMessage')

// sessionId → true when the saved credentials belong to a linked (registered) device.
// Kept in memory so status checks never hit the database.
const linked = new Map()

async function useMongoAuthState(sessionId, baileys) {
  const { BufferJSON, initAuthCreds, proto } = baileys
  const encode = (v) => JSON.stringify(v, BufferJSON.replacer)
  const decode = (s) => JSON.parse(s, BufferJSON.reviver)

  const read = async (key) => {
    const doc = await WaAuthKey.findOne({ sessionId, key }).lean()
    return doc ? decode(doc.value) : null
  }

  const creds = (await read('creds')) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const docs = await WaAuthKey.find({ sessionId, key: { $in: ids.map(id => `${type}-${id}`) } }).lean()
          const byKey = new Map(docs.map(d => [d.key, d.value]))
          const data = {}
          for (const id of ids) {
            const raw = byKey.get(`${type}-${id}`)
            let value = raw ? decode(raw) : null
            if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value)
            data[id] = value
          }
          return data
        },
        // Must be durable before resolving: losing a Signal key update breaks message delivery.
        set: async (data) => {
          const ops = []
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id]
              const key = `${type}-${id}`
              ops.push(value
                ? { updateOne: { filter: { sessionId, key }, update: { $set: { value: encode(value) } }, upsert: true } }
                : { deleteOne: { filter: { sessionId, key } } })
            }
          }
          if (ops.length) await WaAuthKey.bulkWrite(ops, { ordered: false })
        },
      },
    },
    saveCreds: async () => {
      await WaAuthKey.updateOne({ sessionId, key: 'creds' }, { $set: { value: encode(creds) } }, { upsert: true })
      linked.set(sessionId, !!creds.me?.id)
    },
  }
}

// Sent-message store for Baileys' getMessage (answers re-send requests).
function sentMessageStore(sessionId, baileys) {
  const { BufferJSON } = baileys
  return {
    save: (msg) => {
      if (!msg?.key?.id || !msg.message) return Promise.resolve()
      return WaSentMessage.updateOne(
        { sessionId, msgId: msg.key.id },
        { $set: { message: JSON.stringify(msg.message, BufferJSON.replacer), createdAt: new Date() } },
        { upsert: true }
      ).catch(() => {})
    },
    get: async (key) => {
      const doc = await WaSentMessage.findOne({ sessionId, msgId: key.id }).lean().catch(() => null)
      return doc ? JSON.parse(doc.message, BufferJSON.reviver) : undefined
    },
  }
}

// Session helpers used by WhatsAppSession (keyed by sessionId, e.g. "user_<id>").
const profile = {
  // Load which sessions have a linked login (call once at startup, before sessions are used).
  async load() {
    const docs = await WaAuthKey.find({ key: 'creds' }, { sessionId: 1, value: 1 }).lean()
    for (const d of docs) {
      try { linked.set(d.sessionId, !!JSON.parse(d.value)?.me?.id) } catch (_) {}
    }
    return linked.size
  },
  hasSavedSession(sessionId) {
    return linked.get(sessionId) === true
  },
  wipe(sessionId) {
    linked.delete(sessionId)
    return Promise.all([
      WaAuthKey.deleteMany({ sessionId }),
      WaSentMessage.deleteMany({ sessionId }),
    ]).catch(() => {})
  },
}

module.exports = { useMongoAuthState, sentMessageStore, profile }
