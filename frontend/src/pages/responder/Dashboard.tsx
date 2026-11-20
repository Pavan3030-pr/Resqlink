import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Radio } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AssignmentCard } from '@/components/responder/AssignmentCard'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Segmented, Switch } from '@/components/ui/controls'
import { LiveDot } from '@/components/ui/live'
import { EmptyState, ErrorNote, PageHeader } from '@/components/ui/misc'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { timeAgo } from '@/lib/format'
import type { Assignment, Availability, Responder } from '@/lib/types'
import { useNow } from '@/lib/useNow'

const OPTIONS = [
  { value: 'AVAILABLE', label: 'Available', tone: 'low' },
  { value: 'BUSY', label: 'Busy', tone: 'medium' },
  { value: 'OFFLINE', label: 'Offline', tone: 'neutral' },
] as const

export default function ResponderDashboard() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const now = useNow(15_000)
  const verified = user?.verificationStatus === 'VERIFIED'
  const me = useQuery({ queryKey: ['responder', 'me'], queryFn: () => api.get<Responder>('/responders/me'), enabled: verified })
  const mine = useQuery({ queryKey: ['assignments', 'mine'], queryFn: () => api.get<Assignment[]>('/assignments/mine'), enabled: verified, refetchInterval: 10_000 })
  const [geoError, setGeoError] = useState<string | null>(null)
  const watchRef = useRef<number | null>(null)
  const lastSent = useRef(0)

  const setAvail = useMutation({
    mutationFn: (b: { availability: Availability; shareLocation?: boolean }) => api.patch<Responder>('/responders/availability', b),
    onSuccess: (r) => { qc.setQueryData(['responder', 'me'], r); void qc.invalidateQueries({ queryKey: ['responders'] }) },
  })
  const push = useMutation({ mutationFn: (p: { latitude: number; longitude: number }) => api.patch<Responder>('/responders/location', p), onSuccess: (r) => qc.setQueryData(['responder', 'me'], r) })

  const sharing = me.data?.shareLocation ?? false
  useEffect(() => {
    if (!sharing) {
      if (watchRef.current != null) { navigator.geolocation?.clearWatch(watchRef.current); watchRef.current = null }
      return
    }
    if (!navigator.geolocation) { setGeoError('This browser does not support location sharing.'); return }
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        setGeoError(null)
        if (Date.now() - lastSent.current < 15_000) return
        lastSent.current = Date.now()
        push.mutate({ latitude: p.coords.latitude, longitude: p.coords.longitude })
      },
      () => setGeoError('Location permission was denied or unavailable. Your last position is not updated.'),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    )
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current) }
  }, [sharing]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!verified) return <div className="mx-auto max-w-3xl"><PageHeader title="Responder dashboard" subtitle="Your account is awaiting verification." /></div>
  const active = (mine.data ?? []).filter((a) => ['ASSIGNED', 'ACCEPTED', 'ARRIVED'].includes(a.status))
  const lastAt = me.data?.lastLocationAt ? +new Date(me.data.lastLocationAt) : 0
  const stale = sharing && (!lastAt || now - lastAt > 120_000)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Responder dashboard" subtitle="Set your availability and manage assignments." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="order-1 min-w-0 space-y-4 lg:order-2 lg:col-span-2">
          <h2 className="flex items-center justify-between text-[15px] font-semibold text-ink"><span>Active assignments ({active.length})</span><Link to="/responder/assignments" className="text-[13px] font-medium text-primary hover:underline">All</Link></h2>
          {mine.isLoading ? <Skeleton className="h-64 rounded-panel" /> : active.length === 0
            ? <Card><EmptyState icon={Radio} title="No active assignments" hint={me.data?.availability === 'AVAILABLE' ? 'You are visible to dispatchers. New assignments appear here and in your notifications.' : 'Set yourself Available to receive assignments.'} /></Card>
            : active.map((a) => <AssignmentCard key={a.id} a={a} />)}
        </div>
        <Card className="order-2 self-start lg:order-1">
          <CardHeader><CardTitle>Availability</CardTitle></CardHeader>
          <CardBody className="space-y-5">
            <Segmented ariaLabel="Availability" options={[...OPTIONS]} value={me.data?.availability} disabled={setAvail.isPending || !me.data}
              onChange={(a) => setAvail.mutate({ availability: a, shareLocation: a === 'OFFLINE' ? false : undefined })} />
            <Switch label="Share my live location with dispatchers" checked={sharing} disabled={me.data?.availability === 'OFFLINE' || setAvail.isPending}
              description="Off by default. Turning it off deletes your stored position." onChange={(v) => setAvail.mutate({ availability: me.data!.availability, shareLocation: v })} />
            {sharing && (
              <p className="flex items-center gap-2 text-xs text-muted"><LiveDot tone={stale ? 'warn' : 'live'} pulse={!stale} />{me.data?.lastLocationAt ? `Last shared ${timeAgo(me.data.lastLocationAt, now)}` : 'Waiting for your first position…'}</p>
            )}
            {geoError && <p role="alert" className="rounded-ctl border border-medium-edge bg-medium-tint px-3 py-2 text-xs text-medium">{geoError}</p>}
            <ErrorNote error={setAvail.error ?? push.error} />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
