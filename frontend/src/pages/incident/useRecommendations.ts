import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { IncidentDetail, Recommendation } from '@/lib/types'

/** Ranked responder suggestions. Shared by the Command Bar (one-tap assign of the top match) and the responder panel. */
export function useRecommendations(d: IncidentDetail, enabled: boolean) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const load = useMutation({ mutationFn: () => api.post<Recommendation[]>(`/ai/incidents/${d.summary.id}/recommendations`), onSuccess: setRecs })
  useEffect(() => { if (enabled) load.mutate() }, [d.summary.id, enabled, d.assignments.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return { recs, loading: enabled && !recs && !load.error, error: load.error }
}
