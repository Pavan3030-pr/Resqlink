import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ErrorNote } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { CATEGORY_LABEL, formatDateTime, formatDistance, STATUS_LABEL } from '@/lib/format'
import type { DuplicateMatch, IncidentDetail } from '@/lib/types'
import type { IncidentActions } from './useIncidentActions'

function CompareDialog({ current, match, onClose, onLink, canLink }: { current: IncidentDetail; match: DuplicateMatch | null; onClose: () => void; onLink: (id: number) => void; canLink: boolean }) {
  const other = useQuery({ queryKey: ['incident', String(match?.incidentId)], queryFn: () => api.get<IncidentDetail>(`/incidents/${match!.incidentId}`), enabled: !!match })
  const col = (title: string, d?: IncidentDetail) => (
    <div className="rounded-ctl border border-line p-3 text-sm">
      <p className="mb-2 font-semibold">{title}</p>
      {!d ? <p className="text-muted">Loading…</p> : (
        <dl className="space-y-2">
          <div><dt className="text-xs text-muted">Reported</dt><dd>{formatDateTime(d.summary.createdAt)}</dd></div>
          <div><dt className="text-xs text-muted">Type · status</dt><dd>{CATEGORY_LABEL[d.summary.category]} · {STATUS_LABEL[d.summary.status]}</dd></div>
          <div><dt className="text-xs text-muted">Location</dt><dd>{d.summary.latitude.toFixed(5)}, {d.summary.longitude.toFixed(5)}{d.summary.addressHint ? ` · ${d.summary.addressHint}` : ''}</dd></div>
          <div><dt className="text-xs text-muted">Description (original)</dt><dd className="whitespace-pre-wrap">{d.summary.description}</dd></div>
        </dl>
      )}
    </div>
  )
  return (
    <Dialog open={!!match} onClose={onClose} title={match ? `Compare ${current.summary.incidentNumber} with ${match.incidentNumber}` : 'Compare'}>
      {match && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">{col(current.summary.incidentNumber + ' (this report)', current)}{col(match.incidentNumber + ' (earlier report)', other.data)}</div>
          <div className="rounded-ctl border border-advisory-edge bg-advisory-tint/50 p-3 text-sm">
            <p className="font-medium">Why the system suggests a match: {Math.round(match.confidence * 100)}%</p>
            <ul className="mt-1 list-disc pl-5 text-ink-2">{match.reasons.map((r) => <li key={r}>{r}</li>)}{match.semanticSimilarity != null && <li>Embedding similarity {Math.round(match.semanticSimilarity * 100)}%</li>}</ul>
            <p className="mt-2 text-xs text-muted">Linking keeps both reports on record. Nothing is deleted, and you can still verify or reject this report instead.</p>
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Close</Button>{canLink && <Button onClick={() => onLink(match.incidentId)}>Link as duplicate</Button>}</div>
        </div>
      )}
    </Dialog>
  )
}

export function Duplicates({ d, actions }: { d: IncidentDetail; actions: IncidentActions }) {
  const [dupes, setDupes] = useState<DuplicateMatch[] | null>(null)
  const [compare, setCompare] = useState<DuplicateMatch | null>(null)
  const find = useMutation({ mutationFn: () => api.post<DuplicateMatch[]>(`/ai/incidents/${d.summary.id}/duplicates`), onSuccess: setDupes })
  const canLink = actions.allowed('DUPLICATE')
  return (
    <Card>
      <CardHeader>
        <CardTitle>Possible duplicates</CardTitle>
        <Button size="sm" variant="secondary" loading={find.isPending} onClick={() => find.mutate()}>{find.isPending ? 'Checking…' : <><Copy className="h-3.5 w-3.5" aria-hidden />Check for duplicates</>}</Button>
      </CardHeader>
      <CardBody className="space-y-3">
        {!dupes && !find.error && <p className="text-[13px] text-muted">Look for nearby reports of the same event before dispatching, so one emergency is not answered twice.</p>}
        <ErrorNote error={find.error} />
        {dupes && (dupes.length === 0 ? <p className="text-sm text-muted">No similar nearby reports found.</p> : dupes.map((m) => (
          <div key={m.incidentId} className="rounded-ctl border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><Link className="num text-[15px] text-primary hover:underline" to={`/incidents/${m.incidentId}`}>{m.incidentNumber}</Link><span className="text-xs text-muted">{Math.round(m.confidence * 100)}% match · {formatDistance(m.distanceMeters)} · {m.minutesApart} min apart</span></div>
            <p className="mt-1 text-ink-2">{m.description}</p>
            <p className="mt-1 text-xs text-muted">{m.reasons.join(' · ')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setCompare(m)}>Compare side by side</Button>
              {canLink && <Button size="sm" variant="ghost" onClick={() => actions.openDuplicate(m.incidentId)}>Link as duplicate of this</Button>}
            </div>
          </div>
        )))}
        {dupes && <p className="text-xs text-muted">Possible duplicates are suggestions only. No report is discarded automatically.</p>}
      </CardBody>
      <CompareDialog current={d} match={compare} onClose={() => setCompare(null)} onLink={(id) => { setCompare(null); actions.openDuplicate(id) }} canLink={canLink} />
    </Card>
  )
}
