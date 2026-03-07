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
  CreditCard,
  ChevronDown,
  MessageCircle,
  ArrowLeftRight,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { isTeacherRole, isStudentRole } from '@/utils/helpers'
import { SidebarCalendar } from './SidebarCalendar'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { useChatUnread } from '@/hooks/useChat'
import { useAuthContext } from '@/contexts/AuthContext'
import { getActiveContext } from '@/utils/userContext'
import { isDemoMode } from '@/lib/supabase'

interface NavigationItem {
  icon: React.ComponentType<any>
  label: string
  href?: string
  onClick?: () => void
  badge?: string
  active?: boolean
  roles?: UserRole[]
  group?: string
}

const GROUP_LABELS: Record<string, string> = {
  enseignement: 'Enseignement',
  gestion: 'Gestion',
  fonctionnalites: 'Fonctionnalités',
  parametres: 'Paramètres',
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
  const { plan } = useSubscriptionInfo()
  const isOnlineSchool = plan?.tier === 'ecole-en-ligne'
  const chatUnread = useChatUnread()
  const { contexts, switchContext } = useAuthContext()
  const activeCtx = getActiveContext()
  const hasMultipleContexts = contexts.length > 1

  const mainNavigation: NavigationItem[] = [
    // --- Top (ungrouped) ---
    {
      icon: Home,
      label: 'Tableau de bord',
      href: '/',
      active: currentPath === '/'
    },
    {
      icon: Calendar,
      label: isStudentRole(userRole) ? 'Mon emploi du temps' : isTeacherRole(userRole) ? 'Mon planning' : 'Planning',
      href: '/planning',
      active: currentPath === '/planning'
    },
    {
      icon: GraduationCap,
      label: 'Référentiel',
      href: '/academic',
      active: currentPath === '/academic',
      roles: ['admin'],
    },
    {
      icon: GraduationCap,
      label: 'Ma classe',
      href: '/my-class',
      active: currentPath === '/my-class',
      roles: ['student'] as UserRole[],
    },
    ...((plan?.hasChat || isDemoMode) ? [{
      icon: MessageCircle,
      label: 'Messages',
      href: '/chat',
      active: currentPath === '/chat',
      badge: chatUnread > 0 ? String(chatUnread) : undefined,
    }] : []),
    // --- Enseignement ---
    ...(isOnlineSchool
      ? [{
          icon: Video,
          label: 'Visio',
          href: '/visio',
          active: currentPath === '/visio',
          roles: ['admin', 'staff'] as UserRole[],
          group: 'enseignement',
        }]
      : [{
          icon: Clock,
          label: isTeacherRole(userRole) ? 'Mes séances' : 'Séances',
          href: '/bookings',
          active: currentPath === '/bookings',
          group: 'enseignement',
        }]
    ),
    {
      icon: UserCog,
      label: isTeacherRole(userRole) ? 'Collaboration' : 'Collaboration profs',
      href: '/teacher-collab',
      active: currentPath === '/teacher-collab',
      roles: ['admin', 'staff', 'teacher'] as UserRole[],
      group: 'enseignement',
    },
    // --- Gestion ---
    ...(!isOnlineSchool
      ? [{
          icon: Building2,
          label: 'Salles',
          href: '/rooms',
          active: currentPath === '/rooms',
          roles: ['admin', 'staff'] as UserRole[],
          group: 'gestion',
        }]
      : []
    ),
    {
      icon: Users,
      label: 'Utilisateurs',
      href: '/users',
      active: currentPath === '/users',
      roles: ['admin'],
      group: 'gestion',
    },
    {
      icon: BarChart3,
      label: 'Statistiques',
      href: '/analytics',
      active: currentPath === '/analytics',
      roles: ['admin', 'staff'],
      group: 'gestion',
    },
    // --- Fonctionnalités (refermé par défaut) ---
    {
      icon: ClipboardCheck,
      label: isStudentRole(userRole) ? 'Mes présences' : isTeacherRole(userRole) ? 'Appel' : 'Présences',
      href: '/attendance',
      active: currentPath === '/attendance',
      group: 'fonctionnalites',
    },
    {
      icon: FileBarChart,
      label: isStudentRole(userRole) ? 'Mon bulletin' : isTeacherRole(userRole) ? 'Mes notes' : 'Notes',
      href: '/grades',
      active: currentPath === '/grades',
      group: 'fonctionnalites',
    },
    {
      icon: Mail,
      label: 'Emails',
      href: '/emails',
      active: currentPath === '/emails',
      roles: ['admin'] as UserRole[],
      group: 'gestion',
    },
    // --- Paramètres (refermé par défaut) ---
    {
      icon: CreditCard,
      label: 'Facturation',
      href: '/billing',
      active: currentPath === '/billing',
      roles: ['admin'] as UserRole[],
      group: 'parametres',
    },
  ]

  const handleItemClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.href && onNavigate) {
      onNavigate(item.href)
    }
  }

  const shouldShowItem = (item: NavigationItem) => {
    // Masquer "Séances" pour les étudiants
    if (item.href === '/bookings' && isStudentRole(userRole)) return false
    if (!item.roles) return true
    // super_admin a accès à toutes les sections sauf celles réservées aux étudiants
    if (userRole === 'super_admin') {
      return !item.roles.every(r => isStudentRole(r))
    }
    return item.roles.includes(userRole)
  }

  const visibleItems = useMemo(() => mainNavigation.filter(shouldShowItem), [currentPath, userRole, isOnlineSchool])
  const showGroupHeaders = visibleItems.length > 6

  // Auto-expand group containing active item
  const activeGroup = useMemo(() => {
    const active = visibleItems.find(item => item.active && item.group)
    return active?.group || null
  }, [visibleItems])

  // Collapsed state per group — default: fonctionnalites + administration collapsed
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ fonctionnalites: true, parametres: true })

  const toggleGroup = (group: string) => {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
  }

  // Group visible items for rendering
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
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {grouped.map((section, si) => {
            const isCollapsible = showGroupHeaders && !!section.group
            const groupKey = section.group || ''
            // Force open if section contains active item
            const isCollapsed = isCollapsible && collapsed[groupKey] && activeGroup !== groupKey

            return (
              <div key={si}>
                {isCollapsible && (
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between mt-3 mb-0.5 px-3 py-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      {GROUP_LABELS[groupKey]}
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
                  {/* Super Admin button inside parametres group — only for super_admin */}
                  {section.group === 'parametres' && userRole === 'super_admin' && (
                    <button
                      onClick={() => { window.location.hash = '#/super-admin'; }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all duration-200 ease-out group text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      <div className="flex items-center space-x-3">
                        <Shield size={16} className="text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                        <span className="text-sm">Espace Super Admin</span>
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
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">Espace actif</p>
              <div className="space-y-1">
                {contexts.map((ctx, i) => {
                  const isActive = activeCtx?.centerId === ctx.centerId && activeCtx?.role === ctx.role
                  const roleLabel = ctx.role === 'super_admin' ? 'Super Admin'
                    : ctx.role === 'teacher' ? 'Professeur'
                    : ctx.role === 'admin' ? 'Admin'
                    : ctx.role === 'student' ? 'Étudiant'
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
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            <p className="font-medium">AntiPlanning v1.0</p>
            <p>Gestion premium pour établissements</p>
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
  const { icon: Icon, label, active, badge } = item

  return (
    <button
      onClick={onClick}
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
