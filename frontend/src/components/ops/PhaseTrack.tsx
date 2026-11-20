import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Compact progress track: filled up to the current phase. Labels are passed in so citizen views can be translated. */
export function PhaseTrack({ labels, current, tone = 'primary', className }: { labels: readonly string[]; current: number; tone?: 'primary' | 'calm'; className?: string }) {
  const fill = tone === 'calm' ? 'bg-low-solid' : 'bg-primary'
  return (
    <ol className={cn('flex w-full', className)} aria-label="Progress">
      {labels.map((l, i) => {
        const done = i < current, on = i === current
        return (
          <li key={l} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={on ? 'step' : undefined}>
            <div className="flex items-center">
              <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', done || on ? fill : 'bg-slate-300', on && (tone === 'calm' ? 'ring-4 ring-low-solid/25' : 'ring-4 ring-primary/20'))}>
                {done ? <Check className="h-3 w-3" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {i < labels.length - 1 && <span className={cn('mx-1 h-0.5 flex-1 rounded-full', done ? fill : 'bg-slate-200')} />}
            </div>
            <span className={cn('break-words pr-1 text-xs leading-tight', on ? 'font-semibold text-ink' : 'text-muted')}>{l}</span>
          </li>
        )
      })}
    </ol>
  )
}
