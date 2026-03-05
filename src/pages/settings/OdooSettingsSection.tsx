import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { Link, RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff, Clock } from 'lucide-react'
import { CenterSettings } from '@/hooks/useCenterSettings'
import { useOdooSync, OdooSyncLog } from '@/hooks/useOdooSync'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface OdooSettingsSectionProps {
  settings: CenterSettings
  onUpdateSettings: (patch: Partial<CenterSettings>) => Promise<void>
}

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

const INTERVAL_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
  { value: 180, label: '3 heures' },
  { value: 360, label: '6 heures' },
  { value: 720, label: '12 heures' },
  { value: 1440, label: '24 heures' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: typeof CheckCircle }> = {
    success: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    warning: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
    error: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    running: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: RefreshCw },
  }
  const cfg = map[status] || map.error
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={12} className={status === 'running' ? 'animate-spin' : ''} />
      {status}
    </span>
  )
}

function SyncLogRow({ log }: { log: OdooSyncLog }) {
  const stats = log.stats as Record<string, number | string[]>
  return (
    <div className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <div className="flex items-center gap-3">
        <StatusBadge status={log.status} />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {format(new Date(log.started_at), 'dd MMM HH:mm', { locale: fr })}
        </span>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          ({log.triggered_by})
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
        {typeof stats.subjects_synced === 'number' && <span>{stats.subjects_synced} mat.</span>}
        {typeof stats.students_matched === 'number' && <span>{stats.students_matched} etu.</span>}
        {typeof stats.enrollments_created === 'number' && stats.enrollments_created > 0 && (
          <span className="text-green-600 dark:text-green-400">+{stats.enrollments_created} inscr.</span>
        )}
        {Array.isArray(stats.errors) && stats.errors.length > 0 && (
          <span className="text-red-500">{stats.errors.length} err.</span>
        )}
      </div>
    </div>
  )
}

export default function OdooSettingsSection({ settings, onUpdateSettings }: OdooSettingsSectionProps) {
  const { syncLogs, isSyncing, isTesting, testConnection, triggerSync } = useOdooSync()

  const [showApiKey, setShowApiKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [syncResult, setSyncResult] = useState<{ success: boolean; error?: string } | null>(null)

  // Local form state for Odoo fields
  const [odooUrl, setOdooUrl] = useState(settings.odoo_url || '')
  const [odooDb, setOdooDb] = useState(settings.odoo_db || '')
  const [odooUser, setOdooUser] = useState(settings.odoo_user || '')
  const [odooApiKey, setOdooApiKey] = useState(settings.odoo_api_key || '')

  // Sync local state when settings change
  const settingsLoaded = !!(settings.odoo_url || settings.odoo_db || settings.odoo_user || settings.odoo_api_key)
  if (settingsLoaded && !odooUrl && settings.odoo_url) {
    setOdooUrl(settings.odoo_url)
    setOdooDb(settings.odoo_db || '')
    setOdooUser(settings.odoo_user || '')
    setOdooApiKey(settings.odoo_api_key || '')
  }

  const handleSaveConnection = async () => {
    await onUpdateSettings({
      odoo_url: odooUrl.replace(/\/+$/, ''), // trim trailing slashes
      odoo_db: odooDb,
      odoo_user: odooUser,
      odoo_api_key: odooApiKey,
    })
  }

  const handleTest = async () => {
    // Save first, then test
    await handleSaveConnection()
    setTestResult(null)
    const result = await testConnection()
    setTestResult(result)
  }

  const handleSync = async () => {
    setSyncResult(null)
    const result = await triggerSync()
    setSyncResult({ success: result.success, error: result.error })
  }

  const canTest = odooUrl && odooDb && odooUser && odooApiKey

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <Link size={20} className="text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Intégration Odoo (OpenEduCat)
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Synchronisez les inscriptions matières depuis Odoo Community v16
          </p>
        </div>
      </div>

      {/* Connection form */}
      <div className="space-y-4 max-w-lg mb-6">
        <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Connexion Odoo</h4>
        <Input
          label="URL Odoo"
          placeholder="https://votre-instance.odoo.com"
          value={odooUrl}
          onChange={e => setOdooUrl(e.target.value)}
        />
        <Input
          label="Nom de la base de données"
          placeholder="zeroencompta"
          value={odooDb}
          onChange={e => setOdooDb(e.target.value)}
        />
        <Input
          label="Utilisateur API (email)"
          placeholder="api@votre-instance.com"
          value={odooUser}
          onChange={e => setOdooUser(e.target.value)}
        />
        <div className="relative">
          <Input
            label="Clé API"
            type={showApiKey ? 'text' : 'password'}
            placeholder="Clé API Odoo"
            value={odooApiKey}
            onChange={e => setOdooApiKey(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTest}
            disabled={!canTest || isTesting}
            variant="secondary"
            size="sm"
          >
            {isTesting ? 'Test en cours...' : 'Tester la connexion'}
          </Button>
          <Button onClick={handleSaveConnection} variant="ghost" size="sm">
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

      {/* Sync controls */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mb-6">
        <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">Synchronisation</h4>
        <div className="space-y-4 max-w-lg">
          <Toggle
            label="Synchronisation automatique"
            description="Active la synchronisation périodique via cron"
            checked={!!settings.odoo_sync_enabled}
            onChange={v => onUpdateSettings({ odoo_sync_enabled: v })}
          />

          {settings.odoo_sync_enabled && (
            <div>
              <label className="block text-sm text-neutral-700 dark:text-neutral-300 mb-1">Intervalle</label>
              <select
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
                value={settings.odoo_sync_interval || 60}
                onChange={e => onUpdateSettings({ odoo_sync_interval: Number(e.target.value) })}
              >
                {INTERVAL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSync}
              disabled={isSyncing || !canTest}
              leftIcon={RefreshCw}
              size="sm"
            >
              {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
            </Button>

            {settings.odoo_last_sync && (
              <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Clock size={12} />
                Dernière sync : {format(new Date(settings.odoo_last_sync), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </span>
            )}
          </div>

          {syncResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              syncResult.success
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {syncResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {syncResult.success ? 'Synchronisation terminée' : syncResult.error}
            </div>
          )}
        </div>
      </div>

      {/* Sync history */}
      {syncLogs.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">
            Historique des synchronisations
          </h4>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
            {syncLogs.map(log => (
              <SyncLogRow key={log.id} log={log} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
