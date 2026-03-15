import React, { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import {
  Calendar,
  Users,
  Building2,
  BarChart3,
  Home,
  Clock,
  Shield,
  GraduationCap,
  Video,
  Mail,
  ClipboardCheck,
  FileBarChart,
  UserCog,
  ChevronDown,
  MessageCircle,
  ArrowLeftRight,
  Globe,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { isTeacherRole, isStudentRole } from '@/utils/helpers'
import { SidebarCalendar } from './SidebarCalendar'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { useFeatureGate } from '@/hooks/useFeatureGate'
import { useChatUnread } from '@/hooks/useChat'
import { useAuthContext } from '@/contexts/AuthContext'
import { getActiveContext } from '@/utils/userContext'
import { isDemoMode } from '@/lib/supabase'
import { getLandingUrl } from '@/utils/subdomain'
import { useLang } from '@/hooks/useLang'

interface NavigationItem {
  icon: React.ComponentType<any>
  label: string
  href?: string
  onClick?: () => void
  badge?: string
  active?: boolean
  roles?: UserRole[]
  group?: string
  dataTour?: string
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  currentPath?: string
  userRole?: UserRole
  onNavigate?: (path: string) => void
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  currentPath = '/',
  userRole = 'teacher',
  onNavigate,
  className
}) => {
  const { t } = useLang()
  const { plan } = useSubscriptionInfo()
  const isOnlineSchool = plan?.tier === 'ecole-en-ligne'
  const { hasAttendance, hasGrades, hasTeacherCollab } = useFeatureGate()
  const chatUnread = useChatUnread()
  const { contexts, switchContext } = useAuthContext()
  const activeCtx = getActiveContext()
  const hasMultipleContexts = contexts.length > 1

  const groupLabels: Record<string, string> = {
    enseignement: t('sidebar.group.enseignement'),
    gestion: t('sidebar.group.gestion'),
    fonctionnalites: t('sidebar.group.fonctionnalites'),
  }

  const mainNavigation: NavigationItem[] = [
    // --- Top (ungrouped) ---
    {
      icon: Home,
      label: t('sidebar.dashboard'),
      href: '/',
      active: currentPath === '/'
    },
    {
      icon: Calendar,
      label: isStudentRole(userRole) ? t('sidebar.mySchedule') : isTeacherRole(userRole) ? t('sidebar.myPlanning') : t('sidebar.planning'),
      href: '/planning',
      active: currentPath === '/planning',
      dataTour: 'planning',
    },
    {
      icon: GraduationCap,
      label: t('sidebar.academic'),
      href: '/academic',
      active: currentPath === '/academic',
      roles: ['admin'],
      dataTour: 'referentiel',
    },
    {
      icon: GraduationCap,
      label: t('sidebar.myClass'),
      href: '/my-class',
      active: currentPath === '/my-class',
      roles: ['student'] as UserRole[],
    },
    ...((plan?.hasChat || isDemoMode) ? [{
      icon: MessageCircle,
      label: t('sidebar.messages'),
      href: '/chat',
      active: currentPath === '/chat',
      badge: chatUnread > 0 ? String(chatUnread) : undefined,
      dataTour: 'chat',
    }] : []),
    // --- Enseignement ---
    ...(isOnlineSchool
      ? [{
          icon: Video,
          label: t('sidebar.visio'),
          href: '/visio',
          active: currentPath === '/visio',
          roles: ['admin', 'staff'] as UserRole[],
          group: 'enseignement',
        }]
      : [{
          icon: Clock,
          label: isTeacherRole(userRole) ? t('sidebar.mySessions') : t('sidebar.sessions'),
          href: '/bookings',
          active: currentPath === '/bookings',
          group: 'enseignement',
        }]
    ),
    ...((hasTeacherCollab || isDemoMode || (!isTeacherRole(userRole))) ? [{
      icon: UserCog,
      label: isTeacherRole(userRole) ? t('sidebar.collab') : t('sidebar.collabTeachers'),
      href: '/teacher-collab',
      active: currentPath === '/teacher-collab',
      roles: ['admin', 'staff', 'teacher'] as UserRole[],
      group: 'enseignement',
    }] : []),
    // --- Gestion ---
    ...(!isOnlineSchool
      ? [{
          icon: Building2,
          label: t('sidebar.rooms'),
          href: '/rooms',
          active: currentPath === '/rooms',
          roles: ['admin', 'staff'] as UserRole[],
          group: 'gestion',
        }]
      : []
    ),
    {
      icon: Users,
      label: t('sidebar.users'),
      href: '/users',
      active: currentPath === '/users',
      roles: ['admin'],
      group: 'gestion',
      dataTour: 'users',
    },
    {
      icon: BarChart3,
      label: t('sidebar.analytics'),
      href: '/analytics',
      active: currentPath === '/analytics',
      roles: ['admin', 'staff'],
      group: 'gestion',
    },
    {
      icon: Mail,
      label: t('sidebar.emails'),
      href: '/emails',
      active: currentPath === '/emails',
      roles: ['admin'] as UserRole[],
      group: 'gestion',
    },
    // --- Fonctionnalités (refermé par défaut) ---
    ...((hasAttendance || isDemoMode) ? [{
      icon: ClipboardCheck,
      label: isStudentRole(userRole) ? t('sidebar.myAttendance') : isTeacherRole(userRole) ? t('sidebar.rollCall') : t('sidebar.attendance'),
      href: '/attendance',
      active: currentPath === '/attendance',
      group: 'fonctionnalites',
      dataTour: 'attendance',
    }] : []),
    ...((hasGrades || isDemoMode) ? [{
      icon: FileBarChart,
      label: isStudentRole(userRole) ? t('sidebar.myTranscript') : isTeacherRole(userRole) ? t('sidebar.myGrades') : t('sidebar.grades'),
      href: '/grades',
      active: currentPath === '/grades',
      group: 'fonctionnalites',
    }] : []),
  ]

  const handleItemClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.href && onNavigate) {
      onNavigate(item.href)
    }
  }

  const shouldShowItem = (item: NavigationItem) => {
    if (item.href === '/bookings' && isStudentRole(userRole)) return false
    if (!item.roles) return true
    if (userRole === 'super_admin') {
      return !item.roles.every(r => isStudentRole(r))
    }
    return item.roles.includes(userRole)
  }

  const visibleItems = useMemo(() => mainNavigation.filter(shouldShowItem), [currentPath, userRole, isOnlineSchool, hasAttendance, hasGrades])
  const showGroupHeaders = visibleItems.length > 6

  const activeGroup = useMemo(() => {
    const active = visibleItems.find(item => item.active && item.group)
    return active?.group || null
  }, [visibleItems])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ enseignement: true, gestion: true, fonctionnalites: true })

  const toggleGroup = (group: string) => {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const grouped = useMemo(() => {
    if (!showGroupHeaders) return [{ group: null, items: visibleItems }]

    const result: { group: string | null; items: NavigationItem[] }[] = []
    let current: { group: string | null; items: NavigationItem[] } | null = null

    for (const item of visibleItems) {
      const g = item.group || null
      if (!current || current.group !== g) {
        current = { group: g, items: [] }
        result.push(current)
      }
      current.items.push(item)
    }
    return result
  }, [visibleItems, showGroupHeaders])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-50',
          'w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800',
          'transform transition-transform duration-300 ease-in-out lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'flex flex-col h-full',
          className
        )}
      >
        {/* Sidebar header - Mobile only */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}>
              A
            </div>
            <span className="font-display font-semibold text-lg text-neutral-900 dark:text-neutral-100">
              AntiPlanning
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {grouped.map((section, si) => {
            const isCollapsible = showGroupHeaders && !!section.group
            const groupKey = section.group || ''
            const isCollapsed = isCollapsible && collapsed[groupKey] && activeGroup !== groupKey

            return (
              <div key={si}>
                {isCollapsible && (
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between mt-3 mb-0.5 px-3 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      {groupLabels[groupKey]}
                    </span>
                    <ChevronDown
                      size={12}
                      className={clsx(
                        'text-neutral-400 transition-transform duration-200',
                        isCollapsed && '-rotate-90'
                      )}
                    />
                  </button>
                )}
                <div
                  className={clsx(
                    'space-y-0.5 overflow-hidden transition-all duration-200',
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                  )}
                >
                  {section.items.map((item, ii) => (
                    <NavItem
                      key={ii}
                      item={item}
                      onClick={() => handleItemClick(item)}
                    />
                  ))}
                  {/* Super Admin button inside gestion group — only for super_admin */}
                  {section.group === 'gestion' && userRole === 'super_admin' && (
                    <button
                      onClick={() => { window.location.hash = '#/super-admin'; }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all duration-200 ease-out group text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center space-x-3">
                        <Shield size={16} className="text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                        <span className="text-sm">{t('sidebar.superAdmin')}</span>
                      </div>
                      <span className="bg-red-100 text-red-800 text-[10px] font-medium px-1.5 py-0.5 rounded-full">SA</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Mini calendar — always visible */}
        <div className="px-4 pb-2">
          <SidebarCalendar onNavigate={onNavigate} />
        </div>

        {/* Context switcher */}
        {hasMultipleContexts && (
          <div className="px-3 pb-2">
            <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">{t('sidebar.activeSpace')}</p>
              <div className="space-y-1">
                {contexts.map((ctx, i) => {
                  const isActive = activeCtx?.centerId === ctx.centerId && activeCtx?.role === ctx.role
                  const roleLabel = ctx.role === 'super_admin' ? t('sidebar.role.superAdmin')
                    : ctx.role === 'teacher' ? t('sidebar.role.teacher')
                    : ctx.role === 'admin' ? t('sidebar.role.admin')
                    : ctx.role === 'student' ? t('sidebar.role.student')
                    : ctx.role
                  return (
                    <button
                      key={`${ctx.centerId}-${ctx.role}-${i}`}
                      onClick={() => switchContext(ctx)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-all',
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      )}
                    >
                      <ArrowLeftRight size={12} className={isActive ? 'text-primary-500' : 'text-neutral-400'} />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{roleLabel}</span>
                        <span className="block truncate text-[10px] opacity-70">{ctx.centerName}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          {(userRole === 'admin' || userRole === 'super_admin') && (
            <a
              href={getLandingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <Globe size={14} />
              <span>{t('sidebar.viewSite')}</span>
            </a>
          )}
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            <p className="font-medium">AntiPlanning v1.0</p>
            <p>{t('sidebar.tagline')}</p>
          </div>
        </div>
      </div>
    </>
  )
}

interface NavItemProps {
  item: NavigationItem
  onClick: () => void
}

const NavItem: React.FC<NavItemProps> = ({ item, onClick }) => {
  const { icon: Icon, label, active, badge, dataTour } = item

  return (
    <button
      onClick={onClick}
      data-tour={dataTour}
      className={clsx(
        'w-full flex items-center justify-between px-3 py-1.5 rounded-lg',
        'text-left transition-all duration-200 ease-out group',
        active
          ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-medium border-l-4 border-primary-600'
          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
      )}
    >
      <div className="flex items-center space-x-3">
        <Icon
          size={16}
          className={clsx(
            'transition-colors duration-200',
            active ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200'
          )}
        />
        <span className="text-sm">{label}</span>
      </div>

      {badge && (
        <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}
