import { FileText, Loader2, Paperclip, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MicButton, SpeakButton } from '@/components/VoiceButtons'
import { useAuth } from '@/lib/auth'
import { quickRepliesFor } from '@/lib/quickReplies'
import { chat, type ChannelRef, type ChatMessage, type LinkState } from '@/lib/nexconn'
import { cn } from '@/lib/utils'

/** Real-time chat for one Nexconn channel (direct or group). */
export function ChatPanel({ channel, title, names, height = 420, onMessages }: {
  channel: ChannelRef
  title?: string
  names?: Record<string, string>
  height?: number
  onMessages?: (m: ChatMessage[]) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const quick = quickRepliesFor(user?.role)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [link, setLink] = useState<LinkState>(chat.status)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sentCb = useRef(onMessages)
  sentCb.current = onMessages

  useEffect(() => chat.onStatus(setLink), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const h = await chat.history(channel)
      setMessages(h)
      void chat.markRead(channel, h.filter((m) => !m.mine).map((m) => m.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages')
    } finally {
      setLoading(false)
    }
  }, [channel.kind, channel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMessages([])
    if (link !== 'connected') { setLoading(false); return }
    void load()
  }, [load, link])

  useEffect(() => {
    chat.activeChannelId = channel.id
    const off = chat.onMessage((m) => {
      if (m.channelId !== channel.id) return
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      void chat.markRead(channel, [m.id])
    })
    return () => { off(); if (chat.activeChannelId === channel.id) chat.activeChannelId = null }
  }, [channel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
    sentCb.current?.(messages)
  }, [messages])

  async function send(override?: string) {
    const t = (override ?? text).trim()
    if (!t || sending) return
    setSending(true)
    setError(null)
    try {
      const m = await chat.sendText(channel, t)
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      if (override === undefined) setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message not sent')
    } finally {
      setSending(false)
    }
  }

  async function sendFile(f: File | undefined) {
    if (!f) return
    setSending(true)
    setError(null)
    try {
      const m = await chat.sendFile(channel, f)
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Attachment not sent')
    } finally {
      setSending(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface" style={{ height }}>
      {title && <div className="border-b border-line px-4 py-2.5 text-sm font-semibold">{title}</div>}
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 p-4" aria-live="polite">
        {link !== 'connected' && <p className="text-center text-sm text-muted">Chat is {link === 'connecting' ? 'connecting…' : 'not connected'}. Messages appear once the connection is ready.</p>}
        {loading && link === 'connected' && <p className="flex items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading messages…</p>}
        {!loading && link === 'connected' && messages.length === 0 && !error && <p className="text-center text-sm text-muted">No messages yet. Say hello to start coordinating.</p>}
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col', m.mine ? 'items-end' : 'items-start')}>
            {!m.mine && <span className="mb-0.5 text-[11px] text-muted">{names?.[m.senderId] ?? 'Participant'}</span>}
            <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', m.mine ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border border-line bg-surface')}>
              {m.kind === 'text' && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
              {m.kind === 'text' && !m.mine && m.text && <SpeakButton text={m.text} className={cn('-ml-2 mt-1')} />}
              {m.kind === 'image' && m.url && <a href={m.url} target="_blank" rel="noreferrer noopener"><img src={m.url} alt="Shared" className="max-h-52 rounded-lg" /></a>}
              {m.kind === 'file' && (
                <a href={m.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 underline"><FileText className="h-4 w-4" />{m.name ?? 'File'}</a>
              )}
              {m.kind === 'other' && <p className="italic opacity-80">{m.text}</p>}
            </div>
            <span className="mt-0.5 text-[10px] text-muted">
              {new Date(m.sentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {m.mine && ` · ${m.status === 'read' ? 'Read' : m.status === 'failed' ? 'Failed' : m.status === 'sending' ? 'Sending' : 'Delivered'}`}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-1.5 text-xs text-critical">{error}</p>}
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 pt-2" role="group" aria-label="Quick replies">
          {quick.map((q) => <button key={q} type="button" disabled={sending || link !== 'connected'} onClick={() => void send(q)} className="rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-50">{q}</button>)}
        </div>
      )}
      <form className="flex items-end gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); void send() }}>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => void sendFile(e.target.files?.[0])} aria-label="Attach file" />
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={sending || link !== 'connected'} aria-label="Attach file"><Paperclip className="h-4 w-4" /></Button>
        <MicButton value={text} onChange={setText} onError={setError} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Write a message…" aria-label="Message"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <Button type="submit" size="sm" disabled={!text.trim() || sending || link !== 'connected'} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}
