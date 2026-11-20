import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import type { AppNotification } from '@/lib/types'
import { cn } from '@/lib/utils'

export function NotificationBell({ onRail }: { onRail?: boolean }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const id = useId()
  const btn = useRef<HTMLButtonElement>(null)
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ items: AppNotification[]; unread: number }>('/notifications', { limit: 20 }),
    refetchInterval: 20_000,
  })
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
  const readOne = useMutation({ mutationFn: (nid: number) => api.post(`/notifications/${nid}/read`), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
  const unread = data?.unread ?? 0

  // A new notification pops the badge once. Nothing animates on first load or while the count is unchanged.
  const prev = useRef(unread)
  const [pop, setPop] = useState(false)
  useEffect(() => {
    if (unread > prev.current) { setPop(true); const t = setTimeout(() => setPop(false), 400); prev.current = unread; return () => clearTimeout(t) }
    prev.current = unread
  }, [unread])

  const close = () => { setOpen(false); btn.current?.focus() }
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  return (
    <div className="relative">
      <button ref={btn} aria-label={`Notifications (${unread} unread)`} aria-haspopup="true" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}
        className={cn('relative flex h-9 w-9 items-center justify-center rounded-ctl text-ink-2 transition-colors hover:bg-surface-3', onRail && 'text-rail-text hover:bg-rail-2 hover:text-rail-ink')}>
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className={cn('num absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical-solid px-1 text-[11px] leading-none text-white ring-2 ring-surface', pop && 'rl-pop', onRail && 'ring-rail')}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[900]" onClick={() => setOpen(false)} />
          <div id={id} role="region" aria-label="Notifications" className="rl-rise fixed inset-x-3 top-16 z-[950] overflow-hidden rounded-panel border border-line bg-surface shadow-overlay md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-[26rem]">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-semibold">Notifications{unread > 0 && <span className="num ml-2 text-xs text-muted">{unread} unread</span>}</span>
              <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft disabled:opacity-40" disabled={unread === 0} onClick={() => readAll.mutate()}><CheckCheck className="h-3.5 w-3.5" aria-hidden />Mark all read</button>
            </div>
            <ul className="max-h-[min(24rem,60vh)] divide-y divide-line overflow-y-auto">
              {(data?.items ?? []).length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">You are all caught up.</li>}
              {(data?.items ?? []).map((n) => {
                const inner = (
                  <div className={cn('relative flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2', !n.read && 'bg-primary-soft/50')}>
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm', n.read ? 'font-medium text-ink-2' : 'font-semibold text-ink')}>{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{n.message}</p>
                      <p className="mt-1 text-2xs text-muted">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                )
                return (
                  <li key={n.id}>
                    {n.incidentId
                      ? <Link to={`/incidents/${n.incidentId}`} className="block" onClick={() => { setOpen(false); if (!n.read) readOne.mutate(n.id) }}>{inner}</Link>
                      : <button className="block w-full text-left" onClick={() => !n.read && readOne.mutate(n.id)}>{inner}</button>}
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
