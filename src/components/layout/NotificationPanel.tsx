import React, { useRef, useEffect } from 'react'
import {
  Bell,
  CalendarPlus,
  CalendarClock,
  CalendarX,
  Clock,
  BarChart3,
  Info,
  Check,
  Trash2,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InAppNotification, InAppNotificationType } from '@/types'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  notifications: InAppNotification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
  onNavigate?: (path: string) => void
}

const TYPE_CONFIG: Record<InAppNotificationType, { icon: React.ElementType; color: string }> = {
  session_created: { icon: CalendarPlus, color: 'text-success-600 bg-success-50' },
  session_updated: { icon: CalendarClock, color: 'text-warning-600 bg-warning-50' },
  session_cancelled: { icon: CalendarX, color: 'text-error-600 bg-error-50' },
  reminder: { icon: Clock, color: 'text-primary-600 bg-primary-50' },
  weekly_recap: { icon: BarChart3, color: 'text-info-600 bg-info-50' },
  system: { icon: Info, color: 'text-neutral-600 bg-neutral-100' },
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNavigate,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  // Fermer avec Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleClick = (notif: InAppNotification) => {
    if (!notif.isRead) onMarkAsRead(notif.id)
    if (notif.link && onNavigate) {
      onNavigate(notif.link)
      onClose()
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-2 top-full mt-1 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-medium text-primary-600 dark:text-primary-400">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
            >
              <Check size={12} />
              Tout marquer comme lu
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={14} className="text-neutral-400" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Aucune notification</p>
          </div>
        ) : (
          notifications.map(notif => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
            const Icon = config.icon
            const [iconColor, iconBg] = config.color.split(' ')

            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex items-start gap-3 px-4 py-3 border-b border-neutral-50 dark:border-neutral-800 last:border-0 cursor-pointer transition-colors ${
                  notif.isRead
                    ? 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    : 'bg-primary-50/50 dark:bg-primary-950/30 hover:bg-primary-50 dark:hover:bg-primary-950/50'
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 p-2 rounded-lg ${iconBg} dark:bg-opacity-20`}>
                  <Icon size={16} className={iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${
                      notif.isRead
                        ? 'text-neutral-700 dark:text-neutral-300'
                        : 'font-semibold text-neutral-900 dark:text-neutral-100'
                    }`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(notif.id) }}
                  className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                  style={{ opacity: undefined }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  title="Supprimer"
                >
                  <Trash2 size={12} className="text-neutral-400 hover:text-error-500" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
