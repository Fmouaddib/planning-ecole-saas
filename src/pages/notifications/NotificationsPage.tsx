/**
 * Page Notifications - Centre de notifications complet
 * Filtres par type, actions groupees, preferences
 */
import { useState, useMemo, useCallback } from 'react'
import {
  Bell, Settings, Trash2, Check, CheckCheck,
  Calendar, AlertCircle,
  BookOpen, Clock, ChevronDown, MailCheck,
  BellOff, X, ClipboardCheck, FileBarChart, Upload, Info,
  AlertTriangle, CheckCircle, UserCog,
  CalendarClock, CalendarX, UserCheck, UserPlus, XCircle, RefreshCw, MessageSquare, Award, Send,
  Smartphone,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button, Badge, LoadingSpinner, HelpBanner } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InAppNotification, InAppNotificationType } from '@/types'

// ==================== CONSTANTS ====================

type FilterTab = 'all' | 'sessions' | 'reminders' | 'system' | 'academic' | 'collaboration'

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof Bell }[] = [
  { key: 'all', label: 'Toutes', icon: Bell },
  { key: 'sessions', label: 'Sessions', icon: Calendar },
  { key: 'collaboration', label: 'Collaboration', icon: UserCog },
  { key: 'reminders', label: 'Rappels', icon: Clock },
  { key: 'system', label: 'Systeme', icon: AlertCircle },
  { key: 'academic', label: 'Academique', icon: BookOpen },
]

const TYPE_TO_TAB: Record<InAppNotificationType, FilterTab> = {
  session_created: 'sessions',
  session_updated: 'sessions',
  session_cancelled: 'sessions',
  reminder: 'reminders',
  weekly_recap: 'reminders',
  system: 'system',
  attendance_marked: 'academic',
  grade_published: 'academic',
  import_completed: 'system',
  info: 'system',
  warning: 'system',
  success: 'system',
  availability_requested: 'collaboration',
  unavailability_declared: 'collaboration',
  assignment_pending: 'collaboration',
  assignment_accepted: 'collaboration',
  assignment_rejected: 'collaboration',
  change_request_pending: 'collaboration',
  change_request_accepted: 'collaboration',
  change_request_rejected: 'collaboration',
  planning_message: 'collaboration',
  availability_demand_sent: 'collaboration',
  availability_response_received: 'collaboration',
  replacement_request_sent: 'collaboration',
  replacement_candidate_accepted: 'collaboration',
  replacement_selected: 'collaboration',
  session_needs_reschedule: 'collaboration',
  bulletin_generated: 'academic',
  bulletin_sent: 'academic',
  absence_report_sent: 'academic',
}

const TYPE_CONFIG: Record<InAppNotificationType, { label: string; color: string; borderColor: string; icon: typeof Bell; bgColor: string }> = {
  session_created: {
    label: 'Nouvelle seance',
    color: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    icon: Calendar,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  session_updated: {
    label: 'Seance modifiee',
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    icon: Calendar,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  session_cancelled: {
    label: 'Seance annulee',
    color: 'text-red-600',
    borderColor: 'border-l-red-500',
    icon: Calendar,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  reminder: {
    label: 'Rappel',
    color: 'text-purple-600',
    borderColor: 'border-l-purple-500',
    icon: Clock,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  weekly_recap: {
    label: 'Recap hebdo',
    color: 'text-emerald-600',
    borderColor: 'border-l-emerald-500',
    icon: MailCheck,
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  system: {
    label: 'Systeme',
    color: 'text-neutral-600',
    borderColor: 'border-l-neutral-500',
    icon: AlertCircle,
    bgColor: 'bg-neutral-100 dark:bg-neutral-800',
  },
  attendance_marked: {
    label: 'Presence',
    color: 'text-teal-600',
    borderColor: 'border-l-teal-500',
    icon: ClipboardCheck,
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
  },
  grade_published: {
    label: 'Note publiee',
    color: 'text-orange-600',
    borderColor: 'border-l-orange-500',
    icon: FileBarChart,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  import_completed: {
    label: 'Import termine',
    color: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    icon: Upload,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  info: {
    label: 'Information',
    color: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    icon: Info,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  warning: {
    label: 'Avertissement',
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    icon: AlertTriangle,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  success: {
    label: 'Succes',
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  availability_requested: {
    label: 'Demande dispo',
    color: 'text-primary-600',
    borderColor: 'border-l-primary-500',
    icon: CalendarClock,
    bgColor: 'bg-primary-100 dark:bg-primary-900/30',
  },
  unavailability_declared: {
    label: 'Indisponibilite',
    color: 'text-red-600',
    borderColor: 'border-l-red-500',
    icon: CalendarX,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  assignment_pending: {
    label: 'Affectation',
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    icon: UserCheck,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  assignment_accepted: {
    label: 'Affectation acceptee',
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  assignment_rejected: {
    label: 'Affectation refusee',
    color: 'text-red-600',
    borderColor: 'border-l-red-500',
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  change_request_pending: {
    label: 'Modification',
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    icon: RefreshCw,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  change_request_accepted: {
    label: 'Modif. acceptee',
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  change_request_rejected: {
    label: 'Modif. refusee',
    color: 'text-red-600',
    borderColor: 'border-l-red-500',
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  planning_message: {
    label: 'Message',
    color: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    icon: MessageSquare,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  availability_demand_sent: {
    label: 'Demande dispo',
    color: 'text-primary-600',
    borderColor: 'border-l-primary-500',
    icon: CalendarClock,
    bgColor: 'bg-primary-100 dark:bg-primary-900/30',
  },
  availability_response_received: {
    label: 'Reponse dispo',
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    icon: CheckCircle,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  replacement_request_sent: {
    label: 'Remplacement',
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    icon: UserPlus,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  replacement_candidate_accepted: {
    label: 'Candidat accepte',
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    icon: UserCheck,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  replacement_selected: {
    label: 'Selection',
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    icon: Award,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  session_needs_reschedule: {
    label: 'A replanifier',
    color: 'text-red-600',
    borderColor: 'border-l-red-500',
    icon: AlertTriangle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  bulletin_generated: {
    label: 'Bulletin genere',
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    icon: FileBarChart,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  bulletin_sent: {
    label: 'Bulletin envoye',
    color: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    icon: Send,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  absence_report_sent: {
    label: 'Signalement absence',
    color: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    icon: AlertTriangle,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
}

const PAGE_SIZE = 20

// ==================== PREFERENCES SECTION ====================

interface NotificationPrefs {
  session_created: boolean
  session_updated: boolean
  session_cancelled: boolean
  reminder: boolean
  weekly_recap: boolean
  system: boolean
}

function PreferencesSection({ onClose }: { onClose: () => void }) {
  const { isSupported, isSubscribed, subscribe, unsubscribe, permissionState } = usePushSubscription()
  const [pushToggling, setPushToggling] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    session_created: true,
    session_updated: true,
    session_cancelled: true,
    reminder: true,
    weekly_recap: true,
    system: true,
  })

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePushToggle = async () => {
    setPushToggling(true)
    try {
      if (isSubscribed) await unsubscribe()
      else await subscribe()
    } finally {
      setPushToggling(false)
    }
  }

  const prefItems: Array<{ key: keyof NotificationPrefs; label: string; description: string }> = [
    { key: 'session_created', label: 'Nouvelles seances', description: 'Quand une seance est creee dans votre emploi du temps' },
    { key: 'session_updated', label: 'Modifications de seances', description: 'Quand une seance existante est modifiee' },
    { key: 'session_cancelled', label: 'Annulations de seances', description: 'Quand une seance est annulee' },
    { key: 'reminder', label: 'Rappels', description: 'Rappels avant le debut des seances (J-1, H-1)' },
    { key: 'weekly_recap', label: 'Recap hebdomadaire', description: 'Resume de votre semaine chaque dimanche' },
    { key: 'system', label: 'Notifications systeme', description: 'Mises a jour, maintenance, nouveautes' },
  ]

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-neutral-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Preferences de notifications</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
          <X size={18} className="text-neutral-500" />
        </button>
      </div>

      {/* Push notification toggle */}
      {isSupported && (
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-violet-50 dark:bg-violet-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-violet-600" />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Notifications push</p>
                <p className="text-xs text-neutral-500">
                  {permissionState === 'denied'
                    ? 'Bloquées par le navigateur'
                    : isSubscribed
                      ? 'Activées sur cet appareil'
                      : 'Recevez des alertes en temps réel'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePushToggle}
              disabled={pushToggling || permissionState === 'denied'}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isSubscribed ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-600'
              } ${pushToggling || permissionState === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                isSubscribed ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {prefItems.map(item => (
          <div key={item.key} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.label}</p>
              <p className="text-xs text-neutral-500">{item.description}</p>
            </div>
            <button
              type="button"
              onClick={() => togglePref(item.key)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                prefs[item.key] ? 'bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                prefs[item.key] ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </button>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
        <Button size="sm" onClick={onClose}>Enregistrer</Button>
      </div>
    </div>
  )
}

// ==================== NOTIFICATION CARD ====================

function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: InAppNotification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system
  const Icon = cfg.icon
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })

  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-xl border border-l-4 px-4 py-3 transition-all hover:shadow-sm ${
        cfg.borderColor
      } ${
        notification.isRead
          ? 'border-neutral-200 dark:border-neutral-700 opacity-70'
          : 'border-neutral-200 dark:border-neutral-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${cfg.bgColor}`}>
          <Icon size={16} className={cfg.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-sm font-semibold ${
              notification.isRead
                ? 'text-neutral-600 dark:text-neutral-400'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-neutral-400">{timeAgo}</span>
            <Badge variant={
              notification.type === 'session_created' ? 'info' :
              notification.type === 'session_cancelled' ? 'error' :
              notification.type === 'session_updated' ? 'warning' :
              notification.type === 'reminder' || notification.type === 'weekly_recap' ? 'success' :
              'neutral'
            } size="sm">
              {cfg.label}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.isRead && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              title="Marquer comme lu"
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <Check size={16} className="text-neutral-400 hover:text-primary-500" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            title="Supprimer"
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Trash2 size={16} className="text-neutral-400 hover:text-red-500" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== DEMO NOTIFICATIONS ====================

const DEMO_NOTIFICATIONS: InAppNotification[] = [
  {
    id: '1', userId: 'u1', centerId: 'c1',
    title: 'Nouvelle seance ajoutee',
    message: 'La seance "Mathematiques - Algebre" a ete ajoutee au planning du lundi 10 mars, 09:00 - 11:00 en Salle 101.',
    type: 'session_created', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: '2', userId: 'u1', centerId: 'c1',
    title: 'Seance modifiee',
    message: 'La seance "Anglais Professionnel" du mardi 11 mars a ete deplacee de 14:00 a 15:30.',
    type: 'session_updated', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3', userId: 'u1', centerId: 'c1',
    title: 'Rappel : Seance demain',
    message: 'Vous avez une seance "Developpement Web" demain a 09:00 en Labo Info 1.',
    type: 'reminder', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4', userId: 'u1', centerId: 'c1',
    title: 'Seance annulee',
    message: 'La seance "Culture Generale" du mercredi 12 mars a ete annulee par l\'administration.',
    type: 'session_cancelled', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '5', userId: 'u1', centerId: 'c1',
    title: 'Recap de la semaine',
    message: 'Vous avez eu 12 seances cette semaine pour un total de 24h. Consultez votre emploi du temps pour la semaine prochaine.',
    type: 'weekly_recap', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: '6', userId: 'u1', centerId: 'c1',
    title: 'Maintenance prevue',
    message: 'Une maintenance est prevue le samedi 15 mars de 02:00 a 06:00. L\'application sera temporairement indisponible.',
    type: 'system', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: '7', userId: 'u1', centerId: 'c1',
    title: 'Nouvelle seance ajoutee',
    message: 'La seance "Base de donnees" a ete ajoutee au planning du jeudi 13 mars.',
    type: 'session_created', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
  {
    id: '8', userId: 'u1', centerId: 'c1',
    title: 'Rappel : Evaluation demain',
    message: 'Rappel : vous avez une evaluation "DS1 - Algebre" demain a 09:00.',
    type: 'reminder', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
]

// ==================== MAIN PAGE ====================

export default function NotificationsPage() {
  useAuthContext() // ensure auth context is available
  const {
    notifications: liveNotifications,
    unreadCount: liveUnreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  // Use demo data if no real notifications
  const notifications = liveNotifications.length > 0 ? liveNotifications : DEMO_NOTIFICATIONS
  // Use demo data if no real notifications
  void liveUnreadCount // used below via effectiveUnread

  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showPrefs, setShowPrefs] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Local deletion tracking for demo mode
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Filter notifications
  const filtered = useMemo(() => {
    let result = notifications.filter(n => !deletedIds.has(n.id))
    if (activeTab !== 'all') {
      result = result.filter(n => TYPE_TO_TAB[n.type] === activeTab)
    }
    return result
  }, [notifications, activeTab, deletedIds])

  const visibleNotifications = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id)
    setReadIds(prev => new Set(prev).add(id))
  }, [markAsRead])

  const handleDelete = useCallback((id: string) => {
    deleteNotification(id)
    setDeletedIds(prev => new Set(prev).add(id))
  }, [deleteNotification])

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead()
    setReadIds(new Set(notifications.map(n => n.id)))
  }, [markAllAsRead, notifications])

  const handleClearAll = useCallback(() => {
    setDeletedIds(new Set(notifications.map(n => n.id)))
  }, [notifications])

  // Effective read status (merge live + local)
  const getNotification = useCallback((n: InAppNotification): InAppNotification => {
    if (readIds.has(n.id)) return { ...n, isRead: true }
    return n
  }, [readIds])

  const effectiveUnread = filtered.filter(n => !n.isRead && !readIds.has(n.id)).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Bell size={22} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Notifications
            </h1>
            <p className="text-sm text-neutral-500">
              {effectiveUnread > 0
                ? `${effectiveUnread} non lue${effectiveUnread > 1 ? 's' : ''}`
                : 'Tout est a jour'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={Settings}
            onClick={() => setShowPrefs(!showPrefs)}
          >
            <span className="hidden sm:inline">Preferences</span>
          </Button>
        </div>
      </div>

      <HelpBanner storageKey="notifications">
        Retrouvez toutes vos notifications : séances créées ou modifiées, rappels, résultats publiés. Filtrez par catégorie et marquez-les comme lues. Activez les notifications push pour ne rien manquer.
      </HelpBanner>

      {/* Preferences panel */}
      {showPrefs && <PreferencesSection onClose={() => setShowPrefs(false)} />}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => {
          const Icon = tab.icon
          const count = tab.key === 'all'
            ? filtered.length
            : notifications.filter(n => !deletedIds.has(n.id) && TYPE_TO_TAB[n.type] === tab.key).length
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setVisibleCount(PAGE_SIZE); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {count > 0 && (
                <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bulk actions */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2">
          {effectiveUnread > 0 && (
            <Button variant="ghost" size="sm" leftIcon={CheckCheck} onClick={handleMarkAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
          <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={handleClearAll}>
            Tout supprimer
          </Button>
        </div>
      )}

      {/* Notification list */}
      {visibleNotifications.length > 0 ? (
        <div className="space-y-2">
          {visibleNotifications.map(n => (
            <NotificationCard
              key={n.id}
              notification={getNotification(n)}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
            <BellOff size={24} className="text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Aucune notification
          </h3>
          <p className="text-sm text-neutral-500 max-w-xs">
            {activeTab !== 'all'
              ? 'Aucune notification dans cette categorie.'
              : 'Vous etes a jour ! Les nouvelles notifications apparaitront ici.'}
          </p>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={ChevronDown}
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          >
            Voir plus ({filtered.length - visibleCount} restantes)
          </Button>
        </div>
      )}
    </div>
  )
}
