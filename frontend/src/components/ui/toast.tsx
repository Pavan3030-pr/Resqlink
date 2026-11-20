import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'success' | 'error'
interface ToastItem { id: number; tone: Tone; text: string }
const ToastCtx = createContext<{ push: (text: string, tone?: Tone) => void }>({ push: () => {} })

const TONE = {
  info: { bar: 'bg-primary', icon: Info, color: 'text-primary' },
  success: { bar: 'bg-low-solid', icon: CircleCheck, color: 'text-low' },
  error: { bar: 'bg-critical-solid', icon: CircleAlert, color: 'text-critical' },
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random()
    setItems((p) => [...p.slice(-2), { id, tone, text }])
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), tone === 'error' ? 8000 : 5000)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* Clear of the mobile tab bar; bottom-right on desktop so it never covers the navigation rail or the queue. */}
      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[2000] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end" aria-live="polite">
        {items.map((t) => {
          const k = TONE[t.tone]
          return (
            <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="rl-rise pointer-events-auto relative flex w-full max-w-sm items-start gap-2.5 overflow-hidden rounded-panel border border-line bg-surface py-2.5 pl-4 pr-2 text-sm shadow-overlay">
              <span className={cn('absolute inset-y-0 left-0 w-1', k.bar)} aria-hidden />
              <k.icon className={cn('mt-0.5 h-4 w-4 shrink-0', k.color)} aria-hidden />
              <span className="min-w-0 flex-1 leading-snug text-ink">{t.text}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-3"><X className="h-4 w-4" /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)
