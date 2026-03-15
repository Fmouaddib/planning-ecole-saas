import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed-at'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const ts = parseInt(raw, 10)
  if (isNaN(ts)) return false
  return Date.now() - ts < DISMISS_DURATION_MS
}

function isIosDevice(): boolean {
  const ua = navigator.userAgent
  return /iP(hone|od|ad)/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(isDismissed)
  const [isIos] = useState(() => isIosDevice())

  useEffect(() => {
    setIsInstalled(isInStandaloneMode())

    const mq = window.matchMedia('(display-mode: standalone)')
    const onChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches)
    mq.addEventListener('change', onChange)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === 'accepted'
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }, [])

  // Show install banner if:
  // - Not already installed
  // - Not dismissed in the last 7 days
  // - Either the native prompt is available (Android/desktop) OR it's iOS (show manual instructions)
  const canShowPrompt = !isInstalled && !dismissed
  const isInstallable = canShowPrompt && !!deferredPrompt
  const showIosInstructions = canShowPrompt && isIos && !deferredPrompt

  return {
    isInstallable,
    isInstalled,
    isIos,
    showIosInstructions,
    promptInstall,
    dismiss,
  }
}
