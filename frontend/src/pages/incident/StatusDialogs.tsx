import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/fields'
import { ErrorNote } from '@/components/ui/misc'
import type { IncidentActions } from './useIncidentActions'

const TITLE = { DUPLICATE: 'Mark as duplicate', REJECTED: 'Reject report', RESOLVED: 'Mark resolved', CLOSED: 'Close incident' } as const

export function StatusDialogs({ actions }: { actions: IncidentActions }) {
  const { dialog, setDialog, reason, setReason, dupOf, setDupOf, status } = actions
  const required = dialog === 'REJECTED' || dialog === 'RESOLVED'
  return (
    <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog ? TITLE[dialog] : ''}>
      <div className="space-y-4">
        {dialog === 'DUPLICATE' && (
          <Field label="Original incident ID" htmlFor="dupof" hint="Pick a match from Possible duplicates, or open the original incident and copy the number from its URL (…/incidents/ID).">
            <input id="dupof" type="number" min={1} className="h-10 w-full rounded-ctl border border-line-strong px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" value={dupOf} onChange={(e) => setDupOf(e.target.value ? Number(e.target.value) : '')} />
          </Field>
        )}
        <Field label={required ? 'Reason (required)' : 'Note (optional)'} htmlFor="reason"><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} /></Field>
        <ErrorNote error={status.error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant={dialog === 'REJECTED' ? 'danger' : 'primary'} loading={status.isPending} disabled={(required && !reason.trim()) || (dialog === 'DUPLICATE' && !dupOf)}
            onClick={() => dialog && status.mutate({ status: dialog, reason: reason.trim() || undefined, duplicateOfId: dialog === 'DUPLICATE' && dupOf ? Number(dupOf) : undefined })}>Confirm</Button>
        </div>
      </div>
    </Dialog>
  )
}
