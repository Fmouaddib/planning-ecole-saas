import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { User } from '@/types'

interface LayoutProps {
  children: React.ReactNode
  user?: User | null
  currentPath?: string
  onNavigate?: (path: string) => void
  onLogout?: () => void
  onNotificationsClick?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  currentPath = '/',
  onNavigate,
  onLogout,
  onNotificationsClick,
  onProfileClick,
  onSettingsClick
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
    // TODO: Implémenter la logique du thème
    if (!isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        {/* Header */}
        <Header
          user={user}
          onMenuToggle={handleMenuToggle}
          isDarkMode={isDarkMode}
          onThemeToggle={handleThemeToggle}
          onNotificationsClick={onNotificationsClick}
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
          onLogout={onLogout}
        />

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
            onLogout={onLogout}
          />

          {/* Main content */}
          <main className="flex-1 lg:ml-0">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}