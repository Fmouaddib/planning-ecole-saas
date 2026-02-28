import { useState, useMemo } from 'react'
import { useAcademicData } from '@/hooks/useAcademicData'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner, MultiSelect } from '@/components/ui'
import { filterBySearch } from '@/utils/helpers'
import type { Diploma, Class, Subject, User } from '@/types'
import { Plus, Search, Pencil, Trash2, GraduationCap, BookOpen, Layers, RefreshCw, UserCheck } from 'lucide-react'

type Tab = 'diplomas' | 'classes' | 'subjects' | 'teachers'

// ==================== Onglet Diplômes ====================

interface DiplomaForm {
  title: string
  description: string
  durationYears: number
}

const emptyDiplomaForm: DiplomaForm = { title: '', description: '', durationYears: 1 }

function DiplomasTab({
  diplomas,
  createDiploma,
  updateDiploma,
  deleteDiploma,
}: {
  diplomas: Diploma[]
  createDiploma: (data: { title: string; description?: string; durationYears?: number }) => Promise<Diploma>
  updateDiploma: (id: string, data: { title?: string; description?: string; durationYears?: number }) => Promise<Diploma>
  deleteDiploma: (id: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Diploma | null>(null)
  const [form, setForm] = useState<DiplomaForm>(emptyDiplomaForm)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    return search ? filterBySearch(diplomas, search, ['title']) : diplomas
  }, [diplomas, search])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptyDiplomaForm); setSelected(null); setModalMode('create') }
  const openEdit = (d: Diploma) => {
    setSelected(d)
    setForm({ title: d.title, description: d.description, durationYears: d.durationYears })
    setModalMode('edit')
  }
  const openDelete = (d: Diploma) => { setSelected(d); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createDiploma(form)
      } else if (modalMode === 'edit' && selected) {
        await updateDiploma(selected.id, form)
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteDiploma(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par titre..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter un diplôme</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Aucun diplôme"
          description={search ? 'Aucun diplôme ne correspond à votre recherche.' : 'Commencez par créer votre premier diplôme.'}
          action={!search ? { label: 'Ajouter un diplôme', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Titre</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Description</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Durée</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(d => (
                    <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{d.title}</span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 max-w-xs truncate">
                        {d.description || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info" size="sm">
                          {d.durationYears} an{d.durationYears > 1 ? 's' : ''}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(d)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(d)}><Trash2 size={14} className="text-error-600" /></Button>
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
        title={modalMode === 'create' ? 'Ajouter un diplôme' : 'Modifier le diplôme'} size="md">
        <div className="space-y-4">
          <Input label="Titre du diplôme" placeholder="Ex: BTS SIO" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" placeholder="Description optionnelle..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label="Durée (années)" type="number" min={1} max={10} value={form.durationYears}
            onChange={e => setForm(f => ({ ...f, durationYears: parseInt(e.target.value) || 1 }))} />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={submitting} disabled={!form.title.trim()}>
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Supprimer le diplôme" size="sm">
        <p className="text-neutral-600">
          Êtes-vous sûr de vouloir supprimer le diplôme <strong>{selected?.title}</strong> ?
          Les classes rattachées ne seront plus liées à aucun diplôme.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ==================== Onglet Classes ====================

interface ClassForm {
  name: string
  diplomaId: string
  academicYear: string
  startDate: string
  endDate: string
  subjectIds: string[]
}

const emptyClassForm: ClassForm = { name: '', diplomaId: '', academicYear: '', startDate: '', endDate: '', subjectIds: [] }

function ClassesTab({
  classes,
  diplomas,
  subjects,
  diplomaOptions,
  subjectOptions,
  getSubjectIdsForClass,
  createClass,
  updateClass,
  deleteClass,
  setClassSubjectLinks,
}: {
  classes: Class[]
  diplomas: Diploma[]
  subjects: Subject[]
  diplomaOptions: { value: string; label: string }[]
  subjectOptions: { value: string; label: string }[]
  getSubjectIdsForClass: (classId: string) => string[]
  createClass: (data: { name: string; diplomaId: string; academicYear?: string; startDate?: string; endDate?: string }) => Promise<Class>
  updateClass: (id: string, data: { name?: string; diplomaId?: string; academicYear?: string; startDate?: string; endDate?: string }) => Promise<Class>
  deleteClass: (id: string) => Promise<void>
  setClassSubjectLinks: (classId: string, subjectIds: string[]) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [diplomaFilter, setDiplomaFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Class | null>(null)
  const [form, setForm] = useState<ClassForm>(emptyClassForm)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    let result = classes
    if (search) result = filterBySearch(result, search, ['name'])
    if (diplomaFilter) result = result.filter(c => c.diplomaId === diplomaFilter)
    return result
  }, [classes, search, diplomaFilter])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptyClassForm); setSelected(null); setModalMode('create') }
  const openEdit = (c: Class) => {
    setSelected(c)
    setForm({
      name: c.name, diplomaId: c.diplomaId,
      academicYear: c.academicYear,
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      subjectIds: getSubjectIdsForClass(c.id),
    })
    setModalMode('edit')
  }
  const openDelete = (c: Class) => { setSelected(c); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        const created = await createClass({
          name: form.name, diplomaId: form.diplomaId,
          academicYear: form.academicYear,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        })
        if (form.subjectIds.length > 0) {
          await setClassSubjectLinks(created.id, form.subjectIds)
        }
      } else if (modalMode === 'edit' && selected) {
        await updateClass(selected.id, {
          name: form.name, diplomaId: form.diplomaId,
          academicYear: form.academicYear,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        })
        await setClassSubjectLinks(selected.id, form.subjectIds)
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteClass(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const getDiplomaTitle = (diplomaId: string) => diplomas.find(d => d.id === diplomaId)?.title || '-'

  const getClassSubjectNames = (classId: string) => {
    const ids = getSubjectIdsForClass(classId)
    return subjects.filter(s => ids.includes(s.id)).map(s => s.name)
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par nom..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={[{ value: '', label: 'Tous les diplômes' }, ...diplomaOptions]}
            value={diplomaFilter}
            onChange={e => setDiplomaFilter(e.target.value)}
          />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter une classe</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aucune classe"
          description={search || diplomaFilter ? 'Aucune classe ne correspond à vos critères.' : 'Commencez par créer votre première classe.'}
          action={!search && !diplomaFilter ? { label: 'Ajouter une classe', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Diplôme</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Année</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Matières</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(c => {
                    const subjectNames = getClassSubjectNames(c.id)
                    return (
                      <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-neutral-900">{c.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" size="sm">{getDiplomaTitle(c.diplomaId)}</Badge>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-sm text-neutral-600">{c.academicYear || '-'}</td>
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openDelete(c)}><Trash2 size={14} className="text-error-600" /></Button>
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
        title={modalMode === 'create' ? 'Ajouter une classe' : 'Modifier la classe'} size="lg">
        <div className="space-y-4">
          <Input label="Nom de la classe" placeholder="Ex: BTS SIO 1A" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Diplôme" options={[{ value: '', label: 'Sélectionner...' }, ...diplomaOptions]}
              value={form.diplomaId} onChange={e => setForm(f => ({ ...f, diplomaId: e.target.value }))} required />
            <Input label="Année académique" placeholder="Ex: 2025-2026" value={form.academicYear}
              onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date de début" type="date" value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="Date de fin" type="date" value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          {subjectOptions.length > 0 && (
            <MultiSelect
              label="Matières associées"
              placeholder="Sélectionner les matières..."
              options={subjectOptions}
              value={form.subjectIds}
              onChange={ids => setForm(f => ({ ...f, subjectIds: ids }))}
            />
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={submitting} disabled={!form.name.trim() || !form.diplomaId}>
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Supprimer la classe" size="sm">
        <p className="text-neutral-600">
          Êtes-vous sûr de vouloir supprimer la classe <strong>{selected?.name}</strong> ?
          Les liaisons matières associées seront également supprimées.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ==================== Onglet Matières ====================

interface SubjectForm {
  name: string
  code: string
  description: string
  category: string
  diplomaId: string
}

const emptySubjectForm: SubjectForm = { name: '', code: '', description: '', category: '', diplomaId: '' }

function SubjectsTab({
  subjects,
  diplomas,
  diplomaOptions,
  createSubject,
  updateSubject,
  deleteSubject,
}: {
  subjects: Subject[]
  diplomas: Diploma[]
  diplomaOptions: { value: string; label: string }[]
  createSubject: (data: { name: string; code?: string; description?: string; category?: string; diplomaId?: string }) => Promise<Subject>
  updateSubject: (id: string, data: { name?: string; code?: string; description?: string; category?: string; diplomaId?: string }) => Promise<Subject>
  deleteSubject: (id: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [diplomaFilter, setDiplomaFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectForm>(emptySubjectForm)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    let result = subjects
    if (search) result = filterBySearch(result, search, ['name', 'code'])
    if (diplomaFilter) result = result.filter(s => s.diplomaId === diplomaFilter)
    return result
  }, [subjects, search, diplomaFilter])

  const getDiplomaTitle = (diplomaId?: string) => diplomas.find(d => d.id === diplomaId)?.title || '-'

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptySubjectForm); setSelected(null); setModalMode('create') }
  const openEdit = (s: Subject) => {
    setSelected(s)
    setForm({ name: s.name, code: s.code, description: s.description || '', category: s.category || '', diplomaId: s.diplomaId || '' })
    setModalMode('edit')
  }
  const openDelete = (s: Subject) => { setSelected(s); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createSubject({ ...form, diplomaId: form.diplomaId || undefined })
      } else if (modalMode === 'edit' && selected) {
        await updateSubject(selected.id, { ...form, diplomaId: form.diplomaId || undefined })
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteSubject(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par nom ou code..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={[{ value: '', label: 'Tous les diplômes' }, ...diplomaOptions]}
            value={diplomaFilter}
            onChange={e => setDiplomaFilter(e.target.value)}
          />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter une matière</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucune matière"
          description={search || diplomaFilter ? 'Aucune matière ne correspond à vos critères.' : 'Commencez par créer votre première matière.'}
          action={!search && !diplomaFilter ? { label: 'Ajouter une matière', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Code</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Diplôme</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Catégorie</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Description</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(s => (
                    <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{s.name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{s.code || '-'}</td>
                      <td className="px-4 py-3">
                        {s.diplomaId ? (
                          <Badge variant="success" size="sm">{getDiplomaTitle(s.diplomaId)}</Badge>
                        ) : (
                          <span className="text-sm text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        {s.category ? <Badge variant="warning" size="sm">{s.category}</Badge> : <span className="text-sm text-neutral-400">-</span>}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 max-w-xs truncate">{s.description || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(s)}><Trash2 size={14} className="text-error-600" /></Button>
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
        title={modalMode === 'create' ? 'Ajouter une matière' : 'Modifier la matière'} size="md">
        <div className="space-y-4">
          <Input label="Nom de la matière" placeholder="Ex: Mathématiques" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Select label="Diplôme" options={[{ value: '', label: 'Sélectionner un diplôme...' }, ...diplomaOptions]}
            value={form.diplomaId} onChange={e => setForm(f => ({ ...f, diplomaId: e.target.value }))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Code" placeholder="Ex: MATH" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <Input label="Catégorie" placeholder="Ex: Scientifique" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
          <Textarea label="Description" placeholder="Description optionnelle..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={submitting} disabled={!form.name.trim() || !form.diplomaId}>
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Supprimer la matière" size="sm">
        <p className="text-neutral-600">
          Êtes-vous sûr de vouloir supprimer la matière <strong>{selected?.name}</strong> ?
          Elle sera retirée de toutes les classes et de tous les professeurs auxquels elle est associée.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ==================== Onglet Professeurs ====================

interface TeacherForm {
  firstName: string
  lastName: string
  email: string
  hasAccess: boolean
  subjectIds: string[]
}

const emptyTeacherForm: TeacherForm = { firstName: '', lastName: '', email: '', hasAccess: true, subjectIds: [] }

function TeachersTab({
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
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Matières</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Accès professeur</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(t => {
                    const subjectNames = getTeacherSubjectNames(t.id)
                    return (
                    <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{t.firstName} {t.lastName}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{t.email}</td>
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
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div>
              <p className="text-sm font-medium text-neutral-900">Accès professeur</p>
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

// ==================== Page principale ====================

const tabs: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'diplomas', label: 'Diplômes', icon: GraduationCap },
  { key: 'classes', label: 'Classes', icon: Layers },
  { key: 'subjects', label: 'Matières', icon: BookOpen },
  { key: 'teachers', label: 'Professeurs', icon: UserCheck },
]

function AcademicPage() {
  const [activeTab, setActiveTab] = useState<Tab>('diplomas')
  const {
    diplomas, classes, subjects, teachers, isLoading,
    diplomaOptions,
    getSubjectIdsForClass,
    createDiploma, updateDiploma, deleteDiploma,
    createClass, updateClass, deleteClass,
    createSubject, updateSubject, deleteSubject,
    createTeacher, updateTeacher, deleteTeacher,
    setClassSubjectLinks,
    setTeacherSubjectLinks,
    getSubjectIdsForTeacher,
    refreshAll,
  } = useAcademicData()

  const subjectOptions = useMemo(
    () => subjects.map(s => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` })),
    [subjects],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement du référentiel..." />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Référentiel académique</h1>
          <p className="text-neutral-500 mt-1">
            {diplomas.length} diplôme{diplomas.length > 1 ? 's' : ''}, {classes.length} classe{classes.length > 1 ? 's' : ''}, {subjects.length} matière{subjects.length > 1 ? 's' : ''}, {teachers.length} professeur{teachers.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshAll} className="mt-4 sm:mt-0">
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="flex space-x-1 -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'diplomas' && (
        <DiplomasTab
          diplomas={diplomas}
          createDiploma={createDiploma}
          updateDiploma={updateDiploma}
          deleteDiploma={deleteDiploma}
        />
      )}
      {activeTab === 'classes' && (
        <ClassesTab
          classes={classes}
          diplomas={diplomas}
          subjects={subjects}
          diplomaOptions={diplomaOptions}
          subjectOptions={subjectOptions}
          getSubjectIdsForClass={getSubjectIdsForClass}
          createClass={createClass}
          updateClass={updateClass}
          deleteClass={deleteClass}
          setClassSubjectLinks={setClassSubjectLinks}
        />
      )}
      {activeTab === 'subjects' && (
        <SubjectsTab
          subjects={subjects}
          diplomas={diplomas}
          diplomaOptions={diplomaOptions}
          createSubject={createSubject}
          updateSubject={updateSubject}
          deleteSubject={deleteSubject}
        />
      )}
      {activeTab === 'teachers' && (
        <TeachersTab
          teachers={teachers}
          subjects={subjects}
          subjectOptions={subjectOptions}
          getSubjectIdsForTeacher={getSubjectIdsForTeacher}
          createTeacher={createTeacher}
          updateTeacher={updateTeacher}
          deleteTeacher={deleteTeacher}
          setTeacherSubjectLinks={setTeacherSubjectLinks}
        />
      )}
    </div>
  )
}

export default AcademicPage
