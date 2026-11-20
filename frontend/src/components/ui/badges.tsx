import { Sparkles } from 'lucide-react'
import type { Availability, AssignmentStatus, IncidentStatus, Priority } from '@/lib/types'
import { STATUS_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'

const LEVEL: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

/** Signal-strength bars: priority carried by shape and count as well as colour, so it survives colour-blindness and glare. */
export function PriorityBars({ priority, className }: { priority?: Priority; className?: string }) {
  const n = priority ? LEVEL[priority] : 0
  return (
    <svg viewBox="0 0 14 12" className={cn('h-3 w-3.5 shrink-0', className)} aria-hidden>
      {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 3.7} y={12 - (4 + i * 2.67)} width="2.4" height={4 + i * 2.67} rx="0.8" fill="currentColor" opacity={i < n ? 1 : 0.25} />)}
    </svg>
  )
}

const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

const PRIORITY_STYLE: Record<Priority, string> = {
  CRITICAL: 'bg-critical text-white ring-critical font-semibold', // the only solid chip in the system: one glance finds it
  HIGH: 'bg-high-tint text-high ring-high-edge font-semibold',
  MEDIUM: 'bg-medium-tint text-medium ring-medium-edge',
  LOW: 'bg-low-tint text-low ring-low-edge',
}

export function PriorityBadge({ priority, suggested }: { priority?: Priority; suggested?: boolean }) {
  if (!priority) return <span className={cn(base, 'bg-surface-2 text-muted ring-line')}>Unprioritised</span>
  return (
    <span className={cn(base, PRIORITY_STYLE[priority])} title={suggested ? 'AI-suggested priority, pending dispatcher verification' : undefined}>
      <PriorityBars priority={priority} />
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
      {suggested && <span className={cn('rounded px-1 text-2xs font-semibold', priority === 'CRITICAL' ? 'bg-white/20 text-white' : 'bg-advisory-tint text-advisory')}>AI</span>}
    </span>
  )
}

/** Marks content that came from the model. Violet always means "suggested by the AI, not decided by a person". */
export function AdvisoryBadge({ children = 'AI suggestion', className }: { children?: React.ReactNode; className?: string }) {
  return <span className={cn(base, 'bg-advisory-tint text-advisory ring-advisory-edge', className)}><Sparkles className="h-3 w-3" aria-hidden />{children}</span>
}

type Tone = { chip: string; dot: string }
const NEUTRAL: Tone = { chip: 'bg-surface-2 text-ink-2 ring-line', dot: 'bg-slate-400' }
const STATUS_STYLE: Partial<Record<IncidentStatus, Tone>> = {
  REPORTED: NEUTRAL,
  AI_ANALYZED: NEUTRAL,
  AWAITING_VERIFICATION: { chip: 'bg-medium-tint text-medium ring-medium-edge', dot: 'bg-medium-solid' }, // a human decision is pending
  VERIFIED: { chip: 'bg-primary-soft text-primary ring-primary-edge', dot: 'bg-primary' },
  ASSIGNED: { chip: 'bg-indigo-50 text-indigo-800 ring-indigo-200', dot: 'bg-indigo-600' },
  RESPONDER_ACCEPTED: { chip: 'bg-indigo-50 text-indigo-800 ring-indigo-200', dot: 'bg-indigo-600' },
  ON_SCENE: { chip: 'bg-sky-50 text-sky-900 ring-sky-200', dot: 'bg-sky-600' },
  RESOLVED: { chip: 'bg-low-tint text-low ring-low-edge', dot: 'bg-low-solid' },
  CLOSED: { chip: 'bg-surface-3 text-muted ring-line', dot: 'bg-slate-400' },
  REJECTED: { chip: 'bg-critical-tint text-critical ring-critical-edge', dot: 'bg-critical-solid' },
  DUPLICATE: { chip: 'bg-surface-3 text-muted ring-line', dot: 'bg-slate-400' },
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const t = STATUS_STYLE[status] ?? NEUTRAL
  return <span className={cn(base, t.chip)}><span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden />{STATUS_LABEL[status]}</span>
}

const AVAIL_STYLE: Record<Availability, Tone> = {
  AVAILABLE: { chip: 'bg-low-tint text-low ring-low-edge', dot: 'bg-low-solid' },
  BUSY: { chip: 'bg-medium-tint text-medium ring-medium-edge', dot: 'bg-medium-solid' },
  OFFLINE: { chip: 'bg-surface-3 text-muted ring-line', dot: 'bg-slate-400' },
}
export function AvailabilityBadge({ value }: { value: Availability }) {
  return <span className={cn(base, AVAIL_STYLE[value].chip)}><span className={cn('h-1.5 w-1.5 rounded-full', AVAIL_STYLE[value].dot)} aria-hidden />{value.charAt(0) + value.slice(1).toLowerCase()}</span>
}

const ASSIGN_STYLE: Record<AssignmentStatus, string> = {
  ASSIGNED: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  ACCEPTED: 'bg-primary-soft text-primary ring-primary-edge',
  ARRIVED: 'bg-sky-50 text-sky-900 ring-sky-200',
  COMPLETED: 'bg-low-tint text-low ring-low-edge',
  DECLINED: 'bg-critical-tint text-critical ring-critical-edge',
  CANCELLED: 'bg-surface-3 text-muted ring-line',
}
export function AssignmentBadge({ status }: { status: AssignmentStatus }) {
  return <span className={cn(base, ASSIGN_STYLE[status])}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
}
