// Needs a local MongoDB (uses a throwaway database). Run: node --test tests/
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const { useMongoAuthState, sentMessageStore, profile } = require('../services/whatsapp/mongoAuthState')
const { loadBaileys } = require('../services/whatsapp/baileysClient')

let baileys
before(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/rto_wa_auth_test', { serverSelectionTimeoutMS: 5000 })
  await mongoose.connection.dropDatabase()
  await require('../models/WaAuthKey').syncIndexes()
  await require('../models/WaSentMessage').syncIndexes()
  baileys = await loadBaileys()
})
after(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

test('credentials survive a save/load round trip (including binary keys)', async () => {
  const a = await useMongoAuthState('user_a', baileys)
  assert.equal(profile.hasSavedSession('user_a'), false)
  a.state.creds.me = { id: '919876543210:3@s.whatsapp.net' }
  await a.saveCreds()
  assert.equal(profile.hasSavedSession('user_a'), true)

  const b = await useMongoAuthState('user_a', baileys)
  assert.equal(b.state.creds.me.id, '919876543210:3@s.whatsapp.net')
  assert.ok(Buffer.isBuffer(b.state.creds.noiseKey.private))
  assert.deepEqual(b.state.creds.noiseKey.private, a.state.creds.noiseKey.private)
  assert.equal(b.state.creds.registrationId, a.state.creds.registrationId)
})

test('signal keys: set, get, overwrite, delete (null)', async () => {
  const { state } = await useMongoAuthState('user_k', baileys)
  const k1 = { keyPair: { public: Buffer.from([1, 2, 3]), private: Buffer.from([4, 5]) }, keyId: 1 }
  await state.keys.set({ 'pre-key': { 1: k1, 2: { keyPair: { public: Buffer.from([9]), private: Buffer.from([8]) }, keyId: 2 } } })
  let got = await state.keys.get('pre-key', ['1', '2', '3'])
  assert.deepEqual(got['1'].keyPair.public, Buffer.from([1, 2, 3]))
  assert.equal(got['3'], null)
  await state.keys.set({ 'pre-key': { 1: null, 2: { keyPair: { public: Buffer.from([7]), private: Buffer.from([7]) }, keyId: 2 } } })
  got = await state.keys.get('pre-key', ['1', '2'])
  assert.equal(got['1'], null)
  assert.deepEqual(got['2'].keyPair.public, Buffer.from([7]))

  await state.keys.set({ 'app-state-sync-key': { AAA: { keyData: Buffer.from([5, 5]), timestamp: 1 } } })
  const ask = await state.keys.get('app-state-sync-key', ['AAA'])
  assert.deepEqual(Buffer.from(ask.AAA.keyData), Buffer.from([5, 5]))
})

test('sessions are isolated; wipe removes only that session; load() restores the linked list', async () => {
  const x = await useMongoAuthState('user_x', baileys)
  x.state.creds.me = { id: '911111111111:1@s.whatsapp.net' }
  await x.saveCreds()
  await x.state.keys.set({ session: { 's1': { data: Buffer.from([1]) } } })
  await profile.wipe('user_x')
  assert.equal(profile.hasSavedSession('user_x'), false)
  const fresh = await useMongoAuthState('user_x', baileys)
  assert.equal(fresh.state.creds.me, undefined)
  assert.equal((await fresh.state.keys.get('session', ['s1'])).s1, null)
  assert.equal(profile.hasSavedSession('user_a'), true) // untouched

  const n = await profile.load()
  assert.ok(n >= 1)
  assert.equal(profile.hasSavedSession('user_a'), true)
})

test('sent messages are kept for re-send requests', async () => {
  const store = sentMessageStore('user_s', baileys)
  await store.save({ key: { id: 'MSG1' }, message: { conversation: 'hello', extra: { data: Buffer.from([1, 2]) } } })
  const m = await store.get({ id: 'MSG1' })
  assert.equal(m.conversation, 'hello')
  assert.deepEqual(m.extra.data, Buffer.from([1, 2]))
  assert.equal(await store.get({ id: 'nope' }), undefined)
})
