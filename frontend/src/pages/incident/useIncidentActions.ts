import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { Category, IncidentDetail, IncidentStatus, Priority } from '@/lib/types'

export type DecisionDialog = 'REJECTED' | 'DUPLICATE' | 'RESOLVED' | 'CLOSED'

/**
 * Every dispatcher decision on one incident (verify, reject, duplicate, resolve, close, category, priority, re-analyse).
 * Lives at page level so the Command Bar, the AI panel and the duplicates list drive the same state and dialogs.
 */
export function useIncidentActions(d: IncidentDetail, onChange: () => void) {
  const toast = useToast()
  const id = d.summary.id
  const [dialog, setDialog] = useState<DecisionDialog | null>(null)
  const [reason, setReason] = useState('')
  const [dupOf, setDupOf] = useState<number | ''>('')
  const [prio, setPrio] = useState<Priority | ''>(d.summary.priority ?? '')
  useEffect(() => setPrio(d.summary.priority ?? ''), [d.summary.priority])

  const analyze = useMutation({ mutationFn: () => api.post(`/ai/incidents/${id}/analyze`), onSuccess: () => { toast.push('Analysis refreshed', 'success'); onChange() } })
  const status = useMutation({
    mutationFn: (b: { status: IncidentStatus; reason?: string; duplicateOfId?: number; priority?: Priority }) => api.patch(`/incidents/${id}/status`, b),
    onSuccess: () => { setDialog(null); setReason(''); toast.push('Status updated', 'success'); onChange() },
  })
  const setCategory = useMutation({ mutationFn: (c: Category) => api.patch(`/incidents/${id}/category`, { category: c }), onSuccess: () => { toast.push('Category updated (override recorded)', 'success'); onChange() } })
  const setPriority = useMutation({ mutationFn: (p: Priority) => api.patch(`/incidents/${id}/priority`, { priority: p }), onSuccess: onChange })

  const choosePriority = (p: Priority | '') => { setPrio(p); if (p) setPriority.mutate(p) }
  const openDuplicate = (originalId: number | '') => { setDupOf(originalId); setDialog('DUPLICATE') }
  const verify = () => status.mutate({ status: 'VERIFIED', priority: prio || undefined })

  return {
    dialog, setDialog, reason, setReason, dupOf, setDupOf, prio, choosePriority, openDuplicate, verify,
    analyze, status, setCategory, setPriority,
    allowed: (s: IncidentStatus) => d.allowedNext.includes(s),
    error: analyze.error ?? status.error ?? setPriority.error ?? setCategory.error,
  }
}
export type IncidentActions = ReturnType<typeof useIncidentActions>
