import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { IncidentSummary, Page } from '@/lib/types'

const BASE_TITLE = 'ResQLink — Emergency Response Coordination'

/** Polls for new CRITICAL incidents, raises a toast and flags the browser tab so dispatchers never miss one. */
export function StaffAlerts() {
  const toast = useToast()
  const seen = useRef<Set<number> | null>(null)
  const q = useQuery({
    queryKey: ['alerts', 'critical'],
    queryFn: () => api.get<Page<IncidentSummary>>('/incidents', { priority: 'CRITICAL', activeOnly: true, size: 20 }),
    refetchInterval: 8_000,
  })
  const open = (q.data?.items ?? []).filter((i) => ['REPORTED', 'AI_ANALYZED', 'AWAITING_VERIFICATION', 'VERIFIED'].includes(i.status))

  useEffect(() => {
    if (!q.data) return
    const ids = new Set(q.data.items.map((i) => i.id))
    if (seen.current === null) { seen.current = ids; return } // first load: do not alert on existing incidents
    const fresh = q.data.items.filter((i) => !seen.current!.has(i.id))
    fresh.forEach((i) => toast.push(`Critical incident ${i.incidentNumber} reported`, 'error'))
    seen.current = ids
  }, [q.data, toast])

  useEffect(() => {
    document.title = open.length > 0 ? `(${open.length}) Critical · ResQLink` : BASE_TITLE
    return () => { document.title = BASE_TITLE }
  }, [open.length])

  return null
}
