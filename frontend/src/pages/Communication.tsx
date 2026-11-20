import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatPanel } from '@/components/ChatPanel'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorNote, PageHeader, PageSpinner } from '@/components/ui/misc'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Contact, IncidentSummary, Page } from '@/lib/types'
import { cn } from '@/lib/utils'

type Sel = { kind: 'direct'; contact: Contact } | { kind: 'group'; incident: IncidentSummary; channelId: string }

export default function Communication() {
  const { user } = useAuth()
  const [sel, setSel] = useState<Sel | null>(null)
  const contacts = useQuery({ queryKey: ['contacts'], queryFn: () => api.get<Contact[]>('/chat/contacts') })
  const incidents = useQuery({ queryKey: ['incidents', 'channels'], queryFn: () => api.get<Page<IncidentSummary>>('/incidents', { size: 50, activeOnly: true }), refetchInterval: 15_000 })
  const withChannel = (incidents.data?.items ?? []).filter((i) => i.hasChannel)

  async function pickIncident(i: IncidentSummary) {
    const r = await api.get<{ channelId: string }>(`/chat/channels/incidents/${i.id}`)
    setSel({ kind: 'group', incident: i, channelId: r.channelId })
  }

  const names: Record<string, string> = {}
  contacts.data?.forEach((c) => { names[c.chatUserId] = c.fullName })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={user?.role === 'RESPONDER' ? 'Team chat' : 'Communication center'} subtitle="Direct messages and incident channels, delivered in real time through Nexconn." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Incident channels</CardTitle></CardHeader>
            {incidents.isLoading ? <PageSpinner /> : withChannel.length === 0 ? <EmptyState title="No active channels" hint="A channel appears when a responder is assigned to an incident." /> : (
              <ul>{withChannel.map((i) => (
                <li key={i.id}><button onClick={() => void pickIncident(i)} className={cn('block w-full border-b border-line px-5 py-3 text-left text-sm last:border-0 hover:bg-slate-50', sel?.kind === 'group' && sel.incident.id === i.id && 'bg-primary-soft')}>
                  <p className="font-medium">{i.incidentNumber}</p><p className="truncate text-xs text-muted">{i.description}</p></button></li>
              ))}</ul>
            )}
          </Card>
          <Card>
            <CardHeader><CardTitle>Direct messages</CardTitle></CardHeader>
            {contacts.isLoading ? <PageSpinner /> : (contacts.data ?? []).length === 0 ? <EmptyState title="No contacts available" /> : (
              <ul className="max-h-80 overflow-y-auto">{contacts.data!.map((c) => (
                <li key={c.userId}><button onClick={() => setSel({ kind: 'direct', contact: c })} className={cn('block w-full border-b border-line px-5 py-3 text-left text-sm last:border-0 hover:bg-slate-50', sel?.kind === 'direct' && sel.contact.userId === c.userId && 'bg-primary-soft')}>
                  <p className="font-medium">{c.fullName}</p><p className="text-xs text-muted">{c.role.toLowerCase()}{c.responderType ? ` · ${c.responderType.replace('_', ' ').toLowerCase()}` : ''}</p></button></li>
              ))}</ul>
            )}
          </Card>
          <ErrorNote error={contacts.error ?? incidents.error} />
        </div>
        <div className="lg:col-span-2">
          {!sel ? <Card><EmptyState title="Select a conversation" hint="Choose an incident channel or a contact to start messaging." /></Card> : (
            <>
              {sel.kind === 'group' && <p className="mb-2 text-sm text-muted">Incident <Link className="font-medium text-primary" to={`/incidents/${sel.incident.id}`}>{sel.incident.incidentNumber}</Link> · {sel.incident.status.replace(/_/g, ' ').toLowerCase()}</p>}
              <ChatPanel key={sel.kind === 'group' ? sel.channelId : sel.contact.chatUserId}
                channel={sel.kind === 'group' ? { kind: 'group', id: sel.channelId } : { kind: 'direct', id: sel.contact.chatUserId }}
                title={sel.kind === 'group' ? `Incident ${sel.incident.incidentNumber}` : sel.contact.fullName} names={names} height={560} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
