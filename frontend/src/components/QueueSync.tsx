import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { flushQueue, pendingReports, type PendingReport } from '@/lib/offlineQueue'

/** Read-only view of reports waiting to be sent (refreshes every few seconds). */
export function usePendingReports(): PendingReport[] {
  const [list, setList] = useState<PendingReport[]>(() => pendingReports())
  useEffect(() => {
    const t = setInterval(() => setList(pendingReports()), 3_000)
    return () => clearInterval(t)
  }, [])
  return list
}

/** Mounted once for citizens: sends reports saved while offline as soon as the connection is back. */
export function QueueSync() {
  const qc = useQueryClient()
  const toast = useToast()

  const sync = useCallback(async () => {
    if (pendingReports().length === 0) return
    const sent = await flushQueue((p, key) => api.post('/incidents', p, key))
    if (sent > 0) {
      toast.push(`${sent} saved report${sent > 1 ? 's' : ''} sent`, 'success')
      void qc.invalidateQueries({ queryKey: ['incidents'] })
    }
  }, [qc, toast])

  useEffect(() => {
    void sync()
    const onOnline = () => { void sync() }
    window.addEventListener('online', onOnline)
    const poll = setInterval(() => { if (navigator.onLine) void sync() }, 20_000)
    return () => { window.removeEventListener('online', onOnline); clearInterval(poll) }
  }, [sync])

  return null
}
