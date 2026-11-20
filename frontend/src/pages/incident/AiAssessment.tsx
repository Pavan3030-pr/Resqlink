import { RotateCw, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react'
import { AdvisoryBadge, PriorityBadge } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Disclosure } from '@/components/ui/disclosure'
import { Select } from '@/components/ui/fields'
import { CATEGORY_LABEL } from '@/lib/format'
import type { Category, IncidentDetail, Priority } from '@/lib/types'
import type { IncidentActions } from './useIncidentActions'

const EDITABLE = ['VERIFIED', 'ASSIGNED', 'RESPONDER_ACCEPTED', 'ON_SCENE', 'AWAITING_VERIFICATION', 'AI_ANALYZED', 'REPORTED']

/**
 * Advisory by construction: violet means "from the model", the dispatcher's own decision sits beside it in neutral ink,
 * and overriding is one control away. Confidence is deliberately not shown (the model's number is not calibrated).
 */
export function AiAssessment({ d, actions }: { d: IncidentDetail; actions: IncidentActions }) {
  const a = d.analysis
  const editable = EDITABLE.includes(d.summary.status)
  const prioDiffers = !!a && !!actions.prio && actions.prio !== a.suggestedPriority
  const catDiffers = !!a && a.suggestedCategory !== d.summary.category
  const applySuggestion = () => { if (!a) return; if (a.suggestedPriority !== actions.prio) actions.choosePriority(a.suggestedPriority); if (catDiffers) actions.setCategory.mutate(a.suggestedCategory) }

  return (
    <Card tone="advisory">
      <CardHeader>
        <CardTitle><span className="inline-flex items-center gap-2">AI incident analysis<AdvisoryBadge>Advisory</AdvisoryBadge></span></CardTitle>
        <Button size="sm" variant="secondary" loading={actions.analyze.isPending} onClick={() => actions.analyze.mutate()}>{actions.analyze.isPending ? 'Analysing…' : <><RotateCw className="h-3.5 w-3.5" aria-hidden />Re-run analysis</>}</Button>
      </CardHeader>
      <CardBody className="space-y-4">
        {!a ? <div role="status" className="flex items-center gap-2 text-sm text-muted"><span className="rl-skeleton h-3 w-40 rounded" />Analysis is being prepared…</div> : (
          <>
            <p className="rounded-ctl border border-advisory-edge bg-advisory-tint/60 px-3 py-2.5 text-sm leading-relaxed text-ink">{a.summary}</p>

            {a.processingStatus === 'FALLBACK' && (
              <p role="alert" className="flex items-start gap-2 rounded-ctl border border-medium-edge bg-medium-tint px-3 py-2 text-sm text-medium">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span><strong>AI model unavailable.</strong> This analysis comes from the rule-based fallback{a.fallbackReason ? ` (${a.fallbackReason})` : ''}. It recognises common emergency words and cannot translate or understand context, so read the original report.</span>
              </p>
            )}
            {a.suspectedInjection && (
              <p role="alert" className="flex items-start gap-2 rounded-ctl border border-critical-edge bg-critical-tint px-3 py-2 text-sm text-critical">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />This report contains text that looks aimed at the AI (for example instructions to change the priority). It was treated as data; rely on the original report.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-ctl border border-advisory-edge bg-advisory-tint/50 p-3">
                <p className="text-xs font-semibold text-advisory">AI suggests</p>
                <div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={a.suggestedPriority} /><span className="text-sm font-medium text-ink">{CATEGORY_LABEL[a.suggestedCategory]}</span></div>
                {a.extractedLocation && <p className="mt-2 text-xs text-ink-2">Location mentioned: <span className="font-medium">{a.extractedLocation}</span></p>}
                {editable && (prioDiffers || catDiffers) && <Button size="xs" variant="secondary" className="mt-3" onClick={applySuggestion} loading={actions.setPriority.isPending || actions.setCategory.isPending}><Sparkles className="h-3 w-3" aria-hidden />Use AI suggestion</Button>}
              </div>
              <div className="rounded-ctl border border-line-strong bg-surface p-3">
                <p className="text-xs font-semibold text-ink-2">Your decision {(prioDiffers || catDiffers) && <span className="ml-1 rounded bg-surface-3 px-1.5 py-0.5 font-medium text-muted">differs from AI</span>}</p>
                {editable ? (
                  <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
                    <label htmlFor="cat" className="text-[13px] text-muted">Category</label>
                    <Select id="cat" className="h-9 text-[13px]" value={d.summary.category} onChange={(e) => actions.setCategory.mutate(e.target.value as Category)}>
                      {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                    <label htmlFor="prio" className="text-[13px] text-muted">Priority</label>
                    <Select id="prio" className="h-9 text-[13px]" value={actions.prio} onChange={(e) => actions.choosePriority(e.target.value as Priority | '')}>
                      <option value="">Unset</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                    </Select>
                  </div>
                ) : <div className="mt-2 flex flex-wrap items-center gap-2"><PriorityBadge priority={d.summary.priority} /><span className="text-sm font-medium">{CATEGORY_LABEL[d.summary.category]}</span></div>}
              </div>
            </div>

            {(a.keyInformation.length > 0 || a.missingInformation.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {a.keyInformation.length > 0 && <div><p className="mb-1.5 text-xs font-semibold text-ink-2">Key information</p><ul className="list-disc space-y-1 pl-4 text-[13px] text-ink">{a.keyInformation.map((k) => <li key={k}>{k}</li>)}</ul></div>}
                {a.missingInformation.length > 0 && <div><p className="mb-1.5 text-xs font-semibold text-ink-2">Ask the reporter</p><ul className="list-disc space-y-1 pl-4 text-[13px] text-ink">{a.missingInformation.map((k) => <li key={k}>{k}</li>)}</ul></div>}
              </div>
            )}

            <p className="text-xs text-muted">Suggestion only. Confidence is not calibrated, so it is not shown. A dispatcher decides.</p>
            <Disclosure title="How this was produced" className="-mb-2 border-t border-line pt-1">
              <p className="pb-2 text-xs leading-relaxed text-muted">
                {a.processingStatus === 'FALLBACK' ? 'Rule-based fallback' : 'AI-generated suggestion'} · model {a.modelVersion}{a.latencyMs != null ? ` · ${(a.latencyMs / 1000).toFixed(1)} s` : ''}.
                {a.redacted && ' Phone numbers and e-mail addresses were removed before the text was sent to the AI provider.'}
              </p>
            </Disclosure>
          </>
        )}
      </CardBody>
    </Card>
  )
}
