import { useState, useEffect } from 'react'
import { Cookie, X } from 'lucide-react'

const CONSENT_KEY = 'cookie_consent'

export type CookieConsent = 'accepted' | 'refused' | null

export function getCookieConsent(): CookieConsent {
  const val = localStorage.getItem(CONSENT_KEY)
  if (val === 'accepted' || val === 'refused') return val
  return null
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === 'accepted'
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Show banner only if no consent recorded yet
    if (getCookieConsent() === null) {
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    // Dispatch event so useAnalyticsScript can react
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: 'accepted' }))
  }

  const handleRefuse = () => {
    localStorage.setItem(CONSENT_KEY, 'refused')
    setVisible(false)
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: 'refused' }))
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 transition-transform duration-500"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
    >
      <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
            <Cookie size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Nous respectons votre vie privée
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Ce site utilise des cookies techniques nécessaires à son fonctionnement ainsi que des cookies
              de mesure d'audience (Google Analytics) pour améliorer votre expérience.
              Vous pouvez accepter ou refuser les cookies analytiques.{' '}
              <a href="#/privacy" className="text-primary-600 dark:text-primary-400 underline hover:no-underline">
                Politique de confidentialité
              </a>
            </p>
          </div>
          <button
            onClick={handleRefuse}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0 sm:hidden"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={handleRefuse}
            className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
