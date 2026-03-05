import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
import { Mail, RefreshCw, Filter, CheckCircle, XCircle, Clock, Send, FileText, X, Eye, Pencil, Save, Info } from 'lucide-react'
import { HelpBanner } from '@/components/ui'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const ReactQuill = lazy(() => import('react-quill-new').then(async mod => {
  await import('react-quill-new/dist/quill.snow.css')
  return mod
}))

interface EmailLog {
  id: string
  session_id: string | null
  participant_email: string
  email_type: string
  sent_at: string
  status: string
  error_message: string | null
  rendered_subject: string | null
  rendered_html: string | null
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  template_type: string
  is_active: boolean
  center_id: string | null
  updated_at: string
}

type Tab = 'history' | 'templates'

const EMAIL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  session_created: { label: 'Nouvelle séance', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  session_updated: { label: 'Modification', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  session_cancelled: { label: 'Annulation', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  reminder_day: { label: 'Rappel J-1', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  reminder_hour: { label: 'Rappel H-1', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  invitation: { label: 'Invitation', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  weekly_recap: { label: 'Récap hebdo', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
}

const TEMPLATE_FRIENDLY_NAMES: Record<string, string> = {
  session_created: 'Nouvelle séance',
  session_updated: 'Séance modifiée',
  session_cancelled: 'Séance annulée',
  session_reminder_day: 'Rappel J-1',
  session_reminder_hour: 'Rappel H-1',
  center_invitation: 'Invitation centre',
  weekly_recap: 'Récap hebdomadaire',
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  sent: { icon: CheckCircle, color: 'text-emerald-500', label: 'Envoyé' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Échoué' },
  pending: { icon: Clock, color: 'text-amber-500', label: 'En attente' },
}

/** Variables disponibles par type de template */
const TEMPLATE_VARIABLES: Record<string, string[]> = {
  session_created: ['session_title', 'session_date', 'start_time', 'end_time', 'session_type', 'room_name', 'meeting_url'],
  session_updated: ['session_title', 'session_date', 'start_time', 'end_time', 'session_type', 'room_name', 'meeting_url'],
  session_cancelled: ['session_title', 'session_date', 'start_time', 'end_time', 'session_type', 'room_name', 'meeting_url'],
  session_reminder_day: ['session_title', 'session_date', 'start_time', 'end_time', 'session_type', 'room_name', 'meeting_url'],
  session_reminder_hour: ['session_title', 'session_date', 'start_time', 'end_time', 'session_type', 'room_name', 'meeting_url'],
  center_invitation: ['center_name'],
  weekly_recap: ['week_start', 'week_end', 'session_count'],
}

/** Exemples fictifs pour le preview live */
const EXAMPLE_VALUES: Record<string, string> = {
  session_title: 'Mathématiques - Algèbre',
  session_date: 'lundi 10 mars 2026',
  start_time: '09:00',
  end_time: '11:00',
  session_type: 'Présentiel',
  room_name: 'Salle A102',
  meeting_url: 'https://meet.example.com/abc123',
  center_name: 'FormaPro Paris',
  week_start: '10 mars',
  week_end: '16 mars',
  session_count: '5',
}

/** Remplace les {{variables}} par des exemples fictifs */
function previewTemplate(html: string): string {
  let result = html
  for (const [key, value] of Object.entries(EXAMPLE_VALUES)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  // Remplacer les blocs conditionnels par leur contenu (pour le preview)
  result = result.replace(/\{\{#if \w+\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
  return result
}

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    ['link'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean'],
  ],
}

const QUILL_FORMATS = [
  'bold', 'italic', 'underline',
  'link', 'color', 'background',
  'list', 'align',
]

// ─── Email Preview Modal ─────────────────────────────────────────────
function EmailPreviewModal({ log, onClose }: { log: EmailLog; onClose: () => void }) {
  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const typeConfig = EMAIL_TYPE_LABELS[log.email_type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Email envoyé</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-4 space-y-2 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500 w-16">À :</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{log.participant_email}</span>
          </div>
          {log.rendered_subject && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500 w-16">Objet :</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{log.rendered_subject}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500 w-16">Date :</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              {format(new Date(log.sent_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500 w-16">Statut :</span>
            <div className="flex items-center gap-1.5">
              <StatusIcon size={14} className={statusConfig.color} />
              <span className="text-neutral-700 dark:text-neutral-300">{statusConfig.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500 w-16">Type :</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig?.color || 'bg-neutral-100 text-neutral-800'}`}>
              {typeConfig?.label || log.email_type}
            </span>
          </div>
          {log.error_message && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-neutral-500 w-16">Erreur :</span>
              <span className="text-red-600 dark:text-red-400">{log.error_message}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {log.rendered_html ? (
            <iframe
              srcDoc={log.rendered_html}
              sandbox=""
              className="w-full min-h-[300px] border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white"
              title="Preview email"
              style={{ height: '400px' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info size={32} className="text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                Preview non disponible pour les emails envoyés avant cette mise à jour
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg text-sm font-medium transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Template Edit Modal ─────────────────────────────────────────────
function TemplateEditModal({
  template,
  onClose,
  onSave,
}: {
  template: EmailTemplate
  onClose: () => void
  onSave: (id: string, subject: string, bodyHtml: string) => Promise<void>
}) {
  const [subject, setSubject] = useState(template.subject)
  const [bodyHtml, setBodyHtml] = useState(template.body_html)
  const [saving, setSaving] = useState(false)
  const [insertTarget, setInsertTarget] = useState<'subject' | 'body'>('body')
  const subjectRef = useRef<HTMLInputElement>(null)
  const quillRef = useRef<{ getEditor: () => { insertText: (index: number, text: string) => void; getSelection: () => { index: number } | null } } | null>(null)

  const variables = TEMPLATE_VARIABLES[template.name] || []

  const handleInsertVariable = (varName: string) => {
    const tag = `{{${varName}}}`
    if (insertTarget === 'subject') {
      const input = subjectRef.current
      if (input) {
        const start = input.selectionStart ?? subject.length
        const end = input.selectionEnd ?? subject.length
        const newVal = subject.slice(0, start) + tag + subject.slice(end)
        setSubject(newVal)
        setTimeout(() => {
          input.focus()
          input.setSelectionRange(start + tag.length, start + tag.length)
        }, 0)
      }
    } else {
      const editor = quillRef.current?.getEditor()
      if (editor) {
        const sel = editor.getSelection()
        const idx = sel ? sel.index : 0
        editor.insertText(idx, tag)
      } else {
        setBodyHtml(prev => prev + tag)
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(template.id, subject, bodyHtml)
      onClose()
    } catch (err) {
      console.error('Error saving template:', err)
    } finally {
      setSaving(false)
    }
  }

  const previewHtml = previewTemplate(bodyHtml)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Modifier le template — {TEMPLATE_FRIENDLY_NAMES[template.name] || template.name}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-5">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Objet
            </label>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              onFocus={() => setInsertTarget('subject')}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Variables badges */}
          {variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Variables disponibles (cliquer pour insérer dans {insertTarget === 'subject' ? "l'objet" : 'le corps'}) :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {variables.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-mono bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors border border-primary-200 dark:border-primary-800"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WYSIWYG Editor */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Corps HTML
            </label>
            <div onFocus={() => setInsertTarget('body')} className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
              <Suspense fallback={<div className="h-48 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-neutral-400" /></div>}>
                <ReactQuill
                  ref={quillRef as React.Ref<never>}
                  theme="snow"
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                  className="bg-white dark:bg-neutral-900 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-neutral-200 [&_.ql-toolbar]:dark:border-neutral-700 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[180px] [&_.ql-editor]:text-neutral-900 [&_.ql-editor]:dark:text-neutral-100"
                />
              </Suspense>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Aperçu (avec exemples)
            </label>
            <iframe
              srcDoc={previewHtml}
              sandbox=""
              className="w-full min-h-[200px] border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white"
              title="Preview template"
              style={{ height: '250px' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg text-sm font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('history')
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const { user } = useAuth()

  // ─── Fetch logs ──────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching email logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  // ─── Fetch templates ──────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) return

    try {
      setIsLoadingTemplates(true)
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name')

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching email templates:', err)
    } finally {
      setIsLoadingTemplates(false)
    }
  }, [user?.establishmentId])

  useEffect(() => {
    fetchLogs()
    fetchTemplates()
  }, [fetchLogs, fetchTemplates])

  // ─── Save template ──────────────────────────────
  const saveTemplate = useCallback(async (id: string, subject: string, bodyHtml: string) => {
    const { error } = await supabase
      .from('email_templates')
      .update({ subject, body_html: bodyHtml, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, subject, body_html: bodyHtml, updated_at: new Date().toISOString() } : t))
  }, [])

  // ─── Filtered logs ──────────────────────────────
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterType !== 'all' && log.email_type !== filterType) return false
      if (filterStatus !== 'all' && log.status !== filterStatus) return false
      return true
    })
  }, [logs, filterType, filterStatus])

  const stats = useMemo(() => {
    const total = logs.length
    const sent = logs.filter(l => l.status === 'sent').length
    const failed = logs.filter(l => l.status === 'failed').length
    const today = logs.filter(l => {
      const d = new Date(l.sent_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length
    return { total, sent, failed, today }
  }, [logs])

  const uniqueTypes = useMemo(() => {
    const types = new Set(logs.map(l => l.email_type))
    return Array.from(types).sort()
  }, [logs])

  if (isDemoMode) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Mail className="mx-auto mb-4 text-neutral-400" size={48} />
          <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
            Emails non disponibles en mode démo
          </h2>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'history' as Tab, label: 'Historique', icon: Mail },
    { key: 'templates' as Tab, label: 'Templates', icon: FileText },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Suivi des emails
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Historique, templates et notifications
          </p>
        </div>
        <button
          onClick={() => { fetchLogs(); fetchTemplates() }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <HelpBanner storageKey="admin-emails">
        Consultez l'historique des emails envoyés et personnalisez les modèles. Les emails sont envoyés automatiquement selon la politique définie dans Paramètres (création, modification, annulation de séance, rappels).
      </HelpBanner>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <nav className="flex space-x-1 -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ─── Tab: Historique ─────────────────────────────── */}
      {activeTab === 'history' && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Send size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</p>
                  <p className="text-xs text-neutral-500">Total envoyés</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.sent}</p>
                  <p className="text-xs text-neutral-500">Réussis</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                  <XCircle size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
                  <p className="text-xs text-neutral-500">Échoués</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <Clock size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.today}</p>
                  <p className="text-xs text-neutral-500">Aujourd'hui</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-neutral-400" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="all">Tous les types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>
                    {EMAIL_TYPE_LABELS[t]?.label || t}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            >
              <option value="all">Tous les statuts</option>
              <option value="sent">Envoyés</option>
              <option value="failed">Échoués</option>
            </select>
            <span className="text-sm text-neutral-500 self-center">
              {filteredLogs.length} résultat{filteredLogs.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={24} className="animate-spin text-neutral-400" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Mail size={40} className="text-neutral-300 dark:text-neutral-600 mb-3" />
                <p className="text-neutral-500 dark:text-neutral-400">Aucun email envoyé</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                  Les emails apparaîtront ici après l'envoi de notifications
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                      <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Statut</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Destinataire</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-neutral-600 dark:text-neutral-400">Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => {
                      const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending
                      const StatusIcon = statusConfig.icon
                      const typeConfig = EMAIL_TYPE_LABELS[log.email_type]

                      return (
                        <tr
                          key={log.id}
                          onClick={() => setPreviewLog(log)}
                          className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusIcon size={16} className={statusConfig.color} />
                              <span className="text-neutral-700 dark:text-neutral-300">{statusConfig.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                              {log.participant_email}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig?.color || 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200'}`}>
                              {typeConfig?.label || log.email_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                            {format(new Date(log.sent_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </td>
                          <td className="px-4 py-3">
                            {log.error_message ? (
                              <span className="text-red-600 dark:text-red-400 text-xs truncate max-w-[200px] inline-block" title={log.error_message}>
                                {log.error_message}
                              </span>
                            ) : (
                              <span className="text-neutral-300 dark:text-neutral-600">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Tab: Templates ─────────────────────────────── */}
      {activeTab === 'templates' && (
        <div>
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-neutral-400" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText size={40} className="text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">Aucun template configuré</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                      {TEMPLATE_FRIENDLY_NAMES[tpl.name] || tpl.name}
                    </h3>
                    <span className={`shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tpl.is_active
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                    }`}>
                      {tpl.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Objet :</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4 line-clamp-2 font-mono bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded">
                    {tpl.subject}
                  </p>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      {tpl.updated_at ? format(new Date(tpl.updated_at), "d MMM yyyy", { locale: fr }) : '—'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(tpl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 hover:bg-primary-100 dark:hover:bg-primary-900 rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          const previewHtml = previewTemplate(tpl.body_html)
                          const w = window.open('', '_blank', 'width=700,height=600')
                          if (w) {
                            w.document.write(previewHtml)
                            w.document.close()
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                      >
                        <Eye size={13} />
                        Aperçu
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {previewLog && (
        <EmailPreviewModal log={previewLog} onClose={() => setPreviewLog(null)} />
      )}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={saveTemplate}
        />
      )}
    </div>
  )
}
