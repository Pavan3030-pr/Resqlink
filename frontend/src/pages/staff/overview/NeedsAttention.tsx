import { CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AttentionRow } from '@/components/AttentionRow'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState } from '@/components/ui/misc'
import { QueueSkeleton } from '@/components/ui/skeleton'
import type { IncidentSummary } from '@/lib/types'

const VISIBLE = 8

/** The hero of the screen: the live work queue, most urgent first. The first item gets the lead treatment. */
export function NeedsAttention({ items, loading, error, onRetry, now, critical, onHover }: {
  items: IncidentSummary[]; loading: boolean; error: unknown; onRetry: () => void; now: number; critical: number; onHover: (id: number | null) => void
}) {
  const [lead, ...rest] = items
  return (
    <Card elevation="hero" tone={critical > 0 ? 'critical' : 'none'} className="overflow-hidden">
      <CardHeader className="min-h-14 bg-surface">
        <div className="flex items-center gap-2.5">
          <CardTitle className="text-sm">Needs attention</CardTitle>
          <span className="num rounded-full bg-ink px-2 text-xs leading-5 text-white" aria-label={`${items.length} waiting`}>{items.length}</span>
          {critical > 0 && <span className="rl-attn rounded-full bg-critical-tint px-2 py-0.5 text-xs font-semibold text-critical ring-1 ring-inset ring-critical-edge">{critical} critical</span>}
        </div>
        <Link className="text-[13px] font-medium text-primary hover:underline" to="/dispatch/incidents">All incidents</Link>
      </CardHeader>
      {loading ? <QueueSkeleton />
        : error && items.length === 0 ? <ErrorState title="Could not load the queue" error={error} onRetry={onRetry} />
        : !lead ? <EmptyState icon={CircleCheck} tone="good" title="Nothing is waiting on you" hint="New reports appear here the moment they arrive, highest priority first, with a live wait timer against the response target." />
        : (
          <>
            <AttentionRow i={lead} now={now} variant="lead" onHover={onHover} />
            {rest.slice(0, VISIBLE - 1).map((i) => <AttentionRow key={i.id} i={i} now={now} onHover={onHover} />)}
            {items.length > VISIBLE && <Link to="/dispatch/incidents" className="block border-t border-line bg-surface-2/60 px-5 py-2.5 text-center text-[13px] font-medium text-primary hover:bg-surface-3">View all {items.length} in the queue</Link>}
          </>
        )}
    </Card>
  )
}
