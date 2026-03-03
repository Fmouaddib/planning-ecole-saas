import React, { useState, useEffect } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NotificationPanel } from './NotificationPanel'
import { useNotifications } from '@/hooks/useNotifications'
import { User } from '@/types'

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
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

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
          unreadCount={unreadCount}
        />
        <NotificationPanel
          isOpen={notifPanelOpen}
          onClose={() => setNotifPanelOpen(false)}
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
          onNavigate={(path) => { onNavigate?.(path); setNotifPanelOpen(false) }}
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
