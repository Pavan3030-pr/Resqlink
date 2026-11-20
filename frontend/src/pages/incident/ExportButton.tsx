import { useMutation } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { IncidentExport } from '@/lib/types'

export function ExportButton({ id, number }: { id: number; number: string }) {
  const toast = useToast()
  const run = useMutation({
    mutationFn: () => api.get<IncidentExport>(`/incidents/${id}/export`),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${number}-timeline.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.push('Timeline exported (the export is recorded in the audit log)', 'success')
    },
    onError: (e) => toast.push(e instanceof Error ? e.message : 'Export failed', 'error'),
  })
  return <Button size="sm" variant="secondary" onClick={() => run.mutate()} loading={run.isPending}>{run.isPending ? 'Exporting…' : <><Download className="h-4 w-4" aria-hidden />Export timeline</>}</Button>
}
