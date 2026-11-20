import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PriorityBadge, StatusBadge } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/fields'
import { EmptyState, ErrorNote, PageHeader, PageSpinner } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { CATEGORY_LABEL, STATUS_LABEL, timeAgo } from '@/lib/format'
import type { IncidentSummary, Page } from '@/lib/types'

export default function IncidentTable() {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [unassigned, setUnassigned] = useState(false)
  const query = useQuery({
    queryKey: ['incidents', 'table', page, status, priority, category, q, unassigned],
    queryFn: () => api.get<Page<IncidentSummary>>('/incidents', { page, size: 15, status, priority, category, q, unassigned: unassigned || undefined }),
    placeholderData: (p) => p,
    refetchInterval: 15_000,
  })
  const reset = (fn: () => void) => { fn(); setPage(0) }
  const d = query.data
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Incident management" subtitle="Search, filter and open any incident." />
      <Card className="mb-4"><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input aria-label="Search" placeholder="Search number or text" value={q} onChange={(e) => reset(() => setQ(e.target.value))} />
        <Select aria-label="Status" value={status} onChange={(e) => reset(() => setStatus(e.target.value))}><option value="">Any status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select aria-label="Priority" value={priority} onChange={(e) => reset(() => setPriority(e.target.value))}><option value="">Any priority</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></Select>
        <Select aria-label="Type" value={category} onChange={(e) => reset(() => setCategory(e.target.value))}><option value="">Any type</option>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unassigned} onChange={(e) => reset(() => setUnassigned(e.target.checked))} />Unassigned only</label>
      </div></Card>
      <ErrorNote error={query.error} />
      <Card className="overflow-x-auto">
        {query.isLoading ? <PageSpinner /> : !d || d.items.length === 0 ? <EmptyState title="No incidents match" hint="Adjust the filters or wait for new reports." /> : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase text-muted"><tr>
              <th className="px-5 py-3 font-medium">Incident</th><th className="px-3 py-3 font-medium">Priority</th><th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Responders</th><th className="px-3 py-3 font-medium">Reported</th></tr></thead>
            <tbody>
              {d.items.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3"><Link className="font-semibold text-primary" to={`/incidents/${i.id}`}>{i.incidentNumber}</Link><span className="ml-2 text-muted">{CATEGORY_LABEL[i.category]}</span><p className="max-w-md truncate text-muted">{i.description}</p></td>
                  <td className="px-3 py-3"><PriorityBadge priority={i.priority} suggested={i.priorityIsAiSuggestion} /></td>
                  <td className="px-3 py-3"><StatusBadge status={i.status} /></td>
                  <td className="px-3 py-3 text-muted">{i.responders.length ? i.responders.join(', ') : '—'}</td>
                  <td className="px-3 py-3 text-muted">{timeAgo(i.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {d && d.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>Page {d.page + 1} of {d.totalPages} · {d.totalElements} incidents</span>
          <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page + 1 >= d.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div>
        </div>
      )}
    </div>
  )
}
