import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { Video, CheckCircle, XCircle, Eye, EyeOff, ChevronDown, ExternalLink, Info } from 'lucide-react'
import { CenterSettings } from '@/hooks/useCenterSettings'
import { useVisioMeetings } from '@/hooks/useVisioMeetings'

interface VisioSettingsSectionProps {
  settings: CenterSettings
  onUpdateSettings: (patch: Partial<CenterSettings>) => Promise<void>
}

type VisioProvider = 'zoom' | 'teams' | 'meet'

const PROVIDER_OPTIONS = [
  { value: '', label: 'Aucun' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'meet', label: 'Google Meet' },
]

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-4">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
        {description && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-neutral-300'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  )
}

function GuideSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-left"
      >
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-500" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{title}</span>
        </div>
        <ChevronDown size={16} className={`text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 text-sm text-neutral-700 dark:text-neutral-300 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function StepItem({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
        {number}
      </div>
      <div className="flex-1 pt-0.5">{children}</div>
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 underline">
      {children}
      <ExternalLink size={12} />
    </a>
  )
}

function ZoomGuide() {
  return (
    <GuideSection title="Guide de configuration Zoom (Server-to-Server OAuth)">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Ce guide vous explique comment créer une application Zoom Server-to-Server pour générer automatiquement des liens de réunion.
      </p>

      <StepItem number={1}>
        <p>Rendez-vous sur <ExtLink href="https://marketplace.zoom.us">marketplace.zoom.us</ExtLink> et connectez-vous avec votre compte Zoom administrateur.</p>
      </StepItem>

      <StepItem number={2}>
        <p>Cliquez sur <strong>Develop → Build App</strong> dans le menu en haut à droite.</p>
      </StepItem>

      <StepItem number={3}>
        <p>Choisissez le type <strong>Server-to-Server OAuth</strong> et cliquez sur <strong>Create</strong>.</p>
        <p className="text-xs text-neutral-400 mt-1">Ce type d'app ne nécessite pas d'interaction utilisateur, idéal pour la création automatique de réunions.</p>
      </StepItem>

      <StepItem number={4}>
        <p>Donnez un nom à votre app (ex : <code className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">AntiPlanning Integration</code>).</p>
      </StepItem>

      <StepItem number={5}>
        <p>Dans l'onglet <strong>App Credentials</strong>, copiez :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li><strong>Account ID</strong> → collez dans le champ « Account ID » ci-dessous</li>
          <li><strong>Client ID</strong> → collez dans le champ « Client ID »</li>
          <li><strong>Client Secret</strong> → collez dans le champ « Client Secret »</li>
        </ul>
      </StepItem>

      <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-xs text-neutral-600 dark:text-neutral-400">
        <strong>Note :</strong> Vous verrez aussi un <strong>Secret Token</strong> et un <strong>Verification Token</strong> dans l'onglet « Feature ». Ces tokens servent uniquement aux <em>webhooks</em> Zoom (notifications entrantes) et ne sont <strong>pas nécessaires</strong> pour AntiPlanning. Seuls les 3 identifiants ci-dessus sont requis.
      </div>

      <StepItem number={6}>
        <p>Dans l'onglet <strong>Scopes</strong>, ajoutez les permissions suivantes :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">meeting:write:admin</code> — Créer des réunions</li>
          <li><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">meeting:read:admin</code> — Lire les réunions</li>
          <li><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">user:read:admin</code> — Lire les utilisateurs</li>
        </ul>
      </StepItem>

      <StepItem number={7}>
        <p>Cliquez sur <strong>Activate</strong> pour activer l'application.</p>
      </StepItem>

      <StepItem number={8}>
        <p>Saisissez l'<strong>email de l'utilisateur Zoom</strong> qui sera l'organisateur des réunions (généralement votre email admin Zoom).</p>
      </StepItem>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
        <strong>Important :</strong> L'utilisateur Zoom doit avoir une licence Pro ou supérieure pour créer des réunions.
      </div>
    </GuideSection>
  )
}

function TeamsGuide() {
  return (
    <GuideSection title="Guide de configuration Microsoft Teams (Azure AD)">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Ce guide vous explique comment enregistrer une application Azure AD pour créer des réunions Teams automatiquement.
      </p>

      <StepItem number={1}>
        <p>Rendez-vous sur <ExtLink href="https://portal.azure.com">portal.azure.com</ExtLink> et connectez-vous avec votre compte administrateur Microsoft 365.</p>
      </StepItem>

      <StepItem number={2}>
        <p>Allez dans <strong>Azure Active Directory → Inscriptions d'applications → Nouvelle inscription</strong>.</p>
      </StepItem>

      <StepItem number={3}>
        <p>Remplissez les informations :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li><strong>Nom</strong> : <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">AntiPlanning Teams</code></li>
          <li><strong>Types de comptes pris en charge</strong> : Comptes dans cet annuaire uniquement</li>
        </ul>
        <p className="text-xs mt-1">Cliquez sur <strong>Inscrire</strong>.</p>
      </StepItem>

      <StepItem number={4}>
        <p>Sur la page de l'application, notez :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li><strong>ID d'application (client)</strong> → collez dans « Client ID »</li>
          <li><strong>ID de l'annuaire (locataire)</strong> → collez dans « Tenant ID »</li>
        </ul>
      </StepItem>

      <StepItem number={5}>
        <p>Allez dans <strong>Certificats & secrets → Nouveau secret client</strong>.</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li>Ajoutez une description (ex : <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">AntiPlanning</code>)</li>
          <li>Choisissez une durée (24 mois recommandé)</li>
          <li>Copiez immédiatement la <strong>Valeur</strong> du secret → collez dans « Client Secret »</li>
        </ul>
        <p className="text-xs text-neutral-400 mt-1.5">
          <strong>Attention :</strong> Azure affiche aussi un « ID du secret » — ce n'est <strong>pas</strong> le Client Secret. Copiez bien la colonne <strong>Valeur</strong>, visible uniquement juste après la création.
        </p>
      </StepItem>

      <StepItem number={6}>
        <p>Allez dans <strong>Autorisations de l'API → Ajouter une autorisation → Microsoft Graph → Autorisations d'application</strong>.</p>
        <p className="text-xs mt-1">Ajoutez :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li><code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">OnlineMeetings.ReadWrite.All</code></li>
        </ul>
        <p className="text-xs mt-1">Puis cliquez sur <strong>Accorder le consentement de l'administrateur</strong>.</p>
      </StepItem>

      <StepItem number={7}>
        <p>Récupérez l'<strong>ID utilisateur Azure AD</strong> de l'organisateur des réunions :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li>Allez dans <strong>Azure AD → Utilisateurs</strong></li>
          <li>Cliquez sur l'utilisateur souhaité</li>
          <li>Copiez l'<strong>ID d'objet</strong> → collez dans « User ID »</li>
        </ul>
      </StepItem>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
        <strong>Important :</strong> L'utilisateur organisateur doit avoir une licence Microsoft Teams (incluse dans Microsoft 365 Business Basic ou supérieur).
      </div>
    </GuideSection>
  )
}

function MeetGuide() {
  return (
    <GuideSection title="Guide de configuration Google Meet (Service Account)">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Ce guide vous explique comment créer un Service Account Google pour générer des réunions Meet via Google Calendar.
      </p>

      <StepItem number={1}>
        <p>Rendez-vous sur <ExtLink href="https://console.cloud.google.com">console.cloud.google.com</ExtLink> et connectez-vous avec votre compte Google Workspace admin.</p>
      </StepItem>

      <StepItem number={2}>
        <p>Créez un nouveau projet ou sélectionnez un projet existant.</p>
      </StepItem>

      <StepItem number={3}>
        <p>Activez l'API :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li>Allez dans <strong>APIs & Services → Bibliothèque</strong></li>
          <li>Recherchez et activez <strong>Google Calendar API</strong></li>
        </ul>
      </StepItem>

      <StepItem number={4}>
        <p>Créez un Service Account :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li>Allez dans <strong>APIs & Services → Identifiants → Créer des identifiants → Compte de service</strong></li>
          <li>Donnez un nom (ex : <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">antiplanning-meet</code>)</li>
          <li>Notez l'<strong>email du compte de service</strong> (ex : <code className="text-xs">xxx@project.iam.gserviceaccount.com</code>)</li>
        </ul>
      </StepItem>

      <StepItem number={5}>
        <p>Créez une clé privée :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li>Cliquez sur le compte de service → onglet <strong>Clés</strong></li>
          <li>Cliquez sur <strong>Ajouter une clé → Créer une clé → JSON</strong></li>
          <li>Ouvrez le fichier JSON téléchargé et copiez le contenu du champ <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">"private_key"</code></li>
          <li>Collez-le dans le champ « Clé privée (PEM) » ci-dessous</li>
        </ul>
      </StepItem>

      <StepItem number={6}>
        <p>Configurez la <strong>délégation domain-wide</strong> :</p>
        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
          <li>Allez dans <ExtLink href="https://admin.google.com">admin.google.com</ExtLink></li>
          <li>Allez dans <strong>Sécurité → Contrôle des accès et des données → Contrôles d'API → Gérer la délégation à l'échelle du domaine</strong></li>
          <li>Cliquez sur <strong>Ajouter</strong></li>
          <li><strong>ID client</strong> : l'ID unique du Service Account (trouvable dans la console GCP)</li>
          <li><strong>Portées OAuth</strong> : <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">https://www.googleapis.com/auth/calendar</code></li>
        </ul>
      </StepItem>

      <StepItem number={7}>
        <p>Saisissez l'<strong>email à impersoner</strong> : l'adresse email Google Workspace de l'utilisateur dont le calendrier sera utilisé pour créer les réunions Meet.</p>
      </StepItem>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
        <strong>Important :</strong> Google Meet nécessite un compte Google Workspace (les comptes Gmail personnels ne supportent pas la délégation domain-wide). L'utilisateur impersoné doit avoir une licence Google Workspace avec Meet.
      </div>
    </GuideSection>
  )
}

export default function VisioSettingsSection({ settings, onUpdateSettings }: VisioSettingsSectionProps) {
  const { testConnection } = useVisioMeetings()

  const [showSecret, setShowSecret] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testPhase, setTestPhase] = useState<'idle' | 'saving' | 'testing'>('idle')

  const [zoomAccountId, setZoomAccountId] = useState(settings.zoom_account_id || '')
  const [zoomClientId, setZoomClientId] = useState(settings.zoom_client_id || '')
  const [zoomClientSecret, setZoomClientSecret] = useState(settings.zoom_client_secret || '')
  const [zoomUserEmail, setZoomUserEmail] = useState(settings.zoom_user_email || '')

  const [teamsTenantId, setTeamsTenantId] = useState(settings.teams_tenant_id || '')
  const [teamsClientId, setTeamsClientId] = useState(settings.teams_client_id || '')
  const [teamsClientSecret, setTeamsClientSecret] = useState(settings.teams_client_secret || '')
  const [teamsUserId, setTeamsUserId] = useState(settings.teams_user_id || '')

  const [meetClientEmail, setMeetClientEmail] = useState(settings.meet_client_email || '')
  const [meetPrivateKey, setMeetPrivateKey] = useState(settings.meet_private_key || '')
  const [meetUserEmail, setMeetUserEmail] = useState(settings.meet_user_email || '')

  const provider = settings.visio_provider || ''

  const handleSave = async () => {
    const patch: Partial<CenterSettings> = {}
    if (provider === 'zoom') {
      patch.zoom_account_id = zoomAccountId
      patch.zoom_client_id = zoomClientId
      patch.zoom_client_secret = zoomClientSecret
      patch.zoom_user_email = zoomUserEmail
    } else if (provider === 'teams') {
      patch.teams_tenant_id = teamsTenantId
      patch.teams_client_id = teamsClientId
      patch.teams_client_secret = teamsClientSecret
      patch.teams_user_id = teamsUserId
    } else if (provider === 'meet') {
      patch.meet_client_email = meetClientEmail
      patch.meet_private_key = meetPrivateKey
      patch.meet_user_email = meetUserEmail
    }
    await onUpdateSettings(patch)
  }

  const handleTest = async () => {
    setTestResult(null)
    setTestPhase('saving')
    try {
      await handleSave()
      setTestPhase('testing')
      const result = await testConnection(provider || undefined)
      setTestResult(result)
    } catch (e) {
      setTestResult({ success: false, message: `Erreur lors de la sauvegarde : ${(e as Error).message}` })
    } finally {
      setTestPhase('idle')
    }
  }

  const canTest = (() => {
    switch (provider) {
      case 'zoom': return zoomAccountId && zoomClientId && zoomClientSecret && zoomUserEmail
      case 'teams': return teamsTenantId && teamsClientId && teamsClientSecret && teamsUserId
      case 'meet': return meetClientEmail && meetPrivateKey && meetUserEmail
      default: return false
    }
  })()

  const handleProviderChange = (newProvider: string) => {
    setTestResult(null)
    onUpdateSettings({ visio_provider: (newProvider || undefined) as VisioProvider | undefined })
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Video size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Intégration Visioconférence
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Créez automatiquement des réunions pour vos séances en ligne
          </p>
        </div>
      </div>

      {/* Provider selector */}
      <div className="max-w-lg mb-6">
        <Select
          label="Fournisseur"
          options={PROVIDER_OPTIONS}
          value={provider}
          onChange={e => handleProviderChange(e.target.value)}
        />
      </div>

      {/* Setup guide */}
      {provider === 'zoom' && (
        <div className="mb-6">
          <ZoomGuide />
        </div>
      )}
      {provider === 'teams' && (
        <div className="mb-6">
          <TeamsGuide />
        </div>
      )}
      {provider === 'meet' && (
        <div className="mb-6">
          <MeetGuide />
        </div>
      )}

      {/* Zoom form */}
      {provider === 'zoom' && (
        <div className="space-y-4 max-w-lg mb-6">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Identifiants Zoom
          </h4>
          <Input label="Account ID" placeholder="Votre Account ID Zoom" value={zoomAccountId} onChange={e => setZoomAccountId(e.target.value)} />
          <Input label="Client ID" placeholder="Client ID de l'app S2S" value={zoomClientId} onChange={e => setZoomClientId(e.target.value)} />
          <div className="relative">
            <Input label="Client Secret" type={showSecret ? 'text' : 'password'} placeholder="Client Secret de l'app S2S" value={zoomClientSecret} onChange={e => setZoomClientSecret(e.target.value)} />
            <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input label="Email utilisateur Zoom" placeholder="admin@votre-domaine.com" value={zoomUserEmail} onChange={e => setZoomUserEmail(e.target.value)} />
        </div>
      )}

      {/* Teams form */}
      {provider === 'teams' && (
        <div className="space-y-4 max-w-lg mb-6">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Identifiants Azure AD
          </h4>
          <Input label="Tenant ID" placeholder="ID du tenant Azure AD" value={teamsTenantId} onChange={e => setTeamsTenantId(e.target.value)} />
          <Input label="Client ID" placeholder="ID de l'application Azure" value={teamsClientId} onChange={e => setTeamsClientId(e.target.value)} />
          <div className="relative">
            <Input label="Client Secret" type={showSecret ? 'text' : 'password'} placeholder="Secret de l'application Azure" value={teamsClientSecret} onChange={e => setTeamsClientSecret(e.target.value)} />
            <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input label="User ID (Azure AD)" placeholder="ID de l'utilisateur organisateur" value={teamsUserId} onChange={e => setTeamsUserId(e.target.value)} />
        </div>
      )}

      {/* Meet form */}
      {provider === 'meet' && (
        <div className="space-y-4 max-w-lg mb-6">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Identifiants Google Service Account
          </h4>
          <Input label="Email du Service Account" placeholder="xxx@project.iam.gserviceaccount.com" value={meetClientEmail} onChange={e => setMeetClientEmail(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Clé privée (PEM)
            </label>
            <textarea
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 font-mono resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
              value={meetPrivateKey}
              onChange={e => setMeetPrivateKey(e.target.value)}
            />
          </div>
          <Input label="Email à impersoner" placeholder="admin@votre-domaine.com" value={meetUserEmail} onChange={e => setMeetUserEmail(e.target.value)} />
        </div>
      )}

      {/* Test + Save buttons */}
      {provider && (
        <div className="space-y-4 max-w-lg mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={handleTest} disabled={!canTest || testPhase !== 'idle'} variant="primary" size="sm">
              {testPhase === 'saving' ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sauvegarde en cours...
                </span>
              ) : testPhase === 'testing' ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Test de connexion...
                </span>
              ) : 'Enregistrer et tester la connexion'}
            </Button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              testResult.success
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {testResult.message}
            </div>
          )}
        </div>
      )}

      {/* Auto-create toggle */}
      {provider && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">Options</h4>
          <div className="space-y-4 max-w-lg">
            <Toggle
              label="Création automatique"
              description={`Crée automatiquement un lien ${provider === 'zoom' ? 'Zoom' : provider === 'teams' ? 'Teams' : 'Google Meet'} pour chaque séance En ligne ou Hybride`}
              checked={!!settings.visio_auto_create}
              onChange={v => onUpdateSettings({ visio_auto_create: v })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
