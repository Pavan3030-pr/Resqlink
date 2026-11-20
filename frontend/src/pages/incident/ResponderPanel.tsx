import { Check, Truck } from 'lucide-react'
import { AssignmentBadge } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorNote } from '@/components/ui/misc'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatDistance } from '@/lib/format'
import type { IncidentDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { AssignOps } from './useAssignOps'
import type { useRecommendations } from './useRecommendations'

/** Who is assigned, and who should be: ranked by fit with the reasons visible, top match first, one tap to assign. */
export function ResponderPanel({ d, ops, rec }: { d: IncidentDetail; ops: AssignOps; rec: ReturnType<typeof useRecommendations> }) {
  const canAssign = ['VERIFIED', 'ASSIGNED', 'RESPONDER_ACCEPTED', 'ON_SCENE'].includes(d.summary.status)
  const live = d.assignments.filter((a) => ['ASSIGNED', 'ACCEPTED', 'ARRIVED'].includes(a.status))
  const { recs } = rec
  return (
    <Card elevation={d.summary.status === 'VERIFIED' ? 'raised' : 'flat'}>
      <CardHeader><CardTitle>Responders</CardTitle>{live.length > 0 && <span className="num text-xs text-muted">{live.length} active</span>}</CardHeader>
      <CardBody className="space-y-4">
        {d.assignments.length === 0 && <p className="flex items-center gap-2 text-[13px] text-muted"><Truck className="h-4 w-4" aria-hidden />{canAssign ? 'No responders assigned yet.' : 'Verify the incident to assign responders.'}</p>}
        {d.assignments.length > 0 && (
          <ul className="space-y-2">
            {d.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-ctl bg-surface-2 px-3 py-2.5 text-sm">
                <div className="min-w-0"><p className="font-medium text-ink">{a.responderName}</p><p className="text-xs text-muted">{(a.responderType ?? '').replace('_', ' ')} · assigned {formatDateTime(a.assignedAt)}{a.declineReason ? ` · ${a.declineReason}` : ''}</p></div>
                <div className="flex items-center gap-2"><AssignmentBadge status={a.status} />{live.includes(a) && <Button size="xs" variant="ghost" onClick={() => ops.cancel.mutate(a)} disabled={ops.cancel.isPending}>Remove</Button>}</div>
              </li>
            ))}
          </ul>
        )}
        {canAssign && (
          <div className={cn(d.assignments.length > 0 && 'border-t border-line pt-4')}>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">Recommended responders <span className="font-normal text-muted">(you make the final decision)</span></p>
            {rec.loading && <div role="status" aria-label="Ranking responders" className="space-y-2"><Skeleton className="h-[72px]" /><Skeleton className="h-[72px]" /></div>}
            {recs && recs.length === 0 && <p className="rounded-ctl bg-medium-tint px-3 py-2 text-[13px] text-medium">No available responders. Responders must be verified and set to Available.</p>}
            <ol className="space-y-2">
              {recs?.map((r, i) => (
                <li key={r.responderId} className={cn('flex items-center gap-3 rounded-ctl border p-3 text-sm', i === 0 ? 'border-primary-edge bg-primary-soft/60' : 'border-line')}>
                  <span className={cn('num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]', i === 0 ? 'bg-primary text-white' : 'bg-surface-3 text-ink-2')} aria-hidden>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 font-medium text-ink">{r.name}{i === 0 && <span className="inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-2xs font-semibold text-white"><Check className="h-3 w-3" aria-hidden />Top match</span>}</p>
                    <p className="text-xs text-muted"><span className="num text-[13px] text-ink-2">{formatDistance(r.distanceMeters)}</span> · {r.responderType.replace('_', ' ')}</p>
                    <p className="mt-0.5 text-xs text-muted">{r.reasons.join(' · ')}</p>
                  </div>
                  <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => ops.assign.mutate(r.responderId)} disabled={ops.assign.isPending}>Assign</Button>
                </li>
              ))}
            </ol>
            <p className="mt-2.5 text-xs text-muted">Ranking uses distance, availability, responder type and current workload.</p>
          </div>
        )}
        <ErrorNote error={ops.assign.error ?? ops.cancel.error ?? rec.error} />
      </CardBody>
    </Card>
  )
}
