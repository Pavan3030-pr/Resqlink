import type { Role } from './types'

/** Tap-to-send messages for the incident channel: one tap instead of typing while driving or handling a casualty. */
export const QUICK_REPLIES: Record<Role, string[]> = {
  RESPONDER: ['On my way', 'ETA 5 minutes', 'Arrived on scene', 'Need an additional ambulance', 'Need fire support', 'Area is not safe, holding back'],
  DISPATCHER: ['Please confirm your ETA', 'Update on patient condition?', 'Backup is being sent', 'Stay on this channel for updates'],
  ADMIN: ['Please confirm your ETA', 'Update on patient condition?'],
  CITIZEN: [],
}

export function quickRepliesFor(role: Role | undefined): string[] {
  return role ? QUICK_REPLIES[role] ?? [] : []
}
