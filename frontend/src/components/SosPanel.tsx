import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Siren } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { enqueueReport } from '@/lib/offlineQueue'
import { buildSosPayload, SOS_CATEGORIES, SOS_TEXT } from '@/lib/sos'
import type { Category, IncidentDetail } from '@/lib/types'

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('unsupported')); return }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 })
  })
}

/** One-tap SOS for citizens: pick the emergency type, and the GPS position goes straight to the dispatch queue. Offline-safe. */
export function SosPanel() {
  const { lang, t } = useI18n()
  const s = SOS_TEXT[lang]
  const { user } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One key per SOS attempt: a double tap or a retry after a lost response can never create two incidents.
  const key = useRef(`sos-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)}`)

  const send = useMutation({
    mutationFn: async (category: Category): Promise<IncidentDetail | 'queued'> => {
      const pos = await getPosition().catch(() => { throw new Error('no-gps') })
      const payload = buildSosPayload({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }, category, lang)
      const form = new FormData()
      form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      try {
        return await api.postForm<IncidentDetail>('/incidents', form, key.current)
      } catch (e) {
        if (e instanceof ApiError && e.status === 0 && enqueueReport(payload, { owner: user?.id ?? null, idempotencyKey: key.current })) return 'queued'
        throw e
      }
    },
    onSuccess: (d) => {
      key.current = `sos-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setOpen(false)
      if (d === 'queued') { toast.push('SOS saved on this device. It is sent automatically the moment you are online. Call 112 if you can.', 'info'); return }
      void qc.invalidateQueries({ queryKey: ['incidents'] })
      toast.push(`SOS ${d.summary.incidentNumber} sent`, 'success')
      nav(`/incidents/${d.summary.id}`)
    },
    onError: (e) => setError(e instanceof Error && e.message === 'no-gps' ? s.noGps : e instanceof Error ? e.message : 'Could not send SOS. Call 112.'),
  })

  return (
    <section aria-label="SOS" className="mb-5 rounded-panel border border-critical-edge bg-critical-tint p-4">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-[14px] text-critical">{s.hint}</p>
          <Button variant="urgent" size="xl" onClick={() => { setError(null); setOpen(true) }}><Siren className="h-5 w-5" aria-hidden />{s.button}</Button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[15px] font-semibold text-critical" id="sos-q">{s.choose}</p>
          <div role="group" aria-labelledby="sos-q" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SOS_CATEGORIES.map((c) => (
              <Button key={c} variant="urgent" size="lg" disabled={send.isPending} onClick={() => { setError(null); send.mutate(c) }}>{t('cat_' + c)}</Button>
            ))}
          </div>
          {send.isPending && <p role="status" className="mt-3 text-sm text-critical">{s.locating}</p>}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-critical">{error}</p>}
          <div className="mt-3"><Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={send.isPending}>{s.cancel}</Button></div>
        </div>
      )}
    </section>
  )
}
