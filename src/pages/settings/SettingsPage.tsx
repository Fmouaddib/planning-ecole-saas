import { useState, useEffect } from 'react'
import { Button, Select } from '@/components/ui'
import { Settings, Bell, Monitor, Save } from 'lucide-react'

interface AppSettings {
  language: string
  timezone: string
  emailNotifications: boolean
  pushNotifications: boolean
  bookingReminders: boolean
  conflictAlerts: boolean
  theme: 'light' | 'dark' | 'auto'
  compactMode: boolean
  pageSize: string
}

const defaultSettings: AppSettings = {
  language: 'fr',
  timezone: 'Europe/Paris',
  emailNotifications: true,
  pushNotifications: false,
  bookingReminders: true,
  conflictAlerts: true,
  theme: 'light',
  compactMode: false,
  pageSize: '10',
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-neutral-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) })
      } catch { /* ignore */ }
    }
  }, [])

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Paramètres</h1>
          <p className="text-neutral-500 mt-1">Configurez vos préférences</p>
        </div>
        <Button leftIcon={Save} onClick={handleSave}>
          {saved ? 'Enregistré !' : 'Enregistrer'}
        </Button>
      </div>

      {/* General */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Settings size={20} className="text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">Général</h3>
        </div>
        <div className="space-y-4 max-w-md">
          <Select
            label="Langue"
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
            value={settings.language}
            onChange={e => updateSetting('language', e.target.value)}
          />
          <Select
            label="Fuseau horaire"
            options={[
              { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
              { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
              { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
            ]}
            value={settings.timezone}
            onChange={e => updateSetting('timezone', e.target.value)}
          />
          <Select
            label="Éléments par page"
            options={[
              { value: '5', label: '5 par page' },
              { value: '10', label: '10 par page' },
              { value: '20', label: '20 par page' },
              { value: '50', label: '50 par page' },
            ]}
            value={settings.pageSize}
            onChange={e => updateSetting('pageSize', e.target.value)}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning-100 rounded-lg">
            <Bell size={20} className="text-warning-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">Notifications</h3>
        </div>
        <div className="space-y-4 max-w-md">
          <Toggle
            label="Notifications par email"
            checked={settings.emailNotifications}
            onChange={v => updateSetting('emailNotifications', v)}
          />
          <Toggle
            label="Notifications push"
            checked={settings.pushNotifications}
            onChange={v => updateSetting('pushNotifications', v)}
          />
          <Toggle
            label="Rappels de réservation"
            checked={settings.bookingReminders}
            onChange={v => updateSetting('bookingReminders', v)}
          />
          <Toggle
            label="Alertes de conflit"
            checked={settings.conflictAlerts}
            onChange={v => updateSetting('conflictAlerts', v)}
          />
        </div>
      </div>

      {/* Display */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-success-100 rounded-lg">
            <Monitor size={20} className="text-success-600" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">Affichage</h3>
        </div>
        <div className="space-y-4 max-w-md">
          <Select
            label="Thème"
            options={[
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
              { value: 'auto', label: 'Automatique' },
            ]}
            value={settings.theme}
            onChange={e => updateSetting('theme', e.target.value as 'light' | 'dark' | 'auto')}
          />
          <Toggle
            label="Mode compact"
            checked={settings.compactMode}
            onChange={v => updateSetting('compactMode', v)}
          />
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
