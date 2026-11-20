import type { Category, IncidentStatus, Priority } from './types'

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  REPORTED: 'Reported',
  AI_ANALYZED: 'AI analyzed',
  AWAITING_VERIFICATION: 'Awaiting verification',
  VERIFIED: 'Verified',
  ASSIGNED: 'Assigned',
  RESPONDER_ACCEPTED: 'Responder accepted',
  ON_SCENE: 'On scene',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  ACCIDENT: 'Accident',
  FIRE: 'Fire',
  FLOOD: 'Flood',
  MEDICAL: 'Medical emergency',
  OTHER: 'Other',
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  CRITICAL: '#D92D20',
  HIGH: '#E8590C',
  MEDIUM: '#C27C05',
  LOW: '#1B9A52',
}

export const LIFECYCLE: IncidentStatus[] = [
  'REPORTED', 'AI_ANALYZED', 'AWAITING_VERIFICATION', 'VERIFIED', 'ASSIGNED',
  'RESPONDER_ACCEPTED', 'ON_SCENE', 'RESOLVED', 'CLOSED',
]

export function timeAgo(iso: string | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const diff = Math.max(0, now - new Date(iso).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  return `${d} d ago`
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDistance(meters: number | undefined | null): string {
  if (meters == null) return 'Unknown'
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

export function formatMinutes(min: number | undefined | null): string {
  if (min == null) return 'No data yet'
  if (min < 1) return '< 1 min'
  if (min < 90) return `${min.toFixed(1)} min`
  return `${(min / 60).toFixed(1)} h`
}

export function isOpen(status: IncidentStatus): boolean {
  return !['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(status)
}

export function navigationUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`
}

/** "just now", "12 s ago", "3 min ago": freshness cues for data that updates live. */
export function freshness(ts: number | undefined, now: number = Date.now()): string {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`
}

export const PRIORITY_LABEL: Record<Priority, string> = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
