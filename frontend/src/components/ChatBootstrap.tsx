import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { chat } from '@/lib/nexconn'
import type { ChatToken } from '@/lib/types'

/** Connects the signed-in user to Nexconn once and raises a toast for incoming messages. */
export function ChatBootstrap() {
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  useEffect(() => {
    if (!user) return
    if (user.role === 'RESPONDER' && user.verificationStatus !== 'VERIFIED') return
    let cancelled = false
    api.post<ChatToken>('/chat/token')
      .then((t) => (cancelled ? undefined : chat.connect(t)))
      .catch((e: Error) => {
        // Citizens have no chat surface until a dispatcher invites them, so a failed connection is not worth interrupting a report for.
        if (!cancelled && user.role !== 'CITIZEN') toast.push(`Chat unavailable: ${e.message}`, 'error')
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    return chat.onMessage((m) => {
      if (m.mine) return
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      if (m.channelId !== chat.activeChannelId) {
        toast.push(`New message: ${m.kind === 'text' ? (m.text ?? '').slice(0, 80) : m.name ?? 'attachment'}`, 'info')
      }
    })
  }, [qc, toast])

  return null
}
