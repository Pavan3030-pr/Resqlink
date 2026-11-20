import { useMutation } from '@tanstack/react-query'
import { Check, Flag, Navigation } from 'lucide-react'
import { useState } from 'react'
import { PhaseTrack } from '@/components/ops/PhaseTrack'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/fields'
import { ErrorNote } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { chat } from '@/lib/nexconn'
import type { Assignment } from '@/lib/types'

const STEPS = ['Assigned', 'En route', 'On scene', 'Done'] as const
const STEP_INDEX: Record<string, number> = { ASSIGNED: 0, ACCEPTED: 1, ARRIVED: 2, COMPLETED: 3 }

/**
 * Accept -> arrive -> complete, as one big next step at a time. Used on the incident page and on the responder dashboard
 * so the flow is identical wherever the responder meets it. Progress is posted to the incident channel (best effort).
 */
export function AssignmentFlow({ a, channelId, onChange, onDeclined, showTrack = true }: { a: Assignment; channelId?: string; onChange: () => void; onDeclined?: () => void; showTrack?: boolean }) {
  const toast = useToast()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const update = useMutation({
    mutationFn: (b: { status: string; reason?: string }) => api.patch<Assignment>(`/assignments/${a.id}/status`, b),
    onSuccess: async (_r, vars) => {
      setDeclining(false)
      toast.push(`Assignment ${vars.status.toLowerCase()}`, 'success')
      // Share the progress update with the team through the Nexconn incident channel (real message).
      const note = ({ ACCEPTED: 'accepted the assignment and is on the way', ARRIVED: 'has arrived on scene', COMPLETED: 'completed the response' } as Record<string, string>)[vars.status]
      if (note && channelId && chat.status === 'connected') {
        try { await chat.sendText({ kind: 'group', id: channelId }, `Status update: responder ${note}.`) } catch { /* chat update is best effort */ }
      }
      onChange()
      if (vars.status === 'DECLINED') onDeclined?.()
    },
  })
  const busy = update.isPending
  return (
    <div className="space-y-4">
      {showTrack && STEP_INDEX[a.status] != null && <PhaseTrack labels={STEPS} current={STEP_INDEX[a.status]} />}
      {a.status === 'ASSIGNED' && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button size="xl" loading={busy} onClick={() => update.mutate({ status: 'ACCEPTED' })}><Check className="h-5 w-5" aria-hidden />Accept</Button>
          <Button size="xl" variant="outlineDanger" onClick={() => setDeclining(true)}>Decline</Button>
        </div>
      )}
      {a.status === 'ACCEPTED' && <Button size="xl" className="w-full" loading={busy} onClick={() => update.mutate({ status: 'ARRIVED' })}><Navigation className="h-5 w-5" aria-hidden />I have arrived</Button>}
      {a.status === 'ARRIVED' && <Button size="xl" variant="success" className="w-full" loading={busy} onClick={() => update.mutate({ status: 'COMPLETED' })}><Flag className="h-5 w-5" aria-hidden />Mark my response complete</Button>}
      <ErrorNote error={update.error} />
      <Dialog open={declining} onClose={() => setDeclining(false)} title="Decline assignment">
        <div className="space-y-4">
          <Field label="Reason (required)" htmlFor="decline"><Textarea id="decline" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeclining(false)}>Cancel</Button>
            <Button variant="danger" disabled={!reason.trim() || busy} onClick={() => update.mutate({ status: 'DECLINED', reason: reason.trim() })}>Decline</Button></div>
        </div>
      </Dialog>
    </div>
  )
}
