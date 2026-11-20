import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Navigation } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AssignmentFlow } from '@/components/responder/AssignmentFlow'
import { AssignmentBadge, PriorityBadge, StatusBadge } from '@/components/ui/badges'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/misc'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { CATEGORY_LABEL, formatDateTime, navigationUrl, timeAgo } from '@/lib/format'
import type { IncidentDetail } from '@/lib/types'
import { AiAssessment } from './incident/AiAssessment'
import { ChannelCard } from './incident/ChannelCard'
import { CitizenStatus } from './incident/CitizenStatus'
import { CommandBar } from './incident/CommandBar'
import { Duplicates } from './incident/Duplicates'
import { ExportButton } from './incident/ExportButton'
import { LocationCard } from './incident/LocationCard'
import { ReportCard } from './incident/ReportCard'
import { ResponderPanel } from './incident/ResponderPanel'
import { StatusDialogs } from './incident/StatusDialogs'
import { Timeline } from './incident/Timeline'
import { useAssignOps } from './incident/useAssignOps'
import { useIncidentActions } from './incident/useIncidentActions'
import { useRecommendations } from './incident/useRecommendations'

export default function IncidentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['incident', id], queryFn: () => api.get<IncidentDetail>(`/incidents/${id}`), refetchInterval: 10_000, enabled: !!id })
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['incident', id] })
    void qc.invalidateQueries({ queryKey: ['incidents'] })
  }
  if (!user) return null
  if (q.isLoading) return <DetailSkeleton />
  if (q.error || !q.data) return <div className="mx-auto max-w-3xl"><Card><ErrorState title="Could not load this incident" error={q.error ?? new Error('Incident not found')} onRetry={() => q.refetch()} /></Card></div>
  return <IncidentView d={q.data} refresh={refresh} />
}

/** Composition only: each section is its own component, and the role decides which sections exist. */
function IncidentView({ d, refresh }: { d: IncidentDetail; refresh: () => void }) {
  const { user } = useAuth()
  const nav = useNavigate()
  const actions = useIncidentActions(d, refresh)
  const ops = useAssignOps(d, refresh)
  const canAssign = ['VERIFIED', 'ASSIGNED', 'RESPONDER_ACCEPTED', 'ON_SCENE'].includes(d.summary.status)
  const staff = user?.role === 'DISPATCHER' || user?.role === 'ADMIN'
  const rec = useRecommendations(d, !!staff && canAssign)
  if (!user) return null
  const citizen = user.role === 'CITIZEN'
  const responder = user.role === 'RESPONDER'
  const back = staff ? '/dispatch/incidents' : responder ? '/responder/assignments' : '/citizen'
  const mine = d.assignments.find((a) => a.responderId === user.id && ['ASSIGNED', 'ACCEPTED', 'ARRIVED'].includes(a.status))
  const s = d.summary

  return (
    <div className="mx-auto max-w-7xl">
      <Link to={back} className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-ctl pr-2 text-[13px] font-medium text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden />Back</Link>

      {citizen ? <CitizenStatus d={d} /> : (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-baseline gap-x-2.5"><span className="num text-[26px] leading-9 text-ink">{s.incidentNumber}</span><span className="text-lg font-semibold text-ink-2">{CATEGORY_LABEL[s.category]}</span></h1>
              <p className="mt-0.5 text-[13px] text-muted">Reported {formatDateTime(s.createdAt)}{d.reportedByName ? ` by ${d.reportedByName}` : ''} · {timeAgo(s.createdAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.demo && <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-2">Demo data</span>}
              <PriorityBadge priority={s.priority} suggested={s.priorityIsAiSuggestion} /><StatusBadge status={s.status} />
              {staff && <ExportButton id={s.id} number={s.incidentNumber} />}
            </div>
          </div>

          {staff && <CommandBar d={d} actions={actions} ops={ops} rec={rec} />}
          {responder && mine && (
            <Card elevation="hero" tone="info">
              <CardHeader><CardTitle>Your assignment</CardTitle><div className="flex items-center gap-2"><AssignmentBadge status={mine.status} /></div></CardHeader>
              <CardBody className="space-y-4">
                <AssignmentFlow a={mine} channelId={d.channel?.channelId} onChange={refresh} onDeclined={() => nav('/responder/assignments')} />
                <a className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-ctl border border-line-strong bg-surface text-sm font-medium text-ink shadow-card hover:bg-surface-2" target="_blank" rel="noreferrer noopener" href={navigationUrl(s.latitude, s.longitude)}><Navigation className="h-4 w-4" aria-hidden />Navigate to the scene</a>
              </CardBody>
            </Card>
          )}

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="min-w-0 space-y-5 lg:col-span-7">
              <ReportCard d={d} />
              {staff && <AiAssessment d={d} actions={actions} />}
              {staff && <Duplicates d={d} actions={actions} />}
              <Timeline d={d} />
            </div>
            <div className="min-w-0 space-y-5 lg:col-span-5">
              {staff && <ResponderPanel d={d} ops={ops} rec={rec} />}
              <LocationCard d={d} staff={!!staff} responder={responder} />
              <ChannelCard d={d} onChange={refresh} />
            </div>
          </div>
          {staff && <StatusDialogs actions={actions} />}
        </>
      )}
      {citizen && <div className="mx-auto mt-4 max-w-2xl"><ChannelCard d={d} onChange={refresh} /></div>}
    </div>
  )
}
