import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { flushQueue, pendingReports, type PendingReport } from '@/lib/offlineQueue'

/** Read-only view of reports waiting to be sent (refreshes every few seconds). */
export function usePendingReports(): PendingReport[] {
  const { user } = useAuth()
  const owner = user?.id ?? null
  const [list, setList] = useState<PendingReport[]>(() => pendingReports(owner))
  useEffect(() => {
    setList(pendingReports(owner))
    const t = setInterval(() => setList(pendingReports(owner)), 3_000)
    return () => clearInterval(t)
  }, [owner])
  return list
}

/** Mounted once for citizens: sends reports saved while offline as soon as the connection is back. */
export function QueueSync() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const owner = user?.id ?? null
  const busy = useRef(false) // mount, 'online' and the poll can fire together; never flush twice at once

  const sync = useCallback(async () => {
    if (owner === null || busy.current || pendingReports(owner).length === 0) return
    busy.current = true
    try {
      const sent = await flushQueue((p, key) => api.post('/incidents', p, key), owner)
      if (sent > 0) {
        toast.push(`${sent} saved report${sent > 1 ? 's' : ''} sent`, 'success')
        void qc.invalidateQueries({ queryKey: ['incidents'] })
      }
    } finally {
      busy.current = false
    }
  }, [qc, toast, owner])

  useEffect(() => {
    void sync()
    const onOnline = () => { void sync() }
    window.addEventListener('online', onOnline)
    const poll = setInterval(() => { if (navigator.onLine) void sync() }, 20_000)
    return () => { window.removeEventListener('online', onOnline); clearInterval(poll) }
  }, [sync])

  return null
}
