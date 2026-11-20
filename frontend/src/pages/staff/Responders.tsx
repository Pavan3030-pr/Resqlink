import { useQuery } from '@tanstack/react-query'
import { IncidentMap } from '@/components/IncidentMap'
import { AvailabilityBadge } from '@/components/ui/badges'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorNote, PageHeader, PageSpinner } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import type { Responder } from '@/lib/types'

export default function RespondersPage() {
  const q = useQuery({ queryKey: ['responders'], queryFn: () => api.get<Responder[]>('/responders'), refetchInterval: 15_000 })
  const list = q.data ?? []
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Responders" subtitle="Availability, workload and last shared location. Assign responders from an incident." />
      <ErrorNote error={q.error} />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="overflow-x-auto xl:col-span-3">
          <CardHeader><CardTitle>Verified responders ({list.length})</CardTitle></CardHeader>
          {q.isLoading ? <PageSpinner /> : list.length === 0 ? <EmptyState title="No verified responders" hint="An administrator must verify responder accounts first." /> : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs uppercase text-muted"><tr><th className="px-5 py-3 font-medium">Responder</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Workload</th><th className="px-3 py-3 font-medium">Last location</th></tr></thead>
              <tbody>{list.map((r) => (
                <tr key={r.userId} className="border-b border-line last:border-0">
                  <td className="px-5 py-3"><p className="font-medium">{r.fullName}</p><p className="text-xs text-muted">{r.responderType.replace('_', ' ')}{r.phone ? ` · ${r.phone}` : ''}</p></td>
                  <td className="px-3 py-3"><AvailabilityBadge value={r.availability} /></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-2 w-16 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, r.activeAssignments * 34)}%` }} /></div><span>{r.activeAssignments}</span></div></td>
                  <td className="px-3 py-3">{r.shareLocation && r.lastLocationAt
                    ? (Date.now() - new Date(r.lastLocationAt).getTime() > 15 * 60_000
                      ? <span className="font-medium text-medium" title="Older than 15 minutes: not used for recommendations">Stale · {timeAgo(r.lastLocationAt)}</span>
                      : <span className="text-muted">{timeAgo(r.lastLocationAt)}</span>)
                    : <span className="text-muted">Not shared</span>}</td>
                </tr>))}</tbody>
            </table>
          )}
        </Card>
        <div className="xl:col-span-2"><IncidentMap responders={list} height={420} fit={false} /></div>
      </div>
    </div>
  )
}
