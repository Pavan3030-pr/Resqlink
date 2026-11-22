#!/usr/bin/env node
/** Generates public/emergency.html (no JavaScript needed) from src/lib/emergency.ts, so the two can never drift apart. */
import { buildSync } from 'esbuild'
import { writeFileSync } from 'node:fs'

const out = buildSync({ entryPoints: ['src/lib/emergency.ts'], bundle: true, format: 'esm', write: false })
const { EMERGENCY_NUMBERS, FIRST_AID } = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Emergency help · ResQLink</title><link rel="icon" href="/favicon.svg">
<style>
:root{color-scheme:light}body{margin:0;font:18px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6f9;color:#0b1626}
main{max-width:46rem;margin:0 auto;padding:1.25rem 1.25rem 4rem}a.back{display:inline-block;margin:.5rem 0 1rem;color:#0f5c5c;font-weight:600}
h1{font-size:2rem;margin:.2rem 0}h2{font-size:1.3rem;margin:2rem 0 .75rem}.lead{color:#33415a}
ul.nums{list-style:none;padding:0;display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))}
ul.nums a{display:block;padding:1rem;border:1px solid #9aa6b8;border-radius:12px;background:#fff;text-decoration:none;color:inherit;min-height:3.5rem}
.n{display:block;font-size:1.7rem;font-weight:700}.l{font-weight:600}.note{display:block;font-size:.85rem;color:#51607a}
details{background:#fff;border:1px solid #d3dae5;border-radius:12px;padding:1rem;margin:.75rem 0}summary{font-weight:700;font-size:1.1rem;cursor:pointer}
ol{padding-left:1.3rem}li{margin:.4rem 0}:focus-visible{outline:3px solid #0f5c5c;outline-offset:2px}
</style></head><body><main>
<a class="back" href="/">ResQLink</a>
<h1>Emergency help</h1>
<p class="lead">In danger, call first. This page needs no JavaScript and no internet; the phone numbers need a mobile signal.</p>
<h2>Call now</h2>
<ul class="nums">
${EMERGENCY_NUMBERS.map((n) => `<li><a href="tel:${n.number}"><span class="n">${n.number}</span><span class="l">${esc(n.label)}</span>${n.note ? `<span class="note">${esc(n.note)}</span>` : ''}</a></li>`).join('\n')}
</ul>
<h2>First steps while you wait</h2>
<p class="lead">General guidance only. A trained responder or doctor always comes first.</p>
${FIRST_AID.map((c) => `<details><summary>${esc(c.title)}</summary><ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`).join('\n')}
</main></body></html>
`
writeFileSync('public/emergency.html', html)
console.log('wrote public/emergency.html')
