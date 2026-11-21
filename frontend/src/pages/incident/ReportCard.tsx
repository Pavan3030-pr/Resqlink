import { Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { IncidentDetail } from '@/lib/types'

export function Evidence({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    api.imageBlobUrl(url).then((u) => {
      if (cancelled) { URL.revokeObjectURL(u); return }
      revoked = u
      setSrc(u)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked) }
  }, [url])
  if (failed) return <p className="text-sm text-muted">Photo could not be loaded.</p>
  if (!src) return <Skeleton className="h-40 w-56 rounded-ctl" />
  return <a href={src} target="_blank" rel="noreferrer noopener" className="inline-block"><img src={src} alt="Evidence submitted by the reporter" className="max-h-56 rounded-ctl border border-line object-cover" /></a>
}

/** What was reported, in the reporter's own words, with evidence and a one-tap way to reach them. */
export function ReportCard({ d }: { d: IncidentDetail }) {
  const { user } = useAuth()
  return (
    <Card elevation="raised">
      <CardHeader><CardTitle>Report</CardTitle>{(d.duplicateCount ?? 0) > 0 && <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{d.duplicateCount} linked report{d.duplicateCount === 1 ? '' : 's'}</span>}</CardHeader>
      <CardBody className="space-y-4">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{d.summary.description}</p>
        {d.imageUrl && <Evidence url={d.imageUrl} />}
        {(d.contactName || d.contactPhone) && user?.role !== 'CITIZEN' && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-ctl bg-surface-2 px-3 py-2 text-sm text-ink-2">
            <span>Contact: {d.contactName ?? '—'}</span>
            {d.contactPhone && <a href={`tel:${d.contactPhone}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden />{d.contactPhone}</a>}
          </p>
        )}
        {d.duplicateOfId && <p className="text-sm text-muted">Marked as a duplicate of incident #{d.duplicateOfId}.</p>}
      </CardBody>
    </Card>
  )
}
