import { useEffect, useState } from 'react'
import { describeServer, pingServer, type ServerState } from '@/lib/serverStatus'
import { cn } from '@/lib/utils'

/** Live server badge. Polls quickly while the server is waking, slowly once it is up. */
export function ServerStatus({ quietWhenOnline = false }: { quietWhenOnline?: boolean }) {
  const [state, setState] = useState<ServerState>('checking')
  useEffect(() => {
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    let misses = 0
    const tick = async () => {
      const up = await pingServer()
      if (stop) return
      if (up) { misses = 0; setState('online') }
      else { misses++; setState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : misses >= 6 ? 'offline' : 'waking') }
      timer = setTimeout(tick, up ? 60_000 : 4_000)
    }
    void tick()
    return () => { stop = true; clearTimeout(timer) }
  }, [])
  if (quietWhenOnline && (state === 'online' || state === 'checking')) return null
  const tone = state === 'online' ? 'bg-low' : state === 'offline' ? 'bg-critical' : 'bg-medium'
  return (
    <p role="status" className="flex items-start gap-2 text-sm text-ink-2">
      <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', tone, state === 'waking' && 'rl-ping-soft')} aria-hidden />
      <span>{describeServer(state)}</span>
    </p>
  )
}
