import { useSuperAdminDashboard } from '@/hooks/super-admin/useSuperAdminDashboard';
import type { AuditLogEntry } from '@/types/super-admin';

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
          <div className="sa-empty-icon">!</div>
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
    { label: 'Abonnements payants', value: stats?.activeSubscriptions || 0, sub: `sur ${stats?.totalSubscriptions || 0} abonnement(s) total` },
  ];

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

      {/* Recent Activity */}
      <div className="sa-table-container" style={{ marginTop: '24px' }}>
        <div className="sa-table-header">
          <span className="sa-table-title">Activite recente</span>
        </div>
        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--sa-border-medium)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--sa-text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '10px 12px', color: 'var(--sa-text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Utilisateur</th>
                  <th style={{ padding: '10px 12px', color: 'var(--sa-text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '10px 12px', color: 'var(--sa-text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Detail</th>
                  <th style={{ padding: '10px 12px', color: 'var(--sa-text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Centre</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sa-empty-state">
            <div className="sa-empty-title">Aucune activite recente</div>
          </div>
        )}
      </div>
    </div>
  );
};

function ActivityRow({ entry }: { entry: AuditLogEntry }) {
  const details = entry.details || {};
  const userName = (details._user_name as string) || entry.user_email || '—';
  const centerName = (details._center_name as string) || '';
  const targetName = (details._target_name as string) || '';

  const { icon, label, color } = formatActionInfo(entry.action);

  return (
    <tr style={{ borderBottom: '1px solid var(--sa-border-light)' }}>
      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--sa-text-secondary)', fontSize: '0.8rem' }}>
        {formatDate(entry.created_at)}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 500, color: 'var(--sa-text-primary)' }}>{userName}</div>
        {entry.user_email && entry.user_email !== userName && (
          <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-secondary)' }}>{entry.user_email}</div>
        )}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 500,
          background: color + '18', color,
        }}>
          <span style={{ fontSize: '0.85rem' }}>{icon}</span>
          {label}
        </span>
      </td>
      <td style={{ padding: '10px 12px', color: 'var(--sa-text-primary)' }}>
        {targetName || '—'}
      </td>
      <td style={{ padding: '10px 12px', color: 'var(--sa-text-secondary)' }}>
        {centerName || '—'}
      </td>
    </tr>
  );
}

function formatActionInfo(action: string): { icon: string; label: string; color: string } {
  const map: Record<string, { icon: string; label: string; color: string }> = {
    'user.login':               { icon: '\u{1F511}', label: 'Connexion',         color: '#6b7280' },
    'user.created':             { icon: '\u{2795}',  label: 'Utilisateur cree',  color: '#16a34a' },
    'user.updated':             { icon: '\u{270F}',  label: 'Utilisateur modifie', color: '#2563eb' },
    'user.deleted':             { icon: '\u{1F5D1}', label: 'Utilisateur supprime', color: '#dc2626' },
    'user.bulk_updated':        { icon: '\u{270F}',  label: 'Maj groupee',       color: '#2563eb' },
    'center.created':           { icon: '\u{1F3E2}', label: 'Centre cree',       color: '#16a34a' },
    'center.updated':           { icon: '\u{270F}',  label: 'Centre modifie',    color: '#2563eb' },
    'center.deleted':           { icon: '\u{1F5D1}', label: 'Centre supprime',   color: '#dc2626' },
    'subscription.activated':   { icon: '\u{2705}',  label: 'Abonnement active', color: '#16a34a' },
    'subscription.updated':     { icon: '\u{270F}',  label: 'Abonnement modifie', color: '#2563eb' },
    'subscription.cancelled':   { icon: '\u{274C}',  label: 'Abonnement annule', color: '#dc2626' },
    'session.created':          { icon: '\u{1F4C5}', label: 'Session creee',     color: '#16a34a' },
    'session.updated':          { icon: '\u{270F}',  label: 'Session modifiee',  color: '#2563eb' },
    'session.deleted':          { icon: '\u{1F5D1}', label: 'Session supprimee', color: '#dc2626' },
    'plan.created':             { icon: '\u{2795}',  label: 'Plan cree',         color: '#16a34a' },
    'plan.updated':             { icon: '\u{270F}',  label: 'Plan modifie',      color: '#2563eb' },
    'plan.deleted':             { icon: '\u{1F5D1}', label: 'Plan supprime',     color: '#dc2626' },
  };
  return map[action] || { icon: '\u{1F4CB}', label: action, color: '#6b7280' };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'A l\'instant';
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;

  // Format court jour/mois heure
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');

  if (date.getFullYear() === now.getFullYear()) {
    return `${day}/${month} ${h}:${m}`;
  }
  return `${day}/${month}/${date.getFullYear()} ${h}:${m}`;
}
