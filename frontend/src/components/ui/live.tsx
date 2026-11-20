import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** True for ~1.6 s after `token` changes (never on first render). Pair with the `rl-flash` class to show "this just updated". */
export function useFlash(token: unknown): boolean {
  const prev = useRef(token)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (prev.current === token) return
    prev.current = token
    setOn(true)
    const t = setTimeout(() => setOn(false), 1600)
    return () => clearTimeout(t)
  }, [token])
  return on
}

/** Status dot. `pulse` draws a single slow ring, used only when the thing is genuinely live. */
export function LiveDot({ tone, pulse, className }: { tone: 'live' | 'warn' | 'off' | 'critical'; pulse?: boolean; className?: string }) {
  const c = tone === 'live' ? 'bg-low-solid' : tone === 'warn' ? 'bg-medium-solid' : tone === 'critical' ? 'bg-critical-solid' : 'bg-slate-400'
  return (
    <span className={cn('relative inline-flex h-2 w-2 shrink-0', className)} aria-hidden>
      {pulse && <span className={cn('rl-ping absolute inset-0 rounded-full', c)} />}
      <span className={cn('relative h-2 w-2 rounded-full', c)} />
    </span>
  )
}
