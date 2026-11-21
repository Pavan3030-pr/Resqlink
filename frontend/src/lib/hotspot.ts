import type { Category, Priority } from './types'

/**
 * Hotspot analysis for dispatchers: groups recent incidents into ~1 km grid cells and scores each cell by
 * priority and recency. It is a transparent counting rule over recorded incidents, not a prediction model;
 * the UI labels it as such. Pure and deterministic so it can be tested.
 */
export interface HotspotInput { id: number; latitude: number; longitude: number; createdAt: string; priority?: Priority; category: Category }
export interface Hotspot {
  key: string
  latitude: number
  longitude: number
  count: number
  score: number
  topCategory: Category
  critical: number
  incidentIds: number[]
}

const PRIORITY_WEIGHT: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
/** Cell edge in degrees: 0.01 degrees is about 1.1 km north-south. */
export const CELL_DEGREES = 0.01
/** An incident's weight halves every this many hours. */
export const HALF_LIFE_HOURS = 72

export function recencyFactor(createdAt: string, now: number, halfLifeHours = HALF_LIFE_HOURS): number {
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t)) return 0
  const ageH = Math.max(0, (now - t) / 3_600_000)
  return Math.pow(0.5, ageH / halfLifeHours)
}

export function findHotspots(items: HotspotInput[], now: number = Date.now(), opts: { minCount?: number; limit?: number } = {}): Hotspot[] {
  const minCount = opts.minCount ?? 2
  const limit = opts.limit ?? 5
  type Cell = { sumLat: number; sumLng: number; score: number; ids: number[]; cats: Map<Category, number>; critical: number }
  const cells = new Map<string, Cell>()
  for (const i of items) {
    if (!Number.isFinite(i.latitude) || !Number.isFinite(i.longitude)) continue
    const key = `${Math.floor(i.latitude / CELL_DEGREES)}:${Math.floor(i.longitude / CELL_DEGREES)}`
    const c: Cell = cells.get(key) ?? { sumLat: 0, sumLng: 0, score: 0, ids: [], cats: new Map(), critical: 0 }
    c.sumLat += i.latitude
    c.sumLng += i.longitude
    c.score += (PRIORITY_WEIGHT[i.priority ?? 'MEDIUM'] ?? 2) * recencyFactor(i.createdAt, now)
    c.ids.push(i.id)
    c.cats.set(i.category, (c.cats.get(i.category) ?? 0) + 1)
    if (i.priority === 'CRITICAL') c.critical++
    cells.set(key, c)
  }
  return [...cells.entries()]
    .filter(([, c]) => c.ids.length >= minCount)
    .map(([key, c]) => {
      const top = [...c.cats.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
      return { key, latitude: c.sumLat / c.ids.length, longitude: c.sumLng / c.ids.length, count: c.ids.length, score: Math.round(c.score * 100) / 100, topCategory: top, critical: c.critical, incidentIds: c.ids }
    })
    .sort((a, b) => b.score - a.score || b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit)
}
