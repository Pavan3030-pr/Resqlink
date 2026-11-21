import L from 'leaflet'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { PriorityBadge } from '@/components/ui/badges'
import { clusterPoints } from '@/lib/cluster'
import { CATEGORY_LABEL, PRIORITY_COLOR, STATUS_LABEL, timeAgo } from '@/lib/format'
import { UNATTENDED } from '@/lib/triage'
import type { Category, MapMarker, Responder } from '@/lib/types'
import { cn } from '@/lib/utils'

const DEFAULT_CENTER: [number, number] = [17.385, 78.4867] // Hyderabad, used only when there is nothing to show
const NEUTRAL = '#64748B'
const INK = '#0F1B2D'
const BLUE = '#0B5D5E'

// Glyphs are drawn white on the priority colour, so category is readable at a glance without colour.
const GLYPH: Record<Category, string> = {
  FIRE: '<path d="M12 3c.6 2.6 4 4.6 4 8.6a4 4 0 0 1-8 0c0-1.8.8-3 1.8-3.8.2 1.6.9 2.4 1.7 2.6C11.3 8 11 5.6 12 3Z"/>',
  MEDICAL: '<path d="M12 6v12M6 12h12"/>',
  FLOOD: '<path d="M3 9.5c3-3 6 3 9 0s6 3 9 0M3 15.5c3-3 6 3 9 0s6 3 9 0"/>',
  ACCIDENT: '<path d="M12 4 21 19.5H3L12 4Z"/><path d="M12 10v4.2M12 16.8v.1"/>',
  OTHER: '<circle cx="12" cy="12" r="2.2"/>',
}

const iconCache = new Map<string, L.DivIcon>()
const cached = (key: string, make: () => L.DivIcon) => { let i = iconCache.get(key); if (!i) { i = make(); iconCache.set(key, i) } return i }

interface PinOpts { color: string; category?: Category; assigned?: boolean; pulse?: boolean; emphasis?: 'none' | 'hover' | 'selected'; label?: string }

/** Marker icons are cached by appearance so a poll that changes nothing visible replaces no DOM. */
function pin(o: PinOpts): L.DivIcon {
  const emph = o.emphasis ?? 'none'
  const size = emph === 'none' ? 30 : 38
  const key = ['pin', o.color, o.category, o.assigned, o.pulse, emph, emph === 'selected' ? o.label : ''].join('|')
  return cached(key, () => {
    const border = emph === 'selected' ? `3px solid ${INK}` : '2.5px solid #fff'
    const glyph = o.category ? `<svg viewBox="0 0 24 24" width="${size * 0.58}" height="${size * 0.58}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${GLYPH[o.category]}</svg>` : ''
    return L.divIcon({
      className: 'rl-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div style="position:relative;width:${size}px;height:${size}px">
        ${o.pulse ? `<span class="rl-ring" style="background:${o.color}"></span>` : ''}
        <div style="position:relative;width:100%;height:100%;border-radius:50%;background:${o.color};border:${border};box-shadow:0 2px 6px rgba(11,22,38,.38);display:flex;align-items:center;justify-content:center;transition:transform .15s">${glyph}</div>
        ${o.assigned ? `<span style="position:absolute;right:-3px;bottom:-3px;width:12px;height:12px;border-radius:50%;background:${BLUE};border:2px solid #fff"></span>` : ''}
        ${emph === 'selected' && o.label ? `<span style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:4px;background:${INK};color:#fff;font:600 11px 'IBM Plex Sans Condensed','IBM Plex Sans',Inter,sans-serif;padding:1px 6px;border-radius:6px;white-space:nowrap">${o.label}</span>` : ''}
      </div>`,
    })
  })
}

function clusterIcon(count: number, color: string, hasCritical: boolean, emphasised: boolean): L.DivIcon {
  const size = count > 99 ? 48 : count > 9 ? 42 : 36
  return cached(`cl|${count}|${color}|${hasCritical}|${emphasised}`, () => L.divIcon({
    className: 'rl-marker',
    iconSize: [size + 12, size + 12],
    iconAnchor: [(size + 12) / 2, (size + 12) / 2],
    html: `<div style="width:${size + 12}px;height:${size + 12}px;border-radius:50%;background:${color}33;display:flex;align-items:center;justify-content:center">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;border:${emphasised ? `3px solid ${INK}` : '2.5px solid #fff'};box-shadow:0 2px 6px rgba(11,22,38,.38);display:flex;align-items:center;justify-content:center;font:600 15px 'IBM Plex Sans Condensed','IBM Plex Sans',Inter,sans-serif">${count}</div></div>`,
  }))
}

const responderIcon = () => cached('responder', () => L.divIcon({
  className: 'rl-marker', iconSize: [26, 26], iconAnchor: [13, 13],
  html: `<div style="width:26px;height:26px;border-radius:7px;background:${INK};border:2px solid #fff;box-shadow:0 2px 6px rgba(11,22,38,.38);color:#fff;display:flex;align-items:center;justify-content:center;font:700 12px 'IBM Plex Sans',Inter,sans-serif">R</div>`,
}))

const WEIGHT: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

function MarkerPopup({ m, link }: { m: MapMarker; link: boolean }) {
  return (
    <div className="space-y-2 p-3 pr-8">
      <div className="flex items-center gap-2"><span className="num text-[15px] text-ink">{m.incidentNumber}</span><PriorityBadge priority={m.priority} /></div>
      <p className="text-[13px] font-medium leading-snug text-ink">{CATEGORY_LABEL[m.category]} <span className="font-normal text-muted">· {STATUS_LABEL[m.status]}</span></p>
      <p className="line-clamp-2 text-xs leading-relaxed text-ink-2">{m.description}</p>
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-xs text-muted">
        <span>{m.assigned ? 'Responder assigned' : 'No responder yet'} · {timeAgo(m.createdAt)}</span>
        {link && <Link to={`/incidents/${m.id}`} className="shrink-0 font-semibold text-primary hover:underline">Open</Link>}
      </div>
    </div>
  )
}

interface MarkersProps { markers: MapMarker[]; onSelect?: (id: number) => void; selectedId?: number | null; hoverId?: number | null; link: boolean }

function Markers({ markers, onSelect, selectedId, hoverId, link }: MarkersProps) {
  const map = useMap()
  const [tick, setTick] = useState(0)
  const refs = useRef(new Map<number, L.Marker>())
  useMapEvents({ zoomend: () => setTick((t) => t + 1), moveend: () => setTick((t) => t + 1) })

  const clusters = useMemo(() => {
    const pts = markers.map((m) => {
      const p = map.latLngToContainerPoint([m.latitude, m.longitude])
      return { id: m.id, x: p.x, y: p.y }
    })
    return clusterPoints(pts, 56)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, map, tick])

  const byId = useMemo(() => new Map(markers.map((m) => [m.id, m])), [markers])

  // Selecting from outside (a list row) brings the marker into view at a zoom that un-clusters it, then opens its popup.
  useEffect(() => {
    if (selectedId == null) return
    const m = byId.get(selectedId)
    if (!m) return
    map.flyTo([m.latitude, m.longitude], Math.max(map.getZoom(), 14), { duration: 0.5 })
    const t = setTimeout(() => refs.current.get(selectedId)?.openPopup?.(), 550)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return (
    <>
      {clusters.map((c) => {
        const members = c.ids.map((id) => byId.get(id)!).filter(Boolean)
        const emphasised = members.some((m) => m.id === selectedId || m.id === hoverId)
        if (members.length === 1) {
          const m = members[0]
          const emphasis = m.id === selectedId ? 'selected' : m.id === hoverId ? 'hover' : 'none'
          return (
            <Marker key={`m${m.id}`} position={[m.latitude, m.longitude]} zIndexOffset={emphasis !== 'none' ? 1000 : (WEIGHT[m.priority ?? ''] ?? 0) * 10}
              ref={(r) => { if (r) refs.current.set(m.id, r); else refs.current.delete(m.id) }}
              title={`${m.incidentNumber} ${CATEGORY_LABEL[m.category]} ${m.priority ?? ''}`.trim()}
              icon={pin({ color: m.priority ? PRIORITY_COLOR[m.priority] : NEUTRAL, category: m.category, assigned: m.assigned, pulse: m.priority === 'CRITICAL' && UNATTENDED.includes(m.status), emphasis, label: m.incidentNumber })}
              eventHandlers={{ click: () => onSelect?.(m.id) }}>
              <Popup className="rl-popup" closeButton><MarkerPopup m={m} link={link} /></Popup>
            </Marker>
          )
        }
        const top = members.reduce((a, b) => ((WEIGHT[b.priority ?? ''] ?? 0) > (WEIGHT[a.priority ?? ''] ?? 0) ? b : a))
        const critical = members.filter((m) => m.priority === 'CRITICAL').length
        const center = L.latLngBounds(members.map((m) => [m.latitude, m.longitude] as [number, number])).getCenter()
        return (
          <Marker key={`c${c.ids.join('-')}`} position={center} title={`${members.length} incidents${critical ? `, ${critical} critical` : ''}. Click to zoom in`}
            icon={clusterIcon(members.length, top.priority ? PRIORITY_COLOR[top.priority] : NEUTRAL, critical > 0, emphasised)}
            eventHandlers={{ click: () => map.fitBounds(L.latLngBounds(members.map((m) => [m.latitude, m.longitude] as [number, number])).pad(0.4), { maxZoom: 17 }) }} />
        )
      })}
    </>
  )
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], Math.max(map.getZoom(), 14))
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 16 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

function Picker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

export interface IncidentMapProps {
  markers?: MapMarker[]
  responders?: Responder[]
  height?: number | string
  /** Fired when a marker is clicked. Its popup opens as well. */
  onSelect?: (id: number) => void
  /** Externally selected incident (e.g. a list row): the map flies to it, emphasises it and opens its popup. */
  selectedId?: number | null
  /** Externally hovered incident: emphasised only, the map does not move. */
  hoverId?: number | null
  /** When provided the map becomes a location picker. */
  picked?: { lat: number; lng: number } | null
  onPick?: (lat: number, lng: number) => void
  fit?: boolean
  /** Popups link to the incident page. */
  popupLink?: boolean
  /** Rendered above the map (legend, counts). Wrap interactive children in `pointer-events-auto`. */
  overlay?: ReactNode
  /** Drop the border and radius when the map fills a panel edge to edge. */
  bare?: boolean
  className?: string
}

export function IncidentMap({ markers = [], responders = [], height = 420, onSelect, selectedId, hoverId, picked, onPick, fit = true, popupLink = true, overlay, bare, className }: IncidentMapProps) {
  const points = useMemo<[number, number][]>(() => {
    const p: [number, number][] = markers.map((m) => [m.latitude, m.longitude])
    if (picked) p.push([picked.lat, picked.lng])
    return p
  }, [markers, picked])
  const located = responders.filter((r) => r.shareLocation && r.latitude != null && r.longitude != null)
  const center = points[0] ?? DEFAULT_CENTER
  return (
    // `isolate` keeps Leaflet's high z-index panes and controls from climbing over the sticky header.
    <div className={cn('relative isolate overflow-hidden', !bare && 'rounded-panel border border-line shadow-card', className)} style={{ height }}>
      <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        {fit && points.length > 0 && <FitBounds points={points} />}
        {markers.length > 0 && <Markers markers={markers} onSelect={onSelect} selectedId={selectedId} hoverId={hoverId} link={popupLink} />}
        {located.map((r) => (
          <Marker key={`r${r.userId}`} position={[r.latitude!, r.longitude!]} icon={responderIcon()} title={`Responder ${r.fullName}`}>
            <Popup className="rl-popup"><div className="space-y-0.5 p-3 pr-8"><p className="text-[13px] font-semibold">{r.fullName}</p><p className="text-xs text-muted">{r.responderType.replace('_', ' ')} · {r.availability.toLowerCase()}</p></div></Popup>
          </Marker>
        ))}
        {onPick && <Picker onPick={onPick} />}
        {picked && onPick && <Marker position={[picked.lat, picked.lng]} icon={pin({ color: BLUE, pulse: true, emphasis: 'hover' })} title="Selected incident location" />}
      </MapContainer>
      {overlay && <div className="pointer-events-none absolute inset-0 z-[1000]">{overlay}</div>}
    </div>
  )
}
