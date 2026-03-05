import { useState } from 'react'
import { Lightbulb, X } from 'lucide-react'

interface HelpBannerProps {
  storageKey: string
  children: React.ReactNode
}

export function HelpBanner({ storageKey, children }: HelpBannerProps) {
  const fullKey = 'help_dismissed_' + storageKey
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(fullKey) === 'true')

  if (dismissed) return null

  return (
    <div className="relative bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-r-lg p-4 mb-6">
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200 pr-6">{children}</div>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(fullKey, 'true')
          setDismissed(true)
        }}
        className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
        aria-label="Fermer l'aide"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
