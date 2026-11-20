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
  const now = useNow()
  const [status, setStatus] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [activeOnly, setActiveOnly] = useState<boolean>(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const rows = useRef<Map<string, HTMLLIElement>>(new Map())

  const staff = mode === 'staff'

  const markers = useQuery({
    queryKey: ['map-markers'],
    queryFn: () => api.getMapMarkers(),
    refetchInterval: 15_000,
  })

  const responders = useQuery({
    queryKey: ['responders-locations'],
    queryFn: () => api.getResponders(),
    enabled: staff,
    refetchInterval: 15_000,
  })

  const list = useMemo(() => {
    if (!markers.data) return []
    let arr = markers.data
    if (activeOnly) {
      arr = arr.filter((m) => m.status === 'open' || m.status === 'assigned')
    }
    if (status) {
      arr = arr.filter((m) => m.status === status)
    }
    if (category) {
      arr = arr.filter((m) => m.category === category)
    }
    if (priority) {
      arr = arr.filter((m) => m.priority === priority)
    }
    return sortByUrgency(arr, now)
  }, [markers.data, activeOnly, status, category, priority, now])

  const shown = list

  const critical = useMemo(
    () => shown.filter((m) => m.priority === 'CRITICAL').length,
    [shown]
  )

  useEffect(() => {
    if (!selected) return
    const el = rows.current.get(selected)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selected])

  return (
    <main className="container-shell space-y-4">
      <PageHeader
        title={staff ? 'Operations Map' : 'Field Map'}
        description={
          staff
            ? 'Live view of incidents and active responders'
            : 'Live map of incidents requiring field action'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/incidents"
              className="px-3 py-1.5 text-xs font-semibold text-ink-2 hover:text-ink border border-line rounded-ctl"
            >
              Incident list
            </Link>
          </div>
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-2">Status:</span>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-2">Category:</span>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              <option value="MEDICAL">Medical</option>
              <option value="FIRE">Fire</option>
              <option value="FLOOD">Flood</option>
              <option value="RESCUE">Rescue</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-2">Priority:</span>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </Select>
          </div>

          <label className="ml-1 flex h-9 items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              disabled={!!status}
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
                hoveredId={hover}
                onSelect={setSelected}
                overlay={
                  <>
                    <p className="pointer-events-auto absolute left-3 top-3 rounded-ctl bg-surface/95 px-2.5 py-1.5 text-xs font-medium text-ink-2 shadow-raised backdrop-blur">
                      <span className="num text-sm text-ink">{shown.length}</span> shown
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
                        <li key={l} className="inline-flex items-center gap-1.5">
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
                          <span style={{ color: m.priority ? PRIORITY_COLOR[m.priority] : '#64748B' }}>
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
                          {STATUS_LABEL[m.status]} · {m.assigned ? 'assigned' : 'unassigned'} ·{' '}
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
    </main>
  )
}
