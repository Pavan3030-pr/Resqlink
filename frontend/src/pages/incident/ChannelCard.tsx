import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveDot } from '@/components/ui/live'
import { ErrorNote } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ChatMessage } from '@/lib/nexconn'
import type { ChannelSync, Contact, ConversationSummary, IncidentDetail } from '@/lib/types'

export function ChannelCard({ d, onChange }: { d: IncidentDetail; onChange: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const staff = user?.role === 'DISPATCHER' || user?.role === 'ADMIN'
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [summary, setSummary] = useState<ConversationSummary | null>(null)
  const contacts = useQuery({ queryKey: ['contacts'], queryFn: () => api.get<Contact[]>('/chat/contacts'), enabled: !!user && user.role !== 'CITIZEN' })
  const names = useMemo(() => {
    const m: Record<string, string> = {}
    contacts.data?.forEach((c) => { m[c.chatUserId] = c.fullName })
    d.assignments.forEach((a) => { m[`rl_user_${a.responderId}`] = a.responderName })
    return m
  }, [contacts.data, d.assignments, d.reportedByName])

  const sync = useMutation({
    mutationFn: () => api.post<ChannelSync>(`/chat/channels/incidents/${d.summary.id}`),
    onSuccess: (r) => { toast.push(r.synced ? 'Channel is ready' : r.message, r.synced ? 'success' : 'error'); onChange() },
  })
  const invite = useMutation({
    mutationFn: () => api.post<ChannelSync>(`/chat/channels/incidents/${d.summary.id}/invite-reporter`),
    onSuccess: () => { toast.push('Reporter invited to the channel', 'success'); onChange() },
  })
  const summarise = useMutation({
    mutationFn: () => api.post<ConversationSummary>(`/ai/incidents/${d.summary.id}/conversation-summary`, {
      messages: msgs.filter((m) => m.kind === 'text' && m.text).slice(-100).map((m) => ({ sender: m.mine ? (user?.fullName ?? 'Me') : names[m.senderId] ?? 'Participant', text: m.text, sentAt: new Date(m.sentTime).toISOString() })),
    }),
    onSuccess: setSummary,
  })

  const ch = d.channel
  const canOpen = staff && ['VERIFIED', 'ASSIGNED', 'RESPONDER_ACCEPTED', 'ON_SCENE', 'RESOLVED'].includes(d.summary.status)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident channel</CardTitle>
        {staff && <div className="flex gap-2">
          {(ch || canOpen) && <Button size="sm" variant="secondary" onClick={() => sync.mutate()} loading={sync.isPending}>{ch ? (ch.syncStatus === 'FAILED' ? 'Retry sync' : 'Sync members') : 'Create channel'}</Button>}
          {ch && !ch.reporterInvited && <Button size="sm" variant="ghost" onClick={() => invite.mutate()} loading={invite.isPending}>Invite reporter</Button>}
        </div>}
      </CardHeader>
      <CardBody className="space-y-3">
        {!ch ? (
          <p className="text-[13px] leading-relaxed text-muted">{user?.role === 'CITIZEN' ? 'A dispatcher may invite you to a secure channel with the response team.' : 'The channel is created when a responder is assigned, or from “Create channel”.'}</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {ch.syncStatus === 'SYNCED' && <span className="inline-flex items-center gap-1.5 rounded-md bg-low-tint px-2 py-0.5 font-medium text-low"><LiveDot tone="live" />Members synced</span>}
              {ch.syncStatus === 'PENDING' && <span className="inline-flex items-center gap-1.5 rounded-md bg-medium-tint px-2 py-0.5 font-medium text-medium"><LiveDot tone="warn" pulse />Syncing members…</span>}
              {ch.syncStatus === 'FAILED' && <span className="inline-flex items-center gap-1.5 rounded-md bg-critical-tint px-2 py-0.5 font-medium text-critical"><LiveDot tone="critical" />Sync failed, retrying</span>}
              <code className="truncate rounded bg-surface-3 px-1.5 py-0.5 text-2xs">{ch.channelId}</code>
            </p>
            {staff && ch.syncStatus === 'FAILED' && (
              <p role="alert" className="rounded-ctl border border-critical-edge bg-critical-tint px-3 py-2 text-xs text-critical">{ch.syncError ?? 'The chat service could not be reached.'} The system retries automatically; you can also press “Sync members”.</p>
            )}
            <ChatPanel channel={{ kind: 'group', id: ch.channelId }} names={names} height={380} onMessages={setMsgs} />
            {staff && (
              <div className="space-y-2">
                <Button size="sm" variant="secondary" onClick={() => summarise.mutate()} loading={summarise.isPending} disabled={msgs.filter((m) => m.kind === 'text').length === 0}>{summarise.isPending ? 'Summarising…' : 'Summarise conversation'}</Button>
                {summary && <div className="rounded-ctl border border-advisory-edge bg-advisory-tint/50 p-3 text-sm"><p>{summary.summary}</p><p className="mt-1 text-xs text-muted">AI summary · based on {summary.messageCount} message(s) · {summary.source}</p></div>}
              </div>
            )}
          </>
        )}
        <ErrorNote error={sync.error ?? invite.error ?? summarise.error} />
      </CardBody>
    </Card>
  )
}
