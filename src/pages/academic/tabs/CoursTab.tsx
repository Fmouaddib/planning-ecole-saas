import { useState, useMemo } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, BookOpen, CalendarDays, Copy, Link2, MessageCircle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { SCHEDULE_TYPE_OPTIONS, DAY_OPTIONS, DEFAULT_DAYS_BY_TYPE, getScheduleTypeLabel, getScheduleTypeBadgeVariant, formatDaysShort } from '@/utils/scheduleUtils'
import type { Diploma, Program, AcademicYear } from '@/types'
import type { CoursEntity } from '@/hooks/useAcademicData'

interface CoursForm {
  name: string
  diplomaId: string
  programId: string
  academicYearId: string
  scheduleType: string
  attendanceDays: number[]
  code: string
  description: string
  whatsappLink: string
  formationLink: string
}

const emptyCoursForm: CoursForm = {
  name: '', diplomaId: '', programId: '', academicYearId: '',
  scheduleType: 'initial', attendanceDays: [1, 2, 3, 4, 5],
  code: '', description: '', whatsappLink: '', formationLink: '',
}

export function CoursTab({
  coursList,
  diplomas,
  programs,
  diplomaOptions,
  programOptionsByDiploma,
  academicYears,
  academicYearOptions,
  currentAcademicYear,
  createCours,
  updateCours,
  deleteCours,
  duplicateCours,
  isOnlineSchool,
}: {
  coursList: CoursEntity[]
  diplomas: Diploma[]
  programs: Program[]
  diplomaOptions: { value: string; label: string }[]
  programOptionsByDiploma: (diplomaId: string) => { value: string; label: string }[]
  academicYears: AcademicYear[]
  academicYearOptions: { value: string; label: string }[]
  currentAcademicYear: AcademicYear | null
  createCours: (data: { name: string; diplomaId: string; programId?: string; academicYear?: string; academicYearId?: string; scheduleType?: string; attendanceDays?: number[]; code?: string; description?: string; whatsappLink?: string; formationLink?: string }) => Promise<{ classId: string; subjectId: string }>
  updateCours: (classId: string, subjectId: string, data: { name?: string; diplomaId?: string; programId?: string; academicYear?: string; academicYearId?: string; scheduleType?: string; attendanceDays?: number[]; code?: string; description?: string; whatsappLink?: string; formationLink?: string }) => Promise<void>
  deleteCours: (classId: string, subjectId: string) => Promise<void>
  duplicateCours: (cours: CoursEntity, targetAcademicYearId?: string) => Promise<{ classId: string; subjectId: string }>
  isOnlineSchool?: boolean
}) {
  const [search, setSearch] = useState('')
  const [diplomaFilter, setDiplomaFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'duplicate' | null>(null)
  const [selected, setSelected] = useState<CoursEntity | null>(null)
  const [form, setForm] = useState<CoursForm>(emptyCoursForm)
  const [duplicateTargetYearId, setDuplicateTargetYearId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  type SortKey = 'name' | 'code' | 'diploma' | 'program' | 'year' | 'profile'
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { if (sortDir === 'asc') setSortDir('desc'); else { setSortKey(null); setSortDir('asc') } }
    else { setSortKey(key); setSortDir('asc') }
  }

  const getDiplomaTitle = (diplomaId: string) => diplomas.find(d => d.id === diplomaId)?.title || '-'
  const getProgramName = (programId?: string) => programId ? programs.find(p => p.id === programId)?.name || '-' : '-'

  const filtered = useMemo(() => {
    let result = coursList
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
    if (diplomaFilter) result = result.filter(c => c.diplomaId === diplomaFilter)
    if (yearFilter) result = result.filter(c => c.academicYearId === yearFilter)
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        switch (sortKey) {
          case 'name': return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) * dir
          case 'code': return (a.code || '').localeCompare(b.code || '', 'fr', { sensitivity: 'base' }) * dir
          case 'diploma': return getDiplomaTitle(a.diplomaId).localeCompare(getDiplomaTitle(b.diplomaId), 'fr', { sensitivity: 'base' }) * dir
          case 'program': return getProgramName(a.programId).localeCompare(getProgramName(b.programId), 'fr', { sensitivity: 'base' }) * dir
          case 'year': {
            const aName = a.academicYearId ? (academicYears.find(y => y.id === a.academicYearId)?.name || '') : (a.academicYear || '')
            const bName = b.academicYearId ? (academicYears.find(y => y.id === b.academicYearId)?.name || '') : (b.academicYear || '')
            return aName.localeCompare(bName, 'fr', { sensitivity: 'base' }) * dir
          }
          case 'profile': return (a.scheduleType || '').localeCompare(b.scheduleType || '', 'fr', { sensitivity: 'base' }) * dir
          default: return 0
        }
      })
    }
    return result
  }, [coursList, search, diplomaFilter, yearFilter, sortKey, sortDir, diplomas, programs, academicYears])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => {
    setForm({ ...emptyCoursForm, academicYearId: currentAcademicYear?.id || '' })
    setSelected(null)
    setModalMode('create')
  }
  const openEdit = (c: CoursEntity) => {
    setSelected(c)
    setForm({
      name: c.name,
      diplomaId: c.diplomaId,
      programId: c.programId || '',
      academicYearId: c.academicYearId || '',
      scheduleType: c.scheduleType || 'initial',
      attendanceDays: c.attendanceDays || [1, 2, 3, 4, 5],
      code: c.code || '',
      description: c.description || '',
      whatsappLink: c.whatsappLink || '',
      formationLink: c.formationLink || '',
    })
    setModalMode('edit')
  }
  const openDuplicate = (c: CoursEntity) => {
    setSelected(c)
    setDuplicateTargetYearId('')
    setModalMode('duplicate')
  }
  const openDelete = (c: CoursEntity) => { setSelected(c); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const yearName = form.academicYearId
        ? academicYears.find(y => y.id === form.academicYearId)?.name
        : undefined
      if (modalMode === 'create') {
        await createCours({
          name: form.name,
          diplomaId: form.diplomaId,
          programId: form.programId || undefined,
          academicYear: yearName,
          academicYearId: form.academicYearId || undefined,
          scheduleType: form.scheduleType,
          attendanceDays: form.attendanceDays,
          code: form.code || undefined,
          description: form.description || undefined,
          whatsappLink: form.whatsappLink || undefined,
          formationLink: form.formationLink || undefined,
        })
      } else if (modalMode === 'edit' && selected) {
        await updateCours(selected.classId, selected.subjectId, {
          name: form.name,
          diplomaId: form.diplomaId,
          programId: form.programId || undefined,
          academicYear: yearName,
          academicYearId: form.academicYearId || undefined,
          scheduleType: form.scheduleType,
          attendanceDays: form.attendanceDays,
          code: form.code || undefined,
          description: form.description || undefined,
          whatsappLink: form.whatsappLink || undefined,
          formationLink: form.formationLink || undefined,
        })
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDuplicate = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await duplicateCours(selected, duplicateTargetYearId || undefined)
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteCours(selected.classId, selected.subjectId); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par nom ou code..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: '', label: 'Toutes les années' }, ...academicYearOptions]}
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: '', label: 'Tous les diplômes' }, ...diplomaOptions]}
            value={diplomaFilter}
            onChange={e => setDiplomaFilter(e.target.value)}
          />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter un cours</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucun cours"
          description={search || diplomaFilter ? 'Aucun cours ne correspond à vos critères.' : 'Commencez par créer votre premier cours.'}
          action={!search && !diplomaFilter ? { label: 'Ajouter un cours', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    {([
                      { key: 'name' as SortKey, label: 'Nom', className: '' },
                      { key: 'diploma' as SortKey, label: 'Diplôme', className: '' },
                      { key: 'program' as SortKey, label: 'Programme', className: 'hidden sm:table-cell' },
                      { key: 'code' as SortKey, label: 'Code', className: 'hidden sm:table-cell' },
                      { key: 'profile' as SortKey, label: 'Profil', className: 'hidden md:table-cell' },
                      { key: 'year' as SortKey, label: 'Année', className: 'hidden md:table-cell' },
                    ]).map(col => (
                      <th key={col.key} className={`${col.className} text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors`} onClick={() => toggleSort(col.key)}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (sortDir === 'asc' ? <ArrowUp size={12} className="text-primary-500" /> : <ArrowDown size={12} className="text-primary-500" />) : <ArrowUpDown size={12} className="opacity-30" />}
                        </span>
                      </th>
                    ))}
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(c => (
                    <tr key={c.classId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success" size="sm">{getDiplomaTitle(c.diplomaId)}</Badge>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                        {getProgramName(c.programId)}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        {c.code ? <Badge variant="neutral" size="sm">{c.code}</Badge> : <span className="text-sm text-neutral-400">-</span>}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={getScheduleTypeBadgeVariant(c.scheduleType)} size="sm">
                            {getScheduleTypeLabel(c.scheduleType)}
                          </Badge>
                          <span className="text-[11px] text-neutral-400">
                            {formatDaysShort(c.attendanceDays)}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{c.academicYear || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDuplicate(c)} title="Dupliquer"><Copy size={14} className="text-primary-600" /></Button>
                          <Button variant="ghost" size="sm" aria-label="Modifier" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" aria-label="Supprimer" onClick={() => openDelete(c)}><Trash2 size={14} className="text-error-600" /></Button>
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
        title={modalMode === 'create' ? 'Ajouter un cours' : 'Modifier le cours'} size="lg">
        <div className="space-y-4">
          <Input label="Nom du cours" placeholder="Ex: Développement Web" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Diplôme" options={[{ value: '', label: 'Sélectionner...' }, ...diplomaOptions]}
              value={form.diplomaId} onChange={e => {
                const newDiplomaId = e.target.value
                setForm(f => ({ ...f, diplomaId: newDiplomaId, programId: '' }))
              }} required />
            <Select label="Programme" options={[{ value: '', label: 'Aucun (optionnel)' }, ...programOptionsByDiploma(form.diplomaId)]}
              value={form.programId} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Code" placeholder="Ex: DEV-WEB" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <Select label="Année académique"
              options={[{ value: '', label: 'Aucune' }, ...academicYearOptions]}
              value={form.academicYearId}
              onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))} />
          </div>
          <Textarea label="Description" placeholder="Description du cours (optionnel)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />

          {/* Profil de planification */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} className="text-primary-600" />
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Planification</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Profil"
                options={SCHEDULE_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                value={form.scheduleType}
                onChange={e => {
                  const newType = e.target.value
                  setForm(f => ({
                    ...f,
                    scheduleType: newType,
                    attendanceDays: DEFAULT_DAYS_BY_TYPE[newType] || f.attendanceDays,
                  }))
                }}
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Jours de présence
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map(day => {
                    const isSelected = form.attendanceDays.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            attendanceDays: isSelected
                              ? f.attendanceDays.filter(d => d !== day.value)
                              : [...f.attendanceDays, day.value].sort((a, b) => a - b),
                          }))
                        }}
                      >
                        {day.label.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Liens (école en ligne uniquement) */}
          {isOnlineSchool && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={16} className="text-primary-600" />
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Liens du cours</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Groupe WhatsApp"
                  placeholder="https://chat.whatsapp.com/..."
                  value={form.whatsappLink}
                  onChange={e => setForm(f => ({ ...f, whatsappLink: e.target.value }))}
                  leftIcon={MessageCircle}
                />
                <Input
                  label="Lien de la formation"
                  placeholder="https://..."
                  value={form.formationLink}
                  onChange={e => setForm(f => ({ ...f, formationLink: e.target.value }))}
                  leftIcon={Link2}
                />
              </div>
            </div>
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
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Supprimer le cours" size="sm">
        <p className="text-neutral-600 dark:text-neutral-400">
          Êtes-vous sûr de vouloir supprimer le cours <strong>{selected?.name}</strong> ?
          La classe et la matière associées seront également supprimées.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Supprimer</Button>
        </ModalFooter>
      </Modal>

      {/* Duplicate Modal */}
      <Modal isOpen={modalMode === 'duplicate'} onClose={closeModal} title="Dupliquer le cours" size="sm">
        <div className="space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400">
            Dupliquer <strong>{selected?.name}</strong> avec ses affectations professeurs.
          </p>
          <Select
            label="Année cible"
            options={[{ value: '', label: 'Même année' }, ...academicYearOptions]}
            value={duplicateTargetYearId}
            onChange={e => setDuplicateTargetYearId(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleDuplicate} isLoading={submitting} leftIcon={Copy}>Dupliquer</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
