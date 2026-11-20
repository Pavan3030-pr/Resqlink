import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Navigation } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AssignmentBadge, PriorityBadge } from '@/components/ui/badges'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AssignmentFlow } from './AssignmentFlow'
import { api } from '@/lib/api'
import { CATEGORY_LABEL, navigationUrl, timeAgo } from '@/lib/format'
import type { Assignment, IncidentDetail } from '@/lib/types'

/** An active assignment, glanceable and actionable without opening the incident: what, where, and the one next step. */
export function AssignmentCard({ a }: { a: Assignment }) {
  const qc = useQueryClient()
  // Same query key as the incident page, so opening the incident afterwards is instant.
  const q = useQuery({ queryKey: ['incident', String(a.incidentId)], queryFn: () => api.get<IncidentDetail>(`/incidents/${a.incidentId}`), refetchInterval: 15_000 })
  const d = q.data
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['assignments'] }); void qc.invalidateQueries({ queryKey: ['incident', String(a.incidentId)] }) }
  return (
    <Card elevation="hero" tone={d?.summary.priority === 'CRITICAL' ? 'critical' : 'info'} className="overflow-hidden">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num text-xl text-ink">{a.incidentNumber}</span>
          {d && <span className="text-[15px] font-semibold text-ink-2">{CATEGORY_LABEL[d.summary.category]}</span>}
          <span className="ml-auto flex items-center gap-1.5">{d && <PriorityBadge priority={d.summary.priority} />}<AssignmentBadge status={a.status} /></span>
        </div>
        {d ? (
          <>
            {d.summary.addressHint && <p className="text-[15px] font-medium text-ink">{d.summary.addressHint}</p>}
            <p className="line-clamp-2 text-sm leading-relaxed text-ink-2">{d.summary.description}</p>
          </>
        ) : <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3.5 w-full" /></div>}
        <p className="text-xs text-muted">Assigned {timeAgo(a.assignedAt)}</p>
        <AssignmentFlow a={a} channelId={d?.channel?.channelId} onChange={refresh} />
      </div>
      <div className="grid grid-cols-2 divide-x divide-line border-t border-line bg-surface-2/60 text-sm font-medium">
        {d ? <a href={navigationUrl(d.summary.latitude, d.summary.longitude)} target="_blank" rel="noreferrer noopener" className="flex h-12 items-center justify-center gap-2 text-primary hover:bg-surface-3"><Navigation className="h-4 w-4" aria-hidden />Navigate</a> : <span />}
        <Link to={`/incidents/${a.incidentId}`} className="flex h-12 items-center justify-center gap-1 text-ink-2 hover:bg-surface-3">Open incident<ChevronRight className="h-4 w-4" aria-hidden /></Link>
      </div>
    </Card>
  )
}
