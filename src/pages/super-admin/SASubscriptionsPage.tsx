import { useState, useMemo, useCallback } from 'react';
import {
  useSuperAdminSubscriptions,
  useSuperAdminPlans,
  useAssignPlan,
  useCancelSubscription,
  useBillingHistory,
  useUpdateSubscription,
} from '@/hooks/super-admin/useSuperAdminSubscriptions';
import { useSuperAdminCenters } from '@/hooks/super-admin/useSuperAdminCenters';
import { usePagination } from '@/hooks/usePagination';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { exportToCSV } from '@/utils/csv-export';
import { SAPagination } from '@/components/super-admin/components/SAPagination';
import type { CenterSubscription } from '@/types/super-admin';
import { centerDisplayName } from '@/utils/helpers';

/** Calculer le prix Enterprise en fonction du nombre d'etudiants */
const computeEnterprisePrice = (maxStudents: number): number => {
  if (maxStudents <= 100) return 149;
  if (maxStudents <= 500) return 199;
  const extra = Math.ceil((maxStudents - 500) / 250) * 29;
  return 199 + extra;
};

const STATUS_OPTIONS = ['active', 'trialing', 'past_due', 'cancelled', 'expired'] as const;

export const SASubscriptionsPage = () => {
  const { data: subscriptions, isLoading } = useSuperAdminSubscriptions();
  const { data: plans } = useSuperAdminPlans();
  const { data: centers } = useSuperAdminCenters();
  const { data: billing } = useBillingHistory();
  const assignPlan = useAssignPlan();
  const cancelSub = useCancelSubscription();
  const updateSub = useUpdateSubscription();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'billing'>('subscriptions');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [maxStudentsInput, setMaxStudentsInput] = useState(100);
  const [subSearch, setSubSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingSub, setEditingSub] = useState<CenterSubscription | null>(null);
  const [editPlanId, setEditPlanId] = useState('');
  const [editCycle, setEditCycle] = useState<'monthly' | 'yearly'>('monthly');

  const selectedPlan = useMemo(
    () => (plans || []).find(p => p.id === selectedPlanId),
    [plans, selectedPlanId]
  );
  const isEnterprisePlan = selectedPlan?.slug === 'enterprise';
  const computedPrice = isEnterprisePlan ? computeEnterprisePrice(maxStudentsInput) : null;

  // Filtered subscriptions
  const filteredSubs = useMemo(() => {
    let result = subscriptions || [];
    if (subSearch) {
      const s = subSearch.toLowerCase();
      result = result.filter(sub =>
        centerDisplayName(sub.center).toLowerCase().includes(s) ||
        (sub.center?.name || '').toLowerCase().includes(s) ||
        (sub.plan?.name || '').toLowerCase().includes(s)
      );
    }
    if (statusFilter) {
      result = result.filter(sub => sub.status === statusFilter);
    }
    return result;
  }, [subscriptions, subSearch, statusFilter]);

  // Pagination for subscriptions tab
  const subsPagination = usePagination(filteredSubs);

  // Pagination for billing tab
  const billingPagination = usePagination(billing || [], { initialPageSize: 25 });

  const closeAllModals = useCallback(() => {
    if (cancelConfirmId) { setCancelConfirmId(null); return; }
    if (editingSub) { setEditingSub(null); return; }
    if (showAssignModal) { setShowAssignModal(false); }
  }, [cancelConfirmId, editingSub, showAssignModal]);

  useEscapeKey(closeAllModals);

  const handleAssign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    assignPlan.mutate({
      center_id: form.get('center_id') as string,
      plan_id: form.get('plan_id') as string,
      billing_cycle: form.get('billing_cycle') as 'monthly' | 'yearly',
      ...(isEnterprisePlan ? { max_students: maxStudentsInput } : {}),
    }, { onSuccess: () => setShowAssignModal(false) });
  };

  const handleEditSub = () => {
    if (!editingSub) return;
    updateSub.mutate(
      { id: editingSub.id, data: { plan_id: editPlanId, billing_cycle: editCycle } },
      { onSuccess: () => setEditingSub(null) }
    );
  };

  const openEditSub = (sub: CenterSubscription) => {
    setEditingSub(sub);
    setEditPlanId(sub.plan_id);
    setEditCycle(sub.billing_cycle || 'monthly');
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const handleExportSubsCSV = () => {
    exportToCSV(filteredSubs, [
      { header: 'Centre', accessor: (s) => centerDisplayName(s.center) || s.center_id || '' },
      { header: 'Plan', accessor: (s) => s.plan?.name || s.plan_id || '' },
      { header: 'Statut', accessor: (s) => s.status },
      { header: 'Cycle', accessor: (s) => s.billing_cycle || '' },
      { header: 'Debut', accessor: (s) => formatDate(s.current_period_start) },
      { header: 'Fin', accessor: (s) => formatDate(s.current_period_end) },
    ], 'abonnements');
  };

  const handleExportBillingCSV = () => {
    exportToCSV(billing || [], [
      { header: 'Date', accessor: (e) => formatDate(e.created_at) },
      { header: 'Centre', accessor: (e) => centerDisplayName(e.center) || e.center_id || '' },
      { header: 'Type', accessor: (e) => e.event_type },
      { header: 'Montant', accessor: (e) => e.amount != null ? `${e.amount}\u20AC` : '' },
      { header: 'Description', accessor: (e) => e.description || '' },
    ], 'facturation');
  };

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Abonnements</h1>
          <p className="sa-page-subtitle">Gestion des abonnements et facturation</p>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => setShowAssignModal(true)}>
          + Assigner un plan
        </button>
      </div>

      {/* Tabs */}
      <div className="sa-tabs">
        <button className={`sa-tab ${activeTab === 'subscriptions' ? 'active' : ''}`} onClick={() => setActiveTab('subscriptions')}>
          Abonnements
        </button>
        <button className={`sa-tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
          Facturation
        </button>
      </div>

      {activeTab === 'subscriptions' && (
        <>
          {/* Search + Filters + CSV */}
          <div className="sa-search-bar" style={{ flexWrap: 'wrap' }}>
            <input
              type="text"
              className="sa-search-input"
              placeholder="Rechercher par centre ou plan..."
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
            />
            <button
              className={`sa-filter-btn ${statusFilter === '' ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              Tous
            </button>
            {STATUS_OPTIONS.map(status => (
              <button
                key={status}
                className={`sa-filter-btn ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
            <button className="sa-btn sa-btn-secondary" onClick={handleExportSubsCSV}>Exporter CSV</button>
          </div>

          <div className="sa-table-container">
            {isLoading ? (
              <div className="p-8 text-center sa-text-muted">Chargement...</div>
            ) : filteredSubs.length === 0 ? (
              <div className="sa-empty-state">
                <div className="sa-empty-icon">📋</div>
                <div className="sa-empty-title">Aucun abonnement</div>
                <div className="sa-empty-text">Assignez un plan a un centre pour commencer.</div>
              </div>
            ) : (
              <>
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Centre</th>
                      <th>Plan</th>
                      <th>Statut</th>
                      <th>Cycle</th>
                      <th>Periode</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subsPagination.paginatedData.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{centerDisplayName(sub.center) || sub.center_id}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-secondary)' }}>{sub.center?.email || ''}</div>
                        </td>
                        <td>
                          <strong>{sub.plan?.name || sub.plan_id}</strong>
                          {sub.plan?.price_monthly != null && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-secondary)' }}>{sub.plan.price_monthly}{'\u20AC'}/mois</div>
                          )}
                        </td>
                        <td>
                          <span className={`sa-status ${sub.status}`}>
                            {sub.status}
                          </span>
                          {sub.cancel_at_period_end && (
                            <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>Annulation en fin de periode</div>
                          )}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{sub.billing_cycle}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--sa-text-secondary)' }}>
                          {formatDate(sub.current_period_start)} - {formatDate(sub.current_period_end)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="sa-btn sa-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => openEditSub(sub)}
                            >
                              Modifier
                            </button>
                            {sub.status === 'active' && (
                              <button
                                className="sa-btn sa-btn-danger"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => setCancelConfirmId(sub.id)}
                              >
                                Annuler
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <SAPagination
                  page={subsPagination.page}
                  totalPages={subsPagination.totalPages}
                  totalItems={subsPagination.totalItems}
                  pageSize={subsPagination.pageSize}
                  canNext={subsPagination.canNext}
                  canPrev={subsPagination.canPrev}
                  onNext={subsPagination.nextPage}
                  onPrev={subsPagination.prevPage}
                  onPageSizeChange={subsPagination.setPageSize}
                />
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'billing' && (
        <div>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="sa-btn sa-btn-secondary" onClick={handleExportBillingCSV}>Exporter CSV</button>
          </div>
          <div className="sa-table-container">
          {(billing || []).length === 0 ? (
            <div className="sa-empty-state">
              <div className="sa-empty-icon">💰</div>
              <div className="sa-empty-title">Aucun evenement de facturation</div>
            </div>
          ) : (
            <>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Centre</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {billingPagination.paginatedData.map((event) => (
                    <tr key={event.id}>
                      <td style={{ fontSize: '0.8rem' }}>{formatDate(event.created_at)}</td>
                      <td>{centerDisplayName(event.center) || event.center_id || '-'}</td>
                      <td><span className="sa-status active">{event.event_type}</span></td>
                      <td style={{ fontWeight: 600 }}>{event.amount != null ? `${event.amount}\u20AC` : '-'}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--sa-text-secondary)' }}>{event.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <SAPagination
                page={billingPagination.page}
                totalPages={billingPagination.totalPages}
                totalItems={billingPagination.totalItems}
                pageSize={billingPagination.pageSize}
                canNext={billingPagination.canNext}
                canPrev={billingPagination.canPrev}
                onNext={billingPagination.nextPage}
                onPrev={billingPagination.prevPage}
                onPageSizeChange={billingPagination.setPageSize}
              />
            </>
          )}
        </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmId && (
        <div className="sa-modal-overlay" onClick={() => setCancelConfirmId(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2 className="sa-modal-title">Confirmer l'annulation</h2>
            <p className="sa-text-muted" style={{ marginBottom: '24px' }}>
              Etes-vous sur de vouloir annuler cet abonnement ? Le centre conservera l'acces jusqu'a la fin de la periode en cours.
            </p>
            <div className="sa-modal-actions">
              <button className="sa-btn sa-btn-secondary" onClick={() => setCancelConfirmId(null)}>Non, garder</button>
              <button
                className="sa-btn sa-btn-danger"
                disabled={cancelSub.isPending}
                onClick={() => {
                  cancelSub.mutate(cancelConfirmId, { onSuccess: () => setCancelConfirmId(null) });
                }}
              >
                {cancelSub.isPending ? 'Annulation...' : 'Oui, annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div className="sa-modal-overlay" onClick={() => setEditingSub(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2 className="sa-modal-title">Modifier l'abonnement</h2>
            <p className="sa-text-muted" style={{ marginBottom: '16px' }}>
              Centre : <strong>{centerDisplayName(editingSub.center) || editingSub.center_id}</strong>
            </p>
            <div className="sa-form-group">
              <label className="sa-form-label">Plan</label>
              <select className="sa-form-select" value={editPlanId} onChange={(e) => setEditPlanId(e.target.value)}>
                {(plans || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.price_monthly}{'\u20AC'}/mois</option>
                ))}
              </select>
            </div>
            <div className="sa-form-group">
              <label className="sa-form-label">Cycle de facturation</label>
              <select className="sa-form-select" value={editCycle} onChange={(e) => setEditCycle(e.target.value as 'monthly' | 'yearly')}>
                <option value="monthly">Mensuel</option>
                <option value="yearly">Annuel</option>
              </select>
            </div>
            <div className="sa-modal-actions" style={{ marginTop: '24px' }}>
              <button className="sa-btn sa-btn-secondary" onClick={() => setEditingSub(null)}>Annuler</button>
              <button className="sa-btn sa-btn-primary" onClick={handleEditSub} disabled={updateSub.isPending}>
                {updateSub.isPending ? 'Mise a jour...' : 'Mettre a jour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {showAssignModal && (
        <div className="sa-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sa-modal-title">Assigner un plan</h2>
            <form onSubmit={handleAssign}>
              <div className="sa-form-group">
                <label className="sa-form-label">Centre</label>
                <select name="center_id" className="sa-form-select" required>
                  <option value="">Selectionner un centre...</option>
                  {(centers || []).map(c => (
                    <option key={c.id} value={c.id}>{centerDisplayName(c)}</option>
                  ))}
                </select>
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Plan</label>
                <select name="plan_id" className="sa-form-select" required value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                  <option value="">Selectionner un plan...</option>
                  {(plans || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name} {'\u2014'} {p.price_monthly}{'\u20AC'}/mois</option>
                  ))}
                </select>
              </div>
              {isEnterprisePlan && (
                <div className="sa-form-group">
                  <label className="sa-form-label">Nombre d'etudiants max</label>
                  <input
                    name="max_students"
                    type="number"
                    min={0}
                    step={50}
                    className="sa-form-input"
                    value={maxStudentsInput}
                    onChange={(e) => setMaxStudentsInput(parseInt(e.target.value) || 0)}
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--sa-text-secondary)', marginTop: '4px' }}>
                    100 etud. = 149{'\u20AC'} | 500 etud. = 199{'\u20AC'} | +29{'\u20AC'}/250 au-dela
                  </div>
                  {computedPrice != null && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--sa-text-accent)', marginTop: '8px' }}>
                      Prix calcule : {computedPrice}{'\u20AC'}/mois
                    </div>
                  )}
                </div>
              )}
              <div className="sa-form-group">
                <label className="sa-form-label">Cycle de facturation</label>
                <select name="billing_cycle" className="sa-form-select">
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
              <div className="sa-modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowAssignModal(false)}>Annuler</button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={assignPlan.isPending}>
                  Assigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
