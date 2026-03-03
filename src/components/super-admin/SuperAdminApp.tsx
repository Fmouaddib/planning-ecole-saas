import { useState, lazy, Suspense } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import '@/styles/super-admin.css';

// Lazy-loaded super-admin pages
const SADashboardPage = lazy(() => import('@/pages/super-admin/SADashboardPage').then(m => ({ default: m.SADashboardPage })));
const SAUsersPage = lazy(() => import('@/pages/super-admin/SAUsersPage').then(m => ({ default: m.SAUsersPage })));
const SACentersPage = lazy(() => import('@/pages/super-admin/SACentersPage').then(m => ({ default: m.SACentersPage })));
const SAPlansPage = lazy(() => import('@/pages/super-admin/SAPlansPage').then(m => ({ default: m.SAPlansPage })));
const SASubscriptionsPage = lazy(() => import('@/pages/super-admin/SASubscriptionsPage').then(m => ({ default: m.SASubscriptionsPage })));
const SAAddonsPage = lazy(() => import('@/pages/super-admin/SAAddonsPage').then(m => ({ default: m.SAAddonsPage })));
const SAAuditPage = lazy(() => import('@/pages/super-admin/SAAuditPage').then(m => ({ default: m.SAAuditPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e74c3c]"></div>
  </div>
);

interface SuperAdminAppProps {
  user?: { email?: string; firstName?: string; lastName?: string; role?: string } | null;
  onLogout: () => void;
}

export const SuperAdminApp = ({ user, onLogout }: SuperAdminAppProps) => {
  const [activeTab, setActiveTab] = useState('sa-dashboard');

  const handleBackToApp = () => {
    window.location.hash = '';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'sa-dashboard':
        return <SADashboardPage />;
      case 'sa-users':
        return <SAUsersPage />;
      case 'sa-centers':
        return <SACentersPage />;
      case 'sa-plans':
        return <SAPlansPage />;
      case 'sa-addons':
        return <SAAddonsPage />;
      case 'sa-subscriptions':
        return <SASubscriptionsPage />;
      case 'sa-audit':
        return <SAAuditPage />;
      default:
        return <SADashboardPage />;
    }
  };

  return (
    <SuperAdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      onSignOut={onLogout}
      onBackToApp={handleBackToApp}
    >
      <Suspense fallback={<PageLoader />}>
        {renderContent()}
      </Suspense>
    </SuperAdminLayout>
  );
};
