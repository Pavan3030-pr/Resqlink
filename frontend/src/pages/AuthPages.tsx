import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/fields'
import { ErrorNote } from '@/components/ui/misc'
import { PasswordInput } from '@/components/PasswordInput'
import { ServerStatus } from '@/components/ServerStatus'
import { ApiError } from '@/lib/api'
import { homePathFor, useAuth } from '@/lib/auth'
import { BrandMark } from '@/components/ops/BrandMark'
import { useQuery } from '@tanstack/react-query'
import { api as apiClient } from '@/lib/api'
import type { DemoInfo } from '@/lib/types'

const TRUST = [
  ['AI advises, people decide.', 'Every suggestion is labelled and reviewed by a dispatcher.'],
  ['Privacy first.', 'Responder location is opt-in and deleted when sharing stops.'],
  ['Every action is recorded.', 'Status changes and assignments go to an audit trail.'],
]

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[26rem] shrink-0 flex-col justify-between border-r border-line bg-surface p-10 text-muted lg:flex xl:w-[30rem]">
        <Link to="/" className="flex items-center gap-2.5 text-rail-ink"><BrandMark className="h-9 w-9" /><span className="font-display text-xl font-semibold">ResQLink</span></Link>
        <div>
          <p className="font-display text-[34px] font-semibold leading-[1.1] text-ink">Calm, accountable emergency coordination.</p>
          <ul className="mt-8 space-y-5 text-sm leading-relaxed">
            {TRUST.map(([h, t]) => <li key={h} className="border-l-2 border-primary-edge pl-4"><strong className="block text-rail-ink">{h}</strong>{t}</li>)}
          </ul>
        </div>
        <p className="text-xs leading-relaxed text-muted">Prototype for demonstration. Not a replacement for official emergency services.</p>
      </aside>
      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center gap-2.5 lg:hidden"><BrandMark className="h-9 w-9" /><span className="font-display text-xl font-semibold">ResQLink</span></Link>
          <div className="rounded-panel border border-line bg-surface p-6 shadow-raised sm:p-8">
            <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
            <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export const loginSchema = z.object({
  email: z.string().min(1, 'E-mail is required').email('Enter a valid e-mail'),
  password: z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState<unknown>(null)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) || ''
  async function enterAs(email: string) {
    setError(null)
    try { nav(homePathFor((await login(email, demoPassword)).role), { replace: true }) } catch (e) { setError(e) }
  }
  const demo = useQuery({ queryKey: ['demo-info'], queryFn: () => apiClient.get<DemoInfo>('/public/demo-info'), enabled: import.meta.env.VITE_DEMO_MODE === 'true', retry: 0 })
  return (
    <Shell title="Sign in" subtitle="Access your ResQLink workspace.">
      <form className="space-y-4" onSubmit={handleSubmit(async (v) => {
        setError(null)
        try { nav(homePathFor((await login(v.email, v.password)).role), { replace: true }) } catch (e) { setError(e) }
      })}>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" {...register('email')} /></Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}><PasswordInput id="password" autoComplete="current-password" {...register('password')} /></Field>
        <ErrorNote error={error} />
        <ServerStatus quietWhenOnline />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      {demo.data?.demoMode && (
        <div className="mt-5 rounded-panel border border-line bg-surface-2 p-3 text-sm">
          <p className="font-medium">Demonstration accounts</p>
          <p className="mb-2 text-xs text-muted">{demoPassword ? 'Simulated data. Tap a role to sign in at once.' : 'Simulated data. Pick a role to fill the e-mail; the password is in the submission document.'}</p>
          <div className="flex flex-wrap gap-1.5">{demo.data.accounts?.map((a) => (
            <button key={a.email} type="button" onClick={() => (demoPassword ? void enterAs(a.email) : setValue('email', a.email, { shouldValidate: true }))} className="h-8 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium hover:bg-primary-soft">{a.role.charAt(0) + a.role.slice(1).toLowerCase()}: {a.email.split('@')[0]}</button>
          ))}</div>
        </div>
      )}
      <p className="mt-5 text-center text-sm text-muted">New here? <Link className="font-medium text-primary" to="/register">Create an account</Link></p>
    </Shell>
  )
}

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().min(1, 'E-mail is required').email('Enter a valid e-mail'),
  password: z.string().min(10, 'Use at least 10 characters').max(72, 'Use at most 72 characters')
    .refine((v) => [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length >= 3, 'Mix at least three of: lowercase, uppercase, digits, symbols'),
  phone: z.string().regex(/^[0-9+()\-\s]*$/, 'Use digits, spaces, + ( ) -').max(30).optional().or(z.literal('')),
  role: z.enum(['CITIZEN', 'RESPONDER']),
  responderType: z.string().optional(),
})
type RegisterForm = z.infer<typeof registerSchema>

const RESPONDER_TYPES = ['GENERAL', 'AMBULANCE', 'FIRE_BRIGADE', 'RESCUE', 'POLICE', 'PARAMEDIC', 'VOLUNTEER']

export function Register() {
  const { register: signUp } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState<unknown>(null)
  const { register, handleSubmit, watch, setError: setFieldError, formState: { errors, isSubmitting } } =
    useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'CITIZEN', responderType: 'GENERAL' } })
  const role = watch('role')
  return (
    <Shell title="Create your account" subtitle="Citizens report emergencies. Responders join coordinated response teams.">
      <form className="space-y-4" onSubmit={handleSubmit(async (v) => {
        setError(null)
        try {
          const u = await signUp({ ...v, phone: v.phone || undefined, responderType: v.role === 'RESPONDER' ? v.responderType : undefined })
          nav(homePathFor(u.role), { replace: true })
        } catch (e) {
          if (e instanceof ApiError && e.fieldErrors) Object.entries(e.fieldErrors).forEach(([k, m]) => setFieldError(k as keyof RegisterForm, { message: m }))
          setError(e)
        }
      })}>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}><Input id="fullName" autoComplete="name" {...register('fullName')} /></Field>
        <Field label="E-mail" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" {...register('email')} /></Field>
        <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}><Input id="phone" type="tel" autoComplete="tel" {...register('phone')} /></Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 10 characters, mixing three of: lowercase, uppercase, digits, symbols"><PasswordInput id="password" autoComplete="new-password" {...register('password')} /></Field>
        <Field label="I am a" htmlFor="role">
          <Select id="role" {...register('role')}><option value="CITIZEN">Citizen (report emergencies)</option><option value="RESPONDER">Responder (needs admin verification)</option></Select>
        </Field>
        {role === 'RESPONDER' && (
          <Field label="Responder type" htmlFor="responderType">
            <Select id="responderType" {...register('responderType')}>{RESPONDER_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</Select>
          </Field>
        )}
        <ErrorNote error={error} />
        <ServerStatus quietWhenOnline />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">Already registered? <Link className="font-medium text-primary" to="/login">Sign in</Link></p>
    </Shell>
  )
}
