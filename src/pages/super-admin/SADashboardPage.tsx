import { useSuperAdminDashboard } from '@/hooks/super-admin/useSuperAdminDashboard';

export const SADashboardPage = () => {
  const { data: stats, isLoading, isError, isFetching, refetch } = useSuperAdminDashboard();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="sa-page-header">
          <div>
            <h1 className="sa-page-title">Tableau de bord</h1>
            <p className="sa-page-subtitle">Vue d'ensemble de la plateforme</p>
          </div>
        </div>
        <div className="sa-kpi-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="sa-kpi-card" style={{ opacity: 0.5 }}>
              <div className="sa-kpi-label">Chargement...</div>
              <div className="sa-kpi-value">--</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="sa-page-header">
          <div>
            <h1 className="sa-page-title">Tableau de bord</h1>
            <p className="sa-page-subtitle">Vue d'ensemble de la plateforme</p>
          </div>
        </div>
        <div className="sa-empty-state">
          <div className="sa-empty-icon">⚠️</div>
          <div className="sa-empty-title">Erreur lors du chargement des donnees</div>
          <div className="sa-empty-text">Impossible de recuperer les statistiques. Verifiez votre connexion.</div>
          <button className="sa-btn sa-btn-primary" style={{ marginTop: '16px' }} onClick={() => refetch()}>
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Centres', value: stats?.totalCenters || 0, sub: `${stats?.activeCenters || 0} actifs` },
    { label: 'Utilisateurs', value: stats?.totalUsers || 0, sub: `${stats?.activeUsers || 0} actifs` },
    { label: 'MRR', value: `${stats?.mrr || 0}\u20AC`, sub: 'Revenu mensuel recurrent' },
    { label: 'Abonnements actifs', value: stats?.activeSubscriptions || 0, sub: 'Plans payes' },
  ];

  const maxMrr = Math.max(...(stats?.mrrHistory || []).map(m => m.amount), 1);

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Tableau de bord</h1>
          <p className="sa-page-subtitle">Vue d'ensemble de la plateforme AntiPlanning</p>
        </div>
        <button
          className="sa-btn sa-btn-secondary"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="sa-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="sa-kpi-card">
            <div className="sa-kpi-label">{kpi.label}</div>
            <div className="sa-kpi-value">{kpi.value}</div>
            <div className="sa-kpi-change">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* MRR Chart */}
      <div className="sa-chart-container">
        <div className="sa-chart-title">Evolution du MRR (6 derniers mois)</div>
        <div className="sa-chart-bars">
          {(stats?.mrrHistory || []).map((m) => (
            <div
              key={m.month}
              className="sa-chart-bar"
              style={{ height: `${(m.amount / maxMrr) * 100}%` }}
            >
              <span className="sa-chart-bar-value">{m.amount}{'\u20AC'}</span>
              <span className="sa-chart-bar-label">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="sa-table-container">
        <div className="sa-table-header">
          <span className="sa-table-title">Activite recente</span>
        </div>
        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <ul className="sa-activity-list" style={{ padding: '0 20px' }}>
            {stats.recentActivity.map((entry) => (
              <li key={entry.id} className="sa-activity-item">
                <div className="sa-activity-icon">
                  {entry.action.includes('login') ? '🔑' :
                   entry.action.includes('created') ? '✨' :
                   entry.action.includes('updated') ? '✏️' :
                   entry.action.includes('activated') ? '✅' : '📋'}
                </div>
                <div>
                  <div className="sa-activity-text">
                    <strong>{entry.user_email}</strong> — {formatAction(entry.action)}
                    {entry.details && typeof entry.details === 'object' && 'name' in entry.details && (
                      <> ({String(entry.details.name)})</>
                    )}
                  </div>
                  <div className="sa-activity-time">{formatTimeAgo(entry.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="sa-empty-state">
            <div className="sa-empty-icon">📋</div>
            <div className="sa-empty-title">Aucune activite recente</div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatAction(action: string): string {
  const map: Record<string, string> = {
    'user.login': 's\'est connecte',
    'user.created': 'a cree un utilisateur',
    'user.updated': 'a modifie un utilisateur',
    'center.created': 'a cree un centre',
    'center.updated': 'a modifie un centre',
    'subscription.activated': 'a active un abonnement',
    'subscription.cancelled': 'a annule un abonnement',
    'session.created': 'a cree une session',
    'session.updated': 'a modifie une session',
    'session.deleted': 'a supprime une session',
    'plan.updated': 'a modifie un plan',
  };
  return map[action] || action;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'A l\'instant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}
