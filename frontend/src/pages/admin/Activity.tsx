import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorNote, PageHeader } from '@/components/ui/misc'
import { StatSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { AiEvalReport, DemoInfo, Stats } from '@/lib/types'
import { StatsView } from '../staff/Analytics'

const pct = (v: number) => `${Math.round(v * 100)}%`

function EvalCard() {
  const run = useMutation({ mutationFn: (heldOut: boolean) => api.post<AiEvalReport>(`/admin/ai-eval?heldOut=${heldOut}`) })
  const r = run.data
  return (
    <Card className="mt-8">
      <CardHeader><CardTitle>AI evaluation</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={run.isPending} onClick={() => run.mutate(false)}>Run development set</Button>
          <Button size="sm" disabled={run.isPending} onClick={() => run.mutate(true)}>Run held-out set</Button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-muted">Runs a fixed set of invented reports (English, Hindi, Telugu, ambiguous, prompt-injection, spam) and duplicate pairs through the live analysis path. It makes real model calls when a Gemini key is configured, so it is limited to 4 runs per hour.</p>
        <ErrorNote error={run.error} />
        {run.isPending && <p className="text-sm text-muted">Running… this can take up to a minute with a live model.</p>}
        {r && (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[['Analyzer', r.analyzer], ['Cases', r.cases], ['Category accuracy', pct(r.categoryAccuracy)], ['Priority accuracy', pct(r.priorityAccuracy)],
                ['Critical recall', pct(r.criticalRecall)], ['Injection resistance', pct(r.injectionResistance)], ['Injection flagged', pct(r.injectionFlagRate)], ['Fallback rate', pct(r.fallbackRate)],
                ['Duplicate precision', pct(r.duplicatePrecision)], ['Duplicate recall', pct(r.duplicateRecall)], ['Median latency', `${Math.round(r.medianLatencyMs)} ms`], ['p95 latency', `${Math.round(r.p95LatencyMs)} ms`],
                ['≈ input tokens', r.approxInputTokens], ['≈ output tokens', r.approxOutputTokens], ['≈ cost (USD)', r.approxCostUsd != null ? r.approxCostUsd.toFixed(4) : 'not configured']].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-line bg-surface-2 p-3"><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
              ))}
            </dl>
            <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">{r.note}</p>
            {r.failures.length > 0 && <div><p className="mb-1 text-sm font-medium">Misses</p><ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{r.failures.map((f) => <li key={f}>{f}</li>)}</ul></div>}
          </>
        )}
      </CardBody>
    </Card>
  )
}

function DemoCard() {
  const toast = useToast()
  const qc = useQueryClient()
  const info = useQuery({ queryKey: ['demo-info'], queryFn: () => api.get<DemoInfo>('/public/demo-info') })
  const reset = useMutation({
    mutationFn: () => api.post<{ incidentsRemoved: number }>('/admin/demo/reset'),
    onSuccess: (r) => { toast.push(`Demo reset: ${r.incidentsRemoved} incident(s) removed, scenario re-seeded`, 'success'); void qc.invalidateQueries() },
  })
  if (!info.data?.demoMode) return null
  return (
    <Card className="mt-8">
      <CardHeader><CardTitle>Demonstration data</CardTitle>
        <Button size="sm" variant="outlineDanger" disabled={reset.isPending} onClick={() => { if (window.confirm('Delete ALL incidents and re-seed the demo scenario? Audit logs are kept.')) reset.mutate() }}>{reset.isPending ? 'Resetting…' : 'Reset demo'}</Button>
      </CardHeader>
      <CardBody><p className="text-sm text-muted">Deletes every incident, then puts the demo responders back on duty and creates one earlier report of the road accident through the real pipeline (marked “Demo data”). No history or statistics are invented. Incident numbers keep increasing so chat channels never collide.</p><ErrorNote error={reset.error} /></CardBody>
    </Card>
  )
}

export default function AdminActivity() {
  const q = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/incidents/stats'), refetchInterval: 30_000 })
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="System activity" subtitle="Live operational measurements." />
      <ErrorNote error={q.error} />
      {q.isLoading ? <StatSkeleton /> : q.data && <StatsView s={q.data} />}
      <EvalCard />
      <DemoCard />
    </div>
  )
}
