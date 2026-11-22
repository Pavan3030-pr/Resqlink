import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, Phone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/misc'
import { ListSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { dueLabel, groupOf, sortBoard, type BoardGroup, type BoardRow } from '@/lib/checkin'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const GROUPS: { id: BoardGroup; title: string; hint: string; tone: 'critical' | 'warn' | 'none' }[] = [
  { id: 'help', title: 'Asked for help', hint: 'Call these people first.', tone: 'critical' },
  { id: 'overdue', title: 'Missed a check-in', hint: 'Not heard from since the time they chose.', tone: 'warn' },
  { id: 'ok', title: 'Checked in', hint: 'No action needed.', tone: 'none' },
]

function Row({ r, onFollow }: { r: BoardRow; onFollow: (r: BoardRow) => void }) {
  const g = groupOf(r)
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-[15px] font-semibold text-ink">{r.fullName}</p>
        <p className="text-[13px] text-muted">
          Last check-in {timeAgo(r.lastCheckInAt)} · {g === 'ok' ? dueLabel(r.nextDueAt) : g === 'overdue' ? dueLabel(r.nextDueAt) : 'asked for help'}
        </p>
        {r.note && <p className="mt-1 text-sm text-ink-2">“{r.note}”</p>}
        {r.lastFollowUpAt && <p className="mt-1 text-xs text-low">Followed up by {r.lastFollowUpBy ?? 'a volunteer'} {timeAgo(r.lastFollowUpAt)}</p>}
      </div>
      <div className="flex items-center gap-2">
        {r.phone && <a href={`tel:${r.phone}`} className="inline-flex h-10 items-center gap-2 rounded-ctl border border-line-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2"><Phone className="h-4 w-4" aria-hidden />Call<span className="sr-only"> {r.fullName}</span></a>}
        {g !== 'ok' && <Button size="md" variant={g === 'help' ? 'urgent' : 'primary'} onClick={() => onFollow(r)}>Log follow-up</Button>}
      </div>
    </li>
  )
}

/** Volunteer view of peer-support check-ins: who asked for help, who has gone quiet, who is fine. */
export default function CheckInBoard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [target, setTarget] = useState<BoardRow | null>(null)
  const [note, setNote] = useState('')
  const q = useQuery({ queryKey: ['checkin', 'board'], queryFn: () => api.get<BoardRow[]>('/check-ins/board'), refetchInterval: 30_000 })
  const follow = useMutation({
    mutationFn: (v: { id: number; note: string }) => api.post<void>(`/check-ins/${v.id}/follow-up`, { note: v.note.trim() || undefined }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['checkin', 'board'] }); toast.push('Follow-up saved. Others can see you reached out.', 'success'); setTarget(null); setNote('') },
    onError: (e) => toast.push(e instanceof Error ? e.message : 'Could not save the follow-up.', 'error'),
  })
  const rows = sortBoard(q.data ?? [])
  const counts = { help: rows.filter((r) => groupOf(r) === 'help').length, overdue: rows.filter((r) => groupOf(r) === 'overdue').length }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Check-in board" subtitle="People who check in on a schedule. Call anyone who asked for help or went quiet." />
      {q.isLoading ? <ListSkeleton rows={4} /> : q.error ? <ErrorState title="Could not load check-ins" error={q.error} onRetry={() => q.refetch()} />
        : rows.length === 0 ? <EmptyState icon={HeartHandshake} title="No check-ins yet" hint="When people start checking in, anyone who needs a call appears here first." />
        : (
          <div className="space-y-5">
            <p role="status" className="text-sm text-ink-2"><span className="num text-base text-critical">{counts.help}</span> asked for help · <span className="num text-base text-medium">{counts.overdue}</span> missed a check-in</p>
            {GROUPS.map((g) => {
              const list = rows.filter((r) => groupOf(r) === g.id)
              if (list.length === 0) return null
              return (
                <section key={g.id} aria-labelledby={`g-${g.id}`}>
                  <h2 id={`g-${g.id}`} className="mb-0.5 font-display text-lg font-semibold text-ink">{g.title} <span className="num text-muted">{list.length}</span></h2>
                  <p className="mb-2 text-[13px] text-muted">{g.hint}</p>
                  <Card elevation="raised" tone={g.tone}><ul>{list.map((r) => <Row key={r.userId} r={r} onFollow={setTarget} />)}</ul></Card>
                </section>
              )
            })}
          </div>
        )}
      <Dialog open={!!target} onClose={() => setTarget(null)} title={target ? `Follow-up with ${target.fullName}` : ''}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (target) follow.mutate({ id: target.userId, note }) }}>
          <label className="block text-sm font-medium text-ink-2">What happened? (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={3} placeholder="Spoke on the phone, all fine. Will call again tomorrow."
              className="mt-1.5 w-full rounded-ctl border border-line-strong px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </label>
          <div className={cn('flex justify-end gap-2')}><Button type="button" variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button type="submit" disabled={follow.isPending}>Save follow-up</Button></div>
        </form>
      </Dialog>
    </div>
  )
}
