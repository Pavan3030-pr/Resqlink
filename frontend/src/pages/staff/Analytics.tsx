import { useQuery } from '@tanstack/react-query'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorNote, PageHeader, PageSpinner, Stat } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { CATEGORY_LABEL, formatMinutes, PRIORITY_COLOR, STATUS_LABEL } from '@/lib/format'
import type { Stats } from '@/lib/types'
import { HotspotCard } from './HotspotCard'

function pct(v: number | undefined | null): string { return v == null ? 'No data yet' : `${Math.round(v * 100)}%` }

export function Bars({ data, labels, colors }: { data: Record<string, number>; labels?: Record<string, string>; colors?: Record<string, string> }) {
  const entries = Object.entries(data)
  const max = Math.max(1, ...entries.map(([, v]) => v))
  if (entries.length === 0) return <p className="text-sm text-muted">No data yet.</p>
  return (
    <ul className="space-y-2.5">
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-muted">{labels?.[k] ?? k}</span>
          <div className="h-2.5 flex-1 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${(v / max) * 100}%`, background: colors?.[k] ?? '#2563EB' }} /></div>
          <span className="w-8 text-right font-medium">{v}</span>
        </li>
      ))}
    </ul>
  )
}

export function StatsView({ s }: { s: Stats }) {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total reports" value={s.total} />
        <Stat label="Active" value={s.active} tone="primary" />
        <Stat label="Report → AI analysed" value={formatMinutes(s.avgMinutesToAnalysis)} hint="Average, measured" />
        <Stat label="Report → verified" value={formatMinutes(s.avgMinutesToVerification)} hint="Average, measured" />
        <Stat label="Verified → assigned" value={formatMinutes(s.avgMinutesVerificationToAssignment)} hint="Average, measured" />
        <Stat label="Responders available" value={`${s.respondersAvailable}/${s.respondersTotal}`} />
        <Stat label="Critical open" value={s.critical} tone="critical" />
        <Stat label="Verified, unassigned" value={s.unassigned} />
      </div>
      {(s.demoIncidents ?? 0) > 0 && <p className="mb-4 rounded-lg bg-slate-100 px-4 py-2 text-sm text-muted">Includes {s.demoIncidents} incident{s.demoIncidents === 1 ? '' : 's'} created for the demonstration (labelled “Demo data”). Every figure comes from events recorded by the app.</p>}
      <h2 className="mb-3 text-sm font-semibold">Prototype success metrics (measured)</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Reports with AI analysis" value={pct(s.analysisCoverage)} hint="Rule-based fallback counts" />
        <Stat label="Analyses by Gemini" value={pct(s.modelSuccessRate)} hint="Rest used the fallback" />
        <Stat label="Assignments completed" value={pct(s.assignmentCompletionRate)} hint="Of all assignments" />
        <Stat label="Report → resolved" value={formatMinutes(s.avgMinutesToResolution)} hint="Average, measured" />
        <Stat label="Messages via Nexconn" value={s.chatMessages} hint="Counted from webhooks" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>By status</CardTitle></CardHeader><CardBody><Bars data={s.byStatus} labels={STATUS_LABEL} /></CardBody></Card>
        <Card><CardHeader><CardTitle>By priority</CardTitle></CardHeader><CardBody><Bars data={s.byPriority} colors={PRIORITY_COLOR} /></CardBody></Card>
        <Card><CardHeader><CardTitle>By type</CardTitle></CardHeader><CardBody><Bars data={s.byCategory} labels={CATEGORY_LABEL} /></CardBody></Card>
      </div>
      <p className="mt-4 text-xs text-muted">All figures are computed from recorded incidents and status history. Demo data is clearly labelled and contains no invented statistics.</p>
    </>
  )
}

export default function Analytics() {
  const q = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/incidents/stats'), refetchInterval: 30_000 })
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Reports & analytics" subtitle="Response-time measurements and incident breakdowns." />
      <ErrorNote error={q.error} />
      {q.isLoading ? <PageSpinner /> : q.data && <StatsView s={q.data} />}
      <HotspotCard />
    </div>
  )
}
