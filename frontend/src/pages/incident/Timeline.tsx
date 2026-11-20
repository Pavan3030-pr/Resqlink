import { PhaseTrack } from '@/components/ops/PhaseTrack'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, STATUS_LABEL } from '@/lib/format'
import { PHASES, phaseIndex } from '@/lib/triage'
import type { IncidentDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

const gap = (a: string, b: string) => {
  const m = Math.round((+new Date(b) - +new Date(a)) / 60000)
  return m < 1 ? null : m < 60 ? `+${m} min` : `+${Math.floor(m / 60)} h ${m % 60} min`
}

/** Where the incident is (five phases) and how it got there (every transition, who, why and how long each step took). */
export function Timeline({ d, showActors = true }: { d: IncidentDetail; showActors?: boolean }) {
  const idx = phaseIndex(d.summary.status)
  const ordered = d.history
  return (
    <Card>
      <CardHeader><CardTitle>Status history</CardTitle></CardHeader>
      <CardBody className="space-y-5">
        {idx < 0 ? <p className="text-sm text-muted">This report was closed as <strong className="text-ink">{STATUS_LABEL[d.summary.status]}</strong>.</p> : <PhaseTrack labels={PHASES} current={idx} />}
        <ol className="relative space-y-4 border-l border-line pl-5">
          {[...ordered].reverse().map((h, n) => {
            const i = ordered.length - 1 - n
            const took = i > 0 ? gap(ordered[i - 1].createdAt, h.createdAt) : null
            return (
              <li key={i} className="relative text-sm">
                <span className={cn('absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface', n === 0 ? 'bg-primary' : 'bg-slate-300')} aria-hidden />
                <p><strong className="font-semibold text-ink">{STATUS_LABEL[h.newStatus]}</strong>{showActors && <span className="text-muted"> · {h.changedByName}</span>}{took && <span className="num ml-2 text-xs text-muted">{took}</span>}</p>
                {h.reason && <p className="text-[13px] text-ink-2">{h.reason}</p>}
                <p className="text-xs text-muted">{formatDateTime(h.createdAt)}</p>
              </li>
            )
          })}
        </ol>
      </CardBody>
    </Card>
  )
}
