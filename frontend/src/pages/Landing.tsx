import { ArrowRight, Brain, ClipboardCheck, MessagesSquare, ShieldCheck, Siren, Truck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/ops/BrandMark'
import { SlaMeter } from '@/components/ops/SlaMeter'
import { PriorityBadge, StatusBadge } from '@/components/ui/badges'
import { linkButtonClass } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = [
  { icon: Siren, title: 'Report', text: 'A citizen sends a description, photo and GPS location in under a minute, even with a weak connection.' },
  { icon: Brain, title: 'Triage', text: 'AI summarises the report in English, suggests a priority and flags likely duplicates. A dispatcher verifies.' },
  { icon: Truck, title: 'Assign', text: 'Responders are ranked by distance, type fit and workload. The dispatcher makes the final decision.' },
  { icon: MessagesSquare, title: 'Coordinate', text: 'Each incident gets its own Nexconn channel for real-time messages, photos and status updates.' },
]

const ROLES = [
  { icon: UserRound, name: 'Citizens', points: ['Report with photo and GPS', 'Plain-language status updates', 'Reports saved offline and sent later'] },
  { icon: ClipboardCheck, name: 'Dispatchers', points: ['Priority queue with live wait timers', 'AI analysis, duplicates, next best action', 'Live map, assignment and incident channels'] },
  { icon: Truck, name: 'Responders', points: ['Accept or decline with a reason', 'Navigate and share arrival updates', 'Opt-in location sharing only'] },
  { icon: ShieldCheck, name: 'Administrators', points: ['Verify responders before access', 'Audit log of every action', 'Measured response-time metrics'] },
]

/** A faithful, static slice of the real Command Center queue (sample data), so the first screen shows the product rather than a diagram. */
function QueuePreview() {
  return (
    <figure aria-label="Preview of the dispatcher queue with sample data" className="select-none">
      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-hero">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <span className="text-sm font-semibold text-ink">Needs attention</span>
          <span className="num rounded-full bg-ink px-2 text-xs leading-5 text-white">3</span>
          <span className="rounded-full bg-critical-tint px-2 py-0.5 text-xs font-semibold text-critical ring-1 ring-inset ring-critical-edge">1 critical</span>
        </div>
        <div className="relative border-b border-line bg-critical-tint/50 py-4 pl-6 pr-5">
          <span className="absolute inset-y-0 left-0 w-1.5 bg-critical-solid" aria-hidden />
          <div className="flex flex-wrap items-center gap-2"><span className="rounded bg-ink px-1.5 py-0.5 text-2xs font-semibold text-white">Up next</span><PriorityBadge priority="CRITICAL" suggested /><StatusBadge status="AWAITING_VERIFICATION" /></div>
          <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2"><span className="num text-xl text-ink">RL-1042</span><span className="text-[15px] font-semibold text-ink-2">Accident · Tank Bund flyover</span></p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">Bus overturned near the flyover, several people injured and trapped.</p>
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <SlaMeter priority="CRITICAL" minutes={4} />
            <span className={cn(linkButtonClass({ size: 'lg', variant: 'urgent' }), 'pointer-events-none')}>Review and verify<ArrowRight className="h-4 w-4" aria-hidden /></span>
          </div>
        </div>
        {[['RL-1041', 'Fire · Charminar market', 'HIGH', 11], ['RL-1039', 'Flood · Jubilee Hills underpass', 'MEDIUM', 18]].map(([n, t, p, m]) => (
          <div key={n as string} className="flex items-center justify-between gap-3 border-b border-line py-3 pl-6 pr-4 last:border-0">
            <div className="min-w-0"><p className="truncate"><span className="num text-[15px] text-ink">{n}</span> <span className="text-[13px] font-medium text-ink-2">{t}</span></p><p className="mt-1.5"><PriorityBadge priority={p as 'HIGH'} /></p></div>
            <SlaMeter priority={p as 'HIGH'} minutes={m as number} compact />
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 text-xs text-rail-text">Sample data. Priority, wait against target and the next action, on one screen.</figcaption>
    </figure>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5"><BrandMark className="h-9 w-9" /><span className="font-display text-xl font-semibold text-ink">ResQLink</span></div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="inline-flex h-10 items-center rounded-ctl px-4 text-sm font-medium text-ink-2 hover:bg-surface-3">Sign in</Link>
          <Link to="/register" className={linkButtonClass()}>Get started</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-20 pt-10 lg:grid-cols-[1.02fr_1fr] lg:pt-16 [&>*]:min-w-0">
        <div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.04] text-ink sm:text-[52px] lg:text-[62px]">From emergency report to coordinated response.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">Citizens, dispatchers and responders work from one incident record: AI-assisted triage, a live map, and a dedicated Nexconn channel for every incident.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/register" className={linkButtonClass({ size: 'lg' })}>Report or respond</Link>
            <Link to="/login" className={linkButtonClass({ size: 'lg', variant: 'secondary' })}>Dispatcher sign in</Link>
          </div>
          <div className="mt-12 max-w-lg border-t border-line pt-6">
            <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-ink">
              {[['#D92D20', 'Critical'], ['#E8590C', 'High'], ['#C27C05', 'Medium'], ['#1B9A52', 'Low']].map(([c, n]) => (
                <li key={n} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} aria-hidden />{n}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-muted">Every incident carries a priority and a running wait timer against its target, so the next action is never a guess.</p>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 -z-0 rounded-[28px] bg-primary-soft/70" aria-hidden />
          <div className="relative"><QueuePreview /></div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-4">
        <section aria-labelledby="how">
          <h2 id="how" className="font-display text-3xl font-semibold text-ink">How it works</h2>
          <ol className="mt-8 grid border-t border-ink md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-b border-line py-6 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0">
                <div className="flex items-center gap-3"><span className="num flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs text-white" aria-hidden>{i + 1}</span><s.icon className="h-5 w-5 text-primary" aria-hidden /></div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20" aria-labelledby="roles">
          <h2 id="roles" className="font-display text-3xl font-semibold text-ink">Built for every role</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.name} className="bg-surface p-6">
                <r.icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-ink">{r.name}</h3>
                <ul className="mt-3 space-y-2.5 text-[15px] leading-snug text-muted">{r.points.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />{p}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-panel border border-line bg-surface p-8 shadow-card md:p-10" aria-labelledby="trust">
          <h2 id="trust" className="font-display text-3xl font-semibold text-ink">Human decisions, accountable by design</h2>
          <div className="mt-8 grid gap-8 text-[15px] leading-relaxed text-muted md:grid-cols-3">
            <p className="border-l-2 border-advisory pl-4"><strong className="mb-1 block text-ink">AI advises, people decide.</strong> AI never dispatches responders or diagnoses. Its output is schema-validated, labelled, and always reviewed by a dispatcher.</p>
            <p className="border-l-2 border-primary pl-4"><strong className="mb-1 block text-ink">Privacy first.</strong> Responder location is opt-in and deleted when sharing stops. Evidence photos are only visible to authorised users.</p>
            <p className="border-l-2 border-primary pl-4"><strong className="mb-1 block text-ink">Every action is recorded.</strong> Status changes, assignments and verifications are written to an audit trail administrators can review.</p>
          </div>
        </section>

        <p className="mt-10 rounded-panel border border-medium-edge bg-medium-tint p-4 text-sm text-medium">
          ResQLink is a hackathon prototype and does not replace official emergency services. In a real emergency, call your local emergency number (112 in India).
        </p>
      </main>
    </div>
  )
}
