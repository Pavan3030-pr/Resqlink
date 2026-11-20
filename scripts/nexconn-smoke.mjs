#!/usr/bin/env node
/**
 * Real Nexconn integration smoke test. Requires valid credentials; it cannot run without them.
 *
 *   NEXCONN_APP_KEY=... NEXCONN_APP_SECRET=... NEXCONN_API_DOMAIN=https://api-xx.nexconn.ai node scripts/nexconn-smoke.mjs
 *
 * Optional: BACKEND_URL=https://your-api  also checks the deployed webhook endpoint (valid, replay, bad signature).
 * Uses the same server API calls and signing as the backend (SHA-1 of AppSecret + Nonce + Timestamp in milliseconds).
 * The browser SDK path (connect, send, history) must still be verified in the UI: see docs/DEPLOYMENT.md, "Nexconn verification".
 */
import crypto from 'node:crypto'

const { NEXCONN_APP_KEY: KEY, NEXCONN_APP_SECRET: SECRET, BACKEND_URL } = process.env
let DOMAIN = process.env.NEXCONN_API_DOMAIN
if (!KEY || !SECRET || !DOMAIN) { console.error('Set NEXCONN_APP_KEY, NEXCONN_APP_SECRET and NEXCONN_API_DOMAIN'); process.exit(2) }
if (!DOMAIN.startsWith('http')) DOMAIN = `https://${DOMAIN}`
DOMAIN = DOMAIN.replace(/\/$/, '')

const sign = (nonce, ts) => crypto.createHash('sha1').update(SECRET + nonce + ts).digest('hex')
let passed = 0
const check = (name, cond, extra = '') => { if (!cond) { console.error(`✗ ${name} ${extra}`); process.exit(1) } passed++; console.log(`✓ ${name}`) }

async function api(path, body) {
  const nonce = crypto.randomUUID().replace(/-/g, '')
  const ts = String(Date.now())
  const res = await fetch(DOMAIN + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'App-Key': KEY, Nonce: nonce, Timestamp: ts, Signature: sign(nonce, ts), 'X-Request-ID': crypto.randomUUID() },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

const run = Date.now()
const a = `rl_smoke_a_${run}`, b = `rl_smoke_b_${run}`, channel = `resqlink_smoke_${run}`

const ta = await api('/v4/auth/access-token/issue', { userId: a, name: 'Smoke Dispatcher' })
check('issue user token (dispatcher)', ta.status === 200 && ta.json?.result?.accessToken, JSON.stringify(ta))
const tb = await api('/v4/auth/access-token/issue', { userId: b, name: 'Smoke Responder' })
check('issue user token (responder)', tb.status === 200 && tb.json?.result?.accessToken, JSON.stringify(tb))

const created = await api('/v4/group-channel/create', { channelId: channel, name: 'ResQLink smoke test', owner: a, userIds: [a, b] })
check('create incident-style group channel', created.status === 200 || created.status === 409, JSON.stringify(created))
const again = await api('/v4/group-channel/create', { channelId: channel, name: 'ResQLink smoke test', owner: a, userIds: [a, b] })
check('creating the same channel again is tolerated (idempotent sync)', again.status === 200 || again.status === 409, JSON.stringify(again))
const joined = await api('/v4/group-channel/join', { channelId: channel, userIds: [b] })
check('joining an existing member is accepted', joined.status === 200 || joined.status === 409, JSON.stringify(joined))
const left = await api('/v4/group-channel/leave', { channelId: channel, userIds: [b] })
check('member can be removed (reassignment)', left.status === 200, JSON.stringify(left))

if (BACKEND_URL) {
  const hook = async (nonce, ts, sig) => (await fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/v1/webhooks/nexconn`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Nonce: nonce, Timestamp: ts, Signature: sig }, body: JSON.stringify({ channelId: 'smoke' }),
  })).status
  const n = crypto.randomUUID(), ts = String(Date.now())
  check('deployed webhook rejects a bad signature', (await hook(n, ts, '0'.repeat(40))) === 401)
  check('deployed webhook accepts a valid signed request', (await hook(n, ts, sign(n, ts))) === 200)
  check('deployed webhook rejects the replayed request', (await hook(n, ts, sign(n, ts))) === 401)
}
console.log(`\nAll ${passed} server-side Nexconn checks passed (channel ${channel}).`)
console.log('Now verify the browser path: sign in as two users, assign, and exchange messages in the incident channel.')
