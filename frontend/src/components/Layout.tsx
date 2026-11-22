import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, ClipboardList, Ellipsis, LayoutDashboard, LogOut, Map as MapIcon, MessageSquare, PlusCircle,
  HeartHandshake, ScrollText, ShieldCheck, Truck, Users,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { ChatBootstrap } from './ChatBootstrap'
import { NotificationBell } from './NotificationBell'
import { OfflineBanner } from './OfflineBanner'
import { StaffAlerts } from './StaffAlerts'
import { QueueSync } from './QueueSync'
import { ErrorBoundary } from './ErrorBoundary'
import { FreshnessBadge } from './FreshnessBadge'
import { AccessibilityMenu } from './AccessibilityMenu'
import { ConnectionBanner } from './ConnectionBanner'
import { SandboxBanner } from './SandboxBanner'
import { BrandMark } from './ops/BrandMark'
import { Dialog } from './ui/dialog'
import { LiveDot } from './ui/live'
import { useLiveUpdates } from '@/lib/useLive'
import { LANGS, useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { chat, type LinkState } from '@/lib/nexconn'
import { cn } from '@/lib/utils'
import { useEffect, useState, type ComponentType } from 'react'
import type { Role, Stats } from '@/lib/types'

interface NavItem { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean; emphasis?: boolean }

const NAV: Record<Role, NavItem[]> = {
  CITIZEN: [
    { to: '/citizen', label: 'My reports', icon: ClipboardList, end: true },
    { to: '/citizen/report', label: 'Report emergency', icon: PlusCircle, emphasis: true },
  ],
  DISPATCHER: [
    { to: '/dispatch', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/dispatch/map', label: 'Live map', icon: MapIcon },
    { to: '/dispatch/incidents', label: 'Incidents', icon: ClipboardList },
    { to: '/dispatch/responders', label: 'Responders', icon: Truck },
    { to: '/check-ins', label: 'Check-ins', icon: HeartHandshake },
    { to: '/chat', label: 'Communication', icon: MessageSquare },
    { to: '/dispatch/analytics', label: 'Reports', icon: BarChart3 },
  ],
  RESPONDER: [
    { to: '/responder', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/responder/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/responder/map', label: 'Map', icon: MapIcon },
    { to: '/check-ins', label: 'Check-ins', icon: HeartHandshake },
    { to: '/chat', label: 'Team chat', icon: MessageSquare },
  ],
  ADMIN: [
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/activity', label: 'System activity', icon: BarChart3 },
    { to: '/admin/audit', label: 'Audit logs', icon: ScrollText },
    { to: '/dispatch', label: 'Dispatch overview', icon: LayoutDashboard, end: true },
    { to: '/dispatch/map', label: 'Live map', icon: MapIcon },
    { to: '/dispatch/incidents', label: 'Incidents', icon: ClipboardList },
    { to: '/dispatch/responders', label: 'Responders', icon: Truck },
    { to: '/check-ins', label: 'Check-ins', icon: HeartHandshake },
    { to: '/chat', label: 'Communication', icon: MessageSquare },
  ],
}

const LINK_LABEL: Record<LinkState, { text: string; tone: 'live' | 'warn' | 'off' | 'critical' }> = {
  idle: { text: 'Chat offline', tone: 'off' },
  connecting: { text: 'Chat connecting…', tone: 'warn' },
  connected: { text: 'Chat connected', tone: 'live' },
  disconnected: { text: 'Chat disconnected', tone: 'warn' },
  error: { text: 'Chat unavailable', tone: 'critical' },
}

const initials = (name: string) => name.replace(/\(.*\)/, '').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')

export function Layout() {
  const { user, logout } = useAuth()
  const { lang, setLang } = useI18n()
  const demo = import.meta.env.VITE_DEMO_MODE === 'true'
  const [link, setLink] = useState<LinkState>(chat.status)
  const [more, setMore] = useState(false)
  useLiveUpdates(!!user && !(user.role === 'RESPONDER' && user.verificationStatus !== 'VERIFIED'))
  useEffect(() => chat.onStatus(setLink), [])
  const staff = user?.role === 'DISPATCHER' || user?.role === 'ADMIN'
  // Same key as the Overview query, so this costs no extra request there. Drives the red count on "Overview".
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/incidents/stats'), refetchInterval: 15_000, enabled: !!staff })
  if (!user) return null
  const l = LINK_LABEL[link]
  const pending = user.role === 'RESPONDER' && user.verificationStatus !== 'VERIFIED'
  const items = [...NAV[user.role], ...(demo ? [{ to: '/demo', label: 'Demo guide', icon: ClipboardList } as NavItem] : [])]
  const critical = staff ? stats.data?.critical ?? 0 : 0
  const badgeFor = (n: NavItem) => (n.to === '/dispatch' && critical > 0 ? critical : 0)
  // Phones get a tab bar: up to four destinations plus "More". Citizens have two, one of them the primary action.
  const tabs = items.length <= 4 ? items.filter((n) => n.to !== '/demo') : items.slice(0, 4)
  const overflow = items.length <= 4 ? [] : items.slice(4)
  const role = user.role.charAt(0) + user.role.slice(1).toLowerCase()

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[3000] focus:rounded-ctl focus:bg-primary focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      {/* Operations rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-rail-line bg-rail text-rail-text md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-rail-line px-4">
          <BrandMark />
          <span className="font-display text-lg font-semibold text-rail-ink">ResQLink</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3" aria-label="Main">
          {items.map((n) => {
            const count = badgeFor(n)
            return (
              <NavLink key={n.to + n.label} to={n.to} end={n.end}
                className={({ isActive }) => cn('relative flex h-10 items-center gap-3 rounded-ctl px-3 text-sm font-medium transition-colors', isActive ? 'bg-primary-soft text-primary' : 'hover:bg-rail-2 hover:text-rail-ink')}>
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    {isActive && <span className="absolute -left-2.5 top-2 h-6 w-[3px] rounded-r-full bg-primary" aria-hidden />}
                    <n.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{n.label}</span>
                    {count > 0 && <span className="num rounded-full bg-critical-solid px-1.5 text-xs leading-5 text-white" aria-label={`${count} critical`}>{count}</span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="space-y-3 border-t border-rail-line p-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rail-2 text-[11px] font-semibold text-rail-ink">{initials(user.fullName)}</span>
            <div className="min-w-0"><p className="truncate text-[13px] font-medium text-rail-ink">{user.fullName}</p><p className="truncate">{role}</p></div>
          </div>
          <p className="flex items-center gap-2"><LiveDot tone={l.tone} />{l.text}</p>
          <p className="leading-snug text-rail-text/80">Prototype for demonstration. Not a replacement for official emergency services.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[800] flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line bg-surface/95 px-4 py-1.5 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="md:hidden"><BrandMark className="h-7 w-7" /></span>
            <span className="truncate text-[13px] text-muted"><span className="font-medium text-ink-2">{role} workspace</span>{demo ? <span className="hidden sm:inline"> · demonstration data</span> : ''}</span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            <AccessibilityMenu />
            {user.role === 'CITIZEN' && (
              <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className="h-8 rounded-ctl border border-line-strong bg-surface px-2 text-sm">
                {LANGS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            )}
            <FreshnessBadge />
            <NotificationBell />
            <button aria-label="Sign out" title="Sign out" onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-ctl text-ink-2 hover:bg-surface-3"><LogOut className="h-[18px] w-[18px]" /></button>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] outline-none md:p-6 md:pb-8">
          {pending && (
            <div className="mb-5 flex items-start gap-3 rounded-panel border border-medium-edge bg-medium-tint p-4 text-sm text-medium">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Your responder account is awaiting administrator verification. Operational features unlock once you are verified.</p>
            </div>
          )}
          <OfflineBanner />
          {user.role === 'CITIZEN' && <QueueSync />}
          <ChatBootstrap />
          {(user.role === 'DISPATCHER' || user.role === 'ADMIN') && <StaffAlerts />}
          <SandboxBanner />
          <ConnectionBanner />
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>

      {/* Phone tab bar */}
      <nav aria-label="Mobile" className="pb-safe fixed inset-x-0 bottom-0 z-[800] border-t border-line bg-surface/95 shadow-[0_-4px_16px_rgba(11,22,38,0.06)] backdrop-blur md:hidden">
        <ul className="flex h-14 items-stretch justify-around px-1">
          {tabs.map((n) => {
            const count = badgeFor(n)
            return (
              <li key={n.to + n.label} className="flex-1">
                <NavLink to={n.to} end={n.end} aria-label={n.label}
                  className={({ isActive }) => cn('relative flex h-full flex-col items-center justify-center gap-0.5 text-2xs font-medium', isActive ? 'text-primary' : 'text-muted', n.emphasis && 'text-primary')}>
                  {({ isActive }: { isActive: boolean }) => (
                    <>
                      <span className={cn('relative flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-primary-soft', n.emphasis && !isActive && 'bg-primary-soft/60')}>
                        <n.icon className="h-5 w-5" />
                        {count > 0 && <span className="num absolute -right-0.5 -top-1 min-w-4 rounded-full bg-critical-solid px-1 text-[11px] leading-4 text-white">{count}</span>}
                      </span>
                      <span className="max-w-full truncate px-1">{n.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
          {overflow.length > 0 && (
            <li className="flex-1">
              <button type="button" onClick={() => setMore(true)} className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-2xs font-medium text-muted">
                <span className="flex h-7 w-12 items-center justify-center"><Ellipsis className="h-5 w-5" /></span>More
              </button>
            </li>
          )}
        </ul>
      </nav>
      <Dialog open={more} onClose={() => setMore(false)} title="More">
        <ul className="-my-2 divide-y divide-line">
          {overflow.map((n) => (
            <li key={n.to + n.label}>
              <NavLink to={n.to} onClick={() => setMore(false)} className="flex h-12 items-center gap-3 text-sm font-medium text-ink"><n.icon className="h-4 w-4 text-muted" />{n.label}</NavLink>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted"><LiveDot tone={l.tone} />{l.text}</p>
      </Dialog>
    </div>
  )
}
