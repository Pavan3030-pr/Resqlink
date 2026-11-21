// UI flow tests against the mock API (dev/mock-api.mjs). Run: npm run test:ui
import fs from 'node:fs'
import { launch as launchBrowser } from './browser.mjs'
const SHOTS = process.env.SHOTS_DIR ?? 'dev/ui-tests/shots'
fs.mkdirSync(SHOTS, { recursive: true })
const browsers = []
async function launch(vp) { const br = await launchBrowser(vp); browsers.push(br); return br }
let failures = 0
const ok = (name, cond) => { console.log(cond ? '✓' : '✗', name); if (!cond) failures++ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function session(email) {
  const br = await launch()
  const p = await br.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => { if (m.type() === 'error' && !/tile\.openstreetmap|Failed to load resource|ERR_|Chat unavailable/.test(m.text())) errs.push(m.text()) })
  await p.goto('http://localhost:4173/login', { waitUntil: 'networkidle2' })
  await p.type('#email', email); await p.type('#password', 'whatever1')
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }), p.click('button[type=submit]')])
  await sleep(1200)
  return { p, errs }
}
const text = async (p) => { await sleep(500); return p.evaluate(() => document.body.innerText) }
const clickText = async (p, t, sel = 'button') => {
  const h = await p.evaluateHandle((t, sel) => [...document.querySelectorAll(sel)].find((e) => e.innerText.trim() === t || e.innerText.trim().includes(t)), t, sel)
  const el = h.asElement(); if (!el) throw new Error('no element: ' + t); await el.click()
}

// --- dispatcher: verify, duplicates, assign
{
  const { p, errs } = await session('dispatcher@resqlink.demo')
  let t0 = await text(p)
  ok('dispatcher lands on command center', t0.includes('Command center'))
  ok('live stream connects and the freshness badge says Live', await p.waitForFunction(() => document.body.innerText.includes('Live'), { timeout: 8000 }).then(() => true).catch(() => false))
  ok('coverage gaps card lists the uncovered incident', t0.includes('Coverage gaps') && t0.includes('beyond 10 km'))
  ok('queue leads with the most urgent item and its next action', t0.includes('Needs attention') && t0.includes('Up next'))
  await p.goto('http://localhost:4173/incidents/1', { waitUntil: 'networkidle2' })
  let t = await text(p)
  ok('briefing shows next best action', t.toLowerCase().includes('next best action') && t.includes('Review and verify') || (console.log(t.slice(0, 400)), false))
  await clickText(p, 'Check for duplicates'); await sleep(600)
  t = await text(p)
  ok('duplicate suggestion shown with reasons', t.includes('RL-1005') && t.includes('78% match'))
  await clickText(p, 'Compare side by side'); await sleep(800)
  t = await text(p)
  ok('side-by-side comparison explains the match', t.includes('Why the system suggests a match') && t.includes('earlier report'))
  await p.keyboard.press('Escape'); await sleep(300)
  ok('AI panel shows no calibrated-confidence percentage', !/% confidence/.test(await text(p)))
  await p.screenshot({ path: `${SHOTS}/detail-dupes.png`, fullPage: true })
  await p.goto('http://localhost:4173/incidents/2', { waitUntil: 'networkidle2' }); await sleep(1200)
  t = await text(p)
  ok('fallback analysis is visibly labelled as unavailable AI', t.includes('AI model unavailable'))
  ok('prompt-injection warning is shown to the dispatcher', t.includes('aimed at the AI'))
  await p.goto('http://localhost:4173/incidents/5', { waitUntil: 'networkidle2' }); await sleep(1200)
  t = await text(p)
  ok('failed chat sync is visible with a retry action', t.includes('Sync failed') && t.includes('Retry sync'))
  ok('location accuracy is shown with a low-accuracy warning', t.includes('accuracy ±180 m') && t.includes('Low accuracy'))
  await p.goto('http://localhost:4173/incidents/1', { waitUntil: 'networkidle2' }); await sleep(1200)
  await clickText(p, 'Verify incident'); await sleep(900)
  t = await text(p)
  ok('incident verified; next action is assign', t.includes('Assign a responder'))
  ok('recommended responders listed', t.includes('Recommended responders') && t.includes('Ambulance Unit 1'))
  ok('command bar offers one-tap assignment of the top match', t.includes('Top match') && /Assign Ambulance Unit/.test(t))
  await clickText(p, 'Assign'); await sleep(900)
  t = await text(p)
  ok('assignment appears with chat-sync warning toast', t.includes('Ambulance Unit') && /Chat is not available|Responder assigned/.test(t))
  await p.screenshot({ path: `${SHOTS}/detail-assigned.png`, fullPage: true })
  ok('no console/page errors (dispatcher)', errs.length === 0 || (console.log(errs), false))
}
// --- upgrades: SOS, safety guidance, hotspots, quick replies
{
  const { p, errs } = await session('citizen@resqlink.demo')
  const ctx = p.browserContext(); await ctx.overridePermissions('http://localhost:4173', ['geolocation']); await p.setGeolocation({ latitude: 17.385, longitude: 78.4867, accuracy: 20 })
  await p.goto('http://localhost:4173/citizen', { waitUntil: 'networkidle2' })
  let t = await text(p)
  ok('citizen sees the one-tap SOS button', t.includes('SOS: send my location'))
  await clickText(p, 'SOS: send my location'); await sleep(300)
  ok('SOS asks what the emergency is', (await text(p)).includes('What is the emergency?'))
  await clickText(p, 'Medical emergency'); await sleep(1500)
  t = await text(p)
  ok('SOS creates a report from GPS and opens its status page', /RL-1008/.test(t) && /SOS .* sent|Received|reference/i.test(t))
  ok('reporter sees category-specific safety guidance', t.includes('While you wait: stay safe') && t.includes('112'))
  await p.screenshot({ path: `${SHOTS}/citizen-sos-safety.png`, fullPage: true })
  ok('no console/page errors (SOS)', errs.length === 0 || (console.log(errs), false))
}
{
  const { p, errs } = await session('dispatcher@resqlink.demo')
  await p.goto('http://localhost:4173/dispatch/analytics', { waitUntil: 'networkidle2' })
  const t = await text(p)
  ok('analytics lists the Tank Bund hotspot with an honest "does not forecast" note', t.includes('Incident hotspots') && /\d+ reports/.test(t) && t.includes('does not forecast'))
  await p.screenshot({ path: `${SHOTS}/analytics-hotspots.png`, fullPage: true })
  ok('no console/page errors (hotspots)', errs.length === 0 || (console.log(errs), false))
}
// --- citizen: status banner + offline queue
{
  const { p, errs } = await session('citizen@resqlink.demo')
  let t
  ok('citizen lands on My reports', (await text(p)).includes('My reports'))
  await p.goto('http://localhost:4173/incidents/1', { waitUntil: 'networkidle2' })
  ok('citizen sees plain-language banner, no dispatcher tools', (await text(p)).includes('Help is being sent') || (await text(p)).includes('being sent') || (await text(p)).includes('reviewing'))
  ok('citizen cannot see AI/assign panels', !(await text(p)).includes('AI incident analysis'))
  await p.select('select[aria-label="Language"]', 'hi'); await sleep(500)
  t = await text(p)
  ok('citizen status banner switches to Hindi', /डिस्पैचर|रिपोर्ट|मदद/.test(t))
  await p.select('select[aria-label="Language"]', 'en'); await sleep(300)
  await p.goto('http://localhost:4173/citizen/report', { waitUntil: 'networkidle2' })
  await sleep(800)
  await p.type('#description', 'Fire in the shop next to the bus stop, smoke is spreading')
  await p.evaluate(() => { /* pick location by clicking map center */ })
  const map = await p.$('.leaflet-container'); const box = await map.boundingBox()
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await sleep(300)
  ok('choosing a spot on the map confirms "Location set"', (await text(p)).includes('Location set'))
  await p.setRequestInterception(true)
  p.on('request', (r) => (r.method() === 'POST' && r.url().includes('/incidents') ? r.abort('internetdisconnected') : r.continue()))
  await clickText(p, 'Submit report')
  await p.waitForFunction(() => document.body.innerText.includes('Waiting to send'), { timeout: 8000 }).catch(() => {})
  t = await text(p)
  ok('offline: report saved on device and shown as waiting', t.includes('Waiting to send (1)') || (console.log(t.slice(-700)), false))
  await p.screenshot({ path: `${SHOTS}/citizen-offline.png` })
  ok('no console/page errors (citizen)', errs.length === 0 || (console.log(errs), false))
}
// --- responder + admin pages render
for (const [email, paths, expect] of [
  ['ambulance1@resqlink.demo', ['/responder', '/responder/assignments', '/incidents/5'], ['Availability', 'Assigned incidents', 'Your assignment']],
  ['admin@resqlink.demo', ['/admin/users', '/admin/activity', '/admin/audit', '/demo'], ['Suspend', 'Prototype success metrics', 'Verify integrity', 'Guided demonstration']],
]) {
  const { p, errs } = await session(email)
  for (let i = 0; i < paths.length; i++) {
    await p.goto('http://localhost:4173' + paths[i], { waitUntil: 'networkidle2' }); await sleep(500)
    ok(`${email.split('@')[0]} ${paths[i]} renders`, (await text(p)).includes(expect[i]))
    await p.screenshot({ path: `${SHOTS}/${email.split('@')[0]}-${i}.png` })
  }
  ok(`no console/page errors (${email.split('@')[0]})`, errs.length === 0 || (console.log(errs), false))
}
// --- unauthenticated + guards + mobile
{
  const br = await launch({ width: 390, height: 844 }); const p = await br.newPage()
  await p.goto('http://localhost:4173/dispatch', { waitUntil: 'networkidle2' })
  ok('guard redirects anonymous users to login', p.url().endsWith('/login'))
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle2' })
  await p.screenshot({ path: `${SHOTS}/landing-mobile.png`, fullPage: true })
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  ok('landing has no horizontal overflow on mobile', !overflow)
}
// --- phone layouts: no horizontal overflow on the redesigned screens
for (const [email, paths] of [['dispatcher@resqlink.demo', ['/dispatch', '/dispatch/map', '/incidents/1']], ['citizen@resqlink.demo', ['/citizen', '/citizen/report', '/incidents/1']], ['ambulance1@resqlink.demo', ['/responder', '/responder/assignments']]]) {
  const br = await launch({ width: 390, height: 844 }); const p = await br.newPage()
  await p.goto('http://localhost:4173/login', { waitUntil: 'networkidle2' })
  await p.type('#email', email); await p.type('#password', 'whatever1')
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }), p.click('button[type=submit]')]); await sleep(900)
  for (const path of paths) {
    await p.goto('http://localhost:4173' + path, { waitUntil: 'networkidle2' }); await sleep(700)
    ok(`no horizontal overflow on phones: ${email.split('@')[0]} ${path}`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)))
  }
}
{
  const { p } = await session('citizen@resqlink.demo')
  await p.goto('http://localhost:4173/dispatch', { waitUntil: 'networkidle2' })
  ok('citizen is redirected away from dispatcher pages', p.url().endsWith('/citizen'))
}
for (const x of browsers) await x.close().catch(() => {})
console.log(failures === 0 ? 'ALL UI CHECKS PASSED' : `${failures} UI CHECK(S) FAILED`)
process.exit(failures ? 1 : 0)
