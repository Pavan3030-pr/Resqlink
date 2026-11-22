import { API_BASE, tokenStore } from './api'

/**
 * Sandbox demo: the whole app runs against an in-browser model of the API (src/sandbox/core.mjs), so anyone can try
 * the citizen, dispatcher, volunteer and admin views with no password and no backend. Data is simulated and resets
 * on reload. It is clearly labelled in the UI and never touches the real server, Nexconn or Gemini.
 */
const KEY = 'resqlink.sandbox'
let installed = false

export const SANDBOX_ROLES: { role: string; label: string; email: string; blurb: string }[] = [
  { role: 'CITIZEN', label: 'Citizen', email: 'citizen@resqlink.demo', blurb: 'SOS, check-in, report' },
  { role: 'DISPATCHER', label: 'Dispatcher', email: 'dispatcher@resqlink.demo', blurb: 'Queue, AI triage, assign' },
  { role: 'RESPONDER', label: 'Volunteer', email: 'ambulance1@resqlink.demo', blurb: 'Accept and update jobs' },
  { role: 'ADMIN', label: 'Admin', email: 'admin@resqlink.demo', blurb: 'Verify, audit, analytics' },
]

export function isSandbox(): boolean { try { return sessionStorage.getItem(KEY) === '1' } catch { return false } }

/** Turns a fetch call into the plain request the sandbox model understands. */
export async function toSandboxRequest(url: string, init?: RequestInit): Promise<{ method: string; url: string; headers: Record<string, string>; raw: string }> {
  const headers: Record<string, string> = {}
  new Headers(init?.headers).forEach((v, k) => { headers[k.toLowerCase()] = v })
  let raw = ''
  const b = init?.body
  if (typeof b === 'string') raw = b
  else if (b instanceof FormData) {
    const merged: Record<string, unknown> = {}
    b.forEach((v, k) => {
      if (typeof v !== 'string') return
      try { const j = JSON.parse(v); if (j && typeof j === 'object') { Object.assign(merged, j); return } } catch { /* plain field */ }
      merged[k] = v
    })
    raw = JSON.stringify(merged)
  }
  return { method: (init?.method ?? 'GET').toUpperCase(), url: url.slice(API_BASE.length) || '/', headers, raw }
}

function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const real = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!isSandbox() || !url.startsWith(API_BASE)) return real(input, init)
    const { handle } = await import('../sandbox/core.mjs')
    const out = await handle(await toSandboxRequest(url, init))
    if (out.stream) {
      const enc = new TextEncoder()
      return new Response(new ReadableStream({ start: (c) => c.enqueue(enc.encode('id: 0\nevent: ready\ndata: {"serverTime":1}\n\n')) }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    }
    const nullBody = out.code === 204 || out.body === undefined
    return new Response(nullBody ? null : JSON.stringify(out.body), { status: out.code, headers: { 'Content-Type': 'application/json' } })
  }
}

export function enterSandbox(): void { try { sessionStorage.setItem(KEY, '1') } catch { /* sandbox needs sessionStorage */ } install() }
export function installSandboxIfActive(): void { if (isSandbox()) install() }
export function leaveSandbox(): void {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
  tokenStore.clear()
  window.location.assign('/')
}
