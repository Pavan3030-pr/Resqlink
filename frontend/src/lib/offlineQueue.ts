/**
 * Offline report queue. When the network is down a citizen's report (text + location, no photo) is stored
 * locally and submitted automatically when the connection returns. Storage failures never break the app.
 */
const KEY = 'resqlink.pendingReports.v1'
const MAX_PENDING = 10

export interface PendingReport {
  localId: string
  savedAt: string
  payload: {
    category: string
    description: string
    latitude: number
    longitude: number
    incidentTime: string
    contactName?: string
    contactPhone?: string
    addressHint?: string
    locationAccuracyMeters?: number
    locationSource?: 'GPS' | 'MAP_PIN'
  }
}

function read(): PendingReport[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(list: PendingReport[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function pendingReports(): PendingReport[] { return read() }

export function enqueueReport(payload: PendingReport['payload']): PendingReport | null {
  const list = read()
  if (list.length >= MAX_PENDING) return null
  const item: PendingReport = { localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, savedAt: new Date().toISOString(), payload }
  return write([...list, item]) ? item : null
}

export function removePending(localId: string): void {
  write(read().filter((r) => r.localId !== localId))
}

/** True for failures that mean "no connection" rather than "the server rejected the report". */
export function isNetworkFailure(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'status' in e && (e as { status: number }).status === 0
}

/** Submits queued reports in order; stops at the first network failure. Returns how many were sent. */
/** The queue item id doubles as the Idempotency-Key, so a retry after a lost response can never create a second incident. */
export async function flushQueue(submit: (p: PendingReport['payload'], idempotencyKey: string) => Promise<unknown>): Promise<number> {
  let sent = 0
  for (const item of read()) {
    try {
      await submit(item.payload, item.localId)
      removePending(item.localId)
      sent++
    } catch (e) {
      if (isNetworkFailure(e)) break
      removePending(item.localId) // the server rejected it permanently; do not retry forever
    }
  }
  return sent
}
