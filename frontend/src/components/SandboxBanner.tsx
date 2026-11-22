import { FlaskConical } from 'lucide-react'
import { isSandbox, leaveSandbox } from '@/lib/sandbox'

/** Always visible while the sandbox is on, so nobody mistakes simulated data for a live emergency system. */
export function SandboxBanner() {
  if (!isSandbox()) return null
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-panel border border-advisory-edge bg-advisory-tint px-4 py-3 text-sm text-ink">
      <p className="flex items-start gap-2"><FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-advisory" aria-hidden /><span><strong>Sandbox demo.</strong> Simulated data in your browser. Not connected to the live server, Nexconn chat or Gemini. It resets when you reload.</span></p>
      <button type="button" onClick={leaveSandbox} className="h-9 rounded-ctl border border-line-strong bg-surface px-3 font-medium hover:bg-surface-2">Exit sandbox</button>
    </div>
  )
}
