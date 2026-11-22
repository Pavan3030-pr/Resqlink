import { API_BASE } from './api'

export type ServerState = 'checking' | 'waking' | 'online' | 'offline'

/** The health endpoint lives at the server root, not under /api. Resolves true only for {"status":"UP"}. */
export async function pingServer(timeoutMs = 6000, base: string = API_BASE): Promise<boolean> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(`${base}/actuator/health`, { signal: ctl.signal, cache: 'no-store' })
    if (!r.ok) return false
    const j = (await r.json()) as { status?: string }
    return j.status === 'UP'
  } catch { return false } finally { clearTimeout(timer) }
}

/** Free hosting puts an idle server to sleep; the first request can take about a minute. Say so instead of showing an error. */
export function describeServer(state: ServerState): string {
  switch (state) {
    case 'checking': return 'Checking the server…'
    case 'waking': return 'The server is waking up. This can take up to a minute. You can keep going once it says online.'
    case 'online': return 'Server online'
    case 'offline': return 'Cannot reach the server. Check your internet connection; we will keep trying.'
  }
}
