/**
 * Live updates over Server-Sent Events. Events are only hints ("something changed"); every handler re-reads the
 * authoritative state from the REST API, so duplicated, reordered or missed events can never leave stale data on screen.
 * The stream is read with fetch (not EventSource) so the Authorization header can be sent.
 */
import { API_BASE, tokenStore } from './api'

export type LiveState = 'connecting' | 'live' | 'reconnecting' | 'offline'
export interface LiveHint { type: string; incidentId: number | null }

export interface SseFrame { id?: string; event?: string; data?: string }

/** Incremental parser for text/event-stream. Returns completed frames and the unconsumed remainder. */
export function parseSse(buffer: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = []
  const normalised = buffer.replace(/\r\n/g, '\n')
  const blocks = normalised.split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    const frame: SseFrame = {}
    let hasField = false
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue
      const i = line.indexOf(':')
      const field = i < 0 ? line : line.slice(0, i)
      const value = i < 0 ? '' : line.slice(i + 1).replace(/^ /, '')
      if (field === 'id') { frame.id = value; hasField = true }
      else if (field === 'event') { frame.event = value; hasField = true }
      else if (field === 'data') { frame.data = frame.data === undefined ? value : frame.data + '\n' + value; hasField = true }
    }
    if (hasField) frames.push(frame)
  }
  return { frames, rest }
}

export function backoffMs(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5)) + Math.floor(Math.random() * 400)
}

type Listener = () => void

class LiveStream {
  state: LiveState = 'offline'
  lastEventAt: number | null = null
  private listeners = new Set<Listener>()
  private hintHandlers = new Set<(h: LiveHint) => void>()
  private abort: AbortController | null = null
  private attempt = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private gen = 0 // bumped on every start/stop so a superseded loop can never keep running

  subscribe = (l: Listener) => { this.listeners.add(l); return () => this.listeners.delete(l) }
  onHint(h: (hint: LiveHint) => void) { this.hintHandlers.add(h); return () => this.hintHandlers.delete(h) }
  snapshot = () => this.state
  private set(state: LiveState) { if (this.state !== state) { this.state = state; this.listeners.forEach((l) => l()) } }

  start() {
    if (this.running) return
    this.running = true
    this.attempt = 0
    void this.loop(++this.gen)
  }

  stop() {
    this.running = false
    this.gen++
    this.abort?.abort()
    if (this.timer) clearTimeout(this.timer)
    this.set('offline')
  }

  private async loop(gen: number) {
    const alive = () => this.running && gen === this.gen
    while (alive()) {
      this.set(this.attempt === 0 ? 'connecting' : 'reconnecting')
      const ctl = new AbortController()
      this.abort = ctl
      try {
        const token = tokenStore.get()
        if (!token) { this.set('offline'); return }
        const res = await fetch(`${API_BASE}/api/v1/events/stream`, { headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal: ctl.signal })
        if (res.status === 401 || res.status === 403) { if (alive()) { this.set('offline'); this.running = false }; return }
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        for (;;) {
          const { value, done } = await reader.read()
          if (done || !alive()) { if (!alive()) ctl.abort(); break }
          buf += decoder.decode(value, { stream: true })
          const { frames, rest } = parseSse(buf)
          buf = rest
          for (const f of frames) this.handle(f)
        }
      } catch {
        if (!alive()) return
      }
      if (!alive()) return
      this.attempt++
      this.set(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'reconnecting')
      await new Promise<void>((r) => { this.timer = setTimeout(r, backoffMs(this.attempt)) })
    }
  }

  private handle(f: SseFrame) {
    this.lastEventAt = Date.now()
    if (f.event === 'ready') { this.attempt = 0; this.set('live'); this.listeners.forEach((l) => l()); return }
    if (!f.data) return
    try {
      const d = JSON.parse(f.data) as { type: string; incidentId: number | null }
      this.hintHandlers.forEach((h) => h({ type: d.type, incidentId: d.incidentId }))
    } catch { /* ignore malformed hint */ }
  }
}

export const liveStream = new LiveStream()
