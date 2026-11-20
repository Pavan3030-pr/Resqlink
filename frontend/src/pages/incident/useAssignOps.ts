import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { Assignment, AssignmentResult, IncidentDetail } from '@/lib/types'

/** Assign and remove responders. Lifted to the page so the Command Bar's one-tap assign and the ranked list share state. */
export function useAssignOps(d: IncidentDetail, onChange: () => void) {
  const toast = useToast()
  const assign = useMutation({
    mutationFn: (responderId: number) => api.post<AssignmentResult>('/assignments', { incidentId: d.summary.id, responderId }),
    onSuccess: (r) => { toast.push(`Responder assigned. ${r.chatSyncStatus === 'PENDING' ? 'The chat channel is being set up.' : (r.chatMessage ?? '')}`, 'success'); onChange() },
  })
  const cancel = useMutation({
    mutationFn: (a: Assignment) => api.patch(`/assignments/${a.id}/status`, { status: 'CANCELLED', reason: 'Cancelled by dispatcher' }),
    onSuccess: onChange,
  })
  return { assign, cancel }
}
export type AssignOps = ReturnType<typeof useAssignOps>
