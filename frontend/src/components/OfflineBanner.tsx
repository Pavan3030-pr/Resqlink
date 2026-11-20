import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="rl-fade mb-5 flex items-center gap-2.5 rounded-panel border border-medium-edge bg-medium-tint px-4 py-2.5 text-[13px] text-medium">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden /><p><strong className="font-semibold">You are offline.</strong> Live data may be out of date; citizen reports are saved and sent when the connection returns.</p>
    </div>
  )
}
