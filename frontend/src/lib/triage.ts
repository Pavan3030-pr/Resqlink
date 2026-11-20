import type { IncidentStatus, IncidentSummary, Priority } from './types'

/**
 * Prototype response targets in minutes (warn, breach) for how long an incident may wait unattended.
 * These are demonstration targets, not an official standard; tune them to your operation.
 */
export const WAIT_TARGETS: Record<Priority | 'NONE', [number, number]> = {
  CRITICAL: [2, 5],
  HIGH: [5, 10],
  MEDIUM: [15, 30],
  LOW: [30, 60],
  NONE: [10, 20],
}

export type SlaLevel = 'ok' | 'warn' | 'breach'

/** Statuses where the incident is waiting on a dispatcher (review or assignment). */
export const UNATTENDED: IncidentStatus[] = ['REPORTED', 'AI_ANALYZED', 'AWAITING_VERIFICATION', 'VERIFIED']

export function waitMinutes(createdAt: string, now: number = Date.now()): number {
  return Math.max(0, (now - new Date(createdAt).getTime()) / 60000)
}

export function slaLevel(priority: Priority | undefined, minutes: number): SlaLevel {
  const [warn, breach] = WAIT_TARGETS[priority ?? 'NONE']
  return minutes >= breach ? 'breach' : minutes >= warn ? 'warn' : 'ok'
}

export function formatWait(minutes: number): string {
  if (minutes < 1) return `${Math.max(0, Math.floor(minutes * 60))} s`
  if (minutes < 60) return `${Math.floor(minutes)} min`
  const h = Math.floor(minutes / 60)
  return `${h} h ${Math.floor(minutes % 60)} min`
}

export interface NextAction { label: string; hint: string; tone: 'primary' | 'critical' | 'neutral' }

/** The single most useful thing a dispatcher can do next, derived from the incident state. */
export function nextBestAction(i: IncidentSummary): NextAction {
  const critical = i.priority === 'CRITICAL'
  switch (i.status) {
    case 'REPORTED':
    case 'AI_ANALYZED':
      return { label: 'Wait for AI analysis', hint: 'Analysis normally completes within seconds. You can verify without it.', tone: 'neutral' }
    case 'AWAITING_VERIFICATION':
      return { label: 'Review and verify', hint: 'Check the AI summary and duplicates, then verify or reject.', tone: critical ? 'critical' : 'primary' }
    case 'VERIFIED':
      return { label: 'Assign a responder', hint: 'Responders are ranked by distance, type fit and workload.', tone: critical ? 'critical' : 'primary' }
    case 'ASSIGNED':
      return { label: 'Waiting for responder to accept', hint: i.responders.length ? `Assigned: ${i.responders.join(', ')}` : 'Consider reassigning if there is no response.', tone: 'neutral' }
    case 'RESPONDER_ACCEPTED':
      return { label: 'Responder en route', hint: 'Use the incident channel for updates.', tone: 'neutral' }
    case 'ON_SCENE':
      return { label: 'Response in progress', hint: 'Mark resolved when responders confirm the scene is clear.', tone: 'neutral' }
    case 'RESOLVED':
      return { label: 'Close the incident', hint: 'Closing completes the audit trail.', tone: 'neutral' }
    default:
      return { label: 'No action needed', hint: 'This incident is closed.', tone: 'neutral' }
  }
}

export const CITIZEN_MESSAGE: Record<IncidentStatus, { title: string; text: string }> = {
  REPORTED: { title: 'Report received', text: 'We have your report and are preparing it for review.' },
  AI_ANALYZED: { title: 'Report received', text: 'We have your report and are preparing it for review.' },
  AWAITING_VERIFICATION: { title: 'A dispatcher is reviewing your report', text: 'You will be notified as soon as it is verified.' },
  VERIFIED: { title: 'Report verified', text: 'Your report is verified. A responder is being assigned.' },
  ASSIGNED: { title: 'Help is being sent', text: 'Responders have been assigned and are being notified.' },
  RESPONDER_ACCEPTED: { title: 'Help is on the way', text: 'A responder accepted the assignment and is heading to the location.' },
  ON_SCENE: { title: 'Responders are on scene', text: 'The response team has arrived at the location.' },
  RESOLVED: { title: 'Incident resolved', text: 'Responders report the situation is resolved. Thank you for reporting.' },
  CLOSED: { title: 'Incident closed', text: 'This incident is complete.' },
  REJECTED: { title: 'Report could not be verified', text: 'If someone still needs help, call your local emergency number (112 in India).' },
  DUPLICATE: { title: 'Merged with an existing report', text: 'Another report covers the same incident, so responders are already informed.' },
}

// ---------------------------------------------------------------- additions used by the redesigned queue

export const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

/** Queue order: highest priority first, then longest waiting. Pure so it can be tested and reused by the map list. */
export function sortByUrgency<T extends { priority?: Priority; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (PRIORITY_RANK[b.priority ?? ''] ?? 0) - (PRIORITY_RANK[a.priority ?? ''] ?? 0) || +new Date(a.createdAt) - +new Date(b.createdAt))
}

/** How far through the response target an unattended incident is: 0..1 is within target, >1 is overdue (capped at 1.5 for drawing). */
export function slaProgress(priority: Priority | undefined, minutes: number): { ratio: number; target: number } {
  const [, breach] = WAIT_TARGETS[priority ?? 'NONE']
  return { ratio: Math.min(1.5, minutes / breach), target: breach }
}

/** Collapses the nine workflow statuses into the five phases a person tracks. */
export const PHASES = ['Received', 'Verified', 'Assigned', 'On scene', 'Resolved'] as const
export function phaseIndex(status: IncidentStatus): number {
  switch (status) {
    case 'REPORTED': case 'AI_ANALYZED': case 'AWAITING_VERIFICATION': return 0
    case 'VERIFIED': return 1
    case 'ASSIGNED': case 'RESPONDER_ACCEPTED': return 2
    case 'ON_SCENE': return 3
    case 'RESOLVED': case 'CLOSED': return 4
    default: return -1 // REJECTED / DUPLICATE: outside the normal path
  }
}

/** Four steps a reporter understands (received, verified, help on the way, resolved); -1 for rejected/duplicate. */
export function citizenStep(status: IncidentStatus): number {
  switch (status) {
    case 'REPORTED': case 'AI_ANALYZED': case 'AWAITING_VERIFICATION': return 0
    case 'VERIFIED': return 1
    case 'ASSIGNED': case 'RESPONDER_ACCEPTED': case 'ON_SCENE': return 2
    case 'RESOLVED': case 'CLOSED': return 3
    default: return -1
  }
}
