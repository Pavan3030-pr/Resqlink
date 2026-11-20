import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AssignmentCard } from '@/components/responder/AssignmentCard'
import { AssignmentBadge } from '@/components/ui/badges'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/misc'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Assignment } from '@/lib/types'

export default function ResponderAssignments() {
  const q = useQuery({ queryKey: ['assignments', 'mine'], queryFn: () => api.get<Assignment[]>('/assignments/mine'), refetchInterval: 10_000 })
  const all = q.data ?? []
  const active = all.filter((a) => ['ASSIGNED', 'ACCEPTED', 'ARRIVED'].includes(a.status))
  const past = all.filter((a) => !active.includes(a))
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Assigned incidents" subtitle="Current and past assignments." />
      {q.error && !q.data ? <Card><ErrorState title="Could not load assignments" error={q.error} onRetry={() => q.refetch()} /></Card> : q.isLoading ? <div className="space-y-4"><Skeleton className="h-56 rounded-panel" /><Card><ListSkeleton rows={3} /></Card></div> : all.length === 0 ? <Card><EmptyState icon={ClipboardList} title="No assignments yet" hint="When a dispatcher assigns you to an incident it appears here." /></Card> : (
        <div className="space-y-6">
          {active.length > 0 && <section className="space-y-4" aria-label="Current assignments">{active.map((a) => <AssignmentCard key={a.id} a={a} />)}</section>}
          {past.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Past assignments <span className="num ml-1 text-muted">{past.length}</span></CardTitle></CardHeader>
              {past.map((a) => (
                <Link key={a.id} to={`/incidents/${a.incidentId}`} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-2">
                  <div className="min-w-0"><p className="num text-[15px]">{a.incidentNumber}</p><p className="truncate text-xs text-muted">Assigned {formatDateTime(a.assignedAt)}{a.completedAt ? ` · completed ${formatDateTime(a.completedAt)}` : ''}{a.declineReason ? ` · ${a.declineReason}` : ''}</p></div>
                  <AssignmentBadge status={a.status} />
                </Link>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
