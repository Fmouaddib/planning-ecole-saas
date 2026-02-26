import { useState, useCallback } from 'react';
import {
  useSuperAdminCenters,
  useCreateSACenter,
  useUpdateSACenter,
  useToggleSACenterActive,
  useDeleteSACenter,
} from '@/hooks/super-admin/useSuperAdminCenters';
import { usePagination } from '@/hooks/usePagination';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { exportToCSV } from '@/utils/csv-export';
import { SAPagination } from '@/components/super-admin/components/SAPagination';
import { SAConfirmModal } from '@/components/super-admin/components/SAConfirmModal';
import type { CreateCenterData, SuperAdminCenter } from '@/types/super-admin';

export const SACentersPage = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<SuperAdminCenter | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<SuperAdminCenter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SuperAdminCenter | null>(null);

  const { data: centers, isLoading } = useSuperAdminCenters(search || undefined);
  const createCenter = useCreateSACenter();
  const updateCenter = useUpdateSACenter();
  const toggleActive = useToggleSACenterActive();
  const deleteCenter = useDeleteSACenter();

  const allCenters = centers || [];

  const {
    page, totalPages, totalItems, pageSize, paginatedData,
    canNext, canPrev, nextPage, prevPage, setPageSize,
  } = usePagination(allCenters);

  const closeAllModals = useCallback(() => {
    if (deleteConfirm) { setDeleteConfirm(null); return; }
    if (toggleConfirm) { setToggleConfirm(null); return; }
    if (showModal) { setShowModal(false); setEditingCenter(null); }
  }, [deleteConfirm, toggleConfirm, showModal]);

  useEscapeKey(closeAllModals);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: CreateCenterData = {
      name: form.get('name') as string,
      address: form.get('address') as string || undefined,
      phone: form.get('phone') as string || undefined,
      email: form.get('email') as string || undefined,
      website: form.get('website') as string || undefined,
    };

    if (editingCenter) {
      updateCenter.mutate({ id: editingCenter.id, data }, { onSuccess: () => { setShowModal(false); setEditingCenter(null); } });
    } else {
      createCenter.mutate(data, { onSuccess: () => { setShowModal(false); } });
    }
  };

  const handleExportCSV = () => {
    exportToCSV(allCenters, [
      { header: 'Nom', accessor: (c) => c.name },
      { header: 'Email', accessor: (c) => c.email || '' },
      { header: 'Adresse', accessor: (c) => c.address || '' },
      { header: 'Utilisateurs', accessor: (c) => c._count?.users || 0 },
      { header: 'Sessions', accessor: (c) => c._count?.sessions || 0 },
      { header: 'Plan', accessor: (c) => c.subscription?.plan?.name || 'Aucun' },
      { header: 'Statut', accessor: (c) => c.is_active ? 'Actif' : 'Inactif' },
    ], 'centres');
  };

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Centres de formation</h1>
          <p className="sa-page-subtitle">{allCenters.length} centre(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="sa-btn sa-btn-secondary" onClick={handleExportCSV}>Exporter CSV</button>
          <button className="sa-btn sa-btn-primary" onClick={() => { setEditingCenter(null); setShowModal(true); }}>
            + Nouveau centre
          </button>
        </div>
      </div>

      <div className="sa-search-bar">
        <input
          type="text"
          className="sa-search-input"
          placeholder="Rechercher un centre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center" style={{ color: '#737373' }}>Chargement...</div>
      ) : allCenters.length === 0 ? (
        <div className="sa-empty-state">
          <div className="sa-empty-icon">🏢</div>
          <div className="sa-empty-title">Aucun centre trouve</div>
          <div className="sa-empty-text">Creez un nouveau centre de formation.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
            {paginatedData.map((center) => (
              <div key={center.id} className="sa-plan-card" style={{ borderColor: center.is_active ? 'var(--color-gray-200)' : '#fca5a5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div className="sa-plan-name">{center.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#737373' }}>{center.email || 'Pas d\'email'}</div>
                  </div>
                  <span className={`sa-status ${center.is_active ? 'active' : 'inactive'}`}>
                    {center.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {center.address && (
                  <p style={{ fontSize: '0.8rem', color: '#737373', marginBottom: '12px' }}>{center.address}</p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {[
                    { label: 'Utilisateurs', value: center._count?.users || 0 },
                    { label: 'Sessions', value: center._count?.sessions || 0 },
                    { label: 'Salles', value: center._count?.rooms || 0 },
                    { label: 'Programmes', value: center._count?.programs || 0 },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: 'center', padding: '8px', background: 'var(--color-gray-50)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stat.value}</div>
                      <div style={{ fontSize: '0.65rem', color: '#737373', textTransform: 'uppercase' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {center.subscription ? (
                  <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
                    Plan <strong>{center.subscription.plan?.name || '?'}</strong> — {center.subscription.status}
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', marginBottom: '12px', fontSize: '0.8rem', color: '#92400e' }}>
                    Aucun abonnement
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="sa-btn sa-btn-secondary" onClick={() => { setEditingCenter(center); setShowModal(true); }}>
                    Modifier
                  </button>
                  <button
                    className={`sa-btn ${center.is_active ? 'sa-btn-danger' : 'sa-btn-success'}`}
                    onClick={() => setToggleConfirm(center)}
                  >
                    {center.is_active ? 'Desactiver' : 'Activer'}
                  </button>
                  <button
                    className="sa-btn sa-btn-danger"
                    onClick={() => setDeleteConfirm(center)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px' }}>
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
          </div>
        </>
      )}

      {/* Toggle Confirm Modal */}
      {toggleConfirm && (
        <SAConfirmModal
          title={toggleConfirm.is_active ? 'Desactiver le centre' : 'Activer le centre'}
          message={`Etes-vous sur de vouloir ${toggleConfirm.is_active ? 'desactiver' : 'activer'} le centre "${toggleConfirm.name}" ?`}
          confirmLabel={toggleConfirm.is_active ? 'Desactiver' : 'Activer'}
          variant={toggleConfirm.is_active ? 'danger' : 'primary'}
          isLoading={toggleActive.isPending}
          onConfirm={() => {
            toggleActive.mutate(
              { id: toggleConfirm.id, isActive: !toggleConfirm.is_active },
              { onSuccess: () => setToggleConfirm(null) }
            );
          }}
          onCancel={() => setToggleConfirm(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <SAConfirmModal
          title="Supprimer le centre"
          message={`Etes-vous sur de vouloir supprimer definitivement le centre "${deleteConfirm.name}" ? Cette action est irreversible.`}
          confirmLabel="Supprimer"
          variant="danger"
          isLoading={deleteCenter.isPending}
          onConfirm={() => {
            deleteCenter.mutate(deleteConfirm.id, { onSuccess: () => setDeleteConfirm(null) });
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="sa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sa-modal-title">
              {editingCenter ? 'Modifier le centre' : 'Nouveau centre'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="sa-form-group">
                <label className="sa-form-label">Nom</label>
                <input name="name" className="sa-form-input" required defaultValue={editingCenter?.name || ''} />
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Email</label>
                <input name="email" type="email" className="sa-form-input" defaultValue={editingCenter?.email || ''} />
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Adresse</label>
                <input name="address" className="sa-form-input" defaultValue={editingCenter?.address || ''} />
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Telephone</label>
                <input name="phone" className="sa-form-input" defaultValue={editingCenter?.phone || ''} />
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Site web</label>
                <input name="website" className="sa-form-input" defaultValue={editingCenter?.website || ''} />
              </div>
              <div className="sa-modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={createCenter.isPending || updateCenter.isPending}>
                  {editingCenter ? 'Mettre a jour' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
