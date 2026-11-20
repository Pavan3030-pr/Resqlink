// WCAG A/AA accessibility audit (axe-core) of every role's main pages. Run: npm run test:a11y
import fs from 'node:fs'
import { launch } from './browser.mjs'
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const targets = [
  ['dispatcher@resqlink.demo', ['/dispatch', '/dispatch/incidents', '/incidents/1', '/incidents/5', '/dispatch/responders', '/dispatch/analytics', '/dispatch/map', '/chat', '/demo']],
  ['citizen@resqlink.demo', ['/citizen', '/citizen/report', '/incidents/1']],
  ['ambulance1@resqlink.demo', ['/responder', '/incidents/5']],
  ['admin@resqlink.demo', ['/admin/users', '/admin/audit', '/admin/activity']],
  [null, ['/', '/login', '/register']],
]
let total = 0
for (const [email, paths] of targets) {
  const b = await launch({ width: 1280, height: 900 })
  const p = await b.newPage()
  if (email) {
    await p.goto('http://localhost:4173/login', { waitUntil: 'networkidle2' })
    await p.type('#email', email); await p.type('#password', 'x12345678')
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2' }), p.click('button[type=submit]')]); await sleep(1000)
  }
  for (const path of paths) {
    await p.goto('http://localhost:4173' + path, { waitUntil: 'networkidle2' }); await sleep(900)
    await p.evaluate(axeSrc)
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].html.slice(0, 110), help: v.help })))
    const real = r.filter((v) => !['region'].includes(v.id))
    total += real.length
    console.log(path.padEnd(22), (email ?? 'anon').split('@')[0].padEnd(11), real.length ? JSON.stringify(real) : 'clean')
  }
  await b.close()
}
console.log('violation groups:', total)
process.exit(total === 0 ? 0 : 1)
