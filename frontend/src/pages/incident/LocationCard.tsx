import { Navigation, TriangleAlert } from 'lucide-react'
import { IncidentMap } from '@/components/IncidentMap'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { navigationUrl } from '@/lib/format'
import type { IncidentDetail } from '@/lib/types'
import { cn } from '@/lib/utils'

export function LocationCard({ d, staff, responder }: { d: IncidentDetail; staff: boolean; responder: boolean }) {
  const s = d.summary
  const low = (d.locationAccuracyMeters ?? 0) > 100
  return (
    <Card>
      <CardHeader><CardTitle>Location</CardTitle>
        {responder && <a className="inline-flex h-8 items-center gap-1.5 rounded-ctl bg-primary px-3 text-[13px] font-medium text-white hover:bg-primary-hover" target="_blank" rel="noreferrer noopener" href={navigationUrl(s.latitude, s.longitude)}><Navigation className="h-4 w-4" aria-hidden />Navigate</a>}
      </CardHeader>
      <CardBody className="space-y-3 p-3">
        <IncidentMap height={240} popupLink={false} markers={[{ id: s.id, incidentNumber: s.incidentNumber, category: s.category, priority: s.priority, status: s.status, latitude: s.latitude, longitude: s.longitude, assigned: d.assignments.length > 0, createdAt: s.createdAt, description: s.description }]} />
        <div className="px-1">
          {s.addressHint && <p className="text-sm font-medium text-ink">{s.addressHint}</p>}
          <p className="num text-xs text-muted">{s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}</p>
        </div>
        {staff && d.locationSource && (
          <p className={cn('flex items-start gap-2 rounded-ctl px-3 py-2 text-xs', low ? 'border border-medium-edge bg-medium-tint font-medium text-medium' : 'bg-surface-2 text-muted')}>
            {low && <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
            <span>Location from {d.locationSource === 'GPS' ? 'device GPS' : 'a pin placed on the map'}{d.locationAccuracyMeters != null ? `, accuracy ±${d.locationAccuracyMeters} m` : ''}{low ? '. Low accuracy: confirm the exact spot with the reporter.' : ''}</span>
          </p>
        )}
      </CardBody>
    </Card>
  )
}
