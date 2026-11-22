import { ArrowLeft, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SpeakButton } from '@/components/VoiceButtons'
import { EMERGENCY_NUMBERS, FIRST_AID } from '@/lib/emergency'

/** Public and bundled with the app shell: usable before sign-in and with no connection. */
export default function EmergencyHelp() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" aria-hidden />ResQLink</Link>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 pb-16">
        <h1 className="font-display text-3xl font-semibold text-ink">Emergency help</h1>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-2">In danger, call first. This page works without internet; the phone numbers need a mobile signal.</p>
        <section aria-labelledby="nums" className="mt-8">
          <h2 id="nums" className="font-display text-xl font-semibold text-ink">Call now</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {EMERGENCY_NUMBERS.map((n) => (
              <li key={n.number}>
                <a href={`tel:${n.number}`} className="flex min-h-[4.5rem] items-center gap-4 rounded-panel border border-line-strong bg-surface p-4 shadow-card hover:bg-surface-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-critical-tint text-critical"><Phone className="h-5 w-5" aria-hidden /></span>
                  <span><span className="num block text-2xl text-ink">{n.number}</span><span className="block text-[15px] font-medium text-ink-2">{n.label}</span>{n.note && <span className="block text-xs text-muted">{n.note}</span>}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="aid" className="mt-10">
          <h2 id="aid" className="font-display text-xl font-semibold text-ink">First steps while you wait</h2>
          <p className="mt-1 text-sm text-muted">General guidance only. A trained responder or doctor always comes first.</p>
          <div className="mt-4 space-y-3">
            {FIRST_AID.map((c) => (
              <details key={c.id} className="group rounded-panel border border-line bg-surface p-4 shadow-card">
                <summary className="cursor-pointer text-lg font-semibold text-ink">{c.title}</summary>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-[16px] leading-relaxed text-ink-2">{c.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                <SpeakButton className="mt-2 -ml-2" label="Read these steps aloud" text={`${c.title}. ${c.steps.join(' ')}`} />
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
