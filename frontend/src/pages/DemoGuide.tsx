import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { DemoInfo } from '@/lib/types'

const STEPS: { who: string; what: string; where?: string }[] = [
  { who: 'Citizen', what: 'Report a serious road accident with a photo, location and a description in your own language.', where: '/citizen/report' },
  { who: 'System', what: 'The report arrives; AI summarises it in English, suggests a priority and flags prompt-injection attempts. If the model is unavailable the screen says so.' },
  { who: 'Dispatcher', what: 'Open the incident: exact location with accuracy, the AI findings, and the original report.', where: '/dispatch' },
  { who: 'Dispatcher', what: 'Check duplicates: the earlier demo report near the same flyover is flagged. Compare side by side and see why.' },
  { who: 'Dispatcher', what: 'Verify the incident (or link it as a duplicate).' },
  { who: 'Dispatcher', what: 'Review recommended responders with their distance, type fit and workload, then assign two.' },
  { who: 'System', what: 'The Nexconn group channel is created and members synced. Its state is shown on the incident; a failure is visible and retried automatically.' },
  { who: 'Responders', what: 'Sign in as the assigned responders (two browsers). Accept, then exchange real Nexconn messages in the incident channel.', where: '/responder' },
  { who: 'Responder', what: 'Mark “I have arrived”. A status message is posted into the channel and the dispatcher sees On scene.' },
  { who: 'Responder / Dispatcher', what: 'Complete the response; the dispatcher marks the incident resolved with a reason.' },
  { who: 'Dispatcher', what: 'Export the incident timeline (it is recorded in the audit log).' },
  { who: 'Administrator', what: 'Open Audit logs and verify the hash chain; open System activity to see the metrics computed from what just happened.', where: '/admin/audit' },
]

export default function DemoGuide() {
  const { user } = useAuth()
  const info = useQuery({ queryKey: ['demo-info'], queryFn: () => api.get<DemoInfo>('/public/demo-info') })
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Guided demonstration" subtitle="One scenario from report to resolution. You can also create your own incident at any step." />
      <Card className="mb-6">
        <CardHeader><CardTitle>Demonstration accounts</CardTitle></CardHeader>
        <CardBody className="space-y-2 text-sm">
          <p className="text-muted">All demonstration accounts and responder positions are simulated and labelled “(demo)”. The shared password is given in the submission document, not shown here.</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">{(info.data?.accounts ?? []).map((a) => <li key={a.email}><span className="font-medium">{a.role.charAt(0) + a.role.slice(1).toLowerCase()}</span> · <code className="rounded bg-surface-2 px-1">{a.email}</code></li>)}</ul>
          <p className="text-muted">You are signed in as <strong>{user?.fullName}</strong>.</p>
        </CardBody>
      </Card>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-4 rounded-xl border border-line bg-surface p-4 shadow-card">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">{i + 1}</span>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted">{s.who}</p><p className="text-sm">{s.what}</p>
              {s.where && <Link to={s.where} className="mt-1 inline-block text-sm font-medium text-primary">Open →</Link>}</div>
          </li>
        ))}
      </ol>
    </div>
  )
}
