import { useState, useMemo, useCallback } from 'react';
import {
  useSuperAdminAddonPlans,
  useCreateAddonPlan,
  useUpdateAddonPlan,
  useDeleteAddonPlan,
  useCenterAddons,
  useAssignAddon,
  useCancelAddon,
  useUpdateCenterAddon,
} from '@/hooks/super-admin/useSuperAdminAddons';
import { useSuperAdminCenters } from '@/hooks/super-admin/useSuperAdminCenters';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { SAConfirmModal } from '@/components/super-admin/components/SAConfirmModal';
import type { AddonPlan, CenterAddon, CreateAddonPlanData } from '@/types/super-admin';

const ADDON_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  email: { label: 'Email', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  teacher: { label: 'Professeurs', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  student: { label: 'Etudiants', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cancelled: { label: 'Annule', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  past_due: { label: 'Impaye', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  pending: { label: 'En attente', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, color, background: bg }}>
      {label}
    </span>
  );
}

export const SAAddonsPage = () => {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'centers'>('catalogue');

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Options & Add-ons</h1>
          <p className="sa-page-subtitle">Gerez les packs supplementaires et leur attribution</p>
        </div>
      </div>

      <div className="sa-tabs" style={{ marginBottom: '24px' }}>
        <button className={`sa-tab ${activeTab === 'catalogue' ? 'active' : ''}`} onClick={() => setActiveTab('catalogue')}>
          Catalogue
        </button>
        <button className={`sa-tab ${activeTab === 'centers' ? 'active' : ''}`} onClick={() => setActiveTab('centers')}>
          Add-ons centres
        </button>
      </div>

      {activeTab === 'catalogue' ? <CatalogueTab /> : <CenterAddonsTab />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Onglet Catalogue
// ═══════════════════════════════════════════════════════════

function CatalogueTab() {
  const { data: plans, isLoading } = useSuperAdminAddonPlans();
  const createPlan = useCreateAddonPlan();
  const updatePlan = useUpdateAddonPlan();
  const deletePlan = useDeleteAddonPlan();

  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AddonPlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AddonPlan | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'email' | 'teacher' | 'student'>('all');

  const filteredPlans = useMemo(() => {
    let result = plans || [];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s));
    }
    if (typeFilter !== 'all') result = result.filter(p => p.addon_type === typeFilter);
    return result;
  }, [plans, search, typeFilter]);

  const closeAllModals = useCallback(() => {
    if (deleteConfirm) { setDeleteConfirm(null); return; }
    if (showModal) { setShowModal(false); setEditingPlan(null); }
  }, [deleteConfirm, showModal]);

  useEscapeKey(closeAllModals);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: CreateAddonPlanData = {
      name: form.get('name') as string,
      slug: form.get('slug') as string,
      description: form.get('description') as string || undefined,
      addon_type: form.get('addon_type') as 'email' | 'teacher' | 'student',
      quota_value: parseInt(form.get('quota_value') as string) || 0,
      price_monthly: parseFloat(form.get('price_monthly') as string) || 0,
      price_yearly: parseFloat(form.get('price_yearly') as string) || undefined,
    };

    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data }, { onSuccess: () => { setShowModal(false); setEditingPlan(null); } });
    } else {
      createPlan.mutate(data, { onSuccess: () => { setShowModal(false); } });
    }
  };

  return (
    <>
      <div className="sa-search-bar">
        <input
          type="text"
          className="sa-search-input"
          placeholder="Rechercher un pack..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(['all', 'email', 'teacher', 'student'] as const).map(t => (
          <button
            key={t}
            className={`sa-filter-btn ${typeFilter === t ? 'active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'all' ? 'Tous' : ADDON_TYPE_LABELS[t].label}
          </button>
        ))}
        <button className="sa-btn sa-btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setEditingPlan(null); setShowModal(true); }}>
          + Nouveau pack
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center sa-text-muted">Chargement...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="sa-empty-state">
          <div className="sa-empty-icon">🧩</div>
          <div className="sa-empty-title">Aucun pack trouve</div>
          <div className="sa-empty-text">Ajustez vos filtres ou creez un nouveau pack.</div>
        </div>
      ) : (
        <div className="sa-plans-grid">
          {filteredPlans.map((plan) => {
            const typeCfg = ADDON_TYPE_LABELS[plan.addon_type];
            return (
              <div key={plan.id} className="sa-plan-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className="sa-plan-name">{plan.name}</div>
                  <Badge {...typeCfg} />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--sa-text-secondary)', marginBottom: '12px' }}>{plan.description}</p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sa-text-secondary)' }}>Quota :</span>
                  <strong style={{ fontSize: '1.1rem' }}>
                    {plan.addon_type === 'email' ? `${plan.quota_value}/jour` : `+${plan.quota_value}`}
                  </strong>
                </div>

                <div className="sa-plan-price">
                  {plan.price_monthly}{'\u20AC'}<span>/mois</span>
                </div>
                {plan.price_yearly != null && plan.price_yearly > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--sa-text-secondary)', marginTop: '2px' }}>
                    ou {plan.price_yearly}{'\u20AC'}/an
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <Badge
                    label={plan.is_active ? 'Actif' : 'Inactif'}
                    color={plan.is_active ? '#10b981' : '#6b7280'}
                    bg={plan.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button className="sa-btn sa-btn-secondary" onClick={() => { setEditingPlan(plan); setShowModal(true); }}>
                    Modifier
                  </button>
                  <button className="sa-btn sa-btn-danger" onClick={() => setDeleteConfirm(plan)}>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <SAConfirmModal
          title="Supprimer le pack"
          message={`Etes-vous sur de vouloir supprimer le pack "${deleteConfirm.name}" ? Les add-ons actifs ne seront pas affectes.`}
          confirmLabel="Supprimer"
          variant="danger"
          isLoading={deletePlan.isPending}
          onConfirm={() => { deletePlan.mutate(deleteConfirm.id, { onSuccess: () => setDeleteConfirm(null) }); }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="sa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sa-modal-title">{editingPlan ? 'Modifier le pack' : 'Nouveau pack'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sa-form-group">
                  <label className="sa-form-label">Nom</label>
                  <input name="name" className="sa-form-input" required defaultValue={editingPlan?.name || ''} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Slug</label>
                  <input name="slug" className="sa-form-input" required defaultValue={editingPlan?.slug || ''} />
                </div>
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Description</label>
                <input name="description" className="sa-form-input" defaultValue={editingPlan?.description || ''} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sa-form-group">
                  <label className="sa-form-label">Type</label>
                  <select name="addon_type" className="sa-form-input" defaultValue={editingPlan?.addon_type || 'email'}>
                    <option value="email">Email</option>
                    <option value="teacher">Professeurs</option>
                    <option value="student">Etudiants</option>
                  </select>
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Quota</label>
                  <input name="quota_value" type="number" className="sa-form-input" required defaultValue={editingPlan?.quota_value || ''} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sa-form-group">
                  <label className="sa-form-label">Prix mensuel (EUR)</label>
                  <input name="price_monthly" type="number" step="0.01" className="sa-form-input" defaultValue={editingPlan?.price_monthly || 0} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Prix annuel (EUR)</label>
                  <input name="price_yearly" type="number" step="0.01" className="sa-form-input" defaultValue={editingPlan?.price_yearly || ''} />
                </div>
              </div>
              <div className="sa-modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="sa-btn sa-btn-primary">{editingPlan ? 'Mettre a jour' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Onglet Add-ons centres
// ═══════════════════════════════════════════════════════════

function CenterAddonsTab() {
  const { data: centerAddons, isLoading } = useCenterAddons();
  const { data: addonPlans } = useSuperAdminAddonPlans();
  const { data: centers } = useSuperAdminCenters();
  const assignAddon = useAssignAddon();
  const cancelAddon = useCancelAddon();
  const updateAddon = useUpdateCenterAddon();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<CenterAddon | null>(null);
  const [editingAddon, setEditingAddon] = useState<CenterAddon | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');

  const filteredAddons = useMemo(() => {
    let result = centerAddons || [];
    if (statusFilter === 'active') result = result.filter(a => a.status === 'active');
    if (statusFilter === 'cancelled') result = result.filter(a => a.status === 'cancelled');
    return result;
  }, [centerAddons, statusFilter]);

  const closeAllModals = useCallback(() => {
    if (cancelConfirm) { setCancelConfirm(null); return; }
    if (editingAddon) { setEditingAddon(null); return; }
    if (showAssignModal) { setShowAssignModal(false); }
  }, [cancelConfirm, editingAddon, showAssignModal]);

  useEscapeKey(closeAllModals);

  const handleAssign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    assignAddon.mutate({
      center_id: form.get('center_id') as string,
      addon_plan_id: form.get('addon_plan_id') as string,
      quantity: parseInt(form.get('quantity') as string) || 1,
      billing_cycle: form.get('billing_cycle') as 'monthly' | 'yearly',
    }, { onSuccess: () => setShowAssignModal(false) });
  };

  const handleUpdateQuantity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAddon) return;
    const form = new FormData(e.currentTarget);
    const qty = parseInt(form.get('quantity') as string) || 1;
    updateAddon.mutate({ id: editingAddon.id, data: { quantity: qty } }, { onSuccess: () => setEditingAddon(null) });
  };

  const getEffectivePrice = (addon: CenterAddon): string => {
    const plan = addon.addon_plan;
    if (!plan) return '-';
    const price = addon.billing_cycle === 'yearly' && plan.price_yearly
      ? Number(plan.price_yearly) * addon.quantity
      : Number(plan.price_monthly) * addon.quantity;
    return `${price.toFixed(2)}\u20AC/${addon.billing_cycle === 'yearly' ? 'an' : 'mois'}`;
  };

  return (
    <>
      <div className="sa-search-bar">
        {(['all', 'active', 'cancelled'] as const).map(s => (
          <button
            key={s}
            className={`sa-filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Annules'}
          </button>
        ))}
        <button className="sa-btn sa-btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowAssignModal(true)}>
          + Assigner un add-on
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center sa-text-muted">Chargement...</div>
      ) : filteredAddons.length === 0 ? (
        <div className="sa-empty-state">
          <div className="sa-empty-icon">🧩</div>
          <div className="sa-empty-title">Aucun add-on attribue</div>
          <div className="sa-empty-text">Assignez des packs supplementaires aux centres.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="sa-table">
            <thead>
              <tr>
                <th>Centre</th>
                <th>Pack</th>
                <th>Type</th>
                <th>Quantite</th>
                <th>Prix effectif</th>
                <th>Statut</th>
                <th>Fin de periode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAddons.map((addon) => {
                const typeCfg = ADDON_TYPE_LABELS[addon.addon_plan?.addon_type || 'email'];
                const statusCfg = STATUS_LABELS[addon.status] || STATUS_LABELS.pending;
                return (
                  <tr key={addon.id}>
                    <td>{addon.center?.name || addon.center_id.slice(0, 8)}</td>
                    <td>{addon.addon_plan?.name || '-'}</td>
                    <td><Badge {...typeCfg} /></td>
                    <td>{addon.quantity}x</td>
                    <td>{getEffectivePrice(addon)}</td>
                    <td><Badge {...statusCfg} /></td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {addon.current_period_end
                        ? new Date(addon.current_period_end).toLocaleDateString('fr-FR')
                        : '-'}
                    </td>
                    <td>
                      {addon.status === 'active' && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="sa-btn sa-btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            onClick={() => setEditingAddon(addon)}
                          >
                            Quantite
                          </button>
                          <button
                            className="sa-btn sa-btn-danger"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            onClick={() => setCancelConfirm(addon)}
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel Confirm */}
      {cancelConfirm && (
        <SAConfirmModal
          title="Annuler l'add-on"
          message={`Annuler le pack "${cancelConfirm.addon_plan?.name || ''}" pour ${cancelConfirm.center?.name || ''} ?`}
          confirmLabel="Annuler l'add-on"
          variant="danger"
          isLoading={cancelAddon.isPending}
          onConfirm={() => { cancelAddon.mutate(cancelConfirm.id, { onSuccess: () => setCancelConfirm(null) }); }}
          onCancel={() => setCancelConfirm(null)}
        />
      )}

      {/* Edit Quantity Modal */}
      {editingAddon && (
        <div className="sa-modal-overlay" onClick={() => setEditingAddon(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="sa-modal-title">Modifier la quantite</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--sa-text-secondary)', marginBottom: '16px' }}>
              {editingAddon.addon_plan?.name} — {editingAddon.center?.name}
            </p>
            <form onSubmit={handleUpdateQuantity}>
              <div className="sa-form-group">
                <label className="sa-form-label">Quantite</label>
                <input name="quantity" type="number" min="1" className="sa-form-input" defaultValue={editingAddon.quantity} />
              </div>
              <div className="sa-modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setEditingAddon(null)}>Annuler</button>
                <button type="submit" className="sa-btn sa-btn-primary">Mettre a jour</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="sa-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sa-modal-title">Assigner un add-on</h2>
            <form onSubmit={handleAssign}>
              <div className="sa-form-group">
                <label className="sa-form-label">Centre</label>
                <select name="center_id" className="sa-form-input" required>
                  <option value="">Selectionner un centre</option>
                  {(centers || []).filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Pack</label>
                <select name="addon_plan_id" className="sa-form-input" required>
                  <option value="">Selectionner un pack</option>
                  {(addonPlans || []).filter(p => p.is_active).map(p => {
                    const typeCfg = ADDON_TYPE_LABELS[p.addon_type];
                    return (
                      <option key={p.id} value={p.id}>
                        [{typeCfg.label}] {p.name} — {p.price_monthly}{'\u20AC'}/mois
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sa-form-group">
                  <label className="sa-form-label">Quantite</label>
                  <input name="quantity" type="number" min="1" className="sa-form-input" defaultValue={1} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Cycle</label>
                  <select name="billing_cycle" className="sa-form-input">
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>
              </div>
              <div className="sa-modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowAssignModal(false)}>Annuler</button>
                <button type="submit" className="sa-btn sa-btn-primary">Assigner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
