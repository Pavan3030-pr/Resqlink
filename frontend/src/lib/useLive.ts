import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { liveStream, type LiveHint, type LiveState } from './live'

/** Which cached queries a live hint makes stale. Kept pure so it can be unit tested. */
export function keysFor(h: LiveHint): (string | number)[][] {
  const keys: (string | number)[][] = []
  const inc = h.incidentId
  switch (h.type) {
    case 'notification': keys.push(['notifications']); if (inc) keys.push(['incident', String(inc)]); break
    case 'responder.updated': keys.push(['responders'], ['map'], ['coverage'], ['stats']); break
    case 'channel.updated': if (inc) keys.push(['incident', String(inc)]); keys.push(['incidents']); break
    case 'assignment.updated':
      keys.push(['assignments'], ['responders'], ['incidents'], ['map'], ['stats'], ['coverage'], ['alerts'])
      if (inc) keys.push(['incident', String(inc)])
      break
    default: // incident.created, incident.updated
      keys.push(['incidents'], ['map'], ['stats'], ['coverage'], ['alerts'])
      if (inc) keys.push(['incident', String(inc)])
  }
  return keys
}

export function applyHint(qc: Pick<QueryClient, 'invalidateQueries'>, h: LiveHint) {
  for (const k of keysFor(h)) void qc.invalidateQueries({ queryKey: k })
}

/** Starts the live stream for the signed-in user and keeps React Query fresh. Mount once in the app shell. */
export function useLiveUpdates(enabled: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    const off = liveStream.onHint((h) => applyHint(qc, h))
    const onOnline = () => { void qc.invalidateQueries() }
    window.addEventListener('online', onOnline)
    liveStream.start()
    return () => { off(); window.removeEventListener('online', onOnline); liveStream.stop() }
  }, [enabled, qc])
}

export function useLiveState(): LiveState {
  return useSyncExternalStore(liveStream.subscribe, liveStream.snapshot)
}
