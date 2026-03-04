import { useState, useMemo } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState, MultiSelect } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, UserCheck } from 'lucide-react'
import type { Subject, User } from '@/types'

interface TeacherForm {
  firstName: string
  lastName: string
  email: string
  hasAccess: boolean
  subjectIds: string[]
}

const emptyTeacherForm: TeacherForm = { firstName: '', lastName: '', email: '', hasAccess: true, subjectIds: [] }

export function TeachersTab({
  teachers,
  subjects,
  subjectOptions,
  getSubjectIdsForTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  setTeacherSubjectLinks,
}: {
  teachers: User[]
  subjects: Subject[]
  subjectOptions: { value: string; label: string }[]
  getSubjectIdsForTeacher: (teacherId: string) => string[]
  createTeacher: (data: { firstName: string; lastName: string; email: string; role: 'teacher' | 'staff' }) => Promise<User>
  updateTeacher: (id: string, data: { firstName?: string; lastName?: string; email?: string; role?: 'teacher' | 'staff' }) => Promise<User>
  deleteTeacher: (id: string) => Promise<void>
  setTeacherSubjectLinks: (teacherId: string, subjectIds: string[]) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [accessFilter, setAccessFilter] = useState<'' | 'active' | 'inactive'>('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState<TeacherForm>(emptyTeacherForm)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    let result = teachers
    if (search) result = filterBySearch(result, search, ['firstName', 'lastName', 'email'])
    if (accessFilter === 'active') result = result.filter(t => t.role === 'teacher')
    if (accessFilter === 'inactive') result = result.filter(t => t.role !== 'teacher')
    return result
  }, [teachers, search, accessFilter])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptyTeacherForm); setSelected(null); setModalMode('create') }
  const openEdit = (t: User) => {
    setSelected(t)
    setForm({
      firstName: t.firstName, lastName: t.lastName,
      email: t.email,
      hasAccess: t.role === 'teacher',
      subjectIds: getSubjectIdsForTeacher(t.id),
    })
    setModalMode('edit')
  }
  const openDelete = (t: User) => { setSelected(t); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        const created = await createTeacher({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.hasAccess ? 'teacher' : 'staff',
        })
        if (form.subjectIds.length > 0) {
          await setTeacherSubjectLinks(created.id, form.subjectIds)
        }
      } else if (modalMode === 'edit' && selected) {
        await updateTeacher(selected.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.hasAccess ? 'teacher' : 'staff',
        })
        await setTeacherSubjectLinks(selected.id, form.subjectIds)
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteTeacher(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const getTeacherSubjectNames = (teacherId: string) => {
    const ids = getSubjectIdsForTeacher(teacherId)
    return subjects.filter(s => ids.includes(s.id)).map(s => s.name)
  }

  const toggleAccess = async (t: User) => {
    try {
      await updateTeacher(t.id, {
        role: t.role === 'teacher' ? 'staff' : 'teacher',
      })
    } catch { /* toast in hook */ }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par nom ou email..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'active', label: 'Accès actif' },
              { value: 'inactive', label: 'Accès désactivé' },
            ]}
            value={accessFilter}
            onChange={e => setAccessFilter(e.target.value as '' | 'active' | 'inactive')}
          />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter un professeur</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Aucun professeur"
          description={search || accessFilter ? 'Aucun professeur ne correspond à vos critères.' : 'Commencez par ajouter votre premier professeur.'}
          action={!search && !accessFilter ? { label: 'Ajouter un professeur', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Matières</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Accès professeur</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(t => {
                    const subjectNames = getTeacherSubjectNames(t.id)
                    return (
                    <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{t.firstName} {t.lastName}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{t.email}</td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        {subjectNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subjectNames.slice(0, 3).map(name => (
                              <Badge key={name} variant="neutral" size="sm">{name}</Badge>
                            ))}
                            {subjectNames.length > 3 && (
                              <Badge variant="neutral" size="sm">+{subjectNames.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <button
                          onClick={() => toggleAccess(t)}
                          className="focus:outline-none"
                          title={t.role === 'teacher' ? 'Désactiver l\'accès professeur' : 'Activer l\'accès professeur'}
                        >
                          {t.role === 'teacher' ? (
                            <Badge variant="success" size="sm">Actif</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">Désactivé</Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(t)}><Trash2 size={14} className="text-error-600" /></Button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">Page {page} sur {totalPages} ({totalItems} résultat{totalItems > 1 ? 's' : ''})</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!canPrev} onClick={prevPage}>Précédent</Button>
                <Button variant="secondary" size="sm" disabled={!canNext} onClick={nextPage}>Suivant</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalMode === 'create' || modalMode === 'edit'} onClose={closeModal}
        title={modalMode === 'create' ? 'Ajouter un professeur' : 'Modifier le professeur'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Prénom" placeholder="Ex: Jean" value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            <Input label="Nom" placeholder="Ex: Dupont" value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
          </div>
          <Input label="Email" type="email" placeholder="jean.dupont@ecole.fr" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required />

          {/* Toggle accès professeur */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Accès professeur</p>
              <p className="text-xs text-neutral-500">Permet au professeur de se connecter et consulter son planning</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, hasAccess: !f.hasAccess }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                form.hasAccess ? 'bg-primary-600' : 'bg-neutral-300'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                form.hasAccess ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {subjectOptions.length > 0 && (
            <MultiSelect
              label="Matières enseignées"
              placeholder="Sélectionner les matières..."
              options={subjectOptions}
              value={form.subjectIds}
              onChange={ids => setForm(f => ({ ...f, subjectIds: ids }))}
            />
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={submitting}
            disabled={!form.firstName.trim() || !form.lastName.trim() || (modalMode === 'create' && !form.email.trim())}>
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Retirer le professeur" size="sm">
        <p className="text-neutral-600">
          Êtes-vous sûr de vouloir retirer <strong>{selected?.firstName} {selected?.lastName}</strong> ?
          Son compte sera désactivé mais ses données seront conservées.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Retirer</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
