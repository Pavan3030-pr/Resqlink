/** Simple screen-space grid clustering for map markers (no extra dependency). */
export interface Point { id: number; x: number; y: number }
export interface Cluster { ids: number[]; x: number; y: number }

export function clusterPoints(points: Point[], cellSize: number): Cluster[] {
  const cells = new Map<string, Cluster>()
  for (const p of points) {
    const key = `${Math.floor(p.x / cellSize)}:${Math.floor(p.y / cellSize)}`
    const c = cells.get(key)
    if (!c) {
      cells.set(key, { ids: [p.id], x: p.x, y: p.y })
    } else {
      const n = c.ids.length
      c.x = (c.x * n + p.x) / (n + 1)
      c.y = (c.y * n + p.y) / (n + 1)
      c.ids.push(p.id)
    }
  }
  return [...cells.values()]
}
