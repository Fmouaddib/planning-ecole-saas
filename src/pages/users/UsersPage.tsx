import { useState, useMemo } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner } from '@/components/ui'
import { USER_ROLES } from '@/utils/constants'
import { filterBySearch, formatDate } from '@/utils/helpers'
import type { User, UserRole } from '@/types'
import { Plus, Search, Pencil, Trash2, Users as UsersIcon, RefreshCw } from 'lucide-react'

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  teacher: 'Enseignant',
  student: 'Étudiant',
  staff: 'Personnel',
}

const roleOptions = Object.entries(USER_ROLES).map(([, value]) => ({
  value,
  label: roleLabels[value] || value,
}))

const roleBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  admin: 'error',
  teacher: 'info',
  student: 'success',
  staff: 'warning',
}

interface UserFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  role: UserRole
}

const emptyForm: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'student',
}

function UsersPage() {
  const {
    users, isLoading, error, createUser, updateUser, deleteUser, refreshUsers,
    canCreateUsers, canUpdateUser, canDeleteUser,
  } = useUsers()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    let result = users
    if (search) {
      result = filterBySearch(result, search, ['firstName', 'lastName', 'email'])
    }
    if (roleFilter) {
      result = result.filter(u => u.role === roleFilter)
    }
    return result
  }, [users, search, roleFilter])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => {
    setForm(emptyForm)
    setSelectedUser(null)
    setModalMode('create')
  }

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
    })
    setModalMode('edit')
  }

  const openDelete = (user: User) => {
    setSelectedUser(user)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedUser(null)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createUser({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          role: form.role,
          establishmentId: 'school-1',
        })
      } else if (modalMode === 'edit' && selectedUser) {
        await updateUser(selectedUser.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
        })
      }
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setSubmitting(true)
    try {
      await deleteUser(selectedUser.id)
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement des utilisateurs..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-error-600 mb-4">{error}</p>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshUsers}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Gestion des utilisateurs</h1>
          <p className="text-neutral-500 mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''} au total</p>
        </div>
        {canCreateUsers && (
          <Button leftIcon={Plus} onClick={openCreate} className="mt-4 sm:mt-0">
            Ajouter un utilisateur
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom ou email..."
            leftIcon={Search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: '', label: 'Tous les rôles' }, ...roleOptions]}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table or Empty */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Aucun utilisateur trouvé"
          description={search || roleFilter ? 'Aucun utilisateur ne correspond à vos critères.' : 'Commencez par ajouter votre premier utilisateur.'}
          action={!search && !roleFilter && canCreateUsers ? { label: 'Ajouter un utilisateur', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Rôle</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Statut</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Créé le</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{u.firstName} {u.lastName}</span>
                        <span className="block md:hidden text-xs text-neutral-400 mt-0.5">{u.email}</span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadgeVariant[u.role] || 'neutral'} size="sm">
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive ? 'success' : 'neutral'} size="sm">
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600">
                        {u.createdAt ? formatDate(u.createdAt) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdateUser(u.id) && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                              <Pencil size={14} />
                            </Button>
                          )}
                          {canDeleteUser(u.id) && (
                            <Button variant="ghost" size="sm" onClick={() => openDelete(u)}>
                              <Trash2 size={14} className="text-error-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">
                Page {page} sur {totalPages} ({totalItems} résultat{totalItems > 1 ? 's' : ''})
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!canPrev} onClick={prevPage}>
                  Précédent
                </Button>
                <Button variant="secondary" size="sm" disabled={!canNext} onClick={nextPage}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Ajouter un utilisateur' : 'Modifier l\'utilisateur'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              placeholder="Ex: Jean"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              required
            />
            <Input
              label="Nom"
              placeholder="Ex: Martin"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="jean.martin@ecole.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          {modalMode === 'create' && (
            <Input
              label="Mot de passe"
              type="password"
              placeholder="Mot de passe initial"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          )}
          <Select
            label="Rôle"
            options={roleOptions}
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!form.firstName || !form.lastName || !form.email || (modalMode === 'create' && !form.password)}
          >
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={modalMode === 'delete'}
        onClose={closeModal}
        title="Supprimer l'utilisateur"
        size="sm"
      >
        <p className="text-neutral-600">
          Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> ?
          Cette action est irréversible.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default UsersPage
