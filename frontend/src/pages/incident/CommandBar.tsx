import { Check, Flag, Lock, UserPlus, X } from 'lucide-react'
import { PriorityBadge } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SlaMeter } from '@/components/ops/SlaMeter'
import { formatDistance } from '@/lib/format'
import { nextBestAction, UNATTENDED, waitMinutes } from '@/lib/triage'
import type { IncidentDetail } from '@/lib/types'
import { useNow } from '@/lib/useNow'
import { cn } from '@/lib/utils'
import type { AssignOps } from './useAssignOps'
import type { IncidentActions } from './useIncidentActions'
import type { useRecommendations } from './useRecommendations'

/**
 * The one thing to do next. The sentence says what and why; the button does it. Decisions that are not the next step
 * (reject, duplicate) sit beside it, quieter. The bar stays under the top bar while the rest of the page scrolls.
 */
export function CommandBar({ d, actions, ops, rec }: { d: IncidentDetail; actions: IncidentActions; ops: AssignOps; rec: ReturnType<typeof useRecommendations> }) {
  const now = useNow(10_000)
  const s = d.summary.status
  const a = nextBestAction(d.summary)
  const minutes = waitMinutes(d.summary.createdAt, now)
  const unattended = UNATTENDED.includes(s)
  const urgent = a.tone === 'critical'
  const canVerify = ['REPORTED', 'AI_ANALYZED', 'AWAITING_VERIFICATION'].includes(s) && actions.allowed('VERIFIED')
  const top = rec.recs?.[0]

  let primary: React.ReactNode = null
  if (canVerify) {
    primary = <Button size="lg" variant={urgent ? 'urgent' : 'primary'} loading={actions.status.isPending} onClick={actions.verify}><Check className="h-5 w-5" aria-hidden />Verify incident</Button>
  } else if (s === 'VERIFIED') {
    primary = top
      ? <Button size="lg" variant={urgent ? 'urgent' : 'primary'} loading={ops.assign.isPending} onClick={() => ops.assign.mutate(top.responderId)}><UserPlus className="h-5 w-5" aria-hidden />Assign {top.name}</Button>
      : rec.loading ? <Button size="lg" variant="secondary" disabled loading>Ranking responders…</Button>
      : <span className="max-w-[14rem] text-[13px] font-medium text-medium">No available responder. Check the Responders page.</span>
  } else if (s === 'ON_SCENE' && actions.allowed('RESOLVED')) {
    primary = <Button size="lg" variant="success" onClick={() => actions.setDialog('RESOLVED')}><Flag className="h-5 w-5" aria-hidden />Mark resolved</Button>
  } else if (s === 'RESOLVED' && actions.allowed('CLOSED')) {
    primary = <Button size="lg" variant="secondary" onClick={() => actions.setDialog('CLOSED')}><Lock className="h-5 w-5" aria-hidden />Close incident</Button>
  }

  return (
    <Card elevation="hero" tone={urgent ? 'critical' : a.tone === 'primary' ? 'info' : 'none'} className="z-[700] lg:sticky lg:top-[4.25rem]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-xs font-medium text-muted">Next best action</p>
          <p className={cn('text-lg font-semibold leading-snug', urgent ? 'text-critical' : 'text-ink')}>{a.label}</p>
          <p className="text-[13px] text-muted">
            {a.hint}
            {s === 'VERIFIED' && top && <> Top match is {formatDistance(top.distanceMeters)} away: {top.reasons.slice(0, 2).join(', ')}.</>}
          </p>
        </div>
        {unattended && <SlaMeter priority={d.summary.priority} minutes={minutes} />}
        <div className="flex flex-wrap items-center gap-2">
          {canVerify && <span className="hidden items-center gap-1.5 text-xs text-muted xl:flex">as <PriorityBadge priority={actions.prio || undefined} /></span>}
          {actions.allowed('REJECTED') && <Button size="md" variant="outlineDanger" onClick={() => actions.setDialog('REJECTED')}><X className="h-4 w-4" aria-hidden />Reject</Button>}
          {actions.allowed('DUPLICATE') && <Button size="md" variant="secondary" onClick={() => actions.setDialog('DUPLICATE')}>Mark duplicate</Button>}
          {actions.allowed('RESOLVED') && s !== 'ON_SCENE' && <Button size="md" variant="secondary" onClick={() => actions.setDialog('RESOLVED')}>Mark resolved</Button>}
          {actions.allowed('CLOSED') && s !== 'RESOLVED' && <Button size="md" variant="secondary" onClick={() => actions.setDialog('CLOSED')}>Close incident</Button>}
          {primary}
        </div>
      </div>
      {(actions.error || ops.assign.error) && <p role="alert" className="border-t border-critical-edge bg-critical-tint px-5 py-2 text-[13px] text-critical">{((actions.error ?? ops.assign.error) as Error).message}</p>}
    </Card>
  )
}
