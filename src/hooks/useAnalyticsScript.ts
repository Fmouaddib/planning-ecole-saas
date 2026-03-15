import { useEffect } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'

const SCRIPT_ID = 'sa-analytics-script'

function injectGtagScript(trackingId: string) {
  // Validate tracking ID format to prevent injection
  if (!/^[A-Z0-9\-_]+$/i.test(trackingId)) return

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

export function useAnalyticsScript() {
  useEffect(() => {
    if (isDemoMode) return

    let cancelled = false

    const inject = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'analytics')
          .single()

        if (cancelled || !data?.value) return

        const settings = data.value as { enabled: boolean; tracking_id: string; custom_code?: string }
        if (!settings.enabled) return

        // Remove old injection
        document.getElementById(SCRIPT_ID)?.remove()

        // If custom_code is provided, only allow known safe analytics patterns
        // (no innerHTML to prevent XSS from super-admin input)
        if (settings.custom_code) {
          // Only allow custom_code that looks like a tracking ID (alphanumeric + dashes)
          // This prevents arbitrary script injection
          const safeIdPattern = /^[A-Z0-9\-_]+$/i
          if (safeIdPattern.test(settings.custom_code.trim())) {
            // Treat as a Google Analytics tracking ID
            injectGtagScript(settings.custom_code.trim())
          }
          // Otherwise, silently ignore unsafe custom_code
          return
        }

        if (settings.tracking_id) {
          injectGtagScript(settings.tracking_id)
        }
      } catch {
        // Silently fail — analytics is non-critical
      }
    }

    inject()

    return () => {
      cancelled = true
      document.getElementById(SCRIPT_ID)?.remove()
    }
  }, [])
}
