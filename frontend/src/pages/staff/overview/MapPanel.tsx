import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IncidentMap } from '@/components/IncidentMap'
import { Skeleton } from '@/components/ui/skeleton'
import type { MapMarker } from '@/lib/types'

/** The map is part of the queue, not a card holding a map: hovering a queue row emphasises its marker, and the map fills its panel. */
export function MapPanel({ markers, loading, hoverId }: { markers: MapMarker[]; loading: boolean; hoverId: number | null }) {
  if (loading) return <Skeleton className="h-full w-full rounded-panel" />
  return (
    <IncidentMap height="100%" markers={markers} hoverId={hoverId}
      overlay={
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <p className="pointer-events-auto rounded-ctl bg-surface/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-raised backdrop-blur">Live map <span className="num ml-1 font-semibold text-muted">{markers.length}</span></p>
          <Link to="/dispatch/map" className="pointer-events-auto inline-flex items-center gap-1 rounded-ctl bg-surface/95 px-2.5 py-1.5 text-xs font-semibold text-primary shadow-raised backdrop-blur hover:bg-surface">Full map<ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></Link>
        </div>
      } />
  )
}
