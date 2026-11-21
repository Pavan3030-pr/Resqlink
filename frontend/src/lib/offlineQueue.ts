/**
 * Offline report queue. When the network is down a citizen's report (text + location, no photo) is stored
 * locally and submitted automatically when the connection returns. Storage failures never break the app.
 */
const KEY = 'resqlink.pendingReports.v1'
const MAX_PENDING = 10

export interface PendingReport {
  localId: string
  savedAt: string
  /** Account that wrote the report; a different account on the same device never sends it. */
  owner?: number | null
  /** Key of the original submit attempt, so a retry after a lost response cannot create a second incident. */
  idempotencyKey?: string
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

/** Reports waiting to be sent. With an owner, only that account's reports (and legacy ownerless ones) are returned. */
export function pendingReports(owner?: number | null): PendingReport[] {
  const all = read()
  if (owner === undefined) return all
  return all.filter((r) => r.owner == null || r.owner === owner)
}

export function enqueueReport(payload: PendingReport['payload'], opts: { owner?: number | null; idempotencyKey?: string } = {}): PendingReport | null {
  const list = read()
  if (list.length >= MAX_PENDING) return null
  const item: PendingReport = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    owner: opts.owner ?? null,
    idempotencyKey: opts.idempotencyKey,
    payload,
  }
  return write([...list, item]) ? item : null
}

export function removePending(localId: string): void {
  write(read().filter((r) => r.localId !== localId))
}

/** True for failures that mean "no connection" rather than "the server rejected the report". */
export function isNetworkFailure(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'status' in e && (e as { status: number }).status === 0
}

/** Statuses that mean the server will never accept this payload; everything else (401, 408, 409, 429, 5xx) is retried. */
const PERMANENT = new Set([400, 404, 413, 415, 422])
export function isPermanentRejection(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'status' in e && PERMANENT.has((e as { status: number }).status)
}

/**
 * Submits queued reports in order. Only permanently rejected reports are discarded; a network failure, an expired
 * session, rate limiting or a server error stops the run and keeps the report for the next attempt, so an
 * emergency report is never lost to a transient problem. The first submit key is reused as the Idempotency-Key.
 */
export async function flushQueue(submit: (p: PendingReport['payload'], idempotencyKey: string) => Promise<unknown>, owner?: number | null): Promise<number> {
  let sent = 0
  for (const item of pendingReports(owner)) {
    try {
      await submit(item.payload, item.idempotencyKey ?? item.localId)
      removePending(item.localId)
      sent++
    } catch (e) {
      if (isPermanentRejection(e)) { removePending(item.localId); continue }
      break
    }
  }
  return sent
}
