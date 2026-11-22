/** Peer-support check-ins: a person says "I'm OK" on a schedule; volunteers see who has gone quiet. */

export type CheckInStatus = 'OK' | 'NEED_HELP'

export interface CheckInDto { id: number; status: CheckInStatus; note: string | null; createdAt: string; intervalHours: number; nextDueAt: string }
export interface MineDto { latest: CheckInDto | null; intervalHours: number; nextDueAt: string | null; overdue: boolean }
export interface BoardRow {
  userId: number; fullName: string; phone: string | null; latestStatus: CheckInStatus; note: string | null
  lastCheckInAt: string; intervalHours: number; nextDueAt: string; overdue: boolean; needsHelp: boolean
  lastFollowUpAt: string | null; lastFollowUpBy: string | null
}

export const INTERVAL_CHOICES: { hours: number; label: string }[] = [
  { hours: 12, label: 'Twice a day' },
  { hours: 24, label: 'Every day' },
  { hours: 48, label: 'Every 2 days' },
  { hours: 72, label: 'Every 3 days' },
]

/** Plain-language "when" for a due time, relative to `now`. Works in both directions. */
export function dueLabel(due: string | Date, now: Date = new Date()): string {
  const ms = new Date(due).getTime() - now.getTime()
  const abs = Math.abs(ms)
  const mins = Math.round(abs / 60000)
  const text = mins < 60 ? `${Math.max(mins, 1)} min` : mins < 60 * 36 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} days`
  return ms >= 0 ? `due in ${text}` : `${text} overdue`
}

export type BoardGroup = 'help' | 'overdue' | 'ok'
export const groupOf = (r: Pick<BoardRow, 'needsHelp' | 'overdue'>): BoardGroup => (r.needsHelp ? 'help' : r.overdue ? 'overdue' : 'ok')

/** The server already sorts the board; this keeps the screen correct if a stale cache or mock returns another order. */
export function sortBoard(rows: BoardRow[]): BoardRow[] {
  const rank = (r: BoardRow) => (r.needsHelp ? 0 : r.overdue ? 1 : 2)
  return [...rows].sort((a, b) => rank(a) - rank(b) || new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime())
}
