import { useState, useEffect } from 'react'
import { Button, Input, Select, HelpBanner } from '@/components/ui'
import {
  Settings, Bell, Monitor, Save, LogOut, User, HelpCircle,
  GraduationCap, Mail, BookOpen, Video, Link as LinkIcon, Clock,
  Plus, X, Tag, Share2,
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

const DEFAULT_SESSION_TYPES = [
  { value: 'course', label: 'Cours' },
  { value: 'exam', label: 'Examen' },
  { value: 'meeting', label: 'Réunion' },
  { value: 'event', label: 'Événement' },
  { value: 'maintenance', label: 'Maintenance' },
]

function SessionTypesSettings({ types, onChange }: { types: { value: string; label: string }[]; onChange: (t: { value: string; label: string }[]) => void }) {
  const [newLabel, setNewLabel] = useState('')
  const effectiveTypes = types.length > 0 ? types : DEFAULT_SESSION_TYPES
  const isCustom = types.length > 0

  const addType = () => {
    if (!newLabel.trim()) return
    const value = newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    if (effectiveTypes.some(t => t.value === value)) return
    onChange([...effectiveTypes, { value, label: newLabel.trim() }])
    setNewLabel('')
  }

  const removeType = (value: string) => {
    const filtered = effectiveTypes.filter(t => t.value !== value)
    onChange(filtered)
  }

  const resetToDefaults = () => {
    onChange([])
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <Tag size={20} className="text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Types de séance</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Personnalisez les types de séance disponibles dans le calendrier</p>
        </div>
      </div>
      <div className="space-y-4 max-w-md">
        <div className="flex flex-wrap gap-2">
          {effectiveTypes.map(t => (
            <span key={t.value} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
              {t.label}
              <button
                type="button"
                onClick={() => removeType(t.value)}
                className="text-neutral-400 hover:text-error-500 transition-colors"
                title="Supprimer"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Nouveau type (ex: TP, TD, Tutorat...)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addType() } }}
          />
          <Button variant="secondary" size="sm" leftIcon={Plus} onClick={addType} disabled={!newLabel.trim()}>
            Ajouter
          </Button>
        </div>
        {isCustom && (
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Réinitialiser les types par défaut
          </button>
        )}
      </div>
    </div>
  )
}

const LABEL_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'title', label: 'Titre', description: 'Nom de la séance' },
  { value: 'room', label: 'Salle', description: 'Salle attribuée' },
  { value: 'teacher', label: 'Professeur', description: 'Nom du professeur' },
  { value: 'matiere', label: 'Matière', description: 'Matière du cours' },
  { value: 'time', label: 'Horaire', description: 'Heure début - fin' },
]

const DEFAULT_CALENDAR_LABELS = ['title', 'room', 'teacher']

function CalendarLabelsSettings({ labels, onChange }: { labels: string[]; onChange: (l: string[]) => void }) {
  const effectiveLabels = labels.length > 0 ? labels : DEFAULT_CALENDAR_LABELS

  const toggle = (value: string) => {
    if (value === 'title') return // Title always shown
    const newLabels = effectiveLabels.includes(value)
      ? effectiveLabels.filter(l => l !== value)
      : [...effectiveLabels, value]
    onChange(newLabels)
  }

  const resetToDefaults = () => onChange([])

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Tag size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Étiquettes du calendrier</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Choisissez les informations affichées sur chaque bloc du calendrier</p>
        </div>
      </div>
      <div className="space-y-3 max-w-md">
        {LABEL_OPTIONS.map(opt => {
          const isActive = effectiveLabels.includes(opt.value)
          const isTitle = opt.value === 'title'
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                isActive
                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950/30'
                  : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              } ${isTitle ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => toggle(opt.value)}
                disabled={isTitle}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{opt.label}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">{opt.description}</span>
              </div>
            </label>
          )
        })}
        {JSON.stringify(effectiveLabels) !== JSON.stringify(DEFAULT_CALENDAR_LABELS) && (
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Réinitialiser par défaut
          </button>
        )}
      </div>
    </div>
  )
}

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
        {activeTab === 'center' && isAdmin && (
          <Button leftIcon={Save} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }} className="self-start sm:self-auto">
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
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Contrôlez quels emails sont envoyés, par type et par destinataire</p>
                  </div>
                </div>

                {/* Tableau email par type et destinataire */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-700">
                        <th className="text-left py-2 pr-4 text-neutral-600 dark:text-neutral-400 font-medium">Type d'email</th>
                        <th className="text-center py-2 px-3 text-neutral-600 dark:text-neutral-400 font-medium">Professeurs</th>
                        <th className="text-center py-2 px-3 text-neutral-600 dark:text-neutral-400 font-medium">Etudiants</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {[
                        { label: 'Création de séance', desc: 'Email lors de la création d\'une séance', keyT: 'email_session_created_teachers' as const, keyS: 'email_session_created_students' as const },
                        { label: 'Modification de séance', desc: 'Email lors de la modification d\'une séance', keyT: 'email_session_updated_teachers' as const, keyS: 'email_session_updated_students' as const },
                        { label: 'Annulation de séance', desc: 'Email lors de l\'annulation d\'une séance', keyT: 'email_session_cancelled_teachers' as const, keyS: 'email_session_cancelled_students' as const },
                        { label: 'Rappels automatiques', desc: 'Rappels J-1 et H-1 avant chaque séance', keyT: 'email_reminders_teachers' as const, keyS: 'email_reminders_students' as const },
                        { label: 'Récap. hebdomadaire', desc: 'Chaque dimanche soir', keyT: 'email_recap_weekly_teachers' as const, keyS: 'email_recap_weekly_students' as const },
                        { label: 'Récap. mensuel', desc: 'Chaque fin de mois', keyT: 'email_recap_monthly_teachers' as const, keyS: 'email_recap_monthly_students' as const },
                        { label: 'Récap. trimestriel', desc: 'Tous les 3 mois', keyT: 'email_recap_quarterly_teachers' as const, keyS: 'email_recap_quarterly_students' as const },
                        { label: 'Récap. semestriel', desc: 'Tous les 6 mois', keyT: 'email_recap_semester_teachers' as const, keyS: 'email_recap_semester_students' as const },
                      ].map(row => (
                        <tr key={row.keyT}>
                          <td className="py-3 pr-4">
                            <span className="text-neutral-800 dark:text-neutral-200">{row.label}</span>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{row.desc}</p>
                          </td>
                          <td className="text-center py-3 px-3">
                            <input
                              type="checkbox"
                              checked={centerSettings[row.keyT] ?? true}
                              onChange={e => updateCenterSettings({ [row.keyT]: e.target.checked })}
                              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                            />
                          </td>
                          <td className="text-center py-3 px-3">
                            <input
                              type="checkbox"
                              checked={centerSettings[row.keyS] ?? true}
                              onChange={e => updateCenterSettings({ [row.keyS]: e.target.checked })}
                              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
            {/* Horaires et jours d'ouverture */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Horaires d'ouverture</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Définit les plages horaires du calendrier et la validation des séances</p>
                </div>
              </div>
              <div className="space-y-5 max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Heure d'ouverture"
                    type="time"
                    value={centerSettings.opening_time || '08:00'}
                    onChange={e => updateCenterSettings({ opening_time: e.target.value })}
                  />
                  <Input
                    label="Heure de fermeture"
                    type="time"
                    value={centerSettings.closing_time || '20:00'}
                    onChange={e => updateCenterSettings({ closing_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Jours ouvrés
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 1, label: 'Lun' },
                      { value: 2, label: 'Mar' },
                      { value: 3, label: 'Mer' },
                      { value: 4, label: 'Jeu' },
                      { value: 5, label: 'Ven' },
                      { value: 6, label: 'Sam' },
                      { value: 0, label: 'Dim' },
                    ].map(day => {
                      const currentDays = centerSettings.working_days || [1, 2, 3, 4, 5]
                      const isSelected = currentDays.includes(day.value)
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          }`}
                          onClick={() => {
                            const newDays = isSelected
                              ? currentDays.filter((d: number) => d !== day.value)
                              : [...currentDays, day.value].sort((a: number, b: number) => a - b)
                            updateCenterSettings({ working_days: newDays })
                          }}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    Les jours non sélectionnés seront masqués dans la vue semaine du calendrier.
                  </p>
                </div>
              </div>
            </div>

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

            {/* Types de séance */}
            <SessionTypesSettings
              types={centerSettings.custom_session_types || []}
              onChange={types => updateCenterSettings({ custom_session_types: types.length > 0 ? types : undefined })}
            />

            {/* Étiquettes du calendrier */}
            <CalendarLabelsSettings
              labels={centerSettings.calendar_labels || []}
              onChange={labels => updateCenterSettings({ calendar_labels: labels.length > 0 && JSON.stringify(labels) !== JSON.stringify(DEFAULT_CALENDAR_LABELS) ? labels as any : undefined })}
            />

            {/* Gestion des salles */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                  <Monitor size={20} className="text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Gestion des salles</h3>
              </div>
              <div className="space-y-4">
                <Toggle
                  checked={centerSettings.room_optional ?? false}
                  onChange={v => updateCenterSettings({ room_optional: v })}
                  label="Salle facultative"
                  description="Permet de créer des séances sans attribuer de salle (utile pour les cours en ligne)"
                />
                <Toggle
                  checked={centerSettings.allow_multi_room ?? false}
                  onChange={v => updateCenterSettings({ allow_multi_room: v })}
                  label="Plusieurs salles par séance"
                  description="Permet d'attribuer plusieurs salles à une même séance (examens, événements)"
                />
              </div>
            </div>

            {/* Détail séance */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <Share2 size={20} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Détail des séances</h3>
              </div>
              <div className="space-y-4">
                <Toggle
                  checked={centerSettings.show_session_sharing !== false}
                  onChange={v => updateCenterSettings({ show_session_sharing: v })}
                  label="Section partage dans le détail"
                  description="Affiche les boutons de partage (Email, WhatsApp) dans la fenêtre de détail d'une séance du calendrier"
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
