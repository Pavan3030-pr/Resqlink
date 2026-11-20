import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface StripCell { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'critical' | 'warn' }

/** Shared by StatStrip and its skeleton so the two always occupy identical space. */
export const STRIP_GRID = '-mb-px -mr-px grid grid-cols-[repeat(auto-fit,minmax(9.25rem,1fr))]'
export const STRIP_CELL = 'flex h-[76px] flex-col justify-center border-b border-r border-line px-4'

/** One panel with hairline-divided cells. The critical cell is the only one allowed to colour itself. */
export function StatStrip({ cells, freshness }: { cells: StripCell[]; freshness?: ReactNode }) {
  return (
    <section aria-label="Operational summary" className="mb-5 overflow-hidden rounded-panel border border-line bg-surface shadow-card">
      <div className="overflow-hidden">
        <dl className={STRIP_GRID}>
          {cells.map((c) => (
            <div key={c.label} className={cn(STRIP_CELL, c.tone === 'critical' && 'bg-critical-tint', c.tone === 'warn' && 'bg-medium-tint')}>
              <dt className={cn('truncate text-xs font-medium', c.tone === 'critical' ? 'text-critical' : 'text-muted')} title={c.label}>{c.label}</dt>
              <dd className="flex items-baseline gap-2">
                <span className={cn('num text-[28px] leading-8', c.tone === 'critical' ? 'text-critical' : 'text-ink')}>{c.value}</span>
                {c.hint && <span className="truncate text-xs text-muted">{c.hint}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {freshness && <p className="border-t border-line bg-surface-2/70 px-4 py-1 text-right text-2xs text-muted tabular-nums">{freshness}</p>}
    </section>
  )
}
