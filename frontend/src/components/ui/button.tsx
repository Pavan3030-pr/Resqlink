import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Variants encode intent, not decoration:
 *  primary  - the one human-decided action on a surface
 *  urgent   - the same action when the incident is critical (red, so the next step reads as time-sensitive)
 *  success  - progress that completes something (arrive, complete, resolve)
 *  danger / outlineDanger - destructive or negative decisions (reject, decline)
 *  secondary / ghost / quiet - supporting actions, in decreasing visual weight
 * Sizes: xs/sm for dense ops rows, md default, lg/xl for touch and high-stress surfaces (>= 44px).
 */
const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white shadow-[0_1px_2px_rgba(8,72,73,0.25)] hover:bg-primary-hover',
        urgent: 'bg-critical text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)] hover:bg-critical-deep',
        success: 'bg-low text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)] hover:bg-emerald-900',
        danger: 'bg-critical text-white hover:bg-critical-deep',
        secondary: 'border border-line-strong bg-surface text-ink shadow-card hover:border-ink/30 hover:bg-surface-2',
        outlineDanger: 'border border-critical-edge bg-surface text-critical hover:bg-critical-tint',
        ghost: 'text-ink-2 hover:bg-surface-3',
        quiet: 'text-primary hover:bg-primary-soft',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
        xl: 'h-14 px-6 text-base font-semibold',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Shows a spinner and blocks clicks while keeping the button's width (no layout shift). */
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', loading, disabled, children, ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
    {children}
  </button>
))
Button.displayName = 'Button'

/** For links that must look like buttons (a link is the right element when the action is navigation). */
export const linkButtonClass = (o?: VariantProps<typeof buttonVariants>) => buttonVariants(o)
