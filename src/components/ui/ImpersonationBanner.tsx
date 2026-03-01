import { useState, useEffect } from 'react'
import { Eye, ArrowLeft } from 'lucide-react'
import { getImpersonation, clearImpersonation, IMPERSONATION_EVENT } from '@/utils/impersonation'

export function ImpersonationBanner() {
  const [data, setData] = useState(getImpersonation)

  useEffect(() => {
    const update = () => setData(getImpersonation())
    window.addEventListener(IMPERSONATION_EVENT, update)
    return () => window.removeEventListener(IMPERSONATION_EVENT, update)
  }, [])

  if (!data) return null

  const handleBack = () => {
    clearImpersonation()
    window.location.hash = '#/super-admin'
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-amber-100 dark:bg-amber-900/80 border-b border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 text-sm">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 shrink-0" />
        <span>
          Vue en tant que : <strong>{data.centerName}</strong>
        </span>
      </div>
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour super-admin
      </button>
    </div>
  )
}
