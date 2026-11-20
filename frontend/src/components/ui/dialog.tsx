import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Modal dialog: bottom sheet on phones, centred panel on larger screens. Traps focus, closes on Escape, restores focus on close. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const first = panel.current?.querySelector<HTMLElement>('textarea,input,select') ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const a = items[0], z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    window.addEventListener('keydown', h)
    return () => { window.removeEventListener('keydown', h); opener?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="rl-fade fixed inset-0 z-[1500] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4" onClick={onClose}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}
        className="rl-rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface shadow-overlay sm:max-w-lg sm:rounded-panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-sm font-semibold text-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-2 flex h-9 w-9 items-center justify-center rounded-ctl text-muted hover:bg-surface-3"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
