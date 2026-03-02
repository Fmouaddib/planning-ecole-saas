import { useState } from 'react';
import {
  useSuperAdminUsers,
  useCreateSAUser,
  useUpdateSAUser,
  useToggleSAUserActive,
  useResetSAUserPassword,
  useBulkToggleSAUserActive,
  useDeleteSAUser,
} from '@/hooks/super-admin/useSuperAdminUsers';
import { useSuperAdminCenters } from '@/hooks/super-admin/useSuperAdminCenters';
import { usePagination } from '@/hooks/usePagination';
import { exportToCSV } from '@/utils/csv-export';
import { setImpersonation } from '@/utils/impersonation';
import { SAPagination } from '@/components/super-admin/components/SAPagination';
import { SAConfirmModal } from '@/components/super-admin/components/SAConfirmModal';
import type { CreateUserData, SuperAdminUserProfile } from '@/types/super-admin';

export const SAUsersPage = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SuperAdminUserProfile | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: 'toggle' | 'bulk'; id?: string; isActive?: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SuperAdminUserProfile | null>(null);
  const [resetTarget, setResetTarget] = useState<SuperAdminUserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: users, isLoading } = useSuperAdminUsers(search || undefined);
  const { data: centers } = useSuperAdminCenters();
  const createUser = useCreateSAUser();
  const updateUser = useUpdateSAUser();
  const toggleActive = useToggleSAUserActive();
  const resetPassword = useResetSAUserPassword();
  const deleteUser = useDeleteSAUser();
  const bulkToggle = useBulkToggleSAUserActive();

  const filteredUsers = roleFilter
    ? (users || []).filter(u => u.role === roleFilter)
    : (users || []);

  const {
    page, totalPages, totalItems, pageSize, paginatedData,
    canNext, canPrev, nextPage, prevPage, setPageSize,
  } = usePagination(filteredUsers);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: CreateUserData = {
      email: form.get('email') as string,
      full_name: form.get('full_name') as string,
      role: form.get('role') as CreateUserData['role'],
      phone: form.get('phone') as string || undefined,
      center_id: form.get('center_id') as string || undefined,
      password: form.get('password') as string || undefined,
    };

    if (editingUser) {
      updateUser.mutate({ id: editingUser.id, data }, { onSuccess: () => { setShowModal(false); setEditingUser(null); } });
    } else {
      createUser.mutate(data, { onSuccess: () => { setShowModal(false); } });
    }
  };

  const openEdit = (user: SuperAdminUserProfile) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    setConfirmAction({ type: 'toggle', id, isActive });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'toggle' && confirmAction.id != null) {
      toggleActive.mutate({ id: confirmAction.id, isActive: confirmAction.isActive! }, {
        onSuccess: () => setConfirmAction(null),
      });
    } else if (confirmAction.type === 'bulk') {
      const ids = Array.from(selectedIds);
      bulkToggle.mutate({ ids, isActive: confirmAction.isActive! }, {
        onSuccess: () => { setConfirmAction(null); setSelectedIds(new Set()); },
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(u => u.id)));
    }
  };

  const handleExportCSV = () => {
    exportToCSV(filteredUsers, [
      { header: 'Nom', accessor: (u) => u.full_name },
      { header: 'Email', accessor: (u) => u.email },
      { header: 'Role', accessor: (u) => u.role },
      { header: 'Centre', accessor: (u) => u.center_id ? (centers || []).find(c => c.id === u.center_id)?.name || u.center_id : '' },
      { header: 'Statut', accessor: (u) => u.is_active ? 'Actif' : 'Inactif' },
      { header: 'Date creation', accessor: (u) => new Date(u.created_at).toLocaleDateString('fr-FR') },
    ], 'utilisateurs');
  };

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title">Utilisateurs</h1>
          <p className="sa-page-subtitle">{filteredUsers.length} utilisateur(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="sa-btn sa-btn-secondary" onClick={handleExportCSV}>Exporter CSV</button>
          <button className="sa-btn sa-btn-primary" onClick={openCreate}>+ Nouvel utilisateur</button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="sa-search-bar">
        <input
          type="text"
          className="sa-search-input"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {['', 'admin', 'trainer', 'coordinator', 'staff', 'student', 'super_admin'].map(role => (
          <button
            key={role}
            className={`sa-filter-btn ${roleFilter === role ? 'active' : ''}`}
            onClick={() => setRoleFilter(role)}
          >
            {role || 'Tous'}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
          background: 'var(--sa-bulk-bg)', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--sa-bulk-text)' }}>{selectedIds.size} selectionne(s)</span>
          <button
            className="sa-btn sa-btn-danger"
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => setConfirmAction({ type: 'bulk', isActive: false })}
          >
            Desactiver
          </button>
          <button
            className="sa-btn sa-btn-success"
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => setConfirmAction({ type: 'bulk', isActive: true })}
          >
            Activer
          </button>
          <button
            className="sa-btn sa-btn-secondary"
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => setSelectedIds(new Set())}
          >
            Deselectionner
          </button>
        </div>
      )}

      {/* Table */}
      <div className="sa-table-container">
        {isLoading ? (
          <div className="p-8 text-center sa-text-muted">Chargement...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="sa-empty-state">
            <div className="sa-empty-icon">👥</div>
            <div className="sa-empty-title">Aucun utilisateur trouve</div>
            <div className="sa-empty-text">Modifiez vos filtres ou creez un nouvel utilisateur.</div>
          </div>
        ) : (
          <>
            <table className="sa-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Utilisateur</th>
                  <th>Role</th>
                  <th>Centre</th>
                  <th>Statut</th>
                  <th>Date creation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-secondary)' }}>{user.email}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`sa-status ${user.role === 'super_admin' ? 'active' : ''}`}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--sa-text-secondary)' }}>
                      {user.center_id ? (centers || []).find(c => c.id === user.center_id)?.name || user.center_id : '-'}
                    </td>
                    <td>
                      <span className={`sa-status ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--sa-text-secondary)' }}>
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button className="sa-btn sa-btn-secondary" onClick={() => openEdit(user)}>Modifier</button>
                        <button
                          className={`sa-btn ${user.is_active ? 'sa-btn-danger' : 'sa-btn-success'}`}
                          onClick={() => handleToggleActive(user.id, !user.is_active)}
                        >
                          {user.is_active ? 'Desactiver' : 'Activer'}
                        </button>
                        <button
                          className="sa-btn sa-btn-secondary"
                          onClick={() => { setResetTarget(user); setNewPassword(''); }}
                        >
                          Reset MDP
                        </button>
                        {user.role !== 'super_admin' && (
                          <button
                            className="sa-btn sa-btn-danger"
                            onClick={() => setDeleteTarget(user)}
                          >
                            Supprimer
                          </button>
                        )}
                        {user.center_id && user.role !== 'super_admin' && (
                          <button
                            className="sa-btn sa-btn-primary"
                            onClick={() => {
                              const centerName = (centers || []).find(c => c.id === user.center_id)?.name || 'Centre inconnu';
                              setImpersonation({
                                centerId: user.center_id!,
                                centerName,
                                userId: user.id,
                                userName: user.full_name,
                                userEmail: user.email,
                                userRole: user.role,
                              });
                              window.location.hash = '';
                            }}
                          >
                            Voir en tant que
                          </button>
                        )}
                      </div>
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

      {/* Confirm Modal */}
      {confirmAction && (
        <SAConfirmModal
          title={confirmAction.type === 'bulk'
            ? `${confirmAction.isActive ? 'Activer' : 'Desactiver'} ${selectedIds.size} utilisateur(s)`
            : `${confirmAction.isActive ? 'Activer' : 'Desactiver'} cet utilisateur`
          }
          message={confirmAction.type === 'bulk'
            ? `Etes-vous sur de vouloir ${confirmAction.isActive ? 'activer' : 'desactiver'} les ${selectedIds.size} utilisateurs selectionnes ?`
            : `Etes-vous sur de vouloir ${confirmAction.isActive ? 'activer' : 'desactiver'} cet utilisateur ?`
          }
          variant="danger"
          confirmLabel={confirmAction.isActive ? 'Activer' : 'Desactiver'}
          isLoading={toggleActive.isPending || bulkToggle.isPending}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="sa-modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2 className="sa-modal-title">Reset mot de passe</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--sa-text-secondary)', marginBottom: '16px' }}>
              Definir un nouveau mot de passe pour <strong>{resetTarget.full_name}</strong> ({resetTarget.email})
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              resetPassword.mutate(
                { userId: resetTarget.id, newPassword },
                { onSuccess: () => { setResetTarget(null); setNewPassword(''); } }
              );
            }}>
              <div className="sa-form-group">
                <label className="sa-form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="sa-form-input"
                  placeholder="Minimum 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setResetTarget(null)}>
                  Annuler
                </button>
                <button
                  type="submit"
                  className="sa-btn sa-btn-primary"
                  disabled={newPassword.length < 8 || resetPassword.isPending}
                >
                  {resetPassword.isPending ? 'En cours...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="sa-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2 className="sa-modal-title" style={{ color: '#dc2626' }}>Supprimer l'utilisateur</h2>
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '16px',
            }}>
              <p style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, marginBottom: '6px' }}>
                Attention : cette action est irreversible
              </p>
              <p style={{ fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.5 }}>
                L'utilisateur <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email}) sera
                definitivement supprime. Toutes ses donnees (profil, seances, affectations) seront perdues
                et ne pourront pas etre recuperees.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="sa-btn sa-btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleteUser.isPending}>
                Annuler
              </button>
              <button
                className="sa-btn sa-btn-danger"
                disabled={deleteUser.isPending}
                onClick={() => {
                  deleteUser.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }}
              >
                {deleteUser.isPending ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="sa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sa-modal-title">
              {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="sa-form-group">
                <label className="sa-form-label">Nom complet</label>
                <input name="full_name" className="sa-form-input" required defaultValue={editingUser?.full_name || ''} />
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Email</label>
                <input name="email" type="email" className="sa-form-input" required defaultValue={editingUser?.email || ''} readOnly={!!editingUser} />
              </div>
              {!editingUser && (
                <div className="sa-form-group">
                  <label className="sa-form-label">Mot de passe</label>
                  <input name="password" type="password" className="sa-form-input" placeholder="Minimum 8 caracteres" />
                </div>
              )}
              <div className="sa-form-group">
                <label className="sa-form-label">Role</label>
                <select name="role" className="sa-form-select" defaultValue={editingUser?.role || 'trainer'}>
                  <option value="admin">Admin</option>
                  <option value="trainer">Formateur</option>
                  <option value="coordinator">Coordinateur</option>
                  <option value="staff">Staff</option>
                  <option value="student">Etudiant (lecture seule)</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Centre</label>
                <select name="center_id" className="sa-form-select" defaultValue={editingUser?.center_id || ''}>
                  <option value="">Aucun centre</option>
                  {(centers || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="sa-form-group">
                <label className="sa-form-label">Telephone</label>
                <input name="phone" className="sa-form-input" defaultValue={editingUser?.phone || ''} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="sa-btn sa-btn-primary" disabled={createUser.isPending || updateUser.isPending}>
                  {editingUser ? 'Mettre a jour' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
