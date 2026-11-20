import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** On/off setting with a thumb-sized target. Uses role=switch so assistive tech announces state, not "checkbox". */
export function Switch({ checked, onChange, disabled, label, description }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; description?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-l`} className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-l`} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-50', checked ? 'bg-low-solid' : 'bg-slate-300')}>
        <span className={cn('h-5 w-5 rounded-full bg-white shadow transition-transform duration-150', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  )
}

export interface SegmentOption<T extends string> { value: T; label: string; tone?: 'low' | 'medium' | 'neutral'; hint?: string }

const SEG_ON: Record<NonNullable<SegmentOption<string>['tone']>, string> = {
  low: 'bg-low text-white shadow-raised',
  medium: 'bg-medium-solid text-ink shadow-raised',
  neutral: 'bg-ink-2 text-white shadow-raised',
}

/** Mutually exclusive choice rendered as large adjacent targets (radiogroup with arrow-key navigation). */
export function Segmented<T extends string>({ options, value, onChange, disabled, ariaLabel, className }: { options: SegmentOption<T>[]; value?: T; onChange: (v: T) => void; disabled?: boolean; ariaLabel: string; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (i: number, e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    refs.current[n]?.focus()
    onChange(options[n].value)
  }
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('grid gap-1 rounded-panel bg-surface-3 p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button key={o.value} ref={(el) => { refs.current[i] = el }} type="button" role="radio" aria-checked={on} tabIndex={on || (!value && i === 0) ? 0 : -1} disabled={disabled}
            onClick={() => onChange(o.value)} onKeyDown={(e) => move(i, e)}
            className={cn('flex h-12 flex-col items-center justify-center rounded-ctl px-2 text-sm font-semibold transition-colors duration-150 disabled:opacity-50', on ? SEG_ON[o.tone ?? 'neutral'] : 'text-ink-2 hover:bg-surface')}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
