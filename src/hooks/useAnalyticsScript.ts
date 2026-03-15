import { useEffect } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { hasAnalyticsConsent } from '@/components/CookieBanner'

const SCRIPT_ID = 'sa-analytics-script'
const DEFAULT_TRACKING_ID = 'G-7RFZEEHTCC'

function injectGtagScript(trackingId: string) {
  // Validate tracking ID format to prevent injection
  if (!/^[A-Z0-9\-_]+$/i.test(trackingId)) return

  // Don't inject twice
  if (document.getElementById(SCRIPT_ID)) return

  const container = document.createElement('div')
  container.id = SCRIPT_ID

  const gtagLoader = document.createElement('script')
  gtagLoader.async = true
  gtagLoader.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`
  document.head.appendChild(gtagLoader)

  const gtagInit = document.createElement('script')
  gtagInit.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${trackingId}');`
  document.head.appendChild(gtagInit)

  document.head.appendChild(container)
}

function removeAnalytics() {
  document.getElementById(SCRIPT_ID)?.remove()
  // Remove gtag scripts
  document.querySelectorAll('script[src*="googletagmanager.com"]').forEach(el => el.remove())
}

export function useAnalyticsScript() {
  useEffect(() => {
    if (isDemoMode) return

    let cancelled = false

    const inject = async () => {
      // Check cookie consent first
      if (!hasAnalyticsConsent()) return

      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'analytics')
          .single()

        if (cancelled) return

        if (data?.value) {
          const settings = data.value as { enabled: boolean; tracking_id: string; custom_code?: string }
          if (!settings.enabled) return

          if (settings.custom_code) {
            const safeIdPattern = /^[A-Z0-9\-_]+$/i
            if (safeIdPattern.test(settings.custom_code.trim())) {
              injectGtagScript(settings.custom_code.trim())
            }
            return
          }

          if (settings.tracking_id) {
            injectGtagScript(settings.tracking_id)
            return
          }
        }

        // Fallback: use default tracking ID if platform_settings not available
        if (!cancelled) {
          injectGtagScript(DEFAULT_TRACKING_ID)
        }
      } catch {
        // Fallback to default tracking ID on error
        if (!cancelled && hasAnalyticsConsent()) {
          injectGtagScript(DEFAULT_TRACKING_ID)
        }
      }
    }

    inject()

    // Listen for consent changes
    const handleConsentChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === 'accepted') {
        inject()
      } else {
        removeAnalytics()
      }
    }
    window.addEventListener('cookie-consent-changed', handleConsentChange)

    return () => {
      cancelled = true
      window.removeEventListener('cookie-consent-changed', handleConsentChange)
    }
  }, [])
}
