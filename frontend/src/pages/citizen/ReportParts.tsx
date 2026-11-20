import { Camera, Check, Crosshair, Flame, HeartPulse, CircleHelp, Car, Waves, Loader2, MapPin, TriangleAlert, X } from 'lucide-react'
import type { ComponentType } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { IncidentMap } from '@/components/IncidentMap'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICON: Record<Category, ComponentType<{ className?: string }>> = { ACCIDENT: Car, FIRE: Flame, FLOOD: Waves, MEDICAL: HeartPulse, OTHER: CircleHelp }
export const CATEGORY_ORDER: Category[] = ['MEDICAL', 'FIRE', 'ACCIDENT', 'FLOOD', 'OTHER']

/** Big tappable tiles instead of a dropdown: one tap, icon plus word, nothing to open. Native radios underneath. */
export function CategoryTiles({ register, legend }: { register: UseFormRegisterReturn; legend: string }) {
  const { t } = useI18n()
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-semibold text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {CATEGORY_ORDER.map((c) => {
          const Icon = ICON[c]
          return (
            <label key={c} className={cn('relative cursor-pointer', c === 'OTHER' && 'col-span-2 sm:col-span-1')}>
              <input type="radio" value={c} className="peer sr-only" {...register} />
              <span className="flex h-16 flex-col items-center justify-center gap-1 rounded-panel border-2 border-line bg-surface px-2 text-center text-[13px] font-medium leading-tight text-ink-2 shadow-card transition-colors hover:bg-surface-2 peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                <Icon className="h-5 w-5" aria-hidden />{t('cat_' + c)}
              </span>
              <Check className="pointer-events-none absolute right-1.5 top-1.5 hidden h-3.5 w-3.5 text-primary peer-checked:block" aria-hidden />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export interface PickedLocation { lat: number; lng: number }

/** Location, with honest feedback about how good it is. The map stays visible so it can always be corrected by tapping. */
export function LocationPicker({ picked, source, accuracy, geoState, lowAccuracyM, error, onLocate, onPick }: {
  picked: PickedLocation | null; source?: 'GPS' | 'MAP_PIN'; accuracy?: number; geoState: 'idle' | 'asking' | 'denied' | 'ok'; lowAccuracyM: number; error?: boolean
  onLocate: () => void; onPick: (lat: number, lng: number) => void
}) {
  const { t } = useI18n()
  const low = source === 'GPS' && accuracy != null && accuracy > lowAccuracyM
  const detail = picked ? `${source === 'GPS' ? t('gps') : t('mapPin')}${accuracy != null ? ` · ${t('accuracy')} ±${accuracy} m` : ''}` : ''
  return (
    <div className="space-y-3">
      <Button type="button" size="xl" variant={picked ? 'secondary' : 'primary'} className="w-full" onClick={onLocate} loading={geoState === 'asking'}>
        {geoState === 'asking' ? t('locating') : <><Crosshair className="h-5 w-5" aria-hidden />{t('useMyLocation')}</>}
      </Button>
      {geoState === 'denied' && <p role="alert" className="flex items-start gap-2 rounded-ctl border border-medium-edge bg-medium-tint px-3 py-2.5 text-sm text-medium"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Location permission was denied or unavailable. Tap the map to choose the location instead.</p>}
      <div className="overflow-hidden rounded-panel">
        <IncidentMap height={248} bare picked={picked} popupLink={false} onPick={onPick} className="!rounded-panel border border-line" />
      </div>
      {/* Plain text line kept for screen readers and for the "no location" state; the coloured chip below mirrors it. */}
      <div role="status" className={cn('flex items-start gap-2.5 rounded-ctl px-3 py-2.5 text-sm', !picked ? (error ? 'border border-critical-edge bg-critical-tint text-critical' : 'bg-surface-3 text-ink-2') : low ? 'border border-medium-edge bg-medium-tint text-medium' : 'border border-low-edge bg-low-tint text-low')}>
        {picked ? (low ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />) : <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
        <div className="min-w-0">
          <p className="font-semibold">{picked ? t('locationSet') : t('noLocation')}</p>
          <p className="text-[13px] opacity-90">{picked ? <><span className="num">{picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}</span> · {detail}</> : t('locationHelp')}</p>
          {low && <p className="mt-1 text-[13px] font-medium">{t('lowAccuracy')}</p>}
        </div>
      </div>
    </div>
  )
}

/** Photo: one big target, then a clear "preparing / ready / remove" state so it never feels stuck. */
export function PhotoPicker({ image, preview, busy, error, onFile, onRemove }: { image: File | null; preview: string | null; busy: boolean; error: string | null; onFile: (f?: File) => void; onRemove: () => void }) {
  const { t } = useI18n()
  return (
    <div>
      <span className="mb-2 block text-[15px] font-semibold text-ink">{t('photo')}</span>
      {image && preview ? (
        <div className="flex items-center gap-3 rounded-panel border border-low-edge bg-low-tint/50 p-2.5">
          <img src={preview} alt="Selected evidence" className="h-16 w-16 rounded-ctl object-cover" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{image.name}</p><p className="num text-xs text-low">{Math.round(image.size / 1024)} KB</p></div>
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}><X className="h-4 w-4" aria-hidden />{t('removePhoto')}</Button>
        </div>
      ) : (
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-panel border-2 border-dashed border-line-strong bg-surface px-4 py-3 text-sm text-ink-2 transition-colors hover:bg-surface-2 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden /> : <Camera className="h-5 w-5 text-primary" aria-hidden />}
          <span className="min-w-0"><span className="block font-semibold text-ink">{busy ? t('preparingPhoto') : t('addPhoto')}</span><span className="block text-xs text-muted">{t('photoHint')}</span></span>
          <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-critical">{error}</p>}
    </div>
  )
}
