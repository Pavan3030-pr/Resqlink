import { cloneElement, forwardRef, isValidElement, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactElement, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const base = 'w-full rounded-ctl border border-line-strong bg-surface px-3 text-sm text-ink shadow-[inset_0_1px_1px_rgba(11,22,38,0.04)] placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:bg-surface-2 disabled:text-muted aria-[invalid=true]:border-critical aria-[invalid=true]:ring-critical/15'

// Pass className="h-12 text-base" on touch-first screens: tailwind-merge lets the later size win.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, 'h-10', className)} {...p} />
))
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-[110px] py-2.5 leading-relaxed', className)} {...p} />
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(base, 'h-10', className)} {...p} />
))
Select.displayName = 'Select'

export function Label({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-[13px] font-medium text-ink-2', className)} {...p} />
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null
  return <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-critical">{message}</p>
}

/** Label + control + hint/error. Wires aria-describedby and aria-invalid onto the control so screen readers hear the error. */
export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })
    : children
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted">{hint}</p>}
      <FieldError message={error} id={`${htmlFor}-error`} />
    </div>
  )
}
