#!/usr/bin/env node
/**
 * End-to-end API smoke test for the ResQLink road-accident workflow.
 * Run against a running backend that was started with SEED_DEMO_DATA=true:
 *
 *   API=http://localhost:8080 DEMO_PASSWORD=<same as backend> node scripts/e2e-smoke.mjs
 *
 * Exits non-zero on the first failed check. Chat steps require valid Nexconn credentials on the server.
 */
const API = (process.env.API ?? 'http://localhost:8080').replace(/\/$/, '') + '/api/v1'
const PW = process.env.DEMO_PASSWORD
if (!PW) { console.error('Set DEMO_PASSWORD to the password used for SEED_DEMO_DATA'); process.exit(2) }

let passed = 0
async function call(method, path, { token, body, form } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) })
  const text = await res.text()
  let json; try { json = text ? JSON.parse(text) : null } catch { json = text }
  return { status: res.status, json }
}
function check(name, cond, extra = '') {
  if (!cond) { console.error(`✗ ${name} ${extra}`); process.exit(1) }
  passed++; console.log(`✓ ${name}`)
}
async function login(email) {
  const r = await call('POST', '/auth/login', { body: { email, password: PW } })
  check(`login ${email}`, r.status === 200 && r.json.token, JSON.stringify(r.json))
  return r.json
}

const citizen = await login('citizen@resqlink.demo')
const dispatcher = await login('dispatcher@resqlink.demo')
const amb1 = await login('ambulance1@resqlink.demo')

// security checks
check('anonymous request is rejected', (await call('GET', '/incidents')).status === 401)
check('citizen cannot list responders', (await call('GET', '/responders', { token: citizen.token })).status === 403)
check('citizen cannot assign', (await call('POST', '/assignments', { token: citizen.token, body: { incidentId: 1, responderId: 1 } })).status === 403)
check('webhook without signature is rejected', (await call('POST', '/webhooks/nexconn', { body: {} })).status === 401)

// 1. citizen reports an accident (JPEG magic bytes are enough for the server-side type check)
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9])
const form = new FormData()
form.append('data', new Blob([JSON.stringify({
  category: 'ACCIDENT', description: 'Two vehicles collided near the flyover, one person is injured and a lane is blocked.',
  latitude: 17.3850, longitude: 78.4867, incidentTime: new Date().toISOString(), addressHint: 'Tank Bund flyover',
})], { type: 'application/json' }))
form.append('image', new Blob([jpeg], { type: 'image/jpeg' }), 'accident.jpg')
const created = await call('POST', '/incidents', { token: citizen.token, form })
check('citizen submits report', created.status === 201 && created.json.summary.incidentNumber.startsWith('RL-'), JSON.stringify(created.json))
const id = created.json.summary.id

// 2. AI analysis arrives asynchronously, incident becomes visible to dispatcher
let detail
for (let i = 0; i < 30; i++) {
  detail = (await call('GET', `/incidents/${id}`, { token: dispatcher.token })).json
  if (detail.summary.status === 'AWAITING_VERIFICATION') break
  await new Promise((r) => setTimeout(r, 1000))
}
check('AI analysis completes and incident awaits verification', detail.summary.status === 'AWAITING_VERIFICATION' && detail.analysis, JSON.stringify(detail.summary))
check('AI priority is a suggestion until verified', detail.summary.priorityIsAiSuggestion === true)
check('an unassigned responder cannot see it (404)', (await call('GET', `/incidents/${id}`, { token: amb1.token })).status === 404)

// 3. cannot assign before verification
const early = await call('POST', '/assignments', { token: dispatcher.token, body: { incidentId: id, responderId: 4 } })
check('assignment before verification is refused', early.status === 409, JSON.stringify(early.json))

// 4. dispatcher checks duplicates, verifies, gets recommendations
const dup = await call('POST', `/ai/incidents/${id}/duplicates`, { token: dispatcher.token })
check('duplicate check responds', dup.status === 200 && Array.isArray(dup.json))
const ver = await call('PATCH', `/incidents/${id}/status`, { token: dispatcher.token, body: { status: 'VERIFIED' } })
check('dispatcher verifies', ver.status === 200 && ver.json.summary.status === 'VERIFIED', JSON.stringify(ver.json))
const recs = await call('POST', `/ai/incidents/${id}/recommendations`, { token: dispatcher.token })
check('recommendations returned', recs.status === 200 && recs.json.length >= 2, JSON.stringify(recs.json))

// 5. assign two responders
const a1 = await call('POST', '/assignments', { token: dispatcher.token, body: { incidentId: id, responderId: recs.json[0].responderId } })
const a2 = await call('POST', '/assignments', { token: dispatcher.token, body: { incidentId: id, responderId: recs.json[1].responderId } })
check('two responders assigned', a1.status === 201 && a2.status === 201, JSON.stringify([a1.json, a2.json]))
check('duplicate assignment is refused', (await call('POST', '/assignments', { token: dispatcher.token, body: { incidentId: id, responderId: recs.json[0].responderId } })).status === 409)
console.log(`  chat sync status: ${a1.json.chatSyncStatus} ${a1.json.chatMessage ?? ''}`)

// 6. responders work the assignment
const mine = await call('GET', '/assignments/mine', { token: amb1.token })
const myAssignment = mine.json?.find((x) => x.incidentId === id)
if (myAssignment) {
  check('responder accepts', (await call('PATCH', `/assignments/${myAssignment.id}/status`, { token: amb1.token, body: { status: 'ACCEPTED' } })).status === 200)
  check('responder arrives', (await call('PATCH', `/assignments/${myAssignment.id}/status`, { token: amb1.token, body: { status: 'ARRIVED' } })).status === 200)
  const mid = (await call('GET', `/incidents/${id}`, { token: dispatcher.token })).json
  check('dashboard shows ON_SCENE', mid.summary.status === 'ON_SCENE', mid.summary.status)
  check('responder completes', (await call('PATCH', `/assignments/${myAssignment.id}/status`, { token: amb1.token, body: { status: 'COMPLETED' } })).status === 200)
}

// 7. dispatcher resolves
const fin = await call('PATCH', `/incidents/${id}/status`, { token: dispatcher.token, body: { status: 'RESOLVED', reason: 'Scene cleared, patient transferred' } })
check('dispatcher resolves', fin.status === 200 && fin.json.summary.status === 'RESOLVED', JSON.stringify(fin.json))
check('history recorded', fin.json.history.length >= 5)

const tok = await call('POST', '/chat/token', { token: dispatcher.token })
check('Nexconn token issued (needs server credentials)', tok.status === 200 && tok.json.token && !JSON.stringify(tok.json).includes('secret'), JSON.stringify(tok.json))

console.log(`\nAll ${passed} checks passed.`)
