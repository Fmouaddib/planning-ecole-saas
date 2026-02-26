import { useState } from 'react';
import { useSuperAdminPlans, useCreateSAPlan, useUpdateSAPlan } from '@/hooks/super-admin/useSuperAdminSubscriptions';
import type { SubscriptionPlan, CreatePlanData } from '@/types/super-admin';

export const SAPlansPage = () => {
  const { data: plans, isLoading } = useSuperAdminPlans();
  const createPlan = useCreateSAPlan();
  const updatePlan = useUpdateSAPlan();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: CreatePlanData = {
      name: form.get('name') as string,
      slug: form.get('slug') as string,
      description: form.get('description') as string || undefined,
      price_monthly: parseFloat(form.get('price_monthly') as string) || 0,
      price_yearly: parseFloat(form.get('price_yearly') as string) || undefined,
      max_users: parseInt(form.get('max_users') as string) || 5,
      max_sessions: parseInt(form.get('max_sessions') as string) || 50,
      max_rooms: parseInt(form.get('max_rooms') as string) || 5,
      max_programs: parseInt(form.get('max_programs') as string) || 10,
      max_students: parseInt(form.get('max_students') as string) || 0,
      features: (form.get('features') as string || '').split('\n').filter(f => f.trim()),
    };

    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data }, { onSuccess: () => { setShowModal(false); setEditingPlan(null); } });
    } else {
      createPlan.mutate(data, { onSuccess: () => { setShowModal(false); } });
    }
  };

  const formatLimit = (val: number) => val === -1 ? 'Illimite' : String(val);

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Plans d'abonnement</h1>
          <p className="sa-page-subtitle">Gerez les offres disponibles</p>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => { setEditingPlan(null); setShowModal(true); }}>
          + Nouveau plan
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center" style={{ color: '#737373' }}>Chargement...</div>
      ) : (
        <div className="sa-plans-grid">
          {(plans || []).map((plan, idx) => (
            <div key={plan.id} className={`sa-plan-card ${idx === 1 ? 'featured' : ''}`}>
              {idx === 1 && (
                <div style={{ position: 'absolute', top: '-1px', right: '20px', background: '#e74c3c', color: 'white', fontSize: '0.65rem', padding: '4px 12px', borderRadius: '0 0 8px 8px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Populaire
                </div>
              )}
              <div className="sa-plan-name">{plan.name}</div>
              <p style={{ fontSize: '0.8rem', color: '#737373', marginBottom: '16px' }}>{plan.description}</p>
              <div className="sa-plan-price">
                {plan.price_monthly}{'\u20AC'}<span>/mois</span>
              </div>
              {plan.price_yearly != null && plan.price_yearly > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#737373', marginTop: '4px' }}>
                  ou {plan.price_yearly}{'\u20AC'}/an
                </div>
              )}

              <div style={{ margin: '16px 0', borderTop: '1px solid var(--color-gray-100)', paddingTop: '16px' }}>
                <div className="sa-plan-limit">
                  <span>Utilisateurs</span>
                  <strong>{formatLimit(plan.max_users)}</strong>
                </div>
                <div className="sa-plan-limit">
                  <span>Sessions</span>
                  <strong>{formatLimit(plan.max_sessions)}</strong>
                </div>
                <div className="sa-plan-limit">
                  <span>Salles</span>
                  <strong>{formatLimit(plan.max_rooms)}</strong>
                </div>
                <div className="sa-plan-limit">
                  <span>Programmes</span>
                  <strong>{formatLimit(plan.max_programs)}</strong>
                </div>
                <div className="sa-plan-limit">
                  <span>Etudiants</span>
                  <strong>{plan.max_students > 0 ? plan.max_students : 'Non inclus'}</strong>
                </div>
              </div>

              <ul className="sa-plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="sa-btn sa-btn-secondary" onClick={() => { setEditingPlan(plan); setShowModal(true); }}>
                  Modifier
                </button>
                {plan.stripe_product_id ? (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center' }}>Stripe synced</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center' }}>Pas de Stripe</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="sa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sa-modal-title">{editingPlan ? 'Modifier le plan' : 'Nouveau plan'}</h2>
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
                  <label className="sa-form-label">Prix mensuel (EUR)</label>
                  <input name="price_monthly" type="number" step="0.01" className="sa-form-input" defaultValue={editingPlan?.price_monthly || 0} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Prix annuel (EUR)</label>
                  <input name="price_yearly" type="number" step="0.01" className="sa-form-input" defaultValue={editingPlan?.price_yearly || ''} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                <div className="sa-form-group">
                  <label className="sa-form-label">Max users</label>
                  <input name="max_users" type="number" className="sa-form-input" defaultValue={editingPlan?.max_users || 5} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Max sessions</label>
                  <input name="max_sessions" type="number" className="sa-form-input" defaultValue={editingPlan?.max_sessions || 50} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Max salles</label>
                  <input name="max_rooms" type="number" className="sa-form-input" defaultValue={editingPlan?.max_rooms || 5} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Max prog.</label>
                  <input name="max_programs" type="number" className="sa-form-input" defaultValue={editingPlan?.max_programs || 10} />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label">Max etudiants</label>
                  <input name="max_students" type="number" className="sa-form-input" defaultValue={editingPlan?.max_students || 0} />
                </div>
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Features (une par ligne)</label>
                <textarea name="features" className="sa-form-textarea" rows={4} defaultValue={editingPlan?.features?.join('\n') || ''} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="sa-btn sa-btn-primary">{editingPlan ? 'Mettre a jour' : 'Creer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
