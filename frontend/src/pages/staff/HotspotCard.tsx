import { useQuery } from '@tanstack/react-query'
import { Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { CATEGORY_LABEL } from '@/lib/format'
import { findHotspots } from '@/lib/hotspot'
import type { IncidentSummary, Page } from '@/lib/types'

/** Where incidents cluster. A transparent counting rule over recorded incidents (about 1 km cells, newer and higher priority weigh more), not a prediction. */
export function HotspotCard() {
  const q = useQuery({ queryKey: ['incidents', 'hotspots'], queryFn: () => api.get<Page<IncidentSummary>>('/incidents', { size: 100 }), refetchInterval: 60_000 })
  const spots = findHotspots((q.data?.items ?? []).map((i) => ({ id: i.id, latitude: i.latitude, longitude: i.longitude, createdAt: i.createdAt, priority: i.priority, category: i.category })))
  return (
    <Card className="mb-6">
      <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-4 w-4 text-critical" aria-hidden />Incident hotspots</CardTitle><span className="text-xs text-muted">Last 100 reports, about 1 km areas</span></CardHeader>
      <CardBody>
        {q.isLoading ? <p className="text-sm text-muted">Loading…</p> : spots.length === 0 ? <p className="text-sm text-muted">No area has two or more reports yet. Hotspots appear when incidents cluster.</p> : (
          <ol className="space-y-2.5">
            {spots.map((h, n) => (
              <li key={h.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="num w-5 text-muted">{n + 1}</span>
                <span className="font-medium">{h.count} reports</span>
                <span className="text-muted">mostly {CATEGORY_LABEL[h.topCategory]}{h.critical > 0 ? `, ${h.critical} critical` : ''}</span>
                <span className="ml-auto flex items-center gap-3"><span className="num text-xs text-muted" title="Priority-weighted, recency-decayed score">score {h.score}</span>
                  <a className="text-primary underline" target="_blank" rel="noreferrer noopener" href={`https://www.openstreetmap.org/?mlat=${h.latitude.toFixed(5)}&mlon=${h.longitude.toFixed(5)}#map=15/${h.latitude.toFixed(5)}/${h.longitude.toFixed(5)}`}>Open map</a>
                  <Link className="text-primary underline" to={`/incidents/${h.incidentIds[0]}`}>Latest</Link></span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-muted">Use it to pre-position responders. It counts recorded incidents; it does not forecast.</p>
      </CardBody>
    </Card>
  )
}
