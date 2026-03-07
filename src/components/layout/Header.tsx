import React, { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import {
  Bell,
  Settings,
  User,
  Moon,
  Sun,
  ChevronDown,
  Search,
  Menu,
  LogOut,
  HelpCircle,
} from 'lucide-react'
import { User as UserType } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  super_admin: 'Super Admin',
  teacher: 'Enseignant',
  trainer: 'Formateur',
  student: 'Étudiant',
  staff: 'Personnel',
  coordinator: 'Coordinateur',
}

interface HeaderProps {
  user?: UserType | null
  onMenuToggle?: () => void
  isDarkMode?: boolean
  onThemeToggle?: () => void
  onNotificationsClick?: () => void
  onNavigate?: (path: string) => void
  onLogout?: () => void
  className?: string
  unreadCount?: number
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onMenuToggle,
  isDarkMode = false,
  onThemeToggle,
  onNotificationsClick,
  onNavigate,
  onLogout,
  className,
  unreadCount = 0,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu au clic extérieur
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const navigate = (path: string) => {
    setMenuOpen(false)
    onNavigate?.(path)
  }

  return (
    <header
      className={clsx(
        'bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-soft',
        'h-16 flex items-center justify-between px-4 lg:px-6',
        'sticky top-0 z-30',
        className
      )}
    >
      {/* Left side */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
        >
          <Menu size={20} className="text-neutral-600 dark:text-neutral-400" />
        </button>

        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}>
            A
          </div>
          <span className="hidden sm:block font-display font-semibold text-xl text-neutral-900 dark:text-neutral-100">
            AntiPlanning
          </span>
        </div>

        {/* Search bar - Desktop only */}
        <div className="hidden md:flex relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-neutral-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher salles, événements..."
            className="w-80 pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg
                     text-neutral-900 dark:text-neutral-100 placeholder-neutral-500
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     transition-all duration-200"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-2">
        {/* Search button - Mobile only */}
        <button className="md:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200">
          <Search size={20} className="text-neutral-600 dark:text-neutral-400" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
        >
          {isDarkMode ? (
            <Sun size={20} className="text-neutral-600 dark:text-neutral-400" />
          ) : (
            <Moon size={20} className="text-neutral-600 dark:text-neutral-400" />
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
          title="Notifications"
        >
          <Bell size={20} className="text-neutral-600 dark:text-neutral-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-error-500 rounded-full leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu with dropdown */}
        {user && (
          <div ref={menuRef} className="relative flex items-center space-x-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800
                       transition-colors duration-200"
            >
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <User size={16} className="text-primary-600" />
                )}
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>

              <ChevronDown size={16} className={clsx('text-neutral-400 transition-transform', menuOpen && 'rotate-180')} />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg py-1 z-50">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                </div>

                {/* Navigation items */}
                <div className="py-1">
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <User size={16} className="text-neutral-400" />
                    Mon profil
                  </button>
                  {user?.role && ['admin', 'staff', 'super_admin'].includes(user.role) && (
                    <button
                      onClick={() => navigate('/settings')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Settings size={16} className="text-neutral-400" />
                      Paramètres
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/help')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <HelpCircle size={16} className="text-neutral-400" />
                    Aide & Support
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 py-1">
                  <button
                    onClick={() => { setMenuOpen(false); onLogout?.() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-950 transition-colors"
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
