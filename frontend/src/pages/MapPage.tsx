import { useQuery } from '@tanstack/react-query'
import { MapPinOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IncidentMap } from '@/components/IncidentMap'
import { PriorityBars } from '@/components/ui/badges'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/fields'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { CATEGORY_LABEL, PRIORITY_COLOR, STATUS_LABEL, timeAgo } from '@/lib/format'
import { sortByUrgency } from '@/lib/triage'
import type { MapMarker, Priority, Responder } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useNow } from '@/lib/useNow'

const LEGEND: [string, Priority][] = [['Critical', 'CRITICAL'], ['High', 'HIGH'], ['Medium', 'MEDIUM'], ['Low', 'LOW']]

export default function MapPage({ mode }: { mode: 'staff' | 'responder' }) {
  const staff = mode === 'staff'
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [assigned, setAssigned] = useState('')
  const [responder, setResponder] = useState('')
  const [range, setRange] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const rows = useRef<Map<number, HTMLElement>>()
  const now = useNow(30_000)

  const { data: rawIncidents = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['incidents-map', activeOnly],
    queryFn: () => api.incidents.list(activeOnly ? { active_only: true } : {}),
  })

  const { data: responders = [] } = useQuery({
    queryKey: ['responders-map'],
    queryFn: () => api.responders.list(),
  })

  const filteredIncidents = useMemo(() => {
    return rawIncidents.filter((inc) => {
      if (category && inc.category !== category) return false
      if (priority && inc.priority !== priority) return false
      if (status && inc.status !== status) return false
      if (assigned === 'yes' && !inc.assigned_responder_id) return false
      if (assigned === 'no' && inc.assigned_responder_id) return false
      if (responder && String(inc.assigned_responder_id) !== responder) return false
      return true
    })
  }, [rawIncidents, category, priority, status, assigned, responder])

  const sortedIncidents = useMemo(() => sortByUrgency(filteredIncidents, now), [filteredIncidents, now])

  return (
    <main className="mx-auto max-w-[96rem]">
      <PageHeader title="Live emergency map" subtitle={staff ? 'Incidents by urgency. Blue-dot markers have a responder assigned; dark squares are responders who chose to share location.' : 'Active incidents near you.'} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
              <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {Object.entries(CATEGORY_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>

              <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">All priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>

              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>

              {staff && (
                <>
                  <Select label="Assignment" value={assigned} onChange={(e) => setAssigned(e.target.value)}>
                    <option value="">All</option>
                    <option value="yes">Assigned only</option>
                    <option value="no">Unassigned only</option>
                  </Select>

                  <Select label="Responder" value={responder} onChange={(e) => setResponder(e.target.value)}>
                    <option value="">All responders</option>
                    {responders.map((r: Responder) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                    ))}
                  </Select>
                </>
              )}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden min-h-[500px]">
            <IncidentMap
              incidents={sortedIncidents}
              responders={responders}
              selectedId={selected}
              hoveredId={hover}
              onSelectIncident={setSelected}
              onHoverIncident={setHover}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Incidents ({sortedIncidents.length})</h2>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {isLoading && <Skeleton className="h-24 w-full" />}
            {isError && <ErrorState onRetry={refetch} />}
            {!isLoading && !isError && sortedIncidents.length === 0 && (
              <EmptyState title="No incidents found" description="Try relaxing your filters." icon={MapPinOff} />
            )}
            {sortedIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => setSelected(inc.id)}
                onMouseEnter={() => setHover(inc.id)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition-all',
                  selected === inc.id ? 'border-brand bg-brand/5 shadow-sm' : 'border-border hover:border-border-hover',
                  hover === inc.id ? 'bg-slate-50' : ''
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{inc.title}</span>
                      <PriorityBars priority={inc.priority} />
                    </div>
                    <p className="text-sm text-ink-muted line-clamp-2">{inc.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                  <span>{CATEGORY_LABEL[inc.category] || inc.category}</span>
                  <span>{timeAgo(inc.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
