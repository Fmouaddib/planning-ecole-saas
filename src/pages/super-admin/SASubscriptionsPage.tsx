import { useState, useMemo } from 'react';
import {
  useSuperAdminSubscriptions,
  useSuperAdminPlans,
  useAssignPlan,
  useCancelSubscription,
  useBillingHistory,
} from '@/hooks/super-admin/useSuperAdminSubscriptions';
import { useSuperAdminCenters } from '@/hooks/super-admin/useSuperAdminCenters';
import { exportToCSV } from '@/utils/csv-export';

/** Calculer le prix Enterprise en fonction du nombre d'etudiants */
const computeEnterprisePrice = (maxStudents: number): number => {
  if (maxStudents <= 100) return 149;
  if (maxStudents <= 500) return 199;
  const extra = Math.ceil((maxStudents - 500) / 250) * 29;
  return 199 + extra;
};

export const SASubscriptionsPage = () => {
  const { data: subscriptions, isLoading } = useSuperAdminSubscriptions();
  const { data: plans } = useSuperAdminPlans();
  const { data: centers } = useSuperAdminCenters();
  const { data: billing } = useBillingHistory();
  const assignPlan = useAssignPlan();
  const cancelSub = useCancelSubscription();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'billing'>('subscriptions');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [maxStudentsInput, setMaxStudentsInput] = useState(100);

  const selectedPlan = useMemo(
    () => (plans || []).find(p => p.id === selectedPlanId),
    [plans, selectedPlanId]
  );
  const isEnterprisePlan = selectedPlan?.slug === 'enterprise';
  const computedPrice = isEnterprisePlan ? computeEnterprisePrice(maxStudentsInput) : null;

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

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const handleExportBillingCSV = () => {
    exportToCSV(billing || [], [
      { header: 'Date', accessor: (e) => formatDate(e.created_at) },
      { header: 'Centre', accessor: (e) => e.center?.name || e.center_id || '' },
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
        <div className="sa-table-container">
          {isLoading ? (
            <div className="p-8 text-center" style={{ color: '#737373' }}>Chargement...</div>
          ) : (subscriptions || []).length === 0 ? (
            <div className="sa-empty-state">
              <div className="sa-empty-icon">📋</div>
              <div className="sa-empty-title">Aucun abonnement</div>
              <div className="sa-empty-text">Assignez un plan a un centre pour commencer.</div>
            </div>
          ) : (
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
                {(subscriptions || []).map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sub.center?.name || sub.center_id}</div>
                      <div style={{ fontSize: '0.75rem', color: '#737373' }}>{sub.center?.email || ''}</div>
                    </td>
                    <td>
                      <strong>{sub.plan?.name || sub.plan_id}</strong>
                      {sub.plan?.price_monthly != null && (
                        <div style={{ fontSize: '0.75rem', color: '#737373' }}>{sub.plan.price_monthly}{'\u20AC'}/mois</div>
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
                    <td style={{ fontSize: '0.8rem', color: '#737373' }}>
                      {formatDate(sub.current_period_start)} - {formatDate(sub.current_period_end)}
                    </td>
                    <td>
                      {sub.status === 'active' && (
                        <button
                          className="sa-btn sa-btn-danger"
                          onClick={() => setCancelConfirmId(sub.id)}
                        >
                          Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
                {(billing || []).map((event) => (
                  <tr key={event.id}>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(event.created_at)}</td>
                    <td>{event.center?.name || event.center_id || '-'}</td>
                    <td><span className="sa-status active">{event.event_type}</span></td>
                    <td style={{ fontWeight: 600 }}>{event.amount != null ? `${event.amount}\u20AC` : '-'}</td>
                    <td style={{ fontSize: '0.85rem', color: '#737373' }}>{event.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmId && (
        <div className="sa-modal-overlay" onClick={() => setCancelConfirmId(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2 className="sa-modal-title">Confirmer l'annulation</h2>
            <p style={{ fontSize: '0.9rem', color: '#737373', marginBottom: '24px' }}>
              Etes-vous sur de vouloir annuler cet abonnement ? Le centre conservera l'acces jusqu'a la fin de la periode en cours.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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
                    <option key={c.id} value={c.id}>{c.name}</option>
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
                  <div style={{ fontSize: '0.8rem', color: '#737373', marginTop: '4px' }}>
                    100 etud. = 149{'\u20AC'} | 500 etud. = 199{'\u20AC'} | +29{'\u20AC'}/250 au-dela
                  </div>
                  {computedPrice != null && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#002F5D', marginTop: '8px' }}>
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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
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
