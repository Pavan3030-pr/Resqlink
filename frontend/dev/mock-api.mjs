#!/usr/bin/env node
/**
 * Stateful mock of the ResQLink REST API for frontend-only development and UI testing.
 * It is NOT the real backend and does not talk to Nexconn (chat shows as unavailable).
 *   node dev/mock-api.mjs   # listens on :8081  (set VITE_API_BASE_URL=http://localhost:8081)
 */
import http from 'node:http'

const PORT = Number(process.env.PORT ?? 8081)
const now = Date.now()
const ago = (min) => new Date(now - min * 60000).toISOString()
const users = {
  admin: { id: 1, fullName: 'Admin (demo)', email: 'admin@resqlink.demo', role: 'ADMIN', verificationStatus: 'VERIFIED' },
  dispatcher: { id: 2, fullName: 'Dispatcher Asha (demo)', email: 'dispatcher@resqlink.demo', role: 'DISPATCHER', verificationStatus: 'VERIFIED' },
  citizen: { id: 3, fullName: 'Citizen Ravi (demo)', email: 'citizen@resqlink.demo', role: 'CITIZEN', verificationStatus: 'VERIFIED' },
  responder: { id: 4, fullName: 'Ambulance Unit 1 (demo)', email: 'ambulance1@resqlink.demo', role: 'RESPONDER', verificationStatus: 'VERIFIED' },
}
for (const u of Object.values(users)) { u.chatUserId = `rl_user_${u.id}`; u.createdAt = ago(9999) }
const responders = [
  { userId: 4, fullName: 'Ambulance Unit 1 (demo)', responderType: 'AMBULANCE', availability: 'AVAILABLE', shareLocation: true, latitude: 17.389, longitude: 78.48, lastLocationAt: ago(2), activeAssignments: 0, verificationStatus: 'VERIFIED' },
  { userId: 5, fullName: 'Ambulance Unit 2 (demo)', responderType: 'AMBULANCE', availability: 'AVAILABLE', shareLocation: true, latitude: 17.42, longitude: 78.46, lastLocationAt: ago(4), activeAssignments: 0, verificationStatus: 'VERIFIED' },
  { userId: 6, fullName: 'Rescue Team A (demo)', responderType: 'RESCUE', availability: 'BUSY', shareLocation: true, latitude: 17.37, longitude: 78.5, lastLocationAt: ago(1), activeAssignments: 1, verificationStatus: 'VERIFIED' },
  { userId: 7, fullName: 'Fire Brigade 3 (demo)', responderType: 'FIRE_BRIGADE', availability: 'AVAILABLE', shareLocation: false, activeAssignments: 0, verificationStatus: 'VERIFIED' },
].map((r) => ({ ...r, chatUserId: `rl_user_${r.userId}` }))

const mk = (id, cat, pr, st, desc, lat, lng, min, extra = {}) => ({
  summary: { id, incidentNumber: `RL-${1000 + id}`, category: cat, priority: pr, status: st, description: desc, latitude: lat, longitude: lng,
    createdAt: ago(min), updatedAt: ago(Math.max(0, min - 2)), priorityIsAiSuggestion: ['AWAITING_VERIFICATION', 'AI_ANALYZED'].includes(st), responders: [], hasChannel: false, addressHint: extra.addressHint },
  reportedByName: 'Citizen Ravi (demo)', contactName: 'Citizen Ravi (demo)', contactPhone: '+910000000002', incidentTime: ago(min),
  aiSummary: desc, analysis: { suggestedCategory: cat, suggestedPriority: pr ?? 'MEDIUM', confidence: 0.84, summary: `${cat[0]}${cat.slice(1).toLowerCase()} incident: ${desc}`,
    keyInformation: ['Injury reported', 'Lane blocked'], missingInformation: ['Is the injured person conscious and breathing?', 'How many vehicles are involved?'], extractedLocation: extra.addressHint, modelVersion: 'gemini:gemini-2.5-flash', createdAt: ago(min - 1), processingStatus: 'OK', latencyMs: 1840, suspectedInjection: false, redacted: false },
  assignments: [], history: [{ newStatus: 'REPORTED', changedByName: 'Citizen Ravi (demo)', reason: 'Report submitted', createdAt: ago(min) }],
  allowedNext: [], ...extra,
})
const NEXT = { AWAITING_VERIFICATION: ['VERIFIED', 'REJECTED', 'DUPLICATE'], VERIFIED: ['REJECTED', 'DUPLICATE'], ASSIGNED: ['RESOLVED'], RESPONDER_ACCEPTED: ['RESOLVED'], ON_SCENE: ['RESOLVED'], RESOLVED: ['CLOSED'] }
const incidents = [
  mk(1, 'ACCIDENT', 'CRITICAL', 'AWAITING_VERIFICATION', 'Bus overturned near the flyover, several people injured and trapped.', 17.3850, 78.4867, 4, { addressHint: 'Tank Bund flyover' }),
  mk(2, 'FIRE', 'HIGH', 'AWAITING_VERIFICATION', 'Smoke and flames from a shop in the market, people evacuating.', 17.3616, 78.4747, 11, { addressHint: 'Charminar market' }),
  mk(3, 'MEDICAL', 'CRITICAL', 'VERIFIED', 'Elderly man collapsed, not breathing, bystanders doing CPR.', 17.4399, 78.4983, 19, { addressHint: 'Secunderabad station' }),
  mk(4, 'FLOOD', 'MEDIUM', 'VERIFIED', 'Water rising on the underpass, two cars stuck.', 17.4126, 78.4071, 33, { addressHint: 'Jubilee Hills underpass' }),
  mk(5, 'ACCIDENT', 'HIGH', 'RESPONDER_ACCEPTED', 'Two-wheeler collision with a truck at the junction.', 17.4065, 78.4772, 52, { addressHint: 'Banjara Hills Rd 1' }),
  mk(6, 'OTHER', 'LOW', 'RESOLVED', 'Fallen tree blocking one lane, no injuries.', 17.4435, 78.3772, 130),
].map((i) => { i.allowedNext = NEXT[i.summary.status] ?? []; return i })
incidents[4].assignments = [{ id: 1, incidentId: 5, incidentNumber: 'RL-1005', responderId: 4, responderName: 'Ambulance Unit 1 (demo)', responderType: 'AMBULANCE', status: 'ACCEPTED', assignedAt: ago(48), acceptedAt: ago(45), arrivedAt: ago(30) }]
incidents[4].summary.responders = ['Ambulance Unit 1 (demo)']; incidents[4].summary.hasChannel = true
incidents[4].channel = { channelId: 'resqlink_incident_RL1005', reporterInvited: false, messageCount: 7, syncStatus: 'FAILED', syncError: 'Chat service is temporarily unavailable' }
incidents[4].locationAccuracyMeters = 180; incidents[4].locationSource = 'GPS'; incidents[4].duplicateCount = 1
// one report that carries an injection attempt and was analysed by the fallback, to exercise the warning UI
incidents[1].analysis = { ...incidents[1].analysis, processingStatus: 'FALLBACK', fallbackReason: 'AI service is not configured', suspectedInjection: true, modelVersion: 'rule-based-fallback' }

const find = (id) => incidents.find((i) => i.summary.id === Number(id))
const markers = () => incidents.map((i) => ({ id: i.summary.id, incidentNumber: i.summary.incidentNumber, category: i.summary.category, priority: i.summary.priority, status: i.summary.status,
  latitude: i.summary.latitude, longitude: i.summary.longitude, assigned: i.assignments.length > 0, createdAt: i.summary.createdAt, description: i.summary.description }))
const stats = () => ({ total: incidents.length + 38, active: incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.summary.status)).length, unassigned: incidents.filter((i) => i.summary.status === 'VERIFIED').length,
  critical: incidents.filter((i) => i.summary.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(i.summary.status)).length,
  byStatus: { AWAITING_VERIFICATION: 2, VERIFIED: 2, ON_SCENE: 1, RESOLVED: 22, CLOSED: 15 }, byPriority: { CRITICAL: 9, HIGH: 14, MEDIUM: 17, LOW: 8 }, byCategory: { ACCIDENT: 21, FIRE: 7, FLOOD: 5, MEDICAL: 12, OTHER: 3 },
  avgMinutesToAnalysis: 0.4, avgMinutesToVerification: 3.2, avgMinutesVerificationToAssignment: 1.7, respondersAvailable: 3, respondersTotal: 4,
  aiAnalysisSuccessRate: 0.93, assignmentCompletionRate: 0.88, avgMinutesToResolution: 41.5, chatMessages: 214, demoIncidents: 2 })

function auth(req) {
  const t = (req.headers.authorization ?? '').replace('Bearer ', '')
  return Object.values(users).find((u) => u.email === t) ?? null
}
const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); res.end(body === undefined ? '' : JSON.stringify(body)) }
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(JSON.parse(d)) } catch { r({}) } }) })

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204)
  const url = new URL(req.url, 'http://x'); const p = url.pathname.replace('/api/v1', ''); const me = auth(req)
  if (p === '/auth/login' && req.method === 'POST') {
    const b = await body(req); const u = Object.values(users).find((x) => x.email === b.email)
    return u ? send(res, 200, { token: u.email, user: u }) : send(res, 401, { message: 'Invalid e-mail or password' })
  }
  if (!me) return send(res, 401, { message: 'Authentication required' })
  if (p === '/auth/me') return send(res, 200, me)
  if (p === '/incidents/stats') return send(res, 200, stats())
  if (p === '/incidents/map') return send(res, 200, markers())
  if (p === '/incidents' && req.method === 'GET') {
    let list = incidents.map((i) => i.summary)
    if (me.role === 'CITIZEN') list = list.slice(0, 2)
    return send(res, 200, { items: list, page: 0, size: 50, totalElements: list.length, totalPages: 1 })
  }
  let m
  if ((m = p.match(/^\/incidents\/(\d+)$/))) { const i = find(m[1]); return i ? send(res, 200, i) : send(res, 404, { message: 'Incident not found' }) }
  if ((m = p.match(/^\/incidents\/(\d+)\/status$/)) && req.method === 'PATCH') {
    const b = await body(req); const i = find(m[1]); i.summary.status = b.status; i.summary.priorityIsAiSuggestion = false; i.allowedNext = NEXT[b.status] ?? []
    i.history.push({ previousStatus: 'AWAITING_VERIFICATION', newStatus: b.status, changedByName: me.fullName, reason: b.reason, createdAt: new Date().toISOString() }); return send(res, 200, i)
  }
  if ((m = p.match(/^\/ai\/incidents\/(\d+)\/duplicates$/))) return send(res, 200, m[1] === '1' ? [{ incidentId: 5, incidentNumber: 'RL-1005', confidence: 0.78, distanceMeters: 180, minutesApart: 22, reasons: ['Within 180 m of the earlier report', 'Same category (ACCIDENT)', 'Similar wording in the description'], status: 'ON_SCENE', description: incidents[4].summary.description }] : [])
  if ((m = p.match(/^\/ai\/incidents\/(\d+)\/recommendations$/))) return send(res, 200, responders.filter((r) => r.availability === 'AVAILABLE').map((r, k) => ({ responderId: r.userId, name: r.fullName, responderType: r.responderType, score: 0.9 - k * 0.15, distanceMeters: r.shareLocation ? 1200 + k * 2300 : undefined, reasons: ['Best-fit type', 'No active assignments'] })))
  if ((m = p.match(/^\/ai\/incidents\/(\d+)\/analyze$/))) return send(res, 200, find(m[1]).analysis)
  if (p === '/assignments' && req.method === 'POST') {
    const b = await body(req); const i = find(b.incidentId); const r = responders.find((x) => x.userId === b.responderId)
    const a = { id: Date.now() % 100000, incidentId: i.summary.id, incidentNumber: i.summary.incidentNumber, responderId: r.userId, responderName: r.fullName, responderType: r.responderType, status: 'ASSIGNED', assignedAt: new Date().toISOString() }
    i.assignments.push(a); i.summary.responders.push(r.fullName); i.summary.status = 'ASSIGNED'; i.allowedNext = NEXT.ASSIGNED
    return send(res, 201, { assignment: a, chatSynced: false, chatMessage: 'Chat is not available in the mock API.', chatSyncStatus: 'PENDING' })
  }
  if (p === '/assignments/mine') return send(res, 200, incidents[4].assignments)
  if (p === '/responders' || p === '/responders/available') return send(res, 200, responders)
  if (p === '/responders/me') return send(res, 200, responders[0])
  if (p === '/responders/availability') return send(res, 200, { ...responders[0], ...(await body(req)) })
  if (p === '/notifications') return send(res, 200, { unread: 2, items: [
    { id: 1, incidentId: 1, type: 'NEW_INCIDENT', title: 'New incident RL-1001', message: 'ACCIDENT reported near Tank Bund flyover.', createdAt: ago(4), read: false },
    { id: 2, incidentId: 2, type: 'AI_ANALYSIS', title: 'Incident RL-1002 analysed', message: 'Suggested priority: HIGH. Awaiting verification.', createdAt: ago(10), read: false }] })
  if (p === '/chat/token') return send(res, 503, { message: 'Chat service is not configured on the server' })
  if (p === '/chat/contacts') return send(res, 200, responders.map((r) => ({ userId: r.userId, chatUserId: r.chatUserId, fullName: r.fullName, role: 'RESPONDER', responderType: r.responderType })))
  if (p === '/admin/users') return send(res, 200, [...Object.values(users), { id: 8, fullName: 'New Responder', email: 'new@x.io', role: 'RESPONDER', verificationStatus: 'PENDING', chatUserId: 'rl_user_8', createdAt: ago(60) }])
  if (p === '/admin/audit-logs') return send(res, 200, { items: [{ id: 1, actor: 'Dispatcher Asha (demo)', action: 'INCIDENT_STATUS', resourceType: 'INCIDENT', resourceId: '5', details: 'ON_SCENE', createdAt: ago(30) }], page: 0, size: 25, totalElements: 1, totalPages: 1 })
  if (p === '/auth/logout' && req.method === 'POST') return send(res, 200, { ok: true })
  if (p === '/analytics/coverage') return send(res, 200, { radiusKm: 10, availableLocated: 2, availableUnlocated: 1, gaps: [{ incidentId: 4, incidentNumber: 'RL-1004', priority: 'MEDIUM', nearestMeters: 14200, reason: 'Nearest available responder is beyond 10 km' }] })
  if (p === '/public/demo-info') return send(res, 200, { demoMode: true, accounts: Object.values(users).map((u) => ({ role: u.role, email: u.email, name: u.fullName })) })
  if ((m = p.match(/^\/incidents\/(\d+)\/category$/)) && req.method === 'PATCH') { const b = await body(req); const i = find(m[1]); i.summary.category = b.category; return send(res, 200, i) }
  if ((m = p.match(/^\/incidents\/(\d+)\/priority$/)) && req.method === 'PATCH') { const b = await body(req); const i = find(m[1]); i.summary.priority = b.priority; return send(res, 200, i) }
  if ((m = p.match(/^\/incidents\/(\d+)\/export$/))) { const i = find(m[1]); return send(res, 200, { incident: i, audit: [{ actor: 'Dispatcher Asha (demo)', action: 'INCIDENT_STATUS', details: i.summary.status, createdAt: ago(5) }], exportedAt: new Date().toISOString(), exportedBy: me.fullName, note: 'Chat message contents are held by Nexconn and are not part of this export.' }) }
  if ((m = p.match(/^\/chat\/channels\/incidents\/(\d+)$/)) && req.method === 'POST') return send(res, 200, { channelId: 'resqlink_incident_RL100' + m[1], synced: false, message: 'Chat service is not configured on the server', memberChatIds: [], syncStatus: 'FAILED' })
  if (p === '/admin/audit-logs/verify') return send(res, 200, { valid: true, checked: 41 })
  if (p === '/admin/ai-eval' && req.method === 'POST') return send(res, 200, { analyzer: 'rule-based-fallback', cases: 20, categoryAccuracy: 1, priorityAccuracy: 1, criticalRecall: 1, injectionResistance: 1, injectionFlagRate: 1, duplicatePrecision: 1, duplicateRecall: 1, medianLatencyMs: 0, p95LatencyMs: 1, fallbackRate: 1, approxInputTokens: 0, approxOutputTokens: 0, failures: [], note: 'Mock response for UI testing only.' })
  if (p === '/admin/demo/reset' && req.method === 'POST') return send(res, 200, { incidentsRemoved: 0 })
  if ((m = p.match(/^\/admin\/users\/(\d+)\/(suspension|revoke-sessions|verification|role)$/))) return send(res, 200, { ...Object.values(users)[0], id: Number(m[1]) })
  if (p === '/events/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' })
    res.write('id: 0\nevent: ready\ndata: {"serverTime":1}\n\n')
    const t = setInterval(() => res.write(': hb\n\n'), 15000); req.on('close', () => clearInterval(t)); return
  }
  send(res, 404, { message: 'Not found in mock' })
}).listen(PORT, () => console.log(`mock API on :${PORT}`))
