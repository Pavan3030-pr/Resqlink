import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Shown while the device has no connection, so people know what still works. */
export function ConnectionBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])
  if (online) return null
  return (
    <div role="status" className="mb-4 flex items-start gap-2.5 rounded-panel border border-medium-edge bg-medium-tint px-4 py-3 text-sm text-medium">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p><strong>You are offline.</strong> Text reports are saved on this device and sent when you are back online. Photos and chat need a connection. The <a className="font-semibold underline" href="/emergency">emergency help page</a> still works.</p>
    </div>
  )
}
