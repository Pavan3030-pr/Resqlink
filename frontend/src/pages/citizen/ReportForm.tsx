import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Disclosure } from '@/components/ui/disclosure'
import { Field, Input, Textarea } from '@/components/ui/fields'
import { ErrorNote } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { api, ApiError } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { shrinkImage } from '@/lib/image'
import { enqueueReport } from '@/lib/offlineQueue'
import type { IncidentDetail } from '@/lib/types'
import { CategoryTiles, LocationPicker, PhotoPicker } from './ReportParts'

export const reportSchema = z.object({
  category: z.enum(['ACCIDENT', 'FIRE', 'FLOOD', 'MEDICAL', 'OTHER']),
  description: z.string().trim().min(10, 'Please describe what happened (at least 10 characters)').max(2000, 'Keep it under 2000 characters'),
  latitude: z.number({ invalid_type_error: 'Choose a location' }).min(-90).max(90),
  longitude: z.number({ invalid_type_error: 'Choose a location' }).min(-180).max(180),
  contactName: z.string().max(120).optional(),
  contactPhone: z.string().regex(/^[0-9+()\-\s]*$/, 'Use digits, spaces, + ( ) -').max(30).optional().or(z.literal('')),
  addressHint: z.string().max(250).optional(),
  locationAccuracyMeters: z.number().int().min(0).max(100000).optional(),
  locationSource: z.enum(['GPS', 'MAP_PIN']).optional(),
})
type ReportValues = z.infer<typeof reportSchema>

const MAX_IMAGE = 5 * 1024 * 1024
const LOW_ACCURACY_M = 100

export default function ReportForm() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { t } = useI18n()
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [geoState, setGeoState] = useState<'idle' | 'asking' | 'denied' | 'ok'>('idle')
  // One key per form instance: retrying the same submission can never create a second incident.
  const idemKey = useRef<string>(`web-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)}`)
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { category: 'ACCIDENT', latitude: undefined, longitude: undefined },
  })
  const lat = watch('latitude')
  const lng = watch('longitude')
  const accuracy = watch('locationAccuracyMeters')
  const source = watch('locationSource')
  const picked = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function locate() {
    if (!navigator.geolocation) { setGeoState('denied'); return }
    setGeoState('asking')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setValue('latitude', Number(p.coords.latitude.toFixed(6)), { shouldValidate: true })
        setValue('longitude', Number(p.coords.longitude.toFixed(6)), { shouldValidate: true })
        setValue('locationAccuracyMeters', Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy) : undefined)
        setValue('locationSource', 'GPS')
        setGeoState('ok')
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  async function onImage(f: File | undefined) {
    setImageError(null)
    if (!f) return
    if (!['image/jpeg', 'image/png'].includes(f.type)) { setImageError('Use a JPEG or PNG image'); return }
    setImageBusy(true)
    try {
      const small = await shrinkImage(f)
      if (small.size > MAX_IMAGE) { setImageError('Image must be 5 MB or smaller'); return }
      setImage(small)
      setPreview(URL.createObjectURL(small))
    } finally { setImageBusy(false) }
  }
  function removeImage() { setImage(null); setPreview(null); setImageError(null) }

  const submit = useMutation({
    mutationFn: async (v: ReportValues): Promise<IncidentDetail | 'queued'> => {
      const payload = { ...v, contactPhone: v.contactPhone || undefined, incidentTime: new Date().toISOString() }
      const form = new FormData()
      form.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      if (image) form.append('image', image)
      try {
        return await api.postForm<IncidentDetail>('/incidents', form, idemKey.current)
      } catch (e) {
        // No connection: keep the report on this device and send it automatically later (photos cannot be queued).
        if (e instanceof ApiError && e.status === 0) {
          if (enqueueReport(payload)) return 'queued'
        }
        throw e
      }
    },
    onSuccess: (d) => {
      if (d === 'queued') {
        toast.push(`Saved on this device${image ? ' (without the photo)' : ''}. It will be sent automatically when you are online.`, 'info')
        nav('/citizen')
        return
      }
      void qc.invalidateQueries({ queryKey: ['incidents'] })
      toast.push(`Report ${d.summary.incidentNumber} submitted`, 'success')
      nav(`/incidents/${d.summary.id}`)
    },
  })

  const contactErrors = !!(errors.contactPhone || errors.contactName || errors.addressHint)
  const locationError = !!(errors.latitude || errors.longitude)
  return (
    <div className="mx-auto max-w-2xl lg:max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('reportTitle')}</h1>
      <p className="mb-4 mt-1 text-[15px] text-muted">{t('reportSubtitle')}</p>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-panel border border-critical-edge bg-critical-tint px-4 py-3">
        <p className="text-[15px] font-semibold text-critical">{t('immediateDanger')}</p>
        <a href="tel:112" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-ctl bg-critical px-4 text-sm font-semibold text-white hover:bg-critical-deep"><Phone className="h-4 w-4" aria-hidden />{t('call112')}</a>
      </div>

      <form onSubmit={handleSubmit((v) => submit.mutate(v))} noValidate>
        {/* Phone order is type -> where -> details: the location is the one thing responders cannot do without. Desktop: location sits beside the rest. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
          <div className="lg:col-start-1 lg:row-start-1"><CategoryTiles legend={t('whatHappened')} register={register('category')} /></div>

          <div className="space-y-3 lg:sticky lg:top-[4.5rem] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <h2 className="text-[15px] font-semibold text-ink">{t('where')}</h2>
            <LocationPicker picked={picked} source={source} accuracy={accuracy} geoState={geoState} lowAccuracyM={LOW_ACCURACY_M} error={locationError} onLocate={locate}
              onPick={(a, b) => {
                setValue('latitude', Number(a.toFixed(6)), { shouldValidate: true })
                setValue('longitude', Number(b.toFixed(6)), { shouldValidate: true })
                setValue('locationAccuracyMeters', undefined)
                setValue('locationSource', 'MAP_PIN')
              }} />
            {locationError && <p role="alert" className="text-sm font-medium text-critical">{t('needLocation')}</p>}
          </div>

          <div className="space-y-6 lg:col-start-1 lg:row-start-2">
            <Field label={t('description')} htmlFor="description" error={errors.description?.message} hint={t('descriptionHint')}>
              <Textarea id="description" className="min-h-[132px] text-base" {...register('description')} />
            </Field>
            <PhotoPicker image={image} preview={preview} busy={imageBusy} error={imageError} onFile={(f) => void onImage(f)} onRemove={removeImage} />
            <Disclosure title={t('optionalDetails')} open={contactErrors ? true : undefined} className="rounded-panel border border-line bg-surface px-4">
              <div className="space-y-4 pb-3 pt-1">
                <Field label={t('landmark')} htmlFor="addressHint" error={errors.addressHint?.message}><Input id="addressHint" className="h-12 text-base" {...register('addressHint')} /></Field>
                <Field label={t('contactName')} htmlFor="contactName" error={errors.contactName?.message}><Input id="contactName" autoComplete="name" className="h-12 text-base" {...register('contactName')} /></Field>
                <Field label={t('contactPhone')} htmlFor="contactPhone" error={errors.contactPhone?.message}><Input id="contactPhone" type="tel" autoComplete="tel" inputMode="tel" className="h-12 text-base" {...register('contactPhone')} /></Field>
              </div>
            </Disclosure>
          </div>
        </div>

        <p role="note" className="mt-6 text-xs leading-relaxed text-muted">{t('emergencyNotice')}</p>
        <ErrorNote error={submit.error} />
        <div className="pb-safe sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-4 flex gap-2 border-t border-line bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-panel md:border md:bg-surface md:shadow-raised">
          <Button type="button" size="xl" variant="ghost" onClick={() => nav('/citizen')}>{t('cancel')}</Button>
          <Button type="submit" size="xl" className="flex-1" loading={submit.isPending}>{submit.isPending ? t('submitting') : t('submit')}</Button>
        </div>
      </form>
    </div>
  )
}
