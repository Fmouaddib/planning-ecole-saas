import React from 'react'
import { clsx } from 'clsx'
import {
  Calendar,
  Users,
  Building2,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Home,
  BookOpen,
  Clock,
  Shield,
  GraduationCap
} from 'lucide-react'
import type { UserRole } from '@/types'

interface NavigationItem {
  icon: React.ComponentType<any>
  label: string
  href?: string
  onClick?: () => void
  badge?: string
  active?: boolean
  roles?: UserRole[]
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  currentPath?: string
  userRole?: UserRole
  onNavigate?: (path: string) => void
  onLogout?: () => void
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  currentPath = '/',
  userRole = 'teacher',
  onNavigate,
  onLogout,
  className
}) => {
  const mainNavigation: NavigationItem[] = [
    {
      icon: Home,
      label: 'Tableau de bord',
      href: '/',
      active: currentPath === '/'
    },
    {
      icon: Calendar,
      label: 'Planning',
      href: '/planning',
      active: currentPath === '/planning'
    },
    {
      icon: Building2,
      label: 'Salles',
      href: '/rooms',
      active: currentPath === '/rooms',
      roles: ['admin', 'staff']
    },
    {
      icon: Users,
      label: 'Utilisateurs',
      href: '/users',
      active: currentPath === '/users',
      roles: ['admin']
    },
    {
      icon: BookOpen,
      label: 'Cours',
      href: '/courses',
      active: currentPath === '/courses',
      roles: ['admin', 'teacher']
    },
    {
      icon: Clock,
      label: 'Séances',
      href: '/bookings',
      active: currentPath === '/bookings'
    },
    {
      icon: GraduationCap,
      label: 'Référentiel',
      href: '/academic',
      active: currentPath === '/academic',
      roles: ['admin']
    },
    {
      icon: BarChart3,
      label: 'Statistiques',
      href: '/analytics',
      active: currentPath === '/analytics',
      roles: ['admin', 'staff']
    }
  ]

  const secondaryNavigation: NavigationItem[] = [
    {
      icon: Settings,
      label: 'Paramètres',
      href: '/settings',
      active: currentPath === '/settings'
    },
    {
      icon: HelpCircle,
      label: 'Aide & Support',
      href: '/help',
      active: currentPath === '/help'
    },
    {
      icon: LogOut,
      label: 'Déconnexion',
      onClick: onLogout
    }
  ]

  const handleItemClick = (item: NavigationItem) => {
    if (item.onClick) {
      item.onClick()
    } else if (item.href && onNavigate) {
      onNavigate(item.href)
    }
  }

  const shouldShowItem = (item: NavigationItem) => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  }

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
          'w-64 bg-white border-r border-neutral-200',
          'transform transition-transform duration-300 ease-in-out lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'flex flex-col h-full',
          className
        )}
      >
        {/* Sidebar header - Mobile only */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}>
              A
            </div>
            <span className="font-display font-semibold text-lg text-neutral-900">
              AntiPlanning
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {/* Main navigation */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Navigation principale
            </h3>
            <div className="space-y-1">
              {mainNavigation
                .filter(shouldShowItem)
                .map((item, index) => (
                  <NavItem
                    key={index}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ))
              }
            </div>
          </div>

          {/* Secondary navigation */}
          <div className="pt-6">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Système
            </h3>
            <div className="space-y-1">
              {secondaryNavigation
                .filter(item => item.label !== 'Déconnexion')
                .map((item, index) => (
                  <NavItem
                    key={index}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ))
              }

              {/* Super Admin - avant Déconnexion */}
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <button
                  onClick={() => { window.location.hash = '#/super-admin'; }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 ease-out group text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <div className="flex items-center space-x-3">
                    <Shield size={18} className="text-red-500 group-hover:text-red-600 transition-colors duration-200" />
                    <span className="text-sm">Espace Super Admin</span>
                  </div>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">SA</span>
                </button>
              )}

              {/* Déconnexion toujours en dernier */}
              {secondaryNavigation
                .filter(item => item.label === 'Déconnexion')
                .map((item, index) => (
                  <NavItem
                    key={`logout-${index}`}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ))
              }
            </div>
          </div>
        </nav>

        {/* Mini-calendar slot (filled by CalendarPage via portal) */}
        <div id="sidebar-mini-calendar" className="px-4" />

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200">
          <div className="text-xs text-neutral-500">
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
        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
        'text-left transition-all duration-200 ease-out group',
        active
          ? 'bg-primary-50 text-primary-700 font-medium border-l-4 border-primary-600'
          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
      )}
    >
      <div className="flex items-center space-x-3">
        <Icon 
          size={18} 
          className={clsx(
            'transition-colors duration-200',
            active ? 'text-primary-600' : 'text-neutral-500 group-hover:text-neutral-700'
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