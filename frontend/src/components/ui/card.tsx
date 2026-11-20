import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Elevation encodes importance:
 *  flat   - supporting panels
 *  raised - the primary working surface of a screen
 *  hero   - the single thing the screen is for (queue lead, command bar). Use at most once or twice per screen.
 * `tone` adds a restrained left rule so state is visible without recolouring the whole panel.
 */
const cardVariants = cva('rounded-panel border bg-surface', {
  variants: {
    elevation: {
      flat: 'border-line shadow-card',
      raised: 'border-line-strong/70 shadow-raised',
      hero: 'border-line-strong shadow-hero',
    },
    tone: {
      none: '',
      critical: 'border-l-[3px] border-l-critical-solid',
      warn: 'border-l-[3px] border-l-medium-solid',
      advisory: 'border-l-[3px] border-l-advisory',
      info: 'border-l-[3px] border-l-primary',
    },
  },
  defaultVariants: { elevation: 'flat', tone: 'none' },
})

export function Card({ className, elevation, tone, ...props }: HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ elevation, tone }), className)} {...props} />
}
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5', className)} {...props} />
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[13px] font-semibold tracking-tight text-ink', className)} {...props} />
}
export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/60 px-4 py-3', className)} {...props} />
}
