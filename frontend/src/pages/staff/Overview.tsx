import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { StatStrip } from '@/components/ops/StatStrip'
import { ErrorNote, PageHeader } from '@/components/ui/misc'
import { StatSkeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { freshness } from '@/lib/format'
import { sortByUrgency, UNATTENDED } from '@/lib/triage'
import type { Coverage, IncidentSummary, MapMarker, Page, Stats } from '@/lib/types'
import { useNow } from '@/lib/useNow'
import { MapPanel } from './overview/MapPanel'
import { NeedsAttention } from './overview/NeedsAttention'
import { CoverageGaps, InProgress } from './overview/SidePanels'

export default function Overview() {
  const now = useNow(10_000)
  const [hoverId, setHoverId] = useState<number | null>(null)
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/incidents/stats'), refetchInterval: 15_000 })
  const attention = useQuery({
    queryKey: ['incidents', 'attention'],
    queryFn: () => api.get<Page<IncidentSummary>>('/incidents', { size: 50, activeOnly: true }),
    refetchInterval: 10_000,
  })
  const coverage = useQuery({ queryKey: ['coverage'], queryFn: () => api.get<Coverage>('/analytics/coverage'), refetchInterval: 30_000 })
  const map = useQuery({ queryKey: ['map', 'overview'], queryFn: () => api.get<MapMarker[]>('/incidents/map', { activeOnly: true }), refetchInterval: 15_000 })

  const all = attention.data?.items ?? []
  const needsAttention = sortByUrgency(all.filter((i) => UNATTENDED.includes(i.status)))
  const inProgress = all.filter((i) => ['ASSIGNED', 'RESPONDER_ACCEPTED', 'ON_SCENE'].includes(i.status))
  const criticalWaiting = needsAttention.filter((i) => i.priority === 'CRITICAL').length

  return (
    <div className="mx-auto max-w-[96rem]">
      <PageHeader title="Command center" subtitle="What needs attention, where it is and who is responding." />
      {stats.isLoading ? <StatSkeleton /> : stats.data && (
        <StatStrip
          freshness={<>Updated {freshness(stats.dataUpdatedAt, now)}</>}
          cells={[
            { label: 'Critical open', value: stats.data.critical, tone: stats.data.critical > 0 ? 'critical' : 'default', hint: criticalWaiting > 0 ? `oldest ${needsAttention.find((i) => i.priority === 'CRITICAL')?.incidentNumber}` : undefined },
            { label: 'Waiting on dispatcher', value: needsAttention.length, tone: needsAttention.length > 0 && criticalWaiting === 0 ? 'warn' : 'default' },
            { label: 'Verified, unassigned', value: stats.data.unassigned, hint: stats.data.unassigned > 0 ? 'need a responder' : undefined },
            { label: 'In progress', value: inProgress.length },
            { label: 'Responders available', value: `${stats.data.respondersAvailable}/${stats.data.respondersTotal}` },
          ]} />
      )}
      <ErrorNote error={stats.error} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-7">
          <NeedsAttention items={needsAttention} loading={attention.isLoading} error={attention.error} onRetry={() => attention.refetch()} now={now} critical={criticalWaiting} onHover={setHoverId} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 [&>*]:min-w-0">
            <InProgress items={inProgress} loading={attention.isLoading} now={now} />
            <CoverageGaps data={coverage.data} loading={coverage.isLoading} error={coverage.error} onRetry={() => coverage.refetch()} />
          </div>
        </div>
        <div className="h-[22rem] xl:sticky xl:top-[4.5rem] xl:col-span-5 xl:h-[calc(100vh-6rem)] xl:min-h-[30rem]">
          <MapPanel markers={map.data ?? []} loading={map.isLoading} hoverId={hoverId} />
        </div>
      </div>
    </div>
  )
}
