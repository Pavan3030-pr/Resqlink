import { describe, expect, it } from 'vitest'
import { findHotspots, recencyFactor } from '@/lib/hotspot'
import { quickRepliesFor } from '@/lib/quickReplies'
import { safetyGuidance } from '@/lib/safety'
import { buildSosPayload, SOS_CATEGORIES } from '@/lib/sos'
import { reportSchema } from '@/pages/citizen/ReportForm'

const NOW = Date.parse('2026-11-21T12:00:00Z')
const at = (h: number) => new Date(NOW - h * 3_600_000).toISOString()

describe('hotspots', () => {
  it('halves weight every 72 hours and ignores bad dates', () => {
    expect(recencyFactor(at(0), NOW)).toBeCloseTo(1)
    expect(recencyFactor(at(72), NOW)).toBeCloseTo(0.5)
    expect(recencyFactor('nonsense', NOW)).toBe(0)
  })
  it('ranks dense, recent, critical clusters first and drops singletons', () => {
    const items = [
      { id: 1, latitude: 17.4101, longitude: 78.4701, createdAt: at(1), priority: 'CRITICAL' as const, category: 'ACCIDENT' as const },
      { id: 2, latitude: 17.4105, longitude: 78.4709, createdAt: at(2), priority: 'HIGH' as const, category: 'ACCIDENT' as const },
      { id: 3, latitude: 17.4108, longitude: 78.4702, createdAt: at(3), priority: 'LOW' as const, category: 'FIRE' as const },
      { id: 4, latitude: 17.5301, longitude: 78.3501, createdAt: at(200), priority: 'LOW' as const, category: 'FLOOD' as const },
      { id: 5, latitude: 17.5305, longitude: 78.3503, createdAt: at(210), priority: 'LOW' as const, category: 'FLOOD' as const },
      { id: 6, latitude: 18.9, longitude: 79.9, createdAt: at(1), priority: 'CRITICAL' as const, category: 'OTHER' as const },
    ]
    const h = findHotspots(items, NOW)
    expect(h).toHaveLength(2)
    expect(h[0].count).toBe(3)
    expect(h[0].topCategory).toBe('ACCIDENT')
    expect(h[0].critical).toBe(1)
    expect(h[0].score).toBeGreaterThan(h[1].score)
    expect(h.flatMap((x) => x.incidentIds)).not.toContain(6)
  })
  it('is deterministic and respects the limit', () => {
    expect(findHotspots([], NOW)).toEqual([])
    const many = Array.from({ length: 20 }, (_, n) => ({ id: n, latitude: 10 + Math.floor(n / 2) * 0.02, longitude: 70, createdAt: at(1), priority: 'MEDIUM' as const, category: 'FIRE' as const }))
    expect(findHotspots(many, NOW, { limit: 3 })).toHaveLength(3)
    expect(findHotspots(many, NOW).map((x) => x.key)).toEqual(findHotspots([...many].reverse(), NOW).map((x) => x.key))
  })
})

describe('SOS payload', () => {
  it('passes the same schema the full report form enforces, in every language', () => {
    for (const lang of ['en', 'hi', 'te'] as const) for (const c of SOS_CATEGORIES) {
      const p = buildSosPayload({ latitude: 17.385044123, longitude: 78.486671, accuracy: 18.6 }, c, lang, new Date(NOW))
      const r = reportSchema.safeParse(p)
      expect(r.success, JSON.stringify(r)).toBe(true)
      expect(p.latitude).toBe(17.385044)
      expect(p.locationAccuracyMeters).toBe(19)
      expect(p.locationSource).toBe('GPS')
    }
  })
  it('omits accuracy when unknown and clamps it when absurd', () => {
    expect('locationAccuracyMeters' in buildSosPayload({ latitude: 1, longitude: 2 }, 'FIRE')).toBe(false)
    expect(buildSosPayload({ latitude: 1, longitude: 2, accuracy: 9e9 }, 'FIRE').locationAccuracyMeters).toBe(100000)
  })
})

describe('safety guidance and quick replies', () => {
  it('has tips for every category in every language and always defers to 112', () => {
    for (const lang of ['en', 'hi', 'te'] as const) for (const c of ['ACCIDENT', 'FIRE', 'FLOOD', 'MEDICAL', 'OTHER'] as const) {
      const g = safetyGuidance(c, lang)
      expect(g.tips.length).toBeGreaterThanOrEqual(4)
      expect(g.note).toContain('112')
    }
    expect(safetyGuidance('FIRE', 'en').tips.join(' ')).toMatch(/lifts/)
  })
  it('gives roles the right shortcuts and citizens none', () => {
    expect(quickRepliesFor('RESPONDER')).toContain('Arrived on scene')
    expect(quickRepliesFor('DISPATCHER')).toContain('Backup is being sent')
    expect(quickRepliesFor('CITIZEN')).toContain('I need help')
    expect(quickRepliesFor(undefined)).toEqual([])
  })
})

import { parseA11y, rootFontPercent } from '@/lib/a11y'
import { appendTranscript, listenErrorMessage, speakableText } from '@/lib/voice'
import { dueLabel, groupOf, sortBoard, type BoardRow } from '@/lib/checkin'

describe('reader settings', () => {
  it('falls back to defaults for missing, corrupt or unknown values', () => {
    expect(parseA11y(null)).toEqual({ textSize: 'normal', contrast: false, simple: false })
    expect(parseA11y('{not json')).toEqual({ textSize: 'normal', contrast: false, simple: false })
    expect(parseA11y('{"textSize":"huge","contrast":"yes","simple":1}')).toEqual({ textSize: 'normal', contrast: false, simple: false })
  })
  it('round-trips valid settings and maps sizes to root font percentages', () => {
    expect(parseA11y('{"textSize":"xlarge","contrast":true,"simple":true}')).toEqual({ textSize: 'xlarge', contrast: true, simple: true })
    expect([rootFontPercent('normal'), rootFontPercent('large'), rootFontPercent('xlarge')]).toEqual([100, 125, 150])
  })
})

describe('voice helpers', () => {
  it('appends dictated text with single spaces', () => {
    expect(appendTranscript('', '  my leg  hurts ')).toBe('my leg hurts')
    expect(appendTranscript('Fell down. ', 'cannot stand')).toBe('Fell down. cannot stand')
    expect(appendTranscript('abc', '   ')).toBe('abc')
  })
  it('explains recognition errors in plain words and stays quiet on user-initiated stops', () => {
    expect(listenErrorMessage('not-allowed')).toMatch(/blocked/)
    expect(listenErrorMessage('network')).toMatch(/internet/)
    expect(listenErrorMessage('aborted')).toBe('')
  })
  it('removes links and markdown before reading aloud', () => {
    expect(speakableText('**Stay calm.** See https://example.com/x now')).toBe('Stay calm. See link now')
  })
})

describe('check-in board', () => {
  const row = (o: Partial<BoardRow>): BoardRow => ({ userId: 1, fullName: 'A', phone: null, latestStatus: 'OK', note: null, lastCheckInAt: '2026-01-01T00:00:00Z', intervalHours: 24, nextDueAt: '2026-01-02T00:00:00Z', overdue: false, needsHelp: false, lastFollowUpAt: null, lastFollowUpBy: null, ...o })
  it('groups by urgency and sorts help, then overdue, then the rest', () => {
    const ok = row({ userId: 1 }), late = row({ userId: 2, overdue: true }), help = row({ userId: 3, needsHelp: true, latestStatus: 'NEED_HELP' })
    expect(groupOf(help)).toBe('help'); expect(groupOf(late)).toBe('overdue'); expect(groupOf(ok)).toBe('ok')
    expect(sortBoard([ok, late, help]).map((r) => r.userId)).toEqual([3, 2, 1])
  })
  it('describes due times in both directions', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    expect(dueLabel('2026-01-01T15:00:00Z', now)).toBe('due in 3 h')
    expect(dueLabel('2026-01-01T11:30:00Z', now)).toBe('30 min overdue')
    expect(dueLabel('2025-12-29T12:00:00Z', now)).toBe('3 days overdue')
  })
})
