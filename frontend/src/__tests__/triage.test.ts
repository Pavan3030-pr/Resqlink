import { beforeEach, describe, expect, it } from 'vitest'
import { enqueueReport, flushQueue, isNetworkFailure, pendingReports } from '@/lib/offlineQueue'
import { formatWait, nextBestAction, slaLevel, waitMinutes } from '@/lib/triage'
import type { IncidentSummary } from '@/lib/types'

const base: IncidentSummary = {
  id: 1, incidentNumber: 'RL-1001', category: 'FIRE', priority: 'CRITICAL', status: 'AWAITING_VERIFICATION', description: 'x',
  latitude: 1, longitude: 1, createdAt: '', updatedAt: '', priorityIsAiSuggestion: true, responders: [], hasChannel: false,
}

describe('triage', () => {
  it('escalates wait levels faster for critical incidents', () => {
    expect(slaLevel('CRITICAL', 1)).toBe('ok')
    expect(slaLevel('CRITICAL', 3)).toBe('warn')
    expect(slaLevel('CRITICAL', 6)).toBe('breach')
    expect(slaLevel('LOW', 6)).toBe('ok')
    expect(slaLevel(undefined, 25)).toBe('breach')
  })
  it('computes and formats waits', () => {
    const now = Date.parse('2026-11-10T12:10:00Z')
    expect(waitMinutes('2026-11-10T12:00:00Z', now)).toBeCloseTo(10)
    expect(waitMinutes('2026-11-10T12:30:00Z', now)).toBe(0)
    expect(formatWait(0.5)).toBe('30 s')
    expect(formatWait(7.9)).toBe('7 min')
    expect(formatWait(135)).toBe('2 h 15 min')
  })
  it('recommends the right next action', () => {
    expect(nextBestAction(base).label).toBe('Review and verify')
    expect(nextBestAction(base).tone).toBe('critical')
    expect(nextBestAction({ ...base, status: 'VERIFIED', priority: 'LOW' })).toMatchObject({ label: 'Assign a responder', tone: 'primary' })
    expect(nextBestAction({ ...base, status: 'ASSIGNED', responders: ['A'] }).hint).toContain('A')
    expect(nextBestAction({ ...base, status: 'CLOSED' }).label).toBe('No action needed')
  })
})

describe('offline report queue', () => {
  const payload = { category: 'FIRE', description: 'Fire in the market building', latitude: 17.3, longitude: 78.4, incidentTime: '2026-11-10T12:00:00Z' }
  beforeEach(() => localStorage.clear())

  it('stores and lists reports', () => {
    expect(pendingReports()).toHaveLength(0)
    expect(enqueueReport(payload)).not.toBeNull()
    expect(pendingReports()).toHaveLength(1)
  })
  it('caps the queue', () => {
    for (let i = 0; i < 10; i++) enqueueReport(payload)
    expect(enqueueReport(payload)).toBeNull()
  })
  it('flushes in order and removes sent items', async () => {
    enqueueReport({ ...payload, description: 'first report text here' })
    enqueueReport({ ...payload, description: 'second report text here' })
    const sent: string[] = []
    expect(await flushQueue(async (p) => { sent.push(p.description) })).toBe(2)
    expect(sent).toEqual(['first report text here', 'second report text here'])
    expect(pendingReports()).toHaveLength(0)
  })
  it('sends the queue id as the idempotency key', async () => {
    const item = enqueueReport(payload)!
    const keys: string[] = []
    await flushQueue(async (_p, key) => { keys.push(key) })
    expect(keys).toEqual([item.localId])
  })
  it('keeps reports when offline and drops permanently rejected ones', async () => {
    enqueueReport(payload)
    expect(await flushQueue(async () => { throw { status: 0 } })).toBe(0)
    expect(pendingReports()).toHaveLength(1)
    expect(await flushQueue(async () => { throw { status: 400 } })).toBe(0)
    expect(pendingReports()).toHaveLength(0)
    expect(isNetworkFailure({ status: 0 })).toBe(true)
    expect(isNetworkFailure(new Error('x'))).toBe(false)
  })
  it('survives corrupt storage', () => {
    localStorage.setItem('resqlink.pendingReports.v1', '{not json')
    expect(pendingReports()).toEqual([])
  })
})
