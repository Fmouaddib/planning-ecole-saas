import React, { useRef, useEffect, useState } from 'react'
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
  ClipboardCheck,
  FileBarChart,
  Upload, Send,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  UserPlus,
  XCircle,
  RefreshCw,
  MessageSquare,
  Award,
  MessageCircle,
  Users,
  BookOpen,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { InAppNotification, InAppNotificationType } from '@/types'
import type { ChatNotifMessage } from '@/hooks/useChat'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  notifications: InAppNotification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onDelete: (id: string) => void
  onNavigate?: (path: string) => void
  chatMessages?: ChatNotifMessage[]
  chatUnreadCount?: number
}

const TYPE_CONFIG: Record<InAppNotificationType, { icon: React.ElementType; color: string }> = {
  session_created: { icon: CalendarPlus, color: 'text-success-600 bg-success-50' },
  session_updated: { icon: CalendarClock, color: 'text-warning-600 bg-warning-50' },
  session_cancelled: { icon: CalendarX, color: 'text-error-600 bg-error-50' },
  reminder: { icon: Clock, color: 'text-primary-600 bg-primary-50' },
  weekly_recap: { icon: BarChart3, color: 'text-info-600 bg-info-50' },
  system: { icon: Info, color: 'text-neutral-600 bg-neutral-100' },
  attendance_marked: { icon: ClipboardCheck, color: 'text-teal-600 bg-teal-50' },
  grade_published: { icon: FileBarChart, color: 'text-orange-600 bg-orange-50' },
  import_completed: { icon: Upload, color: 'text-blue-600 bg-blue-50' },
  info: { icon: Info, color: 'text-blue-600 bg-blue-50' },
  warning: { icon: AlertTriangle, color: 'text-warning-600 bg-warning-50' },
  success: { icon: CheckCircle, color: 'text-success-600 bg-success-50' },
  availability_requested: { icon: CalendarClock, color: 'text-primary-600 bg-primary-50' },
  unavailability_declared: { icon: CalendarX, color: 'text-error-600 bg-error-50' },
  assignment_pending: { icon: UserCheck, color: 'text-warning-600 bg-warning-50' },
  assignment_accepted: { icon: CheckCircle, color: 'text-success-600 bg-success-50' },
  assignment_rejected: { icon: XCircle, color: 'text-error-600 bg-error-50' },
  change_request_pending: { icon: RefreshCw, color: 'text-warning-600 bg-warning-50' },
  change_request_accepted: { icon: CheckCircle, color: 'text-success-600 bg-success-50' },
  change_request_rejected: { icon: XCircle, color: 'text-error-600 bg-error-50' },
  planning_message: { icon: MessageSquare, color: 'text-info-600 bg-info-50' },
  availability_demand_sent: { icon: CalendarClock, color: 'text-primary-600 bg-primary-50' },
  availability_response_received: { icon: CheckCircle, color: 'text-success-600 bg-success-50' },
  replacement_request_sent: { icon: UserPlus, color: 'text-warning-600 bg-warning-50' },
  replacement_candidate_accepted: { icon: UserCheck, color: 'text-success-600 bg-success-50' },
  replacement_selected: { icon: Award, color: 'text-success-600 bg-success-50' },
  session_needs_reschedule: { icon: AlertTriangle, color: 'text-error-600 bg-error-50' },
  bulletin_generated: { icon: FileBarChart, color: 'text-success-600 bg-success-50' },
  bulletin_sent: { icon: Send, color: 'text-primary-600 bg-primary-50' },
  absence_report_sent: { icon: AlertTriangle, color: 'text-warning-600 bg-warning-50' },
}

const CHANNEL_TYPE_ICON: Record<string, React.ElementType> = {
  dm: MessageCircle,
  class: Users,
  subject: BookOpen,
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNavigate,
  chatMessages = [],
  chatUnreadCount = 0,
}) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'notifications' | 'messages'>('notifications')

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

  const handleNotifClick = (notif: InAppNotification) => {
    if (!notif.isRead) onMarkAsRead(notif.id)
    if (notif.link && onNavigate) {
      onNavigate(notif.link)
      onClose()
    }
  }

  const handleMessageClick = (msg: ChatNotifMessage) => {
    if (onNavigate) {
      onNavigate(`/chat?channel=${msg.channelId}`)
      onClose()
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-2 top-full mt-1 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex border-b border-neutral-100 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'notifications'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Bell size={14} />
          Notifications
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-error-500 rounded-full leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'messages'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <MessageCircle size={14} />
          Messages
          {chatUnreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-primary-500 rounded-full leading-none">
              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
            </span>
          )}
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={14} className="text-neutral-400" />
        </button>
      </div>

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <>
          {/* Mark all as read header */}
          {unreadCount > 0 && (
            <div className="flex items-center justify-end px-4 py-1.5 border-b border-neutral-50 dark:border-neutral-800">
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1"
              >
                <Check size={12} />
                Tout marquer comme lu
              </button>
            </div>
          )}

          {/* Notification list */}
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
                    onClick={() => handleNotifClick(notif)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-neutral-50 dark:border-neutral-800 last:border-0 cursor-pointer transition-colors ${
                      notif.isRead
                        ? 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        : 'bg-primary-50/50 dark:bg-primary-950/30 hover:bg-primary-50 dark:hover:bg-primary-950/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 p-2 rounded-lg ${iconBg} dark:bg-opacity-20`}>
                      <Icon size={16} className={iconColor} />
                    </div>
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
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(notif.id) }}
                      className="flex-shrink-0 p-1 rounded opacity-0 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
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

          {/* Footer */}
          {notifications.length > 0 && onNavigate && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2">
              <button
                onClick={() => { onNavigate('/notifications'); onClose() }}
                className="w-full text-center text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 py-1"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </>
      )}

      {/* MESSAGES TAB */}
      {activeTab === 'messages' && (
        <>
          <div className="max-h-96 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="py-12 text-center">
                <MessageCircle size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Aucun message non lu</p>
              </div>
            ) : (
              chatMessages.map(msg => {
                const ChannelIcon = CHANNEL_TYPE_ICON[msg.channelType] || MessageCircle
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleMessageClick(msg)}
                    className="flex items-start gap-3 px-4 py-3 border-b border-neutral-50 dark:border-neutral-800 last:border-0 cursor-pointer bg-primary-50/30 dark:bg-primary-950/20 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                      <ChannelIcon size={16} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          dans {msg.channelName}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {msg.content}
                      </p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-500" />
                  </div>
                )
              })
            )}
          </div>

          {/* Footer - go to chat */}
          {onNavigate && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2">
              <button
                onClick={() => { onNavigate('/chat'); onClose() }}
                className="w-full text-center text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 py-1"
              >
                Ouvrir la messagerie
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
