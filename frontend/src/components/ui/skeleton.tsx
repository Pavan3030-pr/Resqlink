import { cn } from '@/lib/utils'
import { STRIP_CELL, STRIP_GRID } from '@/components/ops/StatStrip'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rl-skeleton rounded-md', className)} aria-hidden />
}

/** Rows shaped like IncidentRow so content swaps in without moving anything. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-[68px] items-center justify-between gap-4 px-4">
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-44" /><Skeleton className="h-3 w-3/4" /></div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  )
}

/** Matches StatStrip exactly (same grid, cell height and footer line). */
export function StatSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="mb-5 overflow-hidden rounded-panel border border-line bg-surface shadow-card">
      <div className="overflow-hidden">
        <div className={STRIP_GRID}>
          {Array.from({ length: count }).map((_, i) => <div key={i} className={`${STRIP_CELL} gap-2`}><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-12" /></div>)}
        </div>
      </div>
      <div className="h-[25px] border-t border-line bg-surface-2/70" />
    </div>
  )
}

/** Shaped like the queue: one tall lead card, then compact rows. */
export function QueueSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <div className="space-y-3 border-b border-line p-4"><Skeleton className="h-5 w-56" /><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-10 w-full" /></div>
      <ListSkeleton rows={rows} />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-7xl space-y-5">
      <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-72" /></div>
      <Skeleton className="h-24 w-full rounded-panel" />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7"><Skeleton className="h-48 rounded-panel" /><Skeleton className="h-64 rounded-panel" /></div>
        <div className="space-y-5 lg:col-span-5"><Skeleton className="h-64 rounded-panel" /><Skeleton className="h-40 rounded-panel" /></div>
      </div>
    </div>
  )
}
