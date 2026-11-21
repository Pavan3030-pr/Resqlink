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

const LEGEND: [string, Priority][] = [
  ['Critical', 'CRITICAL'],
  ['High', 'HIGH'],
  ['Medium', 'MEDIUM'],
  ['Low', 'LOW'],
]

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

  const from = range
    ? new Date(Date.now() - Number(range) * 3600 * 1000).toISOString()
    : undefined

  const markers = useQuery({
    queryKey: [
      'incidents-map',
      { category, priority, status, responder, from, activeOnly },
    ],
    queryFn: () =>
      api.get<MapMarker[]>('/incidents/map', {
        category,
        priority,
        status,
        responder,
        from,
        activeOnly,
      }),
  })

  const responders = useQuery({
    queryKey: ['responders'],
    queryFn: () => api.get<Responder[]>('/responders'),
    enabled: staff,
    refetchInterval: 20_000,
  })

  const sorted = useMemo(
    () => sortByUrgency(markers.data ?? []),
    [markers.data]
  )
  const shown = useMemo(() => {
    let list = sorted
    if (assigned === 'yes') list = list.filter((m) => m.assigned)
    if (assigned === 'no') list = list.filter((m) => !m.assigned)
    return list
  }, [sorted, assigned])

  const critical = useMemo(
    () => shown.filter((m) => m.priority === 'CRITICAL').length,
    [shown]
  )

  useEffect(() => {
    if (selected != null) {
      const el = rows.current.get(selected)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selected])

  useEffect(() => {
    if (selected != null && !shown.some((m) => m.id === selected)) {
      setSelected(null)
    }
  }, [selected, shown])

  return (
    <div className="mx-auto max-w-[96rem]">
      <PageHeader
        title="Live emergency map"
        subtitle={
          staff
            ? 'Incidents by urgency. Blue-dot markers indicate responder locations.'
            : 'Incidents sorted by priority and age.'
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Emergency type"
            className="h-9 w-auto text-[13px]"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All types</option>
            <option value="MEDICAL">Medical</option>
            <option value="FIRE">Fire</option>
            <option value="FLOOD">Flood</option>
            <option value="HAZMAT">Hazmat</option>
            <option value="RESCUE">Rescue</option>
            <option value="OTHER">Other</option>
          </Select>
          <Select
            aria-label="Priority"
            className="h-9 w-auto text-[13px]"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
          <Select
            aria-label="Status"
            className="h-9 w-auto text-[13px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
          </Select>
          {staff && (
            <Select
              aria-label="Assignment"
              className="h-9 w-auto text-[13px]"
              value={assigned}
              onChange={(e) => setAssigned(e.target.value)}
            >
              <option value="">All assignments</option>
              <option value="yes">Assigned</option>
              <option value="no">Unassigned</option>
            </Select>
          )}
          {staff && (
            <Select
              aria-label="Responder"
              className="h-9 w-auto text-[13px]"
              value={responder}
              onChange={(e) => setResponder(e.target.value)}
            >
              <option value="">All responders</option>
              {(responders.data ?? []).map((r) => (
                <option key={r.userId} value={r.userId}>
                  {r.fullName}
                </option>
              ))}
            </Select>
          )}
          <Select
            aria-label="Time range"
            className="h-9 w-auto text-[13px]"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="">All time</option>
            <option value="1">Past hour</option>
            <option value="6">Past 6 hours</option>
            <option value="24">Past 24 hours</option>
          </Select>
          <label className="ml-1 flex h-9 items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active only
          </label>
        </div>
      </Card>

      {markers.error && !markers.data ? (
        <Card>
          <ErrorState
            title="Could not load the map"
            error={markers.error}
            onRetry={() => markers.refetch()}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-[56vh] lg:h-[calc(100vh-14rem)] lg:min-h-[520px]">
            {markers.isLoading ? (
              <Skeleton className="h-full w-full rounded-panel" />
            ) : (
              <IncidentMap
                height="100%"
                markers={shown}
                responders={staff ? responders.data : []}
                selectedId={selected}
                hoverId={hover}
                onSelect={setSelected}
                overlay={
                  <>
                    <p className="pointer-events-auto absolute left-3 top-3 rounded-ctl bg-surface/95 px-2.5 py-1.5 text-xs font-medium text-ink-2 shadow-raised backdrop-blur">
                      <span className="num text-sm text-ink">
                        {shown.length}
                      </span>{' '}
                      shown
                      {critical > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          <span className="num text-sm text-critical">
                            {critical}
                          </span>{' '}
                          critical
                        </>
                      )}
                    </p>
                    <ul
                      className="pointer-events-auto absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-ctl bg-surface/95 px-2.5 py-1.5 text-xs text-ink-2 shadow-raised backdrop-blur"
                      aria-label="Map legend"
                    >
                      {LEGEND.map(([l, p]) => (
                        <li
                          key={l}
                          className="inline-flex items-center gap-1.5"
                        >
                          <span style={{ color: PRIORITY_COLOR[p] }}>
                            <PriorityBars priority={p} />
                          </span>
                          {l}
                        </li>
                      ))}
                    </ul>
                  </>
                }
              />
            )}
          </div>

          <Card
            elevation="raised"
            className="flex max-h-[60vh] min-h-0 flex-col overflow-hidden lg:h-[calc(100vh-14rem)] lg:max-h-none lg:min-h-[520px]"
          >
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
              <h2 className="text-[13px] font-semibold">By urgency</h2>
              <span className="num text-xs text-muted">{shown.length}</span>
            </div>
            {markers.isLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : shown.length === 0 ? (
              <EmptyState
                icon={MapPinOff}
                title="No incidents match"
                hint="Widen the filters above, or untick Active only to include closed incidents."
              />
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
                {shown.map((m) => {
                  const on = m.id === selected
                  return (
                    <li
                      key={m.id}
                      ref={(el) => {
                        if (el) rows.current.set(m.id, el)
                        else rows.current.delete(m.id)
                      }}
                      onMouseEnter={() => setHover(m.id)}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        'relative flex items-stretch transition-colors',
                        on ? 'bg-primary-soft' : 'hover:bg-surface-2'
                      )}
                    >
                      <span
                        className="w-1 shrink-0"
                        style={{
                          background: m.priority
                            ? PRIORITY_COLOR[m.priority]
                            : '#CBD5E1',
                        }}
                        aria-hidden
                      />
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSelected(on ? null : m.id)}
                        onFocus={() => setHover(m.id)}
                        onBlur={() => setHover(null)}
                        className="min-w-0 flex-1 px-3 py-2.5 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            style={{
                              color: m.priority
                                ? PRIORITY_COLOR[m.priority]
                                : '#64748B',
                            }}
                          >
                            <PriorityBars priority={m.priority} />
                          </span>
                          <span className="num text-sm text-ink">
                            {m.incidentNumber}
                          </span>
                          <span className="truncate text-[13px] text-ink-2">
                            {CATEGORY_LABEL[m.category]}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {m.description}
                        </span>
                        <span className="mt-0.5 block text-2xs text-muted">
                          {STATUS_LABEL[m.status]} ·{' '}
                          {m.assigned ? 'assigned' : 'unassigned'} ·{' '}
                          {timeAgo(m.createdAt, now)}
                        </span>
                      </button>
                      <Link
                        to={`/incidents/${m.id}`}
                        className="flex w-14 shrink-0 items-center justify-center text-xs font-semibold text-primary hover:bg-primary-soft"
                        aria-label={`Open ${m.incidentNumber}`}
                      >
                        Open
                      </Link>
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
