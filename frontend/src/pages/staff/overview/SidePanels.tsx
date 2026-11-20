import { RadioTower, Siren } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '@/components/ui/badges'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState } from '@/components/ui/misc'
import { ListSkeleton } from '@/components/ui/skeleton'
import { CATEGORY_LABEL, formatDistance, PRIORITY_COLOR, timeAgo } from '@/lib/format'
import type { Coverage, IncidentSummary } from '@/lib/types'

/** Supporting panel: responses already underway. Deliberately quiet; nothing here needs a decision. */
export function InProgress({ items, loading, now }: { items: IncidentSummary[]; loading: boolean; now: number }) {
  return (
    <Card>
      <CardHeader><CardTitle>In progress <span className="num ml-1 text-muted">{items.length}</span></CardTitle></CardHeader>
      {loading ? <ListSkeleton rows={2} /> : items.length === 0 ? <EmptyState icon={Siren} title="No active responses" hint="Incidents move here once a responder is assigned." /> : items.slice(0, 6).map((i) => (
        <Link key={i.id} to={`/incidents/${i.id}`} className="relative flex items-center justify-between gap-3 border-b border-line py-2.5 pl-5 pr-4 text-sm transition-colors last:border-0 hover:bg-surface-2">
          <span className="absolute inset-y-0 left-0 w-1" style={{ background: i.priority ? PRIORITY_COLOR[i.priority] : '#CBD5E1' }} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate"><span className="num text-[15px]">{i.incidentNumber}</span> <span className="text-[13px] text-muted">· {CATEGORY_LABEL[i.category]}</span></p>
            <p className="truncate text-xs text-muted">{i.responders.length ? i.responders.join(', ') : i.description}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1"><StatusBadge status={i.status} /><span className="text-2xs text-muted">{timeAgo(i.createdAt, now)}</span></div>
        </Link>
      ))}
    </Card>
  )
}

/** Coverage gaps escalate their own styling only when there is something to act on. */
export function CoverageGaps({ data, loading, error, onRetry }: { data?: Coverage; loading: boolean; error: unknown; onRetry: () => void }) {
  const gaps = data?.gaps ?? []
  return (
    <Card tone={gaps.length > 0 ? 'warn' : 'none'}>
      <CardHeader className="flex-wrap">
        <CardTitle>Coverage gaps{data ? ` (${gaps.length})` : ''}</CardTitle>
        {data && <span className="text-xs text-muted">{data.availableLocated} available with fresh location · {data.radiusKm} km radius</span>}
      </CardHeader>
      {loading ? <ListSkeleton rows={2} /> : error ? <ErrorState title="Could not check coverage" error={error} onRetry={onRetry} />
        : gaps.length === 0 ? <EmptyState icon={RadioTower} tone="good" title="Every open report is covered" hint="Each has an available responder in range, based on locations shared in the last 15 minutes." />
        : gaps.map((g) => (
          <Link key={g.incidentId} to={`/incidents/${g.incidentId}`} className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 text-sm transition-colors last:border-0 hover:bg-surface-2">
            <div className="min-w-0"><p className="flex items-center gap-2"><span className="num text-[15px]">{g.incidentNumber}</span>{g.priority && <PriorityBadge priority={g.priority} />}</p><p className="mt-1 text-[13px] text-muted">{g.reason}</p></div>
            <span className="shrink-0 text-xs font-medium text-medium">{g.nearestMeters != null ? `Nearest ${formatDistance(g.nearestMeters)}` : 'No location data'}</span>
          </Link>
        ))}
    </Card>
  )
}
