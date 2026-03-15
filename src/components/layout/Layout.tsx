import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NotificationPanel } from './NotificationPanel'
import { useNotifications } from '@/hooks/useNotifications'
import { useChatNotifications } from '@/hooks/useChat'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { User } from '@/types'
import { Download, X, Share } from 'lucide-react'
import { OfflineBanner } from '@/components/OfflineBanner'

interface LayoutProps {
  children: React.ReactNode
  user?: User | null
  currentPath?: string
  onNavigate?: (path: string) => void
  onLogout?: () => void
}

function getInitialTheme(): boolean {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  // Auto : respecter la préférence système
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  currentPath = '/',
  onNavigate,
  onLogout,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  // Install prompt state is now managed inside useInstallPrompt (7-day localStorage dismiss)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()
  const { messages: chatMessages, totalUnread: chatUnreadCount } = useChatNotifications()
  const { isInstallable, showIosInstructions, promptInstall, dismiss: dismissInstall } = useInstallPrompt()
  // Appliquer le thème au montage et à chaque changement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Sync si le thème est changé ailleurs (ex: SettingsPage)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  const handleThemeToggle = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
      >
        Passer au contenu
      </a>

      {/* Offline banner */}
      <OfflineBanner />

      {/* Install banner (Android / Desktop) */}
      {isInstallable && (
        <div className="bg-primary-600 text-white text-sm py-2 px-4 flex items-center justify-center gap-3">
          <Download size={16} />
          <span>Installer Anti-Planning sur votre appareil</span>
          <button
            onClick={promptInstall}
            className="px-3 py-0.5 bg-white text-primary-700 rounded-md text-xs font-semibold hover:bg-primary-50 transition-colors"
          >
            Installer
          </button>
          <button onClick={dismissInstall} aria-label="Fermer" className="ml-1 p-0.5 hover:bg-primary-700 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Install banner (iOS - manual instructions) */}
      {showIosInstructions && (
        <div className="bg-primary-600 text-white text-sm py-2 px-4 flex items-center justify-center gap-3">
          <Share size={16} />
          <span>Appuyez sur Partager puis Ajouter a l'ecran d'accueil</span>
          <button onClick={dismissInstall} aria-label="Fermer" className="ml-1 p-0.5 hover:bg-primary-700 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header + Notification Panel */}
      <div className="relative">
        <Header
          user={user}
          onMenuToggle={handleMenuToggle}
          isDarkMode={isDarkMode}
          onThemeToggle={handleThemeToggle}
          onNotificationsClick={() => setNotifPanelOpen(prev => !prev)}
          onNavigate={onNavigate}
          onLogout={onLogout}
          unreadCount={unreadCount + chatUnreadCount}
        />
        <NotificationPanel
          isOpen={notifPanelOpen}
          onClose={() => setNotifPanelOpen(false)}
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
          onNavigate={(path) => { onNavigate?.(path); setNotifPanelOpen(false) }}
          chatMessages={chatMessages}
          chatUnreadCount={chatUnreadCount}
        />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          currentPath={currentPath}
          userRole={user?.role}
          onNavigate={(path) => {
            onNavigate?.(path)
            handleSidebarClose()
          }}
        />

        {/* Main content */}
        <main id="main-content" className="flex-1 lg:ml-0">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
