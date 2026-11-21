import { Phone } from 'lucide-react'
import { SafetyCard } from '@/components/SafetyCard'
import { IncidentMap } from '@/components/IncidentMap'
import { PhaseTrack } from '@/components/ops/PhaseTrack'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveDot } from '@/components/ui/live'
import { formatDateTime, timeAgo } from '@/lib/format'
import { statusText, useI18n } from '@/lib/i18n'
import { citizenStep, CITIZEN_MESSAGE } from '@/lib/triage'
import type { IncidentDetail, IncidentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Evidence } from './ReportCard'

const message = (lang: ReturnType<typeof useI18n>['lang'], s: IncidentStatus) => { const tr = statusText(lang, s); return tr ? { title: tr[0], text: tr[1] } : CITIZEN_MESSAGE[s] }

/**
 * What the person who reported sees. Calm, one idea at a time: what is happening now, what comes next,
 * a number to quote, and a way to reach emergency services. No dispatcher names, no internal jargon.
 */
export function CitizenStatus({ d }: { d: IncidentDetail }) {
  const { lang, t } = useI18n()
  const s = d.summary.status
  const idx = citizenStep(s)
  const m = message(lang, s)
  const done = idx === 3
  const needsHelp = idx < 0 && s === 'REJECTED'
  const assigned = d.summary.responders.length
  const labels = [t('step_received'), t('step_verified'), t('step_help'), t('step_resolved')]
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card elevation="hero" tone={needsHelp ? 'warn' : 'none'} className={cn('overflow-hidden', done && 'border-low-edge')}>
        <div className={cn('px-5 pb-5 pt-4 md:px-6', done ? 'bg-low-tint/60' : needsHelp ? 'bg-medium-tint/60' : 'bg-primary-soft/50')}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-muted">{t('reference')}</p>
            <p className="num rounded-md bg-surface px-2.5 py-1 text-base text-ink shadow-card">{d.summary.incidentNumber}</p>
          </div>
          <div role="status" aria-live="polite" className="mt-4">
            <h1 className={cn('text-2xl font-semibold leading-tight tracking-tight', done ? 'text-low' : needsHelp ? 'text-medium' : 'text-ink')}>{m.title}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{m.text}{lang === 'en' && assigned > 0 && ['ASSIGNED', 'RESPONDER_ACCEPTED', 'ON_SCENE'].includes(s) ? ` ${assigned} responder${assigned > 1 ? 's are' : ' is'} assigned.` : ''}</p>
          </div>
          {idx >= 0 && <div className="mt-5"><PhaseTrack labels={labels} current={idx} tone="calm" /></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 md:px-6">
          <p className="flex items-center gap-2 text-xs text-muted"><LiveDot tone="live" pulse />{t('autoUpdates')}</p>
          {!done && <a href="tel:112" className="inline-flex h-11 items-center gap-2 rounded-ctl border border-critical-edge bg-surface px-4 text-sm font-semibold text-critical hover:bg-critical-tint"><Phone className="h-4 w-4" aria-hidden />{t('call112')}</a>}
        </div>
      </Card>

      {!done && s !== 'REJECTED' && s !== 'DUPLICATE' && s !== 'CLOSED' && <SafetyCard category={d.summary.category} />}

      <Card>
        <CardHeader><CardTitle>{t('yourReport')}</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{d.summary.description}</p>
          {d.imageUrl && <Evidence url={d.imageUrl} />}
          <IncidentMap height={176} popupLink={false} markers={[{ id: d.summary.id, incidentNumber: d.summary.incidentNumber, category: d.summary.category, priority: undefined, status: s, latitude: d.summary.latitude, longitude: d.summary.longitude, assigned: false, createdAt: d.summary.createdAt, description: d.summary.description }]} />
          {d.summary.addressHint && <p className="text-sm text-muted">{d.summary.addressHint}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('updates')}</CardTitle></CardHeader>
        <CardBody>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {[...d.history].reverse().map((h, n) => (
              <li key={n} className="relative">
                <span className={cn('absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface', n === 0 ? 'bg-primary' : 'bg-slate-300')} aria-hidden />
                <p className={cn('text-sm', n === 0 ? 'font-semibold text-ink' : 'text-ink-2')}>{message(lang, h.newStatus).title}</p>
                <p className="text-xs text-muted" title={formatDateTime(h.createdAt)}>{timeAgo(h.createdAt)}</p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  )
}
