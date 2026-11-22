#!/usr/bin/env node
/**
 * Node wrapper around the shared in-memory API model (src/sandbox/core.mjs), for UI tests and frontend-only dev.
 *   node dev/mock-api.mjs   # listens on :8081  (set VITE_API_BASE_URL=http://localhost:8081)
 */
import http from 'node:http'
import { handle } from '../src/sandbox/core.mjs'

const PORT = Number(process.env.PORT ?? 8081)
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }

http.createServer(async (req, res) => {
  let raw = ''
  await new Promise((r) => { req.on('data', (c) => (raw += c)); req.on('end', r) })
  const out = await handle({ method: req.method, url: req.url, headers: req.headers, raw })
  if (out.stream) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...CORS })
    res.write('id: 0\nevent: ready\ndata: {"serverTime":1}\n\n')
    const t = setInterval(() => res.write(': hb\n\n'), 15000)
    req.on('close', () => clearInterval(t))
    return
  }
  res.writeHead(out.code, { 'Content-Type': 'application/json', ...CORS })
  res.end(out.body === undefined ? '' : JSON.stringify(out.body))
}).listen(PORT, () => console.log(`mock API on :${PORT}`))
