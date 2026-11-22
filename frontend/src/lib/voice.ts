import type { Lang } from './i18n'

/** Web Speech API wrappers. Everything degrades to "button hidden" where the browser lacks support. */

export const SPEECH_LANG: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }

// The Web Speech types are not in lib.dom for every TS version, so we describe only what we use.
interface RecognitionResult { readonly isFinal: boolean; readonly 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = () => recognitionCtor() !== null
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

/** Joins dictated text onto what is already typed, with exactly one space and no doubled punctuation spaces. */
export function appendTranscript(existing: string, transcript: string): string {
  const t = transcript.replace(/\s+/g, ' ').trim()
  if (!t) return existing
  const base = existing.replace(/\s+$/, '')
  return base ? `${base} ${t}` : t
}

/** Human wording for recognition failures, so the person knows what to do next. */
export function listenErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed': return 'Microphone access is blocked. Allow it in your browser settings, or type instead.'
    case 'no-speech': return 'I did not hear anything. Tap the microphone and try again.'
    case 'audio-capture': return 'No microphone was found on this device.'
    case 'network': return 'Voice typing needs an internet connection. You can type instead.'
    case 'aborted': return ''
    default: return 'Voice typing stopped. Tap the microphone to try again.'
  }
}

export interface Listener { stop: () => void }

/** Starts dictation. `onText` receives the final transcript of each phrase. Returns null when unsupported. */
export function startListening(lang: Lang, h: { onText: (t: string) => void; onInterim?: (t: string) => void; onError: (m: string) => void; onEnd: () => void }): Listener | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = SPEECH_LANG[lang]
  rec.continuous = true
  rec.interimResults = true
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) h.onText(r[0].transcript)
      else interim += r[0].transcript
    }
    h.onInterim?.(interim)
  }
  rec.onerror = (e) => { const m = listenErrorMessage(e.error); if (m) h.onError(m) }
  rec.onend = () => { h.onInterim?.(''); h.onEnd() }
  try { rec.start() } catch { h.onError('Voice typing could not start. Tap the microphone to try again.'); return null }
  return { stop: () => { try { rec.stop() } catch { /* already stopped */ } } }
}

/** Strips things that sound wrong when read aloud (markdown marks, URLs, repeated whitespace). */
export function speakableText(s: string): string {
  return s.replace(/https?:\/\/\S+/g, 'link').replace(/[*_`#>]+/g, '').replace(/\s+/g, ' ').trim()
}

export function speak(text: string, lang: Lang, onEnd?: () => void): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(speakableText(text))
  u.lang = SPEECH_LANG[lang]
  u.rate = 0.9
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void { if (canSpeak()) window.speechSynthesis.cancel() }
