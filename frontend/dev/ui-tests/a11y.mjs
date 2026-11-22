// WCAG A/AA accessibility audit (axe-core) of every role's main pages. Run: npm run test:a11y
import fs from 'node:fs'
import { launch } from './browser.mjs'
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const targets = [
  ['dispatcher@resqlink.demo', ['/dispatch', '/dispatch/incidents', '/incidents/1', '/incidents/5', '/dispatch/responders', '/dispatch/analytics', '/dispatch/map', '/check-ins', '/chat', '/demo']],
  ['citizen@resqlink.demo', ['/citizen', '/citizen/report', '/incidents/1']],
  ['ambulance1@resqlink.demo', ['/responder', '/incidents/5']],
  ['admin@resqlink.demo', ['/admin/users', '/admin/audit', '/admin/activity']],
  [null, ['/', '/login', '/register']],
]
let total = 0
for (const [email, paths] of targets) {
  const b = await launch({ width: 1280, height: 900 })
  const p = await b.newPage()
  // Map tiles are third-party and irrelevant to the audit; blocking them keeps the run fast and deterministic.
  await p.setRequestInterception(true)
  p.on('request', (r) => (/tile\.openstreetmap\.org/.test(r.url()) ? r.abort() : r.continue()))
  if (email) {
    await p.goto('http://localhost:4173/login', { waitUntil: 'networkidle2' })
    await p.type('#email', email); await p.type('#password', 'x12345678')
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }), p.click('button[type=submit]')]); await sleep(1000)
  }
  for (const path of paths) {
    // A fresh tab per page: the live event stream keeps one connection open per tab and an old tab's streams
    // can otherwise starve later pages of connections to the same host, which left the map page blank.
    const q = await b.newPage()
    await q.setRequestInterception(true)
    q.on('request', (r) => (/tile\.openstreetmap\.org/.test(r.url()) ? r.abort() : r.continue()))
    await q.goto('http://localhost:4173' + path, { waitUntil: 'networkidle2' }); await sleep(1500)
    await q.evaluate(axeSrc)
    const r = await q.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].html.slice(0, 110), help: v.help })))
    const real = r.filter((v) => !['region'].includes(v.id))
    total += real.length
    console.log(path.padEnd(22), (email ?? 'anon').split('@')[0].padEnd(11), real.length ? JSON.stringify(real) : 'clean')
    await q.close()
  }
  await b.close()
}
console.log('violation groups:', total)
process.exit(total === 0 ? 0 : 1)
