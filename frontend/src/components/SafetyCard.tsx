import { ShieldCheck } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { safetyGuidance } from '@/lib/safety'
import type { Category } from '@/lib/types'

/** Calm, category-specific safety steps for the reporter while help is on the way. */
export function SafetyCard({ category }: { category: Category }) {
  const { lang } = useI18n()
  const g = safetyGuidance(category, lang)
  return (
    <Card tone="info">
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden />{g.heading}</CardTitle></CardHeader>
      <CardBody>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">{g.tips.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="mt-3 text-xs text-muted">{g.note}</p>
      </CardBody>
    </Card>
  )
}
