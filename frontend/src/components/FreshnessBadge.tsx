import { useIsFetching } from '@tanstack/react-query'
import { useLiveState } from '@/lib/useLive'
import { LiveDot } from '@/components/ui/live'
import { cn } from '@/lib/utils'

const LABEL = {
  live: { text: 'Live', tone: 'live', chip: 'border-low-edge bg-low-tint text-low', hint: 'Updates arrive in real time' },
  connecting: { text: 'Connecting…', tone: 'warn', chip: 'border-medium-edge bg-medium-tint text-medium', hint: 'Opening the live stream' },
  reconnecting: { text: 'Reconnecting…', tone: 'warn', chip: 'border-medium-edge bg-medium-tint text-medium', hint: 'Live stream interrupted. Data refreshes every few seconds meanwhile.' },
  offline: { text: 'Offline', tone: 'off', chip: 'border-line bg-surface-3 text-muted', hint: 'No live stream. Data may be out of date.' },
} as const

/** Never claims "live" unless the stream is actually connected. The ring pulses only while live and idle. */
export function FreshnessBadge() {
  const state = useLiveState()
  const fetching = useIsFetching()
  const l = LABEL[state]
  return (
    <span title={l.hint} role="status" aria-label={`Data status: ${l.text}`} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors duration-300', l.chip)}>
      <LiveDot tone={l.tone} pulse={state === 'live' && fetching === 0} />{l.text}
    </span>
  )
}
