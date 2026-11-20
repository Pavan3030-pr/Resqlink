import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ClipboardList, Clock, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { linkButtonClass } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/misc'
import { ListSkeleton } from '@/components/ui/skeleton'
import { usePendingReports } from '@/components/QueueSync'
import { api } from '@/lib/api'
import { CATEGORY_LABEL, timeAgo } from '@/lib/format'
import { statusText, useI18n } from '@/lib/i18n'
import { citizenStep, CITIZEN_MESSAGE } from '@/lib/triage'
import type { IncidentSummary, Page } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Four thin segments: enough to see "how far along" at a glance without reading. */
function MiniProgress({ step }: { step: number }) {
  return (
    <div className="flex gap-1" role="presentation" aria-hidden>
      {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1 w-8 rounded-full', i <= step ? (step === 3 ? 'bg-low-solid' : 'bg-primary') : 'bg-slate-200')} />)}
    </div>
  )
}

function ReportRow({ i }: { i: IncidentSummary }) {
  const { lang, t } = useI18n()
  const step = citizenStep(i.status)
  const title = (statusText(lang, i.status) ?? [CITIZEN_MESSAGE[i.status].title])[0]
  return (
    <Link to={`/incidents/${i.id}`} className="flex items-center gap-3 border-b border-line px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2"><span className="num text-[15px] text-ink">{i.incidentNumber}</span><span className="text-[13px] text-muted">{t('cat_' + i.category) || CATEGORY_LABEL[i.category]} · {timeAgo(i.createdAt)}</span></p>
        <p className="mt-0.5 text-[15px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{i.description}</p>
        {step >= 0 && <div className="mt-2"><MiniProgress step={step} /></div>}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
    </Link>
  )
}

export default function CitizenDashboard() {
  const { t } = useI18n()
  const pending = usePendingReports()
  const q = useQuery({ queryKey: ['incidents', 'mine'], queryFn: () => api.get<Page<IncidentSummary>>('/incidents', { size: 50 }), refetchInterval: 15_000 })
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('myReports')} subtitle="Track the status of emergencies you have reported."
        actions={<Link to="/citizen/report" className={cn(linkButtonClass({ size: 'lg' }), 'hidden sm:inline-flex')}><Plus className="h-5 w-5" aria-hidden />{t('reportTitle')}</Link>} />
      <p role="note" className="mb-5 rounded-panel border border-medium-edge bg-medium-tint px-4 py-3 text-[13px] leading-relaxed text-medium">{t('emergencyNotice')}</p>
      {pending.length > 0 && (
        <Card className="mb-5" tone="warn">
          <CardHeader className="bg-medium-tint/60"><CardTitle className="flex items-center gap-2 text-medium"><Clock className="h-4 w-4" aria-hidden />{t('waitingToSend')} ({pending.length})</CardTitle><span className="text-xs text-medium">Will be submitted automatically when you are online</span></CardHeader>
          {pending.map((r) => (
            <div key={r.localId} className="border-b border-line px-4 py-3 text-sm last:border-0">
              <p className="font-medium">{CATEGORY_LABEL[r.payload.category as keyof typeof CATEGORY_LABEL] ?? r.payload.category} <span className="font-normal text-muted">· saved {timeAgo(r.savedAt)}</span></p>
              <p className="truncate text-muted">{r.payload.description}</p>
            </div>
          ))}
        </Card>
      )}
      <Card elevation="raised">
        {q.isLoading ? <ListSkeleton rows={3} /> : q.error ? <ErrorState title="Could not load your reports" error={q.error} onRetry={() => q.refetch()} />
          : q.data!.items.length === 0 ? <EmptyState icon={ClipboardList} title="No reports yet" hint="When you report an emergency it appears here with live status updates." action={<Link to="/citizen/report" className={linkButtonClass({ size: 'lg' })}>{t('reportTitle')}</Link>} />
          : q.data!.items.map((i) => <ReportRow key={i.id} i={i} />)}
      </Card>
    </div>
  )
}
