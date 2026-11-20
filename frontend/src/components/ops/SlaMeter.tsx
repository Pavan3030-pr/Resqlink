import { Clock } from 'lucide-react'
import { formatWait, slaLevel, slaProgress, type SlaLevel } from '@/lib/triage'
import type { Priority } from '@/lib/types'
import { cn } from '@/lib/utils'

const TONE: Record<SlaLevel, { text: string; bar: string; track: string }> = {
  ok: { text: 'text-ink-2', bar: 'bg-slate-500', track: 'bg-surface-3' },
  warn: { text: 'text-medium', bar: 'bg-medium-solid', track: 'bg-medium-tint' },
  breach: { text: 'text-critical', bar: 'bg-critical-solid', track: 'bg-critical-tint' },
}

/** Waiting time against the response target. The bar fills toward the target and turns red when it is exceeded. */
export function SlaMeter({ priority, minutes, compact }: { priority?: Priority; minutes: number; compact?: boolean }) {
  const level = slaLevel(priority, minutes)
  const { ratio, target } = slaProgress(priority, minutes)
  const t = TONE[level]
  return (
    <div className={cn('shrink-0', compact ? 'w-28' : 'w-44')} title={`Waiting ${formatWait(minutes)}. Prototype response target: ${target} min`}>
      <p className={cn('flex items-center gap-1 text-xs font-medium', t.text)}>
        <Clock className="h-3 w-3" aria-hidden />
        <span className="num text-[15px] leading-4">{formatWait(minutes)}</span>
        {!compact && <span className="font-normal text-muted">of {target} min</span>}
      </p>
      <div className={cn('mt-1 h-1 overflow-hidden rounded-full', t.track)} role="presentation">
        <div className={cn('h-full rounded-full transition-[width] duration-700', t.bar)} style={{ width: `${Math.min(100, (ratio / 1) * 100)}%` }} />
      </div>
    </div>
  )
}
