import { useMutation, useQuery } from '@tanstack/react-query'
import { ShieldCheck, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorNote, PageHeader, PageSpinner } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { AuditLogEntry, AuditVerification, Page } from '@/lib/types'

export default function AdminAudit() {
  const [page, setPage] = useState(0)
  const q = useQuery({ queryKey: ['admin', 'audit', page], queryFn: () => api.get<Page<AuditLogEntry>>('/admin/audit-logs', { page, size: 25 }), placeholderData: (p) => p })
  const verify = useMutation({ mutationFn: () => api.get<AuditVerification>('/admin/audit-logs/verify') })
  const d = q.data
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Audit logs" subtitle="Who did what and when. Entries are hash-chained, so edits or deletions are detectable."
        actions={<Button variant="secondary" onClick={() => verify.mutate()} disabled={verify.isPending}>{verify.isPending ? 'Verifying…' : 'Verify integrity'}</Button>} />
      {verify.data && (verify.data.valid
        ? <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-low"><ShieldCheck className="h-4 w-4" />Chain intact: {verify.data.checked} chained entries verified.</p>
        : <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-critical"><ShieldX className="h-4 w-4" />Integrity check failed at entry #{verify.data.firstBrokenId}. The log was altered after it was written.</p>)}
      <ErrorNote error={verify.error} />
      <ErrorNote error={q.error} />
      <Card className="overflow-x-auto">
        {q.isLoading ? <PageSpinner /> : !d || d.items.length === 0 ? <EmptyState title="No audit entries yet" /> : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase text-muted"><tr><th className="px-5 py-3 font-medium">When</th><th className="px-3 py-3 font-medium">Actor</th><th className="px-3 py-3 font-medium">Action</th><th className="px-3 py-3 font-medium">Resource</th><th className="px-3 py-3 font-medium">Details</th></tr></thead>
            <tbody>{d.items.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0"><td className="px-5 py-2.5 text-muted">{formatDateTime(a.createdAt)}</td><td className="px-3 py-2.5">{a.actor}</td><td className="px-3 py-2.5 font-medium">{a.action}</td><td className="px-3 py-2.5 text-muted">{a.resourceType}{a.resourceId ? ` #${a.resourceId}` : ''}</td><td className="px-3 py-2.5 text-muted">{a.details ?? ''}</td></tr>))}</tbody>
          </table>
        )}
      </Card>
      {d && d.totalPages > 1 && <div className="mt-4 flex items-center justify-between text-sm text-muted"><span>Page {d.page + 1} of {d.totalPages}</span>
        <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page + 1 >= d.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>}
    </div>
  )
}
