import { describe, expect, it, vi } from 'vitest'
import { backoffMs, parseSse } from '@/lib/live'
import { applyHint, keysFor } from '@/lib/useLive'

describe('SSE parser', () => {
  it('parses complete frames and keeps the partial remainder', () => {
    const { frames, rest } = parseSse('id: 1\nevent: incident.updated\ndata: {"a":1}\n\n: hb\n\nid: 2\nevent: notif')
    expect(frames).toEqual([{ id: '1', event: 'incident.updated', data: '{"a":1}' }])
    expect(rest).toBe('id: 2\nevent: notif')
  })
  it('handles CRLF, multi-line data and comments', () => {
    const { frames } = parseSse('event: ready\r\ndata: a\r\ndata: b\r\n\r\n')
    expect(frames).toEqual([{ event: 'ready', data: 'a\nb' }])
  })
  it('ignores heartbeat-only blocks', () => {
    expect(parseSse(': hb\n\n').frames).toEqual([])
  })
})

describe('live hints', () => {
  it('maps incident events to the queries they make stale', () => {
    const keys = keysFor({ type: 'incident.updated', incidentId: 7 })
    expect(keys).toContainEqual(['incident', '7'])
    expect(keys).toContainEqual(['incidents'])
    expect(keys).toContainEqual(['map'])
  })
  it('maps notifications and responder updates', () => {
    expect(keysFor({ type: 'notification', incidentId: null })).toEqual([['notifications']])
    expect(keysFor({ type: 'responder.updated', incidentId: null })).toContainEqual(['responders'])
  })
  it('invalidates idempotently so duplicate events are harmless', () => {
    const qc = { invalidateQueries: vi.fn().mockResolvedValue(undefined) }
    applyHint(qc, { type: 'incident.updated', incidentId: 1 })
    applyHint(qc, { type: 'incident.updated', incidentId: 1 })
    expect(qc.invalidateQueries.mock.calls.length).toBe(2 * keysFor({ type: 'incident.updated', incidentId: 1 }).length)
  })
  it('backs off exponentially up to 30 seconds', () => {
    expect(backoffMs(0)).toBeLessThan(1500)
    expect(backoffMs(3)).toBeGreaterThanOrEqual(8000)
    expect(backoffMs(20)).toBeLessThan(31000)
  })
})
