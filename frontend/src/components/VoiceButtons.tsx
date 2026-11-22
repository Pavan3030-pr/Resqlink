import { Mic, Square, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { appendTranscript, canListen, canSpeak, speak, startListening, stopSpeaking, type Listener } from '@/lib/voice'
import { cn } from '@/lib/utils'

/** Dictation into a text field. Renders nothing where the browser has no speech recognition, so typing always remains. */
export function MicButton({ value, onChange, onError, className, size = 'md' }: {
  value: string; onChange: (v: string) => void; onError?: (m: string) => void; className?: string; size?: 'md' | 'lg'
}) {
  const { lang } = useI18n()
  const [on, setOn] = useState(false)
  const [interim, setInterim] = useState('')
  const live = useRef<Listener | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  useEffect(() => () => live.current?.stop(), [])
  if (!canListen()) return null

  function toggle() {
    if (on) { live.current?.stop(); return }
    live.current = startListening(lang, {
      onText: (t) => onChange(appendTranscript(valueRef.current, t)),
      onInterim: setInterim,
      onError: (m) => onError?.(m),
      onEnd: () => { setOn(false); live.current = null },
    })
    setOn(live.current !== null)
  }
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'
  return (
    <>
      <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? 'Stop voice typing' : 'Start voice typing'}
        className={cn('relative flex shrink-0 items-center justify-center rounded-full border transition-colors', dim,
          on ? 'border-critical bg-critical text-white' : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-3', className)}>
        {on ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
        {on && <span className="rl-ping absolute inset-0 rounded-full border-2 border-critical" aria-hidden />}
      </button>
      <span className="sr-only" role="status">{on ? `Listening. ${interim}` : ''}</span>
    </>
  )
}

/** Reads text aloud in the app language. Hidden when speech output is unavailable. */
export function SpeakButton({ text, label = 'Read aloud', className }: { text: string; label?: string; className?: string }) {
  const { lang } = useI18n()
  const [on, setOn] = useState(false)
  useEffect(() => () => { if (on) stopSpeaking() }, [on])
  if (!canSpeak()) return null
  return (
    <button type="button" aria-pressed={on} aria-label={on ? 'Stop reading' : label}
      onClick={() => { if (on) { stopSpeaking(); setOn(false) } else { setOn(true); speak(text, lang, () => setOn(false)) } }}
      className={cn('inline-flex items-center gap-1.5 rounded-ctl px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft', className)}>
      {on ? <Square className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}{on ? 'Stop' : label}
    </button>
  )
}
