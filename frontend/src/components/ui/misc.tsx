import { CircleAlert, Inbox, Loader2, RotateCw } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Button } from './button'
import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-muted', className)} aria-label="Loading" />
}

/** Route-level fallback: a content-shaped skeleton instead of a lone spinner, so the page does not jump when it arrives. */
export function PageSpinner() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-7xl space-y-5">
      <div className="space-y-2"><Skeleton className="h-6 w-56" /><Skeleton className="h-3.5 w-80 max-w-full" /></div>
      <Skeleton className="h-32 rounded-panel" />
      <Skeleton className="h-56 rounded-panel" />
    </div>
  )
}

/** An empty panel is an instruction: say what it is for and what puts content here. */
export function EmptyState({ title, hint, action, icon: Icon = Inbox, tone = 'neutral' }: { title: string; hint?: string; action?: ReactNode; icon?: ComponentType<{ className?: string }>; tone?: 'neutral' | 'good' }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
      <span className={cn('mb-1 flex h-10 w-10 items-center justify-center rounded-full', tone === 'good' ? 'bg-low-tint text-low' : 'bg-surface-3 text-muted')}><Icon className="h-5 w-5" /></span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[13px] leading-relaxed text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong' }

/** Inline error under a control or above a list. */
export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-ctl border border-critical-edge bg-critical-tint px-3 py-2 text-sm text-critical">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{message(error)}</p>
      {onRetry && <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline"><RotateCw className="h-3.5 w-3.5" />Retry</button>}
    </div>
  )
}

/** Panel-level failure: says what failed, that the data shown may be stale, and offers the way out. */
export function ErrorState({ title = 'Could not load this', error, onRetry }: { title?: string; error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
      <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-critical-tint text-critical"><CircleAlert className="h-5 w-5" /></span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">{message(error)}</p>
      {onRetry && <Button size="sm" variant="secondary" className="mt-2" onClick={onRetry}><RotateCw className="h-3.5 w-3.5" />Try again</Button>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[26px] font-semibold leading-8 text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, tone = 'default', hint }: { label: string; value: ReactNode; tone?: 'default' | 'critical' | 'primary'; hint?: string }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn('num mt-1.5 text-[30px] leading-9', tone === 'critical' && 'text-critical', tone === 'primary' && 'text-primary')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}
