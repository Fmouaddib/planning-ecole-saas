import { useEffect } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'

const SCRIPT_ID = 'sa-analytics-script'

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

        const code = settings.custom_code || (settings.tracking_id
          ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.tracking_id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.tracking_id}');</script>`
          : '')

        if (!code) return

        // Remove old injection
        document.getElementById(SCRIPT_ID)?.remove()

        // Inject into head
        const container = document.createElement('div')
        container.id = SCRIPT_ID
        container.innerHTML = code
        // Move scripts to head so they execute
        const scripts = container.querySelectorAll('script')
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script')
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value))
          if (oldScript.textContent) newScript.textContent = oldScript.textContent
          document.head.appendChild(newScript)
        })
        // Also append non-script elements (noscript, img pixels, etc.)
        const nonScripts = Array.from(container.children).filter(el => el.tagName !== 'SCRIPT')
        nonScripts.forEach(el => document.head.appendChild(el))
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
