import { useState, useCallback } from 'react';
import { useSuperAdminAudit, useLoginActivity } from '@/hooks/super-admin/useSuperAdminAudit';
import { usePagination } from '@/hooks/usePagination';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { exportToCSV } from '@/utils/csv-export';
import { SAPagination } from '@/components/super-admin/components/SAPagination';
import { SADateRangePicker } from '@/components/super-admin/components/SADateRangePicker';

export const SAAuditPage = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'logins'>('all');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loginSearch, setLoginSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filters: Record<string, string> = {};
  if (actionFilter) filters.action = actionFilter;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { data: auditLog, isLoading: loadingAudit } = useSuperAdminAudit(
    Object.keys(filters).length > 0 ? filters as { action?: string; startDate?: string; endDate?: string } : undefined
  );
  const { data: loginActivity, isLoading: loadingLogins } = useLoginActivity();

  // Filter logins by search
  const filteredLogins = (loginActivity || []).filter(entry => {
    if (!loginSearch) return true;
    const s = loginSearch.toLowerCase();
    return (entry.user_email || '').toLowerCase().includes(s) ||
           (entry.user?.full_name || '').toLowerCase().includes(s);
  });

  const entries = activeTab === 'logins' ? filteredLogins : (auditLog || []);
  const isLoading = activeTab === 'logins' ? loadingLogins : loadingAudit;

  const {
    page, totalPages, totalItems, pageSize, paginatedData,
    canNext, canPrev, nextPage, prevPage, setPageSize,
  } = usePagination(entries, { initialPageSize: 25 });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeAllModals = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  useEscapeKey(closeAllModals);

  const actionIcons: Record<string, string> = {
    'user.login': '🔑',
    'user.created': '👤',
    'user.updated': '✏️',
    'center.created': '🏢',
    'center.updated': '🏢',
    'subscription.activated': '✅',
    'subscription.cancelled': '❌',
    'session.created': '📅',
    'plan.updated': '💎',
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleExportCSV = () => {
    exportToCSV(entries, [
      { header: 'Date', accessor: (e) => formatDate(e.created_at) },
      { header: 'Utilisateur', accessor: (e) => e.user?.full_name || e.user_email || 'Systeme' },
      { header: 'Action', accessor: (e) => e.action },
      { header: 'Entite', accessor: (e) => e.entity_type || '' },
      { header: 'Details', accessor: (e) => e.details ? JSON.stringify(e.details) : '' },
    ], 'audit');
  };

  const renderDetails = (entry: typeof entries[0]) => {
    if (!entry.details || Object.keys(entry.details).length === 0) return '-';
    const isExpanded = expandedRows.has(entry.id);

    return (
      <div>
        <button
          className="sa-btn sa-btn-secondary"
          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
          onClick={() => toggleRow(entry.id)}
        >
          {isExpanded ? 'Masquer' : 'Voir details'}
        </button>
        {isExpanded && (
          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--color-gray-50, #fafafa)', borderRadius: '6px', fontSize: '0.8rem' }}>
            {Object.entries(entry.details).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: '8px', padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontWeight: 600, color: '#737373', minWidth: '80px' }}>{key}</span>
                <span style={{ color: '#171717' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Journal d'audit</h1>
          <p className="sa-page-subtitle">Historique de toutes les actions sur la plateforme</p>
        </div>
        <button className="sa-btn sa-btn-secondary" onClick={handleExportCSV}>Exporter CSV</button>
      </div>

      {/* Tabs */}
      <div className="sa-tabs">
        <button className={`sa-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          Toutes les actions
        </button>
        <button className={`sa-tab ${activeTab === 'logins' ? 'active' : ''}`} onClick={() => setActiveTab('logins')}>
          Connexions
        </button>
      </div>

      {/* Date Range Picker */}
      {activeTab === 'all' && (
        <div style={{ marginBottom: '16px' }}>
          <SADateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>
      )}

      {/* Filters (only for "all" tab) */}
      {activeTab === 'all' && (
        <div className="sa-search-bar" style={{ flexWrap: 'wrap' }}>
          {['', 'user.login', 'user.created', 'user.updated', 'center.created', 'center.updated', 'subscription.activated', 'subscription.cancelled', 'session.created', 'plan.updated'].map(action => (
            <button
              key={action}
              className={`sa-filter-btn ${actionFilter === action ? 'active' : ''}`}
              onClick={() => setActionFilter(action)}
            >
              {action ? action.split('.').join(' ') : 'Toutes'}
            </button>
          ))}
        </div>
      )}

      {/* Login search */}
      {activeTab === 'logins' && (
        <div className="sa-search-bar">
          <input
            type="text"
            className="sa-search-input"
            placeholder="Rechercher par email ou nom..."
            value={loginSearch}
            onChange={(e) => setLoginSearch(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      <div className="sa-table-container">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: '#737373' }}>Chargement...</div>
        ) : entries.length === 0 ? (
          <div className="sa-empty-state">
            <div className="sa-empty-icon">📝</div>
            <div className="sa-empty-title">Aucune entree dans le journal</div>
            <div className="sa-empty-text">Les actions seront enregistrees automatiquement.</div>
          </div>
        ) : (
          <>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Entite</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDate(entry.created_at)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {entry.user?.full_name || entry.user_email || 'Systeme'}
                      </div>
                      {entry.user_email && entry.user?.full_name && (
                        <div style={{ fontSize: '0.75rem', color: '#737373' }}>{entry.user_email}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>{actionIcons[entry.action] || '📋'}</span>
                        <span style={{ fontWeight: 500 }}>{entry.action}</span>
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#737373' }}>
                      {entry.entity_type ? (
                        <span>
                          {entry.entity_type}
                          {entry.entity_id && <span style={{ fontSize: '0.75rem' }}> #{entry.entity_id.slice(0, 8)}</span>}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ maxWidth: '250px' }}>
                      {renderDetails(entry)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SAPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              canNext={canNext}
              canPrev={canPrev}
              onNext={nextPage}
              onPrev={prevPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </div>
  );
};
