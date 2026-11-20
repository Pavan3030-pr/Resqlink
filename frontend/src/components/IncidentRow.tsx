import { Link } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '@/components/ui/badges'
import { CATEGORY_LABEL, PRIORITY_COLOR, timeAgo } from '@/lib/format'
import type { IncidentSummary } from '@/lib/types'

export function IncidentRow({ i }: { i: IncidentSummary }) {
  return (
    <Link to={`/incidents/${i.id}`} className="relative flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 pl-5 pr-4 transition-colors last:border-0 hover:bg-surface-2">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: i.priority ? PRIORITY_COLOR[i.priority] : '#CBD5E1' }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm"><span className="num text-[15px] text-ink">{i.incidentNumber}</span> <span className="font-medium text-ink-2">· {CATEGORY_LABEL[i.category]}</span></p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{i.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={i.priority} suggested={i.priorityIsAiSuggestion} />
        <StatusBadge status={i.status} />
        <span className="w-20 text-right text-xs text-muted">{timeAgo(i.createdAt)}</span>
      </div>
    </Link>
  )
}
