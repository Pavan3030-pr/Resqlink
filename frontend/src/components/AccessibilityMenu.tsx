import { Contrast, Eye, Type } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { TEXT_SIZES, useA11y } from '@/lib/a11y'
import { cn } from '@/lib/utils'

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-panel border border-line-strong bg-surface p-4 text-left hover:bg-surface-2">
      <span><span className="block text-base font-semibold text-ink">{label}</span><span className="mt-0.5 block text-sm text-muted">{hint}</span></span>
      <span aria-hidden className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'bg-slate-300')}>
        <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

/** Reader comfort: text size, contrast and simple mode. Available on every page, saved on this device. */
export function AccessibilityMenu({ floating = false }: { floating?: boolean }) {
  const [open, setOpen] = useState(false)
  const { settings, update, reset } = useA11y()
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" data-keep
        className={cn('inline-flex items-center gap-2 rounded-ctl border border-line-strong bg-surface text-sm font-medium text-ink shadow-card hover:bg-surface-2',
          floating ? 'fixed bottom-4 left-4 z-[900] h-11 px-3.5 md:bottom-5 md:left-5' : 'h-8 px-2.5')}>
        <Eye className="h-4 w-4" aria-hidden /><span className={floating ? '' : 'hidden sm:inline'}>Easier to read</span>
        {!floating && <span className="sr-only sm:hidden">Easier to read</span>}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Make ResQLink easier to read">
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-base font-semibold text-ink"><Type className="h-4 w-4" aria-hidden />Text size</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Text size">
              {TEXT_SIZES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={settings.textSize === s.id} onClick={() => update({ textSize: s.id })}
                  className={cn('rounded-panel border px-2 py-3 text-center font-semibold', settings.textSize === s.id ? 'border-primary bg-primary-soft text-primary' : 'border-line-strong bg-surface text-ink hover:bg-surface-2')}>
                  <span className="block" style={{ fontSize: `${s.percent / 100 * 1.1}rem` }}>Aa</span>
                  <span className="mt-1 block text-xs font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <Toggle label="Stronger contrast" hint="Darker text and clearer borders." on={settings.contrast} onChange={(v) => update({ contrast: v })} />
          <Toggle label="Simple mode" hint="Shows only the main actions: get help, say you are OK, chat and report." on={settings.simple} onChange={(v) => update({ simple: v })} />
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="flex items-center gap-2 text-sm text-muted"><Contrast className="h-4 w-4" aria-hidden />Saved on this device.</p>
            <div className="flex gap-2"><Button variant="ghost" onClick={reset}>Reset</Button><Button onClick={() => setOpen(false)}>Done</Button></div>
          </div>
        </div>
      </Dialog>
    </>
  )
}
