import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '@/components/ui/badges'
import { linkButtonClass } from '@/components/ui/button'
import { useFlash } from '@/components/ui/live'
import { SlaMeter } from '@/components/ops/SlaMeter'
import { CATEGORY_LABEL, freshness, PRIORITY_COLOR } from '@/lib/format'
import { nextBestAction, UNATTENDED, waitMinutes } from '@/lib/triage'
import type { IncidentSummary } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  i: IncidentSummary
  now: number
  /** "lead" is the single most urgent item, shown larger with its full description. */
  variant?: 'lead' | 'row'
  onHover?: (id: number | null) => void
}

const ctaVariant = (tone: string) => (tone === 'critical' ? 'urgent' : tone === 'primary' ? 'primary' : 'secondary')

/**
 * Queue entry for dispatchers. The whole row is one link; the button inside is the visual affordance for the next step.
 * Data refreshes flash the row once, and "updated" ages are shown so stale rows are noticeable.
 */
export function AttentionRow({ i, now, variant = 'row', onHover }: Props) {
  const minutes = waitMinutes(i.createdAt, now)
  const unattended = UNATTENDED.includes(i.status)
  const action = nextBestAction(i)
  const flash = useFlash(`${i.updatedAt}|${i.status}|${i.priority}`)
  const updated = freshness(+new Date(i.updatedAt), now)
  const place = i.addressHint ? ` · ${i.addressHint}` : ''
  const bar = i.priority ? PRIORITY_COLOR[i.priority] : '#CBD5E1'
  const hover = { onMouseEnter: () => onHover?.(i.id), onMouseLeave: () => onHover?.(null), onFocus: () => onHover?.(i.id), onBlur: () => onHover?.(null) }

  if (variant === 'lead') {
    const critical = i.priority === 'CRITICAL'
    return (
      <Link to={`/incidents/${i.id}`} {...hover} className={cn('group relative block border-b border-line py-4 pl-6 pr-5 transition-colors hover:bg-surface-2', critical ? 'bg-critical-tint/50' : 'bg-surface', flash && 'rl-flash')}>
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: bar }} aria-hidden />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-ink px-1.5 py-0.5 text-2xs font-semibold text-white">Up next</span>
          <PriorityBadge priority={i.priority} suggested={i.priorityIsAiSuggestion} />
          <StatusBadge status={i.status} />
          <span className="ml-auto text-2xs text-muted tabular-nums" title="Last update to this incident">Updated {updated}</span>
        </div>
        <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2"><span className="num text-xl text-ink">{i.incidentNumber}</span><span className="text-[15px] font-semibold text-ink-2">{CATEGORY_LABEL[i.category]}{place}</span></p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-2">{i.description}</p>
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          {unattended ? <SlaMeter priority={i.priority} minutes={minutes} /> : <span />}
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[16rem] text-xs text-muted lg:block">{action.hint}</span>
            <span className={cn(linkButtonClass({ size: 'lg', variant: ctaVariant(action.tone) }), 'pointer-events-none')}>{action.label}<ArrowRight className="h-4 w-4" aria-hidden /></span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/incidents/${i.id}`} {...hover} className={cn('group relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-3 pl-6 pr-4 transition-colors last:border-0 hover:bg-surface-2', flash && 'rl-flash')}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: bar }} aria-hidden />
      <div className="min-w-[14rem] flex-1 basis-56">
        <p className="flex items-center gap-2 truncate"><span className="num text-[15px] text-ink">{i.incidentNumber}</span><span className="truncate text-[13px] font-medium text-ink-2">{CATEGORY_LABEL[i.category]}{place}</span></p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{i.description}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5"><PriorityBadge priority={i.priority} suggested={i.priorityIsAiSuggestion} /><StatusBadge status={i.status} /><span className="text-2xs text-muted tabular-nums">Updated {updated}</span></p>
      </div>
      <div className="flex items-center gap-3">
        {unattended && <SlaMeter priority={i.priority} minutes={minutes} compact />}
        <span className={cn(linkButtonClass({ size: 'sm', variant: ctaVariant(action.tone) }), 'pointer-events-none hidden w-44 sm:inline-flex')}>{action.label}</span>
      </div>
    </Link>
  )
}
