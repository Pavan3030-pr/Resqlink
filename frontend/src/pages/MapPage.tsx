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
  const rows = useRef<New Map<number, HTMLElement>>()
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
  const rows = useRef(new Map<number, HTMLElement>())
  const now = useNow(30_000)

  const from = range ? new Date(Date.now() - Number(range) * 3600_000).toISOString() : undefined
  const markers = useQuery({
    queryKey: ['map', category, priority, status, responder, range, activeOnly],
    queryFn: () => api.get<MapMarker[]>('/incidents/map', { category, priority, status, assignedTo: responder, from, activeOnly: status ? undefined : activeOnly }),
    refetchInterval: 15_000,
  })
  const responders = useQuery({ queryKey: ['responders'], queryFn: () => api.get<Responder[]>('/responders'), enabled: staff, refetchInterval: 20_000 })

  const shown = useMemo(() => sortByUrgency((markers.data ?? []).filter((m) => (assigned === '' ? true : assigned === 'yes' ? m.assigned : !m.assigned))), [markers.data, assigned])
  const critical = shown.filter((m) => m.priority === 'CRITICAL').length

  // A marker click scrolls its list row into view so map and list always agree on what is selected.
  useEffect(() => { if (selected != null) rows.current.get(selected)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [selected])
  useEffect(() => { if (selected != null && !shown.some((m) => m.id === selected)) setSelected(null) }, [shown, selected])

  return (
    <div className="mx-auto max-w-[96rem]">
      <PageHeader title="Live emergency map" subtitle={staff ? 'Incidents by urgency. Blue-dot markers have a responder assigned; dark squares are responders who chose to share location.' : 'Active incidents near you.'} />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Emergency type" className="h-9 w-auto text-[13px]" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All types</option>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select aria-label="Priority" className="h-9 w-auto text-[13px]" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></Select>
          <Select aria-label="Status" className="h-9 w-auto text-[13px]" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          {staff && <Select aria-label="Assignment" className="h-9 w-auto text-[13px]" value={assigned} onChange={(e) => setAssigned(e.target.value)}><option value="">Assigned & unassigned</option><option value="yes">Assigned</option><option value="no">Unassigned</option></Select>}
          {staff && <Select aria-label="Responder" className="h-9 w-auto text-[13px]" value={responder} onChange={(e) => setResponder(e.target.value)}><option value="">Any responder</option>{responders.data?.map((r) => <option key={r.userId} value={r.userId}>{r.fullName}</option>)}</Select>}
          <Select aria-label="Time range" className="h-9 w-auto text-[13px]" value={range} onChange={(e) => setRange(e.target.value)}><option value="">Any time</option><option value="1">Last hour</option><option value="6">Last 6 hours</option><option value="24">Last 24 hours</option><option value="168">Last 7 days</option></Select>
          <label className="ml-1 flex h-9 items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" className="h-4 w-4 rounded accent-primary" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} disabled={!!status} />Active only</label>
        </div>
      </Card>

      {markers.error && !markers.data ? <Card><ErrorState title="Could not load the map" error={markers.error} onRetry={() => markers.refetch()} /></Card> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-[56vh] lg:h-[calc(100vh-14rem)] lg:min-h-[520px]">
            {markers.isLoading ? <Skeleton className="h-full w-full rounded-panel" /> : (
              <IncidentMap height="100%" markers={shown} responders={staff ? responders.data : []} selectedId={selected} hoverId={hover} onSelect={setSelected}
                overlay={
                  <>
                    <p className="pointer-events-auto absolute left-3 top-3 rounded-ctl bg-surface/95 px-2.5 py-1.5 text-xs font-medium text-ink-2 shadow-raised backdrop-blur">
                      <span className="num text-sm text-ink">{shown.length}</span> shown{critical > 0 && <> · <span className="num text-sm text-critical">{critical}</span> <span className="text-critical">critical</span></>}
                    </p>
                    <ul className="pointer-events-auto absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-ctl bg-surface/95 px-2.5 py-1.5 text-xs text-ink-2 shadow-raised backdrop-blur" aria-label="Map legend">
                      {LEGEND.map(([l, p]) => <li key={l} className="inline-flex items-center gap-1.5"><span style={{ color: PRIORITY_COLOR[p] }}><PriorityBars priority={p} /></span>{l}</li>)}
                    </ul>
                  </>
                } />
            )}
          </div>

          <Card elevation="raised" className="flex max-h-[60vh] min-h-0 flex-col overflow-hidden lg:h-[calc(100vh-14rem)] lg:max-h-none lg:min-h-[520px]">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4"><h2 className="text-[13px] font-semibold">By urgency</h2><span className="num text-xs text-muted">{shown.length}</span></div>
            {markers.isLoading ? <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
              : shown.length === 0 ? <EmptyState icon={MapPinOff} title="No incidents match" hint="Widen the filters above, or untick Active only to include closed incidents." />
              : (
                <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
                  {shown.map((m) => {
                    const on = m.id === selected
                    return (
                      <li key={m.id} ref={(el) => { if (el) rows.current.set(m.id, el); else rows.current.delete(m.id) }} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)}
                        className={cn('relative flex items-stretch transition-colors', on ? 'bg-primary-soft' : 'hover:bg-surface-2')}>
                        <span className="w-1 shrink-0" style={{ background: m.priority ? PRIORITY_COLOR[m.priority] : '#CBD5E1' }} aria-hidden />
                        <button type="button" aria-pressed={on} onClick={() => setSelected(on ? null : m.id)} onFocus={() => setHover(m.id)} onBlur={() => setHover(null)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                          <span className="flex items-center gap-2"><span style={{ color: m.priority ? PRIORITY_COLOR[m.priority] : '#64748B' }}><PriorityBars priority={m.priority} /></span><span className="num text-sm text-ink">{m.incidentNumber}</span><span className="truncate text-[13px] text-ink-2">{CATEGORY_LABEL[m.category]}</span></span>
                          <span className="mt-0.5 block truncate text-xs text-muted">{m.description}</span>
                          <span className="mt-0.5 block text-2xs text-muted">{STATUS_LABEL[m.status]} · {m.assigned ? 'assigned' : 'unassigned'} · {timeAgo(m.createdAt, now)}</span>
                        </button>
                        <Link to={`/incidents/${m.id}`} className="flex w-14 shrink-0 items-center justify-center text-xs font-semibold text-primary hover:bg-primary-soft" aria-label={`Open ${m.incidentNumber}`}>Open</Link>
                      </li>
                    )
                  })}
                </ul>
              )}
          </Card>
        </div>
      )}
    </div>
  )
}
