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
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onLogout?: () => void
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onMenuToggle,
  isDarkMode = false,
  onThemeToggle,
  onNotificationsClick,
  onProfileClick,
  onSettingsClick,
  onLogout,
  className
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

  return (
    <header 
      className={clsx(
        'bg-white border-b border-neutral-200 shadow-soft',
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
          className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
        >
          <Menu size={20} className="text-neutral-600" />
        </button>

        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg, #FF5B46, #FBA625)' }}>
            A
          </div>
          <span className="hidden sm:block font-display font-semibold text-xl text-neutral-900">
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
            className="w-80 pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     transition-all duration-200"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-2">
        {/* Search button - Mobile only */}
        <button className="md:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200">
          <Search size={20} className="text-neutral-600" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
        >
          {isDarkMode ? (
            <Sun size={20} className="text-neutral-600" />
          ) : (
            <Moon size={20} className="text-neutral-600" />
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
          title="Notifications"
        >
          <Bell size={20} className="text-neutral-600" />
          {/* Notification badge */}
          <span className="absolute top-0 right-0 h-2 w-2 bg-error-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors duration-200"
          title="Paramètres"
        >
          <Settings size={20} className="text-neutral-600" />
        </button>

        {/* User menu with dropdown */}
        {user && (
          <div ref={menuRef} className="relative flex items-center space-x-2 pl-2 border-l border-neutral-200">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100
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
                <p className="text-sm font-medium text-neutral-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-neutral-500">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>

              <ChevronDown size={16} className={clsx('text-neutral-400 transition-transform', menuOpen && 'rotate-180')} />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 z-50">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="text-sm font-semibold text-neutral-900 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { setMenuOpen(false); onProfileClick?.() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <User size={16} className="text-neutral-400" />
                    Mon profil
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onSettingsClick?.() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <Settings size={16} className="text-neutral-400" />
                    Paramètres
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-neutral-100 py-1">
                  <button
                    onClick={() => { setMenuOpen(false); onLogout?.() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50 transition-colors"
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