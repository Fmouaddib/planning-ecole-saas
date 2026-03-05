import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { Video, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
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

export default function VisioSettingsSection({ settings, onUpdateSettings }: VisioSettingsSectionProps) {
  const { testConnection, isTesting } = useVisioMeetings()

  const [showSecret, setShowSecret] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Zoom local state
  const [zoomAccountId, setZoomAccountId] = useState(settings.zoom_account_id || '')
  const [zoomClientId, setZoomClientId] = useState(settings.zoom_client_id || '')
  const [zoomClientSecret, setZoomClientSecret] = useState(settings.zoom_client_secret || '')
  const [zoomUserEmail, setZoomUserEmail] = useState(settings.zoom_user_email || '')

  // Teams local state
  const [teamsTenantId, setTeamsTenantId] = useState(settings.teams_tenant_id || '')
  const [teamsClientId, setTeamsClientId] = useState(settings.teams_client_id || '')
  const [teamsClientSecret, setTeamsClientSecret] = useState(settings.teams_client_secret || '')
  const [teamsUserId, setTeamsUserId] = useState(settings.teams_user_id || '')

  // Meet local state
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
    await handleSave()
    setTestResult(null)
    const result = await testConnection(provider || undefined)
    setTestResult(result)
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
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mt-6">
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

      {/* Zoom form */}
      {provider === 'zoom' && (
        <div className="space-y-4 max-w-lg mb-6">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Connexion Zoom (Server-to-Server OAuth)
          </h4>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Créez une app Server-to-Server sur{' '}
            <a href="https://marketplace.zoom.us" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              marketplace.zoom.us
            </a>
            {' '}et copiez les identifiants ci-dessous.
          </p>
          <Input
            label="Account ID"
            placeholder="Votre Account ID Zoom"
            value={zoomAccountId}
            onChange={e => setZoomAccountId(e.target.value)}
          />
          <Input
            label="Client ID"
            placeholder="Client ID de l'app S2S"
            value={zoomClientId}
            onChange={e => setZoomClientId(e.target.value)}
          />
          <div className="relative">
            <Input
              label="Client Secret"
              type={showSecret ? 'text' : 'password'}
              placeholder="Client Secret de l'app S2S"
              value={zoomClientSecret}
              onChange={e => setZoomClientSecret(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input
            label="Email utilisateur Zoom"
            placeholder="admin@votre-domaine.com"
            value={zoomUserEmail}
            onChange={e => setZoomUserEmail(e.target.value)}
          />
        </div>
      )}

      {/* Teams form */}
      {provider === 'teams' && (
        <div className="space-y-4 max-w-lg mb-6">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Connexion Microsoft Teams (Azure AD)
          </h4>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Enregistrez une application dans{' '}
            <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              portal.azure.com
            </a>
            {' '}avec les permissions OnlineMeetings.ReadWrite.All (application).
          </p>
          <Input
            label="Tenant ID"
            placeholder="ID du tenant Azure AD"
            value={teamsTenantId}
            onChange={e => setTeamsTenantId(e.target.value)}
          />
          <Input
            label="Client ID"
            placeholder="ID de l'application Azure"
            value={teamsClientId}
            onChange={e => setTeamsClientId(e.target.value)}
          />
          <div className="relative">
            <Input
              label="Client Secret"
              type={showSecret ? 'text' : 'password'}
              placeholder="Secret de l'application Azure"
              value={teamsClientSecret}
              onChange={e => setTeamsClientSecret(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Input
            label="User ID (Azure AD)"
            placeholder="ID de l'utilisateur organisateur"
            value={teamsUserId}
            onChange={e => setTeamsUserId(e.target.value)}
          />
        </div>
      )}

      {/* Meet form */}
      {provider === 'meet' && (
        <div className="space-y-4 max-w-lg mb-6">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Connexion Google Meet (Service Account)
          </h4>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Créez un Service Account dans{' '}
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              console.cloud.google.com
            </a>
            {' '}avec délégation domain-wide et le scope Calendar.
          </p>
          <Input
            label="Email du Service Account"
            placeholder="xxx@project.iam.gserviceaccount.com"
            value={meetClientEmail}
            onChange={e => setMeetClientEmail(e.target.value)}
          />
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
          <Input
            label="Email à impersoner"
            placeholder="admin@votre-domaine.com"
            value={meetUserEmail}
            onChange={e => setMeetUserEmail(e.target.value)}
          />
        </div>
      )}

      {/* Test + Save buttons */}
      {provider && (
        <div className="space-y-4 max-w-lg mb-6">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleTest}
              disabled={!canTest || isTesting}
              variant="secondary"
              size="sm"
            >
              {isTesting ? 'Test en cours...' : 'Tester la connexion'}
            </Button>
            <Button onClick={handleSave} variant="ghost" size="sm">
              Enregistrer
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
