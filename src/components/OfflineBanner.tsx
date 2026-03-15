import { useState, useEffect, useRef } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true
      setShowReconnected(false)
    } else if (wasOffline.current) {
      // Just came back online
      wasOffline.current = false
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (isOnline && !showReconnected) return null

  if (showReconnected) {
    return (
      <div className="sticky top-0 z-50 bg-emerald-100 dark:bg-emerald-900/80 border-b border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-sm py-2 px-4 flex items-center justify-center gap-2">
        <Wifi className="w-4 h-4 shrink-0" />
        Connexion r&eacute;tablie
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-100 dark:bg-amber-900/80 border-b border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 text-sm py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4 shrink-0" />
      Vous &ecirc;tes hors ligne. Certaines fonctionnalit&eacute;s peuvent ne pas &ecirc;tre disponibles.
    </div>
  )
}
