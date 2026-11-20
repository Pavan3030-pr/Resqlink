import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Progressive disclosure: a full-width toggle row that reveals secondary detail.
 * The body stays mounted (hidden) so form state inside it survives closing.
 */
export function Disclosure({ title, summary, defaultOpen = false, open: controlled, onOpenChange, children, className, flush }: {
  title: ReactNode; summary?: ReactNode; defaultOpen?: boolean; open?: boolean; onOpenChange?: (o: boolean) => void; children: ReactNode; className?: string; flush?: boolean
}) {
  const [inner, setInner] = useState(defaultOpen)
  const open = controlled ?? inner
  const id = useId()
  const toggle = () => { const n = !open; setInner(n); onOpenChange?.(n) }
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={toggle}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-ctl py-2 text-left">
        <span className="min-w-0"><span className="block text-[13px] font-semibold text-ink">{title}</span>{summary && !open && <span className="mt-0.5 block truncate text-xs text-muted">{summary}</span>}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-150', open && 'rotate-180')} aria-hidden />
      </button>
      <div id={id} hidden={!open} className={cn(!flush && 'pb-1')}>{children}</div>
    </div>
  )
}
