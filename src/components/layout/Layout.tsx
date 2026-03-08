import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NotificationPanel } from './NotificationPanel'
import { useNotifications } from '@/hooks/useNotifications'
import { useChatNotifications } from '@/hooks/useChat'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { User } from '@/types'
import { Download, WifiOff, X } from 'lucide-react'

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
  const [installDismissed, setInstallDismissed] = useState(() => sessionStorage.getItem('pwa-install-dismissed') === '1')
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()
  const { messages: chatMessages, totalUnread: chatUnreadCount } = useChatNotifications()
  const { isInstallable, promptInstall } = useInstallPrompt()
  const isOnline = useOnlineStatus()

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

  const dismissInstall = () => {
    setInstallDismissed(true)
    sessionStorage.setItem('pwa-install-dismissed', '1')
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>Vous êtes hors connexion — certaines fonctionnalités sont indisponibles</span>
        </div>
      )}

      {/* Install banner */}
      {isInstallable && !installDismissed && (
        <div className="bg-primary-600 text-white text-sm py-2 px-4 flex items-center justify-center gap-3">
          <Download size={16} />
          <span>Installez Planning École pour un accès rapide</span>
          <button
            onClick={promptInstall}
            className="px-3 py-0.5 bg-white text-primary-700 rounded-md text-xs font-semibold hover:bg-primary-50 transition-colors"
          >
            Installer
          </button>
          <button onClick={dismissInstall} className="ml-1 p-0.5 hover:bg-primary-700 rounded transition-colors">
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
        <main className="flex-1 lg:ml-0">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
