import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { ErrorNote, PageHeader } from '@/components/ui/misc'
import { ListSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import type { Role, User, VerificationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const createSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter a name'),
  email: z.string().email('Enter a valid e-mail'),
  password: z.string().min(10, 'At least 10 characters').max(72)
    .refine((v) => [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length >= 3, 'Mix at least three of: lowercase, uppercase, digits, symbols'),
  role: z.enum(['DISPATCHER', 'ADMIN']),
})
type CreateValues = z.infer<typeof createSchema>

export default function AdminUsers() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [suspending, setSuspending] = useState<User | null>(null)
  const [reason, setReason] = useState('')
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  const q = useQuery({ queryKey: ['admin', 'users', role, status], queryFn: () => api.get<User[]>('/admin/users', { role, status }) })
  const verify = useMutation({
    mutationFn: (v: { id: number; status: VerificationStatus }) => api.patch(`/admin/users/${v.id}/verification`, { status: v.status }),
    onSuccess: () => { toast.push('Verification updated', 'success'); refresh() },
  })
  const changeRole = useMutation({
    mutationFn: (v: { id: number; role: Role }) => api.patch(`/admin/users/${v.id}/role`, { role: v.role }),
    onSuccess: () => { toast.push('Role updated. Existing sessions of that user were signed out.', 'success'); refresh() },
  })
  const suspend = useMutation({
    mutationFn: (v: { id: number; suspended: boolean; reason?: string }) => api.patch(`/admin/users/${v.id}/suspension`, { suspended: v.suspended, reason: v.reason }),
    onSuccess: (_r, v) => { toast.push(v.suspended ? 'Account suspended and signed out everywhere' : 'Account reactivated', 'success'); setSuspending(null); setReason(''); refresh() },
  })
  const revoke = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/revoke-sessions`),
    onSuccess: () => toast.push('All sessions for that user were revoked', 'success'),
  })
  const create = useMutation({
    mutationFn: (v: CreateValues) => api.post('/admin/users', v),
    onSuccess: () => { setOpen(false); reset(); toast.push('Account created', 'success'); refresh() },
  })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { role: 'DISPATCHER' } })

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Users, roles & verification" subtitle="Verify responders, manage roles, suspend accounts. Role changes and suspensions take effect immediately." actions={<Button onClick={() => setOpen(true)}>Create dispatcher / admin</Button>} />
      <Card className="mb-4"><div className="grid gap-3 p-4 sm:grid-cols-3">
        <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option><option value="CITIZEN">Citizens</option><option value="RESPONDER">Responders</option><option value="DISPATCHER">Dispatchers</option><option value="ADMIN">Admins</option></Select>
        <Select aria-label="Verification" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any verification</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></Select>
      </div></Card>
      <ErrorNote error={q.error ?? verify.error ?? changeRole.error ?? suspend.error ?? revoke.error} />
      <Card className="overflow-x-auto">
        <CardHeader><CardTitle>Accounts ({q.data?.length ?? 0})</CardTitle></CardHeader>
        {q.isLoading ? <ListSkeleton /> : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase text-muted"><tr><th className="px-5 py-3 font-medium">User</th><th className="px-3 py-3 font-medium">Role</th><th className="px-3 py-3 font-medium">Verification</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Joined</th><th className="px-3 py-3 font-medium">Actions</th></tr></thead>
            <tbody>{q.data!.map((u) => (
              <tr key={u.id} className={cn('border-b border-line last:border-0', u.status === 'SUSPENDED' && 'bg-red-50/50')}>
                <td className="px-5 py-3"><p className="font-medium">{u.fullName}</p><p className="text-xs text-muted">{u.email}</p></td>
                <td className="px-3 py-3">{u.role.charAt(0) + u.role.slice(1).toLowerCase()}</td>
                <td className="px-3 py-3">{u.role === 'RESPONDER' ? u.verificationStatus.toLowerCase() : '—'}</td>
                <td className="px-3 py-3">{u.status === 'SUSPENDED' ? <span className="font-medium text-critical">Suspended</span> : 'Active'}</td>
                <td className="px-3 py-3 text-muted">{formatDateTime(u.createdAt)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {u.role === 'RESPONDER' && u.verificationStatus !== 'VERIFIED' && <Button size="sm" onClick={() => verify.mutate({ id: u.id, status: 'VERIFIED' })} disabled={verify.isPending}>Verify</Button>}
                    {u.role === 'RESPONDER' && u.verificationStatus !== 'REJECTED' && <Button size="sm" variant="outlineDanger" onClick={() => verify.mutate({ id: u.id, status: 'REJECTED' })} disabled={verify.isPending}>Reject</Button>}
                    {u.role !== 'RESPONDER' && u.id !== me?.id && (
                      <Select aria-label={`Role for ${u.fullName}`} className="h-8 w-36" value={u.role} onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value as Role })}>
                        <option value="CITIZEN">Citizen</option><option value="DISPATCHER">Dispatcher</option><option value="ADMIN">Admin</option>
                      </Select>)}
                    {u.id !== me?.id && (u.status === 'SUSPENDED'
                      ? <Button size="sm" variant="secondary" onClick={() => suspend.mutate({ id: u.id, suspended: false })}>Reactivate</Button>
                      : <Button size="sm" variant="outlineDanger" onClick={() => setSuspending(u)}>Suspend</Button>)}
                    {u.id !== me?.id && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(u.id)} disabled={revoke.isPending}>Sign out everywhere</Button>}
                  </div>
                </td>
              </tr>))}</tbody>
          </table>
        )}
      </Card>
      <Dialog open={!!suspending} onClose={() => setSuspending(null)} title={`Suspend ${suspending?.fullName ?? ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted">The user is signed out immediately and cannot sign in until reactivated. The action is recorded in the audit log.</p>
          <Field label="Reason (recorded in the audit log)" htmlFor="susp"><Textarea id="susp" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSuspending(null)}>Cancel</Button>
            <Button variant="danger" disabled={!reason.trim() || suspend.isPending} onClick={() => suspending && suspend.mutate({ id: suspending.id, suspended: true, reason: reason.trim() })}>Suspend account</Button></div>
        </div>
      </Dialog>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create dispatcher or admin">
        <form className="space-y-4" onSubmit={handleSubmit((v) => create.mutate(v))}>
          <Field label="Full name" htmlFor="c-name" error={errors.fullName?.message}><Input id="c-name" {...register('fullName')} /></Field>
          <Field label="E-mail" htmlFor="c-email" error={errors.email?.message}><Input id="c-email" type="email" {...register('email')} /></Field>
          <Field label="Temporary password" htmlFor="c-pw" error={errors.password?.message} hint="10+ characters, three of: lowercase, uppercase, digits, symbols"><Input id="c-pw" type="password" autoComplete="new-password" {...register('password')} /></Field>
          <Field label="Role" htmlFor="c-role"><Select id="c-role" {...register('role')}><option value="DISPATCHER">Dispatcher</option><option value="ADMIN">Administrator</option></Select></Field>
          <ErrorNote error={create.error} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>Create account</Button></div>
        </form>
      </Dialog>
    </div>
  )
}
