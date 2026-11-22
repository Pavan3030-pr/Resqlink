import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, HeartHandshake, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { MicButton } from '@/components/VoiceButtons'
import { api } from '@/lib/api'
import { dueLabel, INTERVAL_CHOICES, type CheckInDto, type MineDto } from '@/lib/checkin'
import { cn } from '@/lib/utils'

/**
 * "I'm OK" check-in for people who live alone or are in a risky area. One tap says you are fine;
 * a volunteer sees who has gone quiet. "I need help" tells the volunteers straight away.
 */
export function CheckInCard({ onNeedHelp }: { onNeedHelp?: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const mine = useQuery({ queryKey: ['checkin', 'mine'], queryFn: () => api.get<MineDto>('/check-ins/mine'), refetchInterval: 60_000 })
  const post = useMutation({
    mutationFn: (v: { status: 'OK' | 'NEED_HELP' }) =>
      api.post<CheckInDto>('/check-ins', { status: v.status, note: note.trim() || undefined, intervalHours: picked ?? mine.data?.intervalHours }),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['checkin', 'mine'] })
      setNote(''); setShowNote(false); setPicked(null)
      if (v.status === 'NEED_HELP') { toast.push('Volunteers have been told you need help. If it is an emergency, use the red SOS button or call 112.', 'info'); onNeedHelp?.() }
      else toast.push('Thank you. Your family and volunteers can see you are OK.', 'success')
    },
    onError: (e) => toast.push(e instanceof Error ? e.message : 'Could not save your check-in. Try again.', 'error'),
  })
  const m = mine.data
  const overdue = !!m?.overdue
  return (
    <Card elevation="raised" tone={overdue ? 'warn' : 'info'} className="p-5">
      <div className="flex items-start gap-3">
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', overdue ? 'bg-medium-tint text-medium' : 'bg-primary-soft text-primary')}><HeartHandshake className="h-6 w-6" aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-ink">Daily check-in</h2>
          <p className="mt-0.5 text-[15px] text-ink-2" aria-live="polite">
            {mine.isLoading ? 'Loading…'
              : !m?.latest ? 'Tell a volunteer you are okay once a day. If you miss a check-in, someone calls you.'
              : overdue ? `Your check-in is ${dueLabel(m.nextDueAt!)}. Tap below so people know you are fine.`
              : m.latest.status === 'NEED_HELP' ? 'You asked for help. A volunteer will follow up.'
              : `You checked in. Next one ${dueLabel(m.nextDueAt!)}.`}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button size="xl" variant="success" disabled={post.isPending} onClick={() => post.mutate({ status: 'OK' })}>
          {post.isPending && post.variables?.status === 'OK' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-5 w-5" aria-hidden />}I am OK
        </Button>
        <Button size="xl" variant="outlineDanger" disabled={post.isPending} onClick={() => post.mutate({ status: 'NEED_HELP' })}>I need help</Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setShowNote((v) => !v)} aria-expanded={showNote}>{showNote ? 'Hide note' : 'Add a note'}</button>
        <label className="flex items-center gap-2 text-ink-2">Check in
          <select aria-label="How often to check in" value={picked ?? m?.intervalHours ?? 24}
            onChange={(e) => setPicked(Number(e.target.value))}
            className="h-9 rounded-ctl border border-line-strong bg-surface px-2 text-sm">
            {INTERVAL_CHOICES.map((c) => <option key={c.hours} value={c.hours}>{c.label}</option>)}
          </select>
        </label>
      </div>
      {showNote && (
        <div className="mt-3 flex items-end gap-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={2} aria-label="Note for volunteers" placeholder="For example: out of medicine, or feeling dizzy"
            className="min-h-[3rem] flex-1 resize-none rounded-ctl border border-line-strong px-3 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <MicButton size="lg" value={note} onChange={(v) => setNote(v.slice(0, 280))} />
        </div>
      )}
    </Card>
  )
}
