import React, { useState, useEffect, type ReactNode } from 'react';
import { LogOut, ArrowLeft, Menu, X, Moon, Sun } from 'lucide-react';

interface SuperAdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user?: { email?: string; firstName?: string; lastName?: string; role?: string } | null;
  onSignOut: () => void;
  onBackToApp: () => void;
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  user,
  onSignOut,
  onBackToApp
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleThemeToggle = () => {
    const next = !isDarkMode;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDarkMode(next);
  };

  const mainItems = [
    { id: 'sa-dashboard', label: 'Tableau de bord', icon: '📊' },
    { id: 'sa-centers', label: 'Centres', icon: '🏢' },
    { id: 'sa-users', label: 'Utilisateurs', icon: '👥' },
  ];

  const subscriptionItems = [
    { id: 'sa-plans', label: 'Plans', icon: '💎' },
    { id: 'sa-subscriptions', label: 'Abonnements', icon: '📋' },
  ];

  const monitoringItems = [
    { id: 'sa-audit', label: "Journal d'audit", icon: '📝' },
  ];

  const NavItem = ({ id, label, icon }: { id: string; label: string; icon: string }) => (
    <button
      onClick={() => { onTabChange(id); setSidebarOpen(false); }}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
        activeTab === id
          ? 'bg-white/10 text-white font-medium'
          : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Super Admin' : 'Super Admin';

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
            SA
          </div>
          <div className="flex-1">
            <h1 className="text-white font-semibold text-sm">AntiPlanning</h1>
            <div className="sa-badge">SUPER ADMIN</div>
          </div>
          <button
            className="sa-mobile-close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-3 mb-2">Principal</div>
          <div className="space-y-0.5">
            {mainItems.map((item) => <NavItem key={item.id} {...item} />)}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-3 mb-2">Abonnements</div>
          <div className="space-y-0.5">
            {subscriptionItems.map((item) => <NavItem key={item.id} {...item} />)}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider px-3 mb-2">Monitoring</div>
          <div className="space-y-0.5">
            {monitoringItems.map((item) => <NavItem key={item.id} {...item} />)}
          </div>
        </div>
      </nav>

      {/* Back to app + User */}
      <div className="mt-auto">
        <div className="px-4 py-2">
          <button
            onClick={onBackToApp}
            className="sa-back-btn w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour a l'app</span>
          </button>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-[#e74c3c] rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleThemeToggle}
              className="p-1.5 text-neutral-500 hover:text-white rounded-md hover:bg-white/5 transition-colors"
              title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onSignOut}
              className="p-1.5 text-neutral-500 hover:text-[#e74c3c] rounded-md hover:bg-white/5 transition-colors"
              title="Deconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Mobile Header */}
      <div className="sa-mobile-header">
        <button className="sa-mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
            SA
          </div>
          <span className="sa-badge">SUPER ADMIN</span>
        </div>
        <button
          onClick={handleThemeToggle}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sa-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`w-64 flex-shrink-0 flex flex-col sa-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
        {sidebarContent}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto sa-main-content">
        {children}
      </div>
    </div>
  );
};
