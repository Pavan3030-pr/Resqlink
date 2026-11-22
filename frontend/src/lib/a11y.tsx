import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Reader comfort settings. They are per-device (localStorage) and applied to <html>, so they work
 * on every page including sign-in, before anyone has an account. Text size scales the root font
 * size: all spacing and type in the app is rem-based, so the whole layout grows together.
 */
export type TextSize = 'normal' | 'large' | 'xlarge'

export interface A11ySettings {
  textSize: TextSize
  contrast: boolean
  /** Simple mode hides everything except the few actions a first-time or older user needs. */
  simple: boolean
}

export const TEXT_SIZES: { id: TextSize; label: string; percent: number }[] = [
  { id: 'normal', label: 'Normal', percent: 100 },
  { id: 'large', label: 'Large', percent: 125 },
  { id: 'xlarge', label: 'Extra large', percent: 150 },
]

export const DEFAULT_A11Y: A11ySettings = { textSize: 'normal', contrast: false, simple: false }
const KEY = 'resqlink.a11y.v1'

/** Defensive parse: storage can hold anything (old versions, hand edits). Unknown values fall back to defaults. */
export function parseA11y(raw: string | null): A11ySettings {
  if (!raw) return { ...DEFAULT_A11Y }
  try {
    const v = JSON.parse(raw) as Partial<A11ySettings> | null
    return {
      textSize: TEXT_SIZES.some((s) => s.id === v?.textSize) ? (v!.textSize as TextSize) : 'normal',
      contrast: v?.contrast === true,
      simple: v?.simple === true,
    }
  } catch {
    return { ...DEFAULT_A11Y }
  }
}

export const rootFontPercent = (s: TextSize) => TEXT_SIZES.find((x) => x.id === s)?.percent ?? 100

interface Ctx { settings: A11ySettings; update: (patch: Partial<A11ySettings>) => void; reset: () => void }
const A11yContext = createContext<Ctx>({ settings: DEFAULT_A11Y, update: () => {}, reset: () => {} })

function load(): A11ySettings {
  try { return parseA11y(localStorage.getItem(KEY)) } catch { return { ...DEFAULT_A11Y } }
}

export function A11yProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(load)
  useEffect(() => {
    const root = document.documentElement
    root.style.fontSize = `${rootFontPercent(settings.textSize)}%`
    root.dataset.contrast = settings.contrast ? 'high' : 'normal'
    root.dataset.simple = settings.simple ? 'on' : 'off'
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* private mode: setting still applies this session */ }
  }, [settings])
  const value = useMemo<Ctx>(() => ({
    settings,
    update: (patch) => setSettings((s) => ({ ...s, ...patch })),
    reset: () => setSettings({ ...DEFAULT_A11Y }),
  }), [settings])
  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>
}

export const useA11y = () => useContext(A11yContext)
