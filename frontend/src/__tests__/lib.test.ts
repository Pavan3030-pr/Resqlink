import { describe, expect, it } from 'vitest'
import { clusterPoints } from '@/lib/cluster'
import { buildQuery } from '@/lib/api'
import { formatDistance, formatMinutes, isOpen, navigationUrl, timeAgo } from '@/lib/format'
import { reportSchema } from '@/pages/citizen/ReportForm'
import { loginSchema, registerSchema } from '@/pages/AuthPages'

describe('format helpers', () => {
  it('formats distances', () => {
    expect(formatDistance(450)).toBe('450 m')
    expect(formatDistance(1520)).toBe('1.5 km')
    expect(formatDistance(undefined)).toBe('Unknown')
  })
  it('formats minutes and missing data honestly', () => {
    expect(formatMinutes(undefined)).toBe('No data yet')
    expect(formatMinutes(0.4)).toBe('< 1 min')
    expect(formatMinutes(12.34)).toBe('12.3 min')
    expect(formatMinutes(180)).toBe('3.0 h')
  })
  it('timeAgo is relative to a given now', () => {
    const now = Date.parse('2026-11-10T12:00:00Z')
    expect(timeAgo('2026-11-10T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-11-10T11:30:00Z', now)).toBe('30 min ago')
    expect(timeAgo('2026-11-10T09:00:00Z', now)).toBe('3 h ago')
    expect(timeAgo('2026-11-08T12:00:00Z', now)).toBe('2 d ago')
  })
  it('knows which statuses are open', () => {
    expect(isOpen('ON_SCENE')).toBe(true)
    expect(isOpen('CLOSED')).toBe(false)
    expect(isOpen('DUPLICATE')).toBe(false)
  })
  it('builds a navigation link', () => {
    expect(navigationUrl(17.38, 78.48)).toContain('17.38%2C78.48')
  })
})

describe('api helpers', () => {
  it('buildQuery skips empty values and encodes the rest', () => {
    expect(buildQuery({ a: 1, b: '', c: undefined, d: 'x y', e: false })).toBe('?a=1&d=x+y&e=false')
    expect(buildQuery()).toBe('')
    expect(buildQuery({ a: undefined })).toBe('')
  })
})

describe('map clustering', () => {
  it('groups nearby points and keeps distant ones separate', () => {
    const c = clusterPoints([
      { id: 1, x: 10, y: 10 }, { id: 2, x: 20, y: 15 }, { id: 3, x: 400, y: 300 },
    ], 56)
    expect(c).toHaveLength(2)
    const big = c.find((x) => x.ids.length === 2)!
    expect(big.ids.sort()).toEqual([1, 2])
    expect(big.x).toBeCloseTo(15)
  })
  it('returns nothing for no points', () => {
    expect(clusterPoints([], 56)).toEqual([])
  })
})

describe('form validation', () => {
  const valid = { category: 'ACCIDENT', description: 'Two cars collided near the bridge', latitude: 17.38, longitude: 78.48 }
  it('accepts a valid report', () => {
    expect(reportSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects short descriptions and out-of-range coordinates', () => {
    expect(reportSchema.safeParse({ ...valid, description: 'ab' }).success).toBe(false)
    expect(reportSchema.safeParse({ ...valid, latitude: 91 }).success).toBe(false)
    expect(reportSchema.safeParse({ ...valid, longitude: -181 }).success).toBe(false)
    expect(reportSchema.safeParse({ ...valid, latitude: undefined }).success).toBe(false)
    expect(reportSchema.safeParse({ ...valid, category: 'EARTHQUAKE' }).success).toBe(false)
  })
  it('rejects bad phone numbers', () => {
    expect(reportSchema.safeParse({ ...valid, contactPhone: 'abc' }).success).toBe(false)
    expect(reportSchema.safeParse({ ...valid, contactPhone: '+91 98765-43210' }).success).toBe(true)
  })
  it('validates login and registration', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
    expect(registerSchema.safeParse({ fullName: 'Ravi K', email: 'r@x.io', password: 'short', role: 'CITIZEN' }).success).toBe(false)
    expect(registerSchema.safeParse({ fullName: 'Ravi K', email: 'r@x.io', password: 'Long-enough-1x', role: 'CITIZEN' }).success).toBe(true)
    expect(registerSchema.safeParse({ fullName: 'Ravi K', email: 'r@x.io', password: 'Long-enough-1x', role: 'ADMIN' }).success).toBe(false)
  })
})
