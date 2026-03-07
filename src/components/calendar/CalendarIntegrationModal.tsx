import { useState, useEffect } from 'react'
import { X, Copy, Check, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import { useCalendarFeed } from '@/hooks/useCalendarFeed'
import toast from 'react-hot-toast'

interface CalendarIntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  // For subject/class scoped feeds (admin)
  scope?: { type: 'subject' | 'class'; id: string; name: string }
}

type Provider = 'google' | 'outlook' | 'apple' | 'other'

export function CalendarIntegrationModal({ isOpen, onClose, scope }: CalendarIntegrationModalProps) {
  const {
    tokens,
    getFeedUrl,
    getGoogleCalendarUrl,
    getWebcalUrl,
    getOrCreatePersonalToken,
    createSubjectToken,
    createClassToken,
    revokeToken,
  } = useCalendarFeed()

  const [feedToken, setFeedToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSelectedProvider(null)
      setCopied(false)
      return
    }

    const init = async () => {
      setLoading(true)
      let token: string | null = null

      if (scope?.type === 'subject') {
        const existing = tokens.find(t => t.scope === `subject:${scope.id}` && t.is_active)
        token = existing?.token || await createSubjectToken(scope.id, scope.name)
      } else if (scope?.type === 'class') {
        const existing = tokens.find(t => t.scope === `class:${scope.id}` && t.is_active)
        token = existing?.token || await createClassToken(scope.id, scope.name)
      } else {
        token = await getOrCreatePersonalToken()
      }

      setFeedToken(token)
      setLoading(false)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scope?.id])

  if (!isOpen) return null

  const feedUrl = feedToken ? getFeedUrl(feedToken) : ''
  const webcalUrl = feedToken ? getWebcalUrl(feedToken) : ''
  const googleUrl = feedToken ? getGoogleCalendarUrl(feedToken) : ''
  const title = scope ? `Planning — ${scope.name}` : 'Intégrer mon planning'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      toast.success('Lien copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  const handleRevoke = async () => {
    const tokenObj = tokens.find(t => t.token === feedToken)
    if (tokenObj) {
      await revokeToken(tokenObj.id)
      setFeedToken(null)
      toast.success('Lien révoqué')
      onClose()
    }
  }

  const providers: { id: Provider; name: string; icon: string; color: string }[] = [
    { id: 'google', name: 'Google Calendar', icon: '📅', color: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30' },
    { id: 'outlook', name: 'Outlook / Hotmail', icon: '📧', color: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30' },
    { id: 'apple', name: 'Apple Calendar', icon: '🍎', color: 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800' },
    { id: 'other', name: 'Autre (lien iCal)', icon: '🔗', color: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' },
  ]

  const renderSteps = () => {
    if (!selectedProvider || !feedToken) return null

    switch (selectedProvider) {
      case 'google':
        return (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Cliquez sur le bouton ci-dessous pour ajouter automatiquement votre planning à Google Calendar.
            </p>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={16} />
              Ajouter à Google Calendar
            </a>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">Méthode manuelle :</p>
              <ol className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 list-decimal list-inside">
                <li>Ouvrez <strong>Google Calendar</strong></li>
                <li>Cliquez sur <strong>+</strong> à côté de "Autres agendas"</li>
                <li>Sélectionnez <strong>"À partir de l'URL"</strong></li>
                <li>Collez le lien ci-dessous et cliquez <strong>"Ajouter l'agenda"</strong></li>
              </ol>
            </div>
          </div>
        )
      case 'outlook':
        return (
          <div className="space-y-4">
            <a
              href={webcalUrl}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 transition-colors"
            >
              <ExternalLink size={16} />
              Ouvrir dans Outlook
            </a>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">Outlook Web (outlook.com) :</p>
              <ol className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 list-decimal list-inside">
                <li>Ouvrez <strong>Outlook.com</strong> → Calendrier</li>
                <li>Cliquez <strong>"Ajouter un calendrier"</strong></li>
                <li>Choisissez <strong>"S'abonner à partir du web"</strong></li>
                <li>Collez le lien ci-dessous, nommez-le et cliquez <strong>"Importer"</strong></li>
              </ol>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mt-3 mb-2">Outlook Desktop :</p>
              <ol className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 list-decimal list-inside">
                <li>Allez dans <strong>Fichier → Paramètres du compte → Calendriers Internet</strong></li>
                <li>Cliquez <strong>"Nouveau"</strong></li>
                <li>Collez le lien ci-dessous et validez</li>
              </ol>
            </div>
          </div>
        )
      case 'apple':
        return (
          <div className="space-y-4">
            <a
              href={webcalUrl}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-900 dark:hover:bg-neutral-300 transition-colors"
            >
              <ExternalLink size={16} />
              Ouvrir dans Apple Calendar
            </a>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">Méthode manuelle (Mac) :</p>
              <ol className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 list-decimal list-inside">
                <li>Ouvrez <strong>Calendrier</strong></li>
                <li>Menu <strong>Fichier → Nouvel abonnement</strong></li>
                <li>Collez le lien ci-dessous</li>
                <li>Configurez la fréquence de mise à jour et cliquez <strong>"S'abonner"</strong></li>
              </ol>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mt-3 mb-2">iPhone / iPad :</p>
              <ol className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 list-decimal list-inside">
                <li><strong>Réglages → Calendrier → Comptes → Ajouter un compte</strong></li>
                <li>Sélectionnez <strong>"Autre"</strong> → <strong>"Ajouter un calendrier avec abonnement"</strong></li>
                <li>Collez le lien ci-dessous</li>
              </ol>
            </div>
          </div>
        )
      case 'other':
        return (
          <div className="space-y-4">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Copiez le lien ci-dessous et collez-le dans n'importe quelle application de calendrier
                qui supporte les flux <strong>iCal / ICS</strong> (Thunderbird, Samsung Calendar, etc.).
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={18} className="text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={20} className="animate-spin text-primary-500" />
              <span className="ml-2 text-sm text-neutral-500">Génération du lien...</span>
            </div>
          ) : !feedToken ? (
            <p className="text-sm text-error-600 text-center py-6">Erreur lors de la création du lien</p>
          ) : (
            <>
              {/* Provider selector */}
              {!selectedProvider ? (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Choisissez votre application de calendrier pour recevoir vos séances en temps réel.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {providers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProvider(p.id)}
                        className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all hover:shadow-md ${p.color}`}
                      >
                        <span className="text-2xl">{p.icon}</span>
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedProvider(null)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    &larr; Changer d'application
                  </button>

                  {/* Steps */}
                  {renderSteps()}

                  {/* Feed URL */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                      Lien d'abonnement iCal
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={feedUrl}
                        className="flex-1 text-xs px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 font-mono select-all"
                        onFocus={e => e.target.select()}
                      />
                      <button
                        onClick={handleCopy}
                        className="shrink-0 p-2.5 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
                        title="Copier"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Info & revoke */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-xs text-neutral-400">
                  Ce lien se met à jour automatiquement.
                  <br />Ne le partagez pas — il donne accès à votre planning.
                </p>
                <button
                  onClick={handleRevoke}
                  className="shrink-0 flex items-center gap-1 text-xs text-error-600 hover:text-error-700 font-medium"
                  title="Révoquer ce lien"
                >
                  <Trash2 size={12} />
                  Révoquer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
