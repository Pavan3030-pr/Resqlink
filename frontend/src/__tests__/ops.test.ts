import { describe, expect, it } from 'vitest'
import { freshness } from '@/lib/format'
import { citizenStep, phaseIndex, PHASES, slaProgress, sortByUrgency } from '@/lib/triage'

const item = (id: number, priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | undefined, createdAt: string) => ({ id, priority, createdAt })

describe('queue ordering', () => {
  it('sorts by priority first, then by longest wait', () => {
    const sorted = sortByUrgency([
      item(1, 'HIGH', '2026-11-10T12:00:00Z'),
      item(2, 'CRITICAL', '2026-11-10T12:05:00Z'),
      item(3, 'CRITICAL', '2026-11-10T12:01:00Z'),
      item(4, undefined, '2026-11-10T11:00:00Z'),
      item(5, 'LOW', '2026-11-10T10:00:00Z'),
    ])
    expect(sorted.map((i) => i.id)).toEqual([3, 2, 1, 5, 4])
  })
  it('does not mutate its input', () => {
    const input = [item(1, 'LOW', '2026-11-10T12:00:00Z'), item(2, 'CRITICAL', '2026-11-10T12:00:00Z')]
    sortByUrgency(input)
    expect(input.map((i) => i.id)).toEqual([1, 2])
  })
})

describe('response target progress', () => {
  it('is relative to the breach target for the priority and capped for drawing', () => {
    expect(slaProgress('CRITICAL', 0).ratio).toBe(0)
    expect(slaProgress('CRITICAL', 2.5).ratio).toBeCloseTo(0.5)
    expect(slaProgress('CRITICAL', 5).ratio).toBeCloseTo(1)
    expect(slaProgress('CRITICAL', 500).ratio).toBe(1.5)
    expect(slaProgress('CRITICAL', 1).target).toBe(5)
  })
})

describe('phases', () => {
  it('collapses nine statuses into five dispatcher phases', () => {
    expect(PHASES).toHaveLength(5)
    expect(['REPORTED', 'AI_ANALYZED', 'AWAITING_VERIFICATION'].map((s) => phaseIndex(s as never))).toEqual([0, 0, 0])
    expect(phaseIndex('VERIFIED')).toBe(1)
    expect(phaseIndex('RESPONDER_ACCEPTED')).toBe(2)
    expect(phaseIndex('ON_SCENE')).toBe(3)
    expect(phaseIndex('CLOSED')).toBe(4)
    expect(phaseIndex('REJECTED')).toBe(-1)
    expect(phaseIndex('DUPLICATE')).toBe(-1)
  })
  it('collapses to four steps for the person who reported', () => {
    expect(citizenStep('AWAITING_VERIFICATION')).toBe(0)
    expect(citizenStep('VERIFIED')).toBe(1)
    expect(citizenStep('ON_SCENE')).toBe(2)
    expect(citizenStep('RESOLVED')).toBe(3)
    expect(citizenStep('REJECTED')).toBe(-1)
  })
})

describe('freshness labels', () => {
  const now = Date.parse('2026-11-10T12:00:00Z')
  it('reads naturally at each scale', () => {
    expect(freshness(undefined, now)).toBe('—')
    expect(freshness(now - 2_000, now)).toBe('just now')
    expect(freshness(now - 12_000, now)).toBe('12 s ago')
    expect(freshness(now - 3 * 60_000, now)).toBe('3 min ago')
    expect(freshness(now - 2 * 3600_000, now)).toBe('2 h ago')
  })
  it('never goes negative when the clock is slightly ahead', () => {
    expect(freshness(now + 5_000, now)).toBe('just now')
  })
})
