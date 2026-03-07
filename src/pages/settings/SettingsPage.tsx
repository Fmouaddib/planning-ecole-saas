import { useState, useEffect } from 'react'
import { Button, Select, HelpBanner } from '@/components/ui'
import {
  Settings, Bell, Monitor, Save, LogOut, User, HelpCircle,
  GraduationCap, Mail, BookOpen, Video, Link as LinkIcon,
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { navigateTo } from '@/utils/navigation'
import { useCenterSettings } from '@/hooks/useCenterSettings'
import OdooSettingsSection from './OdooSettingsSection'
import VisioSettingsSection from './VisioSettingsSection'

interface SettingsPageProps {
  onLogout?: () => void
  onNavigate?: (path: string) => void
}

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

type SettingsTab = 'general' | 'notifications' | 'display' | 'center' | 'visio' | 'integrations' | 'account'

interface TabDef {
  key: SettingsTab
  label: string
  icon: typeof Settings
  adminOnly?: boolean
}

const TABS: TabDef[] = [
  { key: 'general', label: 'Général', icon: Settings },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'display', label: 'Affichage', icon: Monitor },
  { key: 'center', label: 'Centre', icon: GraduationCap, adminOnly: true },
  { key: 'visio', label: 'Visioconférence', icon: Video, adminOnly: true },
  { key: 'integrations', label: 'Intégrations', icon: LinkIcon, adminOnly: true },
  { key: 'account', label: 'Compte', icon: User },
]

function SettingsPage({ onLogout, onNavigate }: SettingsPageProps) {
  const { user } = useAuthContext()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const { settings: centerSettings, updateSettings: updateCenterSettings } = useCenterSettings()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(localStorage.getItem('appSettings') || '{}') } catch { /* ignore */ }
    const themeKey = localStorage.getItem('theme')
    const theme: 'light' | 'dark' | 'auto' = themeKey === 'dark' ? 'dark' : themeKey === 'light' ? 'light' : 'auto'
    setSettings({ ...defaultSettings, ...parsed, theme })
  }, [])

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
    setSaved(false)
    if (key === 'theme') {
      const theme = value as 'light' | 'dark' | 'auto'
      const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('theme', theme === 'auto' ? '' : theme)
    }
  }

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Paramètres</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Configurez vos préférences</p>
        </div>
        {(activeTab === 'general' || activeTab === 'notifications' || activeTab === 'display') && (
          <Button leftIcon={Save} onClick={handleSave} className="self-start sm:self-auto">
            {saved ? 'Enregistré !' : 'Enregistrer'}
          </Button>
        )}
      </div>

      <HelpBanner storageKey="admin-settings">
        Configurez les préférences de votre centre : politique email, intégration visio (Zoom/Teams/Meet), espace étudiant, mode e-learning et connexion Odoo.
        <span className="flex gap-2 mt-2">
          <button onClick={() => navigateTo('/planning')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Planning →</button>
          <button onClick={() => navigateTo('/emails')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Emails →</button>
        </span>
      </HelpBanner>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-neutral-200 dark:border-neutral-700 -mx-1 px-1">
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 -mb-[1px] ${
                isActive
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Settings size={20} className="text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Préférences générales</h3>
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
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Bell size={20} className="text-warning-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Notifications</h3>
            </div>
            <div className="space-y-4 max-w-md">
              <Toggle label="Notifications par email" checked={settings.emailNotifications} onChange={v => updateSetting('emailNotifications', v)} />
              <Toggle label="Notifications push" checked={settings.pushNotifications} onChange={v => updateSetting('pushNotifications', v)} />
              <Toggle label="Rappels de séance" checked={settings.bookingReminders} onChange={v => updateSetting('bookingReminders', v)} />
              <Toggle label="Alertes de conflit" checked={settings.conflictAlerts} onChange={v => updateSetting('conflictAlerts', v)} />
            </div>

            {/* Politique email — admin only */}
            {isAdmin && (
              <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Mail size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Politique email de l'établissement</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Contrôlez quels emails sont envoyés et à qui</p>
                  </div>
                </div>
                <div className="space-y-6 max-w-md">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">Types d'email envoyés</h4>
                    <div className="space-y-3">
                      <Toggle label="Création de séance" description="Email envoyé lorsqu'une nouvelle séance est créée" checked={centerSettings.email_session_created ?? true} onChange={v => updateCenterSettings({ email_session_created: v })} />
                      <Toggle label="Modification de séance" description="Email envoyé lorsqu'une séance est modifiée" checked={centerSettings.email_session_updated ?? true} onChange={v => updateCenterSettings({ email_session_updated: v })} />
                      <Toggle label="Annulation de séance" description="Email envoyé lorsqu'une séance est annulée" checked={centerSettings.email_session_cancelled ?? true} onChange={v => updateCenterSettings({ email_session_cancelled: v })} />
                      <Toggle label="Rappels automatiques" description="Rappels J-1 et H-1 avant chaque séance" checked={centerSettings.email_reminders ?? true} onChange={v => updateCenterSettings({ email_reminders: v })} />
                      <Toggle label="Récapitulatif hebdomadaire" description="Email récap envoyé chaque dimanche soir" checked={centerSettings.email_weekly_recap ?? true} onChange={v => updateCenterSettings({ email_weekly_recap: v })} />
                    </div>
                  </div>
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                    <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">Destinataires</h4>
                    <div className="space-y-3">
                      <Toggle label="Notifier les formateurs" description="Les formateurs reçoivent les emails liés à leurs séances" checked={centerSettings.email_notify_trainers ?? true} onChange={v => updateCenterSettings({ email_notify_trainers: v })} />
                      <Toggle label="Notifier les étudiants / participants" description="Les étudiants et participants reçoivent les emails liés à leurs séances" checked={centerSettings.email_notify_students ?? true} onChange={v => updateCenterSettings({ email_notify_students: v })} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'display' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-success-100 rounded-lg">
                <Monitor size={20} className="text-success-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Affichage</h3>
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
              <Toggle label="Mode compact" checked={settings.compactMode} onChange={v => updateSetting('compactMode', v)} />
            </div>
          </div>
        )}

        {activeTab === 'center' && isAdmin && (
          <div className="space-y-6">
            {/* Espace étudiant */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <GraduationCap size={20} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Espace étudiant</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Options visibles par les étudiants de votre centre</p>
                </div>
              </div>
              <div className="space-y-4 max-w-md">
                <Toggle
                  label="Masquer la liste des matières"
                  checked={!!centerSettings.hide_subjects}
                  onChange={v => updateCenterSettings({ hide_subjects: v })}
                />
                <p className="text-xs text-neutral-400 dark:text-neutral-500 -mt-2 ml-1">
                  Si activé, la section « Mes matières » ne sera pas visible dans l'espace étudiant.
                </p>
                <Toggle
                  label="Masquer la liste des camarades de classe"
                  checked={!!centerSettings.hide_classmates}
                  onChange={v => updateCenterSettings({ hide_classmates: v })}
                />
                <p className="text-xs text-neutral-400 dark:text-neutral-500 -mt-2 ml-1">
                  Si activé, la section « Mes camarades » ne sera pas visible dans l'espace étudiant.
                </p>
              </div>
            </div>

            {/* Mode e-learning */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <BookOpen size={20} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mode e-learning</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Simplifie le référentiel pour les écoles en ligne</p>
                </div>
              </div>
              <div className="space-y-4 max-w-md">
                <Toggle
                  label="Fusionner Classes et Matières"
                  description="Les onglets Classes et Matières du référentiel sont remplacés par un onglet unique « Cours ». Chaque cours crée automatiquement une classe et une matière liées."
                  checked={!!centerSettings.merge_class_subject}
                  onChange={v => updateCenterSettings({ merge_class_subject: v })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visio' && isAdmin && (
          <VisioSettingsSection
            settings={centerSettings}
            onUpdateSettings={updateCenterSettings}
          />
        )}

        {activeTab === 'integrations' && isAdmin && (
          <OdooSettingsSection
            settings={centerSettings}
            onUpdateSettings={updateCenterSettings}
          />
        )}

        {activeTab === 'account' && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-error-100 rounded-lg">
                <User size={20} className="text-error-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Compte</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate?.('/profile')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
              >
                <User size={18} className="text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Mon profil</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Informations personnelles et abonnement</p>
                </div>
              </button>
              <button
                onClick={() => onNavigate?.('/help')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
              >
                <HelpCircle size={18} className="text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Aide & Support</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Documentation et assistance</p>
                </div>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-error-50 dark:hover:bg-error-950 transition-colors border border-error-200 dark:border-error-800"
              >
                <LogOut size={18} className="text-error-500" />
                <div>
                  <p className="text-sm font-medium text-error-600">Se déconnecter</p>
                  <p className="text-xs text-error-400">Fermer la session en cours</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
