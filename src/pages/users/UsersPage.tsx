import { useState, useMemo, useEffect } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useStudentContacts } from '@/hooks/useStudentContacts'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner, HelpBanner } from '@/components/ui'
import { USER_ROLES } from '@/utils/constants'
import { filterBySearch, formatDate } from '@/utils/helpers'
import type { User, UserRole, ContactRelationship } from '@/types'
import { Plus, Search, Pencil, Trash2, Users as UsersIcon, RefreshCw, X, BookOpen, Upload, Phone, Mail, UserPlus } from 'lucide-react'
import { ImportModal } from '@/components/import/ImportModal'

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

interface DispensationState {
  [studentSubjectId: string]: { dispensed: boolean; reason: string }
}

interface UserFormData {
  firstName: string
  lastName: string
  email: string
  password: string
  role: UserRole
  classId: string
}

const emptyForm: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'student',
  classId: '',
}

function UsersPage() {
  const {
    users, isLoading, error, createUser, updateUser, deleteUser, refreshUsers,
    canCreateUsers, canUpdateUser, canDeleteUser,
  } = useUsers()
  const {
    classes, subjects, getClassIdForStudent, setStudentClass,
    getSubjectIdsForClass,
    toggleDispensation, addFreeSubject, removeFreeSubject,
    getStudentSubjectsForStudent,
  } = useAcademicData()
  const classOptions = useMemo(
    () => classes.map(c => ({ value: c.id, label: c.name })),
    [classes],
  )
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [dispensations, setDispensations] = useState<DispensationState>({})
  const [freeSubjectIds, setFreeSubjectIds] = useState<string[]>([])
  const [addingFreeSubject, setAddingFreeSubject] = useState('')
  const [showImport, setShowImport] = useState(false)
  const { fetchContacts, getContactsForStudent, createContact, updateContact, removeContact } = useStudentContacts()
  const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', email: '', phone: '', relationship: 'parent' as ContactRelationship, receiveBulletins: true, receiveAbsences: true })
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)

  useEffect(() => { fetchContacts() }, [fetchContacts])

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
    const cId = user.role === 'student' ? (getClassIdForStudent(user.id) || '') : ''
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      classId: cId,
    })
    // Charger les dispensations existantes pour cet étudiant
    if (user.role === 'student') {
      const enrollments = getStudentSubjectsForStudent(user.id)
      const dispState: DispensationState = {}
      for (const ss of enrollments) {
        if (ss.enrollment_type === 'class') {
          dispState[ss.id] = { dispensed: ss.status === 'dispensed', reason: ss.dispensation_reason || '' }
        }
      }
      setDispensations(dispState)
      setFreeSubjectIds(enrollments.filter(ss => ss.enrollment_type === 'free').map(ss => ss.subject_id))
    } else {
      setDispensations({})
      setFreeSubjectIds([])
    }
    setAddingFreeSubject('')
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
        const newUser = await createUser({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          role: form.role,
          establishmentId: '',  // Le hook utilise le center_id de l'admin connecté
        })
        // Affecter la classe si étudiant
        if (form.role === 'student' && form.classId) {
          await setStudentClass(newUser.id, form.classId)
        }
      } else if (modalMode === 'edit' && selectedUser) {
        await updateUser(selectedUser.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
        })
        // Mettre à jour la classe si étudiant
        if (form.role === 'student') {
          await setStudentClass(selectedUser.id, form.classId || null)

          // Sauvegarder dispensations
          const currentEnrollments = getStudentSubjectsForStudent(selectedUser.id)
          for (const [ssId, state] of Object.entries(dispensations)) {
            const existing = currentEnrollments.find(ss => ss.id === ssId)
            if (existing && (existing.status === 'dispensed') !== state.dispensed) {
              await toggleDispensation(ssId, state.dispensed, state.reason || undefined)
            } else if (existing && existing.status === 'dispensed' && state.dispensed && (existing.dispensation_reason || '') !== state.reason) {
              await toggleDispensation(ssId, true, state.reason || undefined)
            }
          }

          // Sauvegarder matières libres
          const currentFreeIds = currentEnrollments
            .filter(ss => ss.enrollment_type === 'free')
            .map(ss => ss.subject_id)
          const toAddFree = freeSubjectIds.filter(id => !currentFreeIds.includes(id))
          const toRemoveFree = currentFreeIds.filter(id => !freeSubjectIds.includes(id))
          for (const sid of toAddFree) {
            await addFreeSubject(selectedUser.id, sid)
          }
          for (const sid of toRemoveFree) {
            await removeFreeSubject(selectedUser.id, sid)
          }
        }
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Gestion des utilisateurs</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          {canCreateUsers && (
            <Button variant="secondary" leftIcon={Upload} onClick={() => setShowImport(true)}>
              Importer
            </Button>
          )}
          {canCreateUsers && (
            <Button leftIcon={Plus} onClick={openCreate}>
              Ajouter un utilisateur
            </Button>
          )}
        </div>
      </div>

      <HelpBanner storageKey="admin-users">
        Administrez les comptes de votre centre : créez des profils étudiants, formateurs ou staff. Utilisez l'import CSV/Excel pour ajouter plusieurs utilisateurs d'un coup. Cliquez sur un utilisateur pour gérer ses matières ou contacts.
      </HelpBanner>

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
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Rôle</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Classe</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Statut</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Créé le</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{u.firstName} {u.lastName}</span>
                        <span className="block md:hidden text-xs text-neutral-400 mt-0.5">{u.email}</span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadgeVariant[u.role] || 'neutral'} size="sm">
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                        {u.role === 'student'
                          ? (classes.find(c => c.id === getClassIdForStudent(u.id))?.name || '—')
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.isActive ? 'success' : 'neutral'} size="sm">
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
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
        size={modalMode === 'edit' && form.role === 'student' && form.classId ? 'lg' : 'md'}
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
            onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole, classId: e.target.value !== 'student' ? '' : f.classId }))}
          />
          {form.role === 'student' && (
            <Select
              label="Classe"
              options={[{ value: '', label: 'Aucune classe' }, ...classOptions]}
              value={form.classId}
              onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
            />
          )}

          {/* Section matières (visible si étudiant en édition avec classe) */}
          {modalMode === 'edit' && form.role === 'student' && form.classId && selectedUser && (() => {
            const classSubjectIds = getSubjectIdsForClass(form.classId)
            const classSubjectList = subjects.filter(s => classSubjectIds.includes(s.id))
            const enrollments = getStudentSubjectsForStudent(selectedUser.id)
              .filter(ss => ss.class_id === form.classId && ss.enrollment_type === 'class')

            // Matières du centre disponibles pour "libre" (pas déjà dans la classe ni déjà libre)
            const allAssignedIds = new Set([...classSubjectIds, ...freeSubjectIds])
            const availableFreeSubjects = subjects.filter(s => !allAssignedIds.has(s.id))

            return (
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-4">
                {/* Matières du programme */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={16} className="text-primary-600" />
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Matières du programme ({classSubjectList.length})
                    </h3>
                  </div>
                  {classSubjectList.length === 0 ? (
                    <p className="text-xs text-neutral-400">Aucune matière dans cette classe</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {classSubjectList.map(subject => {
                        const enrollment = enrollments.find(ss => ss.subject_id === subject.id)
                        const ssId = enrollment?.id || ''
                        const dispState = dispensations[ssId]
                        const isDispensed = dispState?.dispensed ?? false
                        return (
                          <div key={subject.id} className={`flex items-center gap-3 p-2 rounded-lg border ${isDispensed ? 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-950' : 'border-neutral-200 dark:border-neutral-700'}`}>
                            <label className="flex items-center gap-2 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={isDispensed}
                                onChange={e => {
                                  if (!ssId) return
                                  setDispensations(prev => ({
                                    ...prev,
                                    [ssId]: { dispensed: e.target.checked, reason: prev[ssId]?.reason || '' }
                                  }))
                                }}
                                className="w-4 h-4 rounded border-neutral-300 text-warning-600 focus:ring-warning-500"
                              />
                              <span className="text-xs text-neutral-500">Dispensé</span>
                            </label>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${isDispensed ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                {subject.name}
                              </span>
                              {subject.code && <span className="text-xs text-neutral-400 ml-2">({subject.code})</span>}
                            </div>
                            {isDispensed && (
                              <>
                                <Badge variant="warning" size="sm">Dispensé</Badge>
                                <input
                                  type="text"
                                  placeholder="Motif..."
                                  value={dispState?.reason || ''}
                                  onChange={e => {
                                    setDispensations(prev => ({
                                      ...prev,
                                      [ssId]: { ...prev[ssId], reason: e.target.value }
                                    }))
                                  }}
                                  className="w-28 text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                                />
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Matières libres */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={16} className="text-info-600" />
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Matières libres ({freeSubjectIds.length})
                    </h3>
                  </div>
                  {freeSubjectIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {freeSubjectIds.map(sid => {
                        const s = subjects.find(x => x.id === sid)
                        return (
                          <span key={sid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-info-50 dark:bg-info-950 text-info-700 dark:text-info-300 text-xs font-medium border border-info-200 dark:border-info-800">
                            {s?.name || 'Matière inconnue'}
                            <button
                              type="button"
                              onClick={() => setFreeSubjectIds(prev => prev.filter(id => id !== sid))}
                              className="ml-0.5 hover:text-error-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {availableFreeSubjects.length > 0 && (
                    <div className="flex gap-2">
                      <select
                        value={addingFreeSubject}
                        onChange={e => setAddingFreeSubject(e.target.value)}
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="">Ajouter une matière libre...</option>
                        {availableFreeSubjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!addingFreeSubject}
                        onClick={() => {
                          if (addingFreeSubject) {
                            setFreeSubjectIds(prev => [...prev, addingFreeSubject])
                            setAddingFreeSubject('')
                          }
                        }}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Section Contacts (visible si étudiant en édition) */}
          {modalMode === 'edit' && form.role === 'student' && selectedUser && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <Phone size={14} /> Contacts ({getContactsForStudent(selectedUser.id).length})
                </h4>
                <Button size="sm" variant="secondary" leftIcon={UserPlus} onClick={() => {
                  setContactForm({ firstName: '', lastName: '', email: '', phone: '', relationship: 'parent', receiveBulletins: true, receiveAbsences: true })
                  setEditingContactId(null)
                  setShowContactForm(true)
                }}>
                  Ajouter
                </Button>
              </div>

              {/* Contact list */}
              {getContactsForStudent(selectedUser.id).map(c => (
                <div key={c.id} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {c.firstName} {c.lastName}
                      <span className="ml-2 text-xs text-neutral-500">
                        ({c.relationship === 'parent' ? 'Parent' : c.relationship === 'tuteur_pro' ? 'Tuteur pro' : c.relationship === 'responsable_legal' ? 'Resp. légal' : 'Autre'})
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500 flex items-center gap-2">
                      <Mail size={10} /> {c.email}
                      {c.phone && <><Phone size={10} /> {c.phone}</>}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {c.receiveBulletins && <Badge size="sm" variant="info">Bulletins</Badge>}
                      {c.receiveAbsences && <Badge size="sm" variant="warning">Absences</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setContactForm({
                        firstName: c.firstName, lastName: c.lastName, email: c.email,
                        phone: c.phone || '', relationship: c.relationship,
                        receiveBulletins: c.receiveBulletins, receiveAbsences: c.receiveAbsences,
                      })
                      setEditingContactId(c.id)
                      setShowContactForm(true)
                    }} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
                      <Pencil size={14} className="text-neutral-500" />
                    </button>
                    <button onClick={() => removeContact(c.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Contact form (add/edit) */}
              {showContactForm && (
                <div className="bg-primary-50 dark:bg-primary-900/10 rounded-lg p-3 space-y-2 border border-primary-200 dark:border-primary-800">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Prénom" value={contactForm.firstName}
                      onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))}
                      className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900" />
                    <input type="text" placeholder="Nom" value={contactForm.lastName}
                      onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))}
                      className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="email" placeholder="Email" value={contactForm.email}
                      onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900" />
                    <input type="tel" placeholder="Téléphone" value={contactForm.phone}
                      onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                      className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={contactForm.relationship}
                      onChange={e => setContactForm(f => ({ ...f, relationship: e.target.value as ContactRelationship }))}
                      className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900">
                      <option value="parent">Parent</option>
                      <option value="tuteur_pro">Tuteur professionnel</option>
                      <option value="responsable_legal">Responsable légal</option>
                      <option value="autre">Autre</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={contactForm.receiveBulletins}
                        onChange={e => setContactForm(f => ({ ...f, receiveBulletins: e.target.checked }))} />
                      Bulletins
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={contactForm.receiveAbsences}
                        onChange={e => setContactForm(f => ({ ...f, receiveAbsences: e.target.checked }))} />
                      Absences
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="secondary" onClick={() => setShowContactForm(false)}>Annuler</Button>
                    <Button size="sm" disabled={!contactForm.firstName || !contactForm.lastName || !contactForm.email}
                      onClick={async () => {
                        if (editingContactId) {
                          await updateContact(editingContactId, contactForm)
                        } else {
                          await createContact({ ...contactForm, studentId: selectedUser!.id })
                        }
                        setShowContactForm(false)
                      }}>
                      {editingContactId ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
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
        <p className="text-neutral-600 dark:text-neutral-400">
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

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        type="students"
        context={{
          classNames: classes.map(c => c.name),
          classMap: new Map(classes.map(c => [c.name.toLowerCase(), c.id])),
        }}
        onComplete={refreshUsers}
      />
    </div>
  )
}

export default UsersPage
