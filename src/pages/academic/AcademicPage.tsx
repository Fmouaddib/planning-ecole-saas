import { useState, useMemo } from 'react'
import { useAcademicData } from '@/hooks/useAcademicData'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner, MultiSelect } from '@/components/ui'
import { filterBySearch } from '@/utils/helpers'
import type { Program, Diploma, Class, Subject, User } from '@/types'
import { Plus, Search, Pencil, Trash2, GraduationCap, BookOpen, Layers, RefreshCw, UserCheck, FolderOpen, CalendarDays, X, FileText } from 'lucide-react'
import { SCHEDULE_TYPE_OPTIONS, DAY_OPTIONS, DEFAULT_DAYS_BY_TYPE, getScheduleTypeLabel, getScheduleTypeBadgeVariant, formatDaysShort } from '@/utils/scheduleUtils'
import type { AlternanceConfig, ScheduleExceptions, ExamPeriod } from '@/types'

type Tab = 'programs' | 'diplomas' | 'classes' | 'subjects' | 'teachers'

// ==================== Onglet Programmes ====================

interface ProgramForm {
  name: string
  code: string
  description: string
  durationHours: number
  maxParticipants: number
  color: string
  diplomaId: string
}

const emptyProgramForm: ProgramForm = { name: '', code: '', description: '', durationHours: 0, maxParticipants: 20, color: '#3B82F6', diplomaId: '' }

function ProgramsTab({
  programs,
  subjects,
  diplomaOptions,
  createProgram,
  updateProgram,
  deleteProgram,
}: {
  programs: Program[]
  subjects: Subject[]
  diplomaOptions: { value: string; label: string }[]
  createProgram: (data: { name: string; code?: string; description?: string; durationHours?: number; maxParticipants?: number; color?: string; diplomaId?: string }) => Promise<Program>
  updateProgram: (id: string, data: { name?: string; code?: string; description?: string; durationHours?: number; maxParticipants?: number; color?: string; diplomaId?: string }) => Promise<Program>
  deleteProgram: (id: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Program | null>(null)
  const [form, setForm] = useState<ProgramForm>(emptyProgramForm)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    return search ? filterBySearch(programs, search, ['name', 'code']) : programs
  }, [programs, search])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptyProgramForm); setSelected(null); setModalMode('create') }
  const openEdit = (p: Program) => {
    setSelected(p)
    setForm({
      name: p.name, code: p.code || '', description: p.description || '',
      durationHours: p.durationHours, maxParticipants: p.maxParticipants, color: p.color,
      diplomaId: p.diplomaId || '',
    })
    setModalMode('edit')
  }
  const openDelete = (p: Program) => { setSelected(p); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = { ...form, diplomaId: form.diplomaId || undefined }
      if (modalMode === 'create') {
        await createProgram(payload)
      } else if (modalMode === 'edit' && selected) {
        await updateProgram(selected.id, payload)
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteProgram(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const getSubjectCount = (programId: string) => subjects.filter(s => s.programId === programId).length

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par nom ou code..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter un programme</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aucun programme"
          description={search ? 'Aucun programme ne correspond à votre recherche.' : 'Commencez par créer votre premier programme.'}
          action={!search ? { label: 'Ajouter un programme', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Programme</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Code</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Durée (h)</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Max participants</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Diplôme</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Matières</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(p => {
                    const nbSubjects = getSubjectCount(p.id)
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{p.code || '-'}</td>
                        <td className="hidden sm:table-cell px-4 py-3">
                          <Badge variant="info" size="sm">{p.durationHours}h</Badge>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{p.maxParticipants}</td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          {p.diploma ? (
                            <Badge variant="success" size="sm">{p.diploma.title}</Badge>
                          ) : (
                            <span className="text-sm text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          {nbSubjects > 0 ? (
                            <Badge variant="info" size="sm">{nbSubjects} matière{nbSubjects > 1 ? 's' : ''}</Badge>
                          ) : (
                            <span className="text-sm text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openDelete(p)}><Trash2 size={14} className="text-error-600" /></Button>
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
        title={modalMode === 'create' ? 'Ajouter un programme' : 'Modifier le programme'} size="md">
        <div className="space-y-4">
          <Input label="Nom du programme" placeholder="Ex: Développement Web" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Diplôme" options={[{ value: '', label: 'Aucun diplôme' }, ...diplomaOptions]}
              value={form.diplomaId} onChange={e => setForm(f => ({ ...f, diplomaId: e.target.value }))} />
            <Input label="Code" placeholder="Ex: DEV-WEB" value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Couleur</label>
              <input type="color" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer" />
            </div>
            <Input label="Max participants" type="number" min={1} value={form.maxParticipants}
              onChange={e => setForm(f => ({ ...f, maxParticipants: parseInt(e.target.value) || 20 }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Durée (heures)" type="number" min={0} value={form.durationHours}
              onChange={e => setForm(f => ({ ...f, durationHours: parseInt(e.target.value) || 0 }))} />
          </div>
          <Textarea label="Description" placeholder="Description optionnelle..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={submitting} disabled={!form.name.trim()}>
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Supprimer le programme" size="sm">
        <p className="text-neutral-600 dark:text-neutral-400">
          Êtes-vous sûr de vouloir supprimer le programme <strong>{selected?.name}</strong> ?
          Les matières rattachées ne seront plus liées à aucun programme.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Supprimer</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ==================== Onglet Diplômes ====================

interface DiplomaForm {
  title: string
  description: string
  durationYears: number
}

const emptyDiplomaForm: DiplomaForm = { title: '', description: '', durationYears: 1 }

function DiplomasTab({
  diplomas,
  programs,
  createDiploma,
  updateDiploma,
  deleteDiploma,
}: {
  diplomas: Diploma[]
  programs: Program[]
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

  const getProgramCount = (diplomaId: string) => programs.filter(p => p.diplomaId === diplomaId).length

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
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Titre</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Programmes</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Description</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Durée</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(d => {
                    const nbPrograms = getProgramCount(d.id)
                    return (
                    <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{d.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        {nbPrograms > 0 ? (
                          <Badge variant="info" size="sm">{nbPrograms} programme{nbPrograms > 1 ? 's' : ''}</Badge>
                        ) : (
                          <span className="text-sm text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
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
        title={modalMode === 'create' ? 'Ajouter un diplôme' : 'Modifier le diplôme'} size="md">
        <div className="space-y-4">
          <Input label="Titre du diplôme" placeholder="Ex: BTS SIO" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Input label="Durée (années)" type="number" min={1} max={10} value={form.durationYears}
            onChange={e => setForm(f => ({ ...f, durationYears: parseInt(e.target.value) || 1 }))} />
          <Textarea label="Description" placeholder="Description optionnelle..." value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
  scheduleType: string
  attendanceDays: number[]
  hasAlternanceCycle: boolean
  alternanceSchoolWeeks: number
  alternanceCompanyWeeks: number
  alternanceRefDate: string
  exceptSchoolDays: string[]
  exceptCompanyDays: string[]
  examPeriods: ExamPeriod[]
}

const emptyClassForm: ClassForm = {
  name: '', diplomaId: '', academicYear: '', startDate: '', endDate: '', subjectIds: [],
  scheduleType: 'initial', attendanceDays: [1, 2, 3, 4, 5],
  hasAlternanceCycle: false,
  alternanceSchoolWeeks: 1, alternanceCompanyWeeks: 2, alternanceRefDate: '',
  exceptSchoolDays: [], exceptCompanyDays: [],
  examPeriods: [],
}

function ClassesTab({
  classes,
  diplomas,
  subjects,
  diplomaOptions,
  subjectOptionsByDiploma,
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
  subjectOptionsByDiploma: (diplomaId: string) => { value: string; label: string }[]
  getSubjectIdsForClass: (classId: string) => string[]
  createClass: (data: { name: string; diplomaId: string; academicYear?: string; startDate?: string; endDate?: string; scheduleType?: string; attendanceDays?: number[]; alternanceConfig?: AlternanceConfig; scheduleExceptions?: ScheduleExceptions; examPeriods?: ExamPeriod[] }) => Promise<Class>
  updateClass: (id: string, data: { name?: string; diplomaId?: string; academicYear?: string; startDate?: string; endDate?: string; scheduleType?: string; attendanceDays?: number[]; alternanceConfig?: AlternanceConfig | null; scheduleExceptions?: ScheduleExceptions | null; examPeriods?: ExamPeriod[] | null }) => Promise<Class>
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
      scheduleType: c.scheduleType || 'initial',
      attendanceDays: c.attendanceDays || [1, 2, 3, 4, 5],
      hasAlternanceCycle: !!(c.alternanceConfig?.schoolWeeks && c.alternanceConfig?.companyWeeks && c.alternanceConfig?.referenceDate),
      alternanceSchoolWeeks: c.alternanceConfig?.schoolWeeks || 1,
      alternanceCompanyWeeks: c.alternanceConfig?.companyWeeks || 2,
      alternanceRefDate: c.alternanceConfig?.referenceDate || '',
      exceptSchoolDays: c.scheduleExceptions?.schoolDays || [],
      exceptCompanyDays: c.scheduleExceptions?.companyDays || [],
      examPeriods: c.examPeriods || [],
    })
    setModalMode('edit')
  }
  const openDelete = (c: Class) => { setSelected(c); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const buildAlternanceConfig = (): AlternanceConfig | null => {
    if (form.scheduleType !== 'alternance' || !form.hasAlternanceCycle) return null
    if (!form.alternanceRefDate || !form.alternanceSchoolWeeks || !form.alternanceCompanyWeeks) return null
    return {
      schoolWeeks: form.alternanceSchoolWeeks,
      companyWeeks: form.alternanceCompanyWeeks,
      referenceDate: form.alternanceRefDate,
    }
  }

  const buildExceptions = (): ScheduleExceptions | null => {
    if (form.exceptSchoolDays.length === 0 && form.exceptCompanyDays.length === 0) return null
    return { schoolDays: form.exceptSchoolDays, companyDays: form.exceptCompanyDays }
  }

  const buildExamPeriods = (): ExamPeriod[] | null => {
    const valid = form.examPeriods.filter(p => p.name.trim() && p.startDate && p.endDate)
    return valid.length > 0 ? valid : null
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const schedulePayload = {
        scheduleType: form.scheduleType,
        attendanceDays: form.attendanceDays,
        alternanceConfig: buildAlternanceConfig(),
        scheduleExceptions: buildExceptions(),
        examPeriods: buildExamPeriods(),
      }
      if (modalMode === 'create') {
        const created = await createClass({
          name: form.name, diplomaId: form.diplomaId,
          academicYear: form.academicYear,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          ...schedulePayload,
          alternanceConfig: schedulePayload.alternanceConfig || undefined,
          scheduleExceptions: schedulePayload.scheduleExceptions || undefined,
          examPeriods: schedulePayload.examPeriods || undefined,
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
          ...schedulePayload,
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Diplôme</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Profil</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Année</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Matières</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(c => {
                    const subjectNames = getClassSubjectNames(c.id)
                    return (
                      <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" size="sm">{getDiplomaTitle(c.diplomaId)}</Badge>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <Badge variant={getScheduleTypeBadgeVariant(c.scheduleType)} size="sm">
                              {getScheduleTypeLabel(c.scheduleType)}
                            </Badge>
                            <span className="text-[11px] text-neutral-400">
                              {formatDaysShort(c.attendanceDays)}
                              {c.alternanceConfig && ` · ${c.alternanceConfig.schoolWeeks}/${c.alternanceConfig.companyWeeks}s`}
                            </span>
                            {((c.scheduleExceptions?.schoolDays?.length || 0) + (c.scheduleExceptions?.companyDays?.length || 0)) > 0 && (
                              <span className="text-[10px] text-primary-500">
                                {(c.scheduleExceptions?.schoolDays?.length || 0) + (c.scheduleExceptions?.companyDays?.length || 0)} exception{((c.scheduleExceptions?.schoolDays?.length || 0) + (c.scheduleExceptions?.companyDays?.length || 0)) > 1 ? 's' : ''}
                              </span>
                            )}
                            {(c.examPeriods?.length || 0) > 0 && (
                              <span className="text-[10px] text-info-500">
                                {c.examPeriods!.length} période{c.examPeriods!.length > 1 ? 's' : ''} exam
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{c.academicYear || '-'}</td>
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
              value={form.diplomaId} onChange={e => {
                const newDiplomaId = e.target.value
                const availableIds = new Set(subjectOptionsByDiploma(newDiplomaId).map(o => o.value))
                setForm(f => ({
                  ...f,
                  diplomaId: newDiplomaId,
                  subjectIds: f.subjectIds.filter(id => availableIds.has(id)),
                }))
              }} required />
            <Input label="Année académique" placeholder="Ex: 2025-2026" value={form.academicYear}
              onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date de début" type="date" value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="Date de fin" type="date" value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>

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

            {/* Config alternance — cycle semaines (optionnel) */}
            {form.scheduleType === 'alternance' && (
              <div className="mt-3 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={form.hasAlternanceCycle}
                    onChange={e => setForm(f => ({ ...f, hasAlternanceCycle: e.target.checked }))}
                    className="rounded border-warning-400"
                  />
                  <span className="text-xs font-semibold text-warning-700 dark:text-warning-400">
                    Cycle multi-semaines (ex: 1 sem. école / 2 sem. entreprise)
                  </span>
                </label>
                {!form.hasAlternanceCycle && (
                  <p className="text-[11px] text-warning-600 dark:text-warning-500">
                    Sans cycle : la classe suit ses jours de présence chaque semaine.
                  </p>
                )}
                {form.hasAlternanceCycle && (
                  <>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <Input
                        label="Sem. école"
                        type="number"
                        min={1}
                        max={12}
                        value={form.alternanceSchoolWeeks}
                        onChange={e => setForm(f => ({ ...f, alternanceSchoolWeeks: Math.max(1, parseInt(e.target.value) || 1) }))}
                      />
                      <Input
                        label="Sem. entreprise"
                        type="number"
                        min={1}
                        max={12}
                        value={form.alternanceCompanyWeeks}
                        onChange={e => setForm(f => ({ ...f, alternanceCompanyWeeks: Math.max(1, parseInt(e.target.value) || 1) }))}
                      />
                      <Input
                        label="Date début cycle"
                        type="date"
                        value={form.alternanceRefDate}
                        onChange={e => setForm(f => ({ ...f, alternanceRefDate: e.target.value }))}
                      />
                    </div>
                    <p className="text-[11px] text-warning-600 dark:text-warning-500 mt-1">
                      Cycle : {form.alternanceSchoolWeeks} sem. école / {form.alternanceCompanyWeeks} sem. entreprise
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Jours exceptionnels */}
            <div className="mt-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Jours exceptionnels</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Jours école exceptionnels */}
                <div>
                  <label className="block text-[11px] font-medium text-success-700 dark:text-success-400 mb-1">
                    Jours de cours exceptionnels
                  </label>
                  <p className="text-[10px] text-neutral-500 mb-1.5">Cours même si le planning dit "pas cours"</p>
                  <div className="flex gap-1.5 mb-1.5">
                    <input
                      type="date"
                      id="add-school-day"
                      className="flex-1 text-xs border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      type="button"
                      className="px-2 py-1 text-xs font-medium bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/30 dark:text-success-400 rounded transition-colors"
                      onClick={() => {
                        const input = document.getElementById('add-school-day') as HTMLInputElement
                        const val = input?.value
                        if (val && !form.exceptSchoolDays.includes(val)) {
                          setForm(f => ({ ...f, exceptSchoolDays: [...f.exceptSchoolDays, val].sort() }))
                          input.value = ''
                        }
                      }}
                    >
                      Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {form.exceptSchoolDays.map(d => (
                      <span key={d} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 rounded">
                        {d}
                        <button type="button" onClick={() => setForm(f => ({ ...f, exceptSchoolDays: f.exceptSchoolDays.filter(x => x !== d) }))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    {form.exceptSchoolDays.length === 0 && <span className="text-[10px] text-neutral-400">Aucun</span>}
                  </div>
                </div>

                {/* Jours entreprise exceptionnels */}
                <div>
                  <label className="block text-[11px] font-medium text-error-700 dark:text-error-400 mb-1">
                    Jours entreprise exceptionnels
                  </label>
                  <p className="text-[10px] text-neutral-500 mb-1.5">Pas de cours même si le planning dit "cours"</p>
                  <div className="flex gap-1.5 mb-1.5">
                    <input
                      type="date"
                      id="add-company-day"
                      className="flex-1 text-xs border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      type="button"
                      className="px-2 py-1 text-xs font-medium bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/30 dark:text-error-400 rounded transition-colors"
                      onClick={() => {
                        const input = document.getElementById('add-company-day') as HTMLInputElement
                        const val = input?.value
                        if (val && !form.exceptCompanyDays.includes(val)) {
                          setForm(f => ({ ...f, exceptCompanyDays: [...f.exceptCompanyDays, val].sort() }))
                          input.value = ''
                        }
                      }}
                    >
                      Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {form.exceptCompanyDays.map(d => (
                      <span key={d} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 rounded">
                        {d}
                        <button type="button" onClick={() => setForm(f => ({ ...f, exceptCompanyDays: f.exceptCompanyDays.filter(x => x !== d) }))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    {form.exceptCompanyDays.length === 0 && <span className="text-[10px] text-neutral-400">Aucun</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Périodes d'examen */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Périodes d'examen</span>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                onClick={() => setForm(f => ({
                  ...f,
                  examPeriods: [...f.examPeriods, { name: '', startDate: '', endDate: '' }],
                }))}
              >
                + Ajouter une période
              </button>
            </div>
            {form.examPeriods.length === 0 ? (
              <p className="text-[11px] text-neutral-400">Aucune période d'examen configurée.</p>
            ) : (
              <div className="space-y-2">
                {form.examPeriods.map((ep, idx) => (
                  <div key={idx} className="flex items-end gap-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Nom</label>
                      <input
                        type="text"
                        placeholder="Ex: Semestre 1"
                        value={ep.name}
                        onChange={e => {
                          const updated = [...form.examPeriods]
                          updated[idx] = { ...updated[idx], name: e.target.value }
                          setForm(f => ({ ...f, examPeriods: updated }))
                        }}
                        className="w-full text-xs border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1.5 bg-white dark:bg-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="w-[130px]">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Début</label>
                      <input
                        type="date"
                        value={ep.startDate}
                        onChange={e => {
                          const updated = [...form.examPeriods]
                          updated[idx] = { ...updated[idx], startDate: e.target.value }
                          setForm(f => ({ ...f, examPeriods: updated }))
                        }}
                        className="w-full text-xs border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1.5 bg-white dark:bg-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="w-[130px]">
                      <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Fin</label>
                      <input
                        type="date"
                        value={ep.endDate}
                        min={ep.startDate || undefined}
                        onChange={e => {
                          const updated = [...form.examPeriods]
                          updated[idx] = { ...updated[idx], endDate: e.target.value }
                          setForm(f => ({ ...f, examPeriods: updated }))
                        }}
                        className="w-full text-xs border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1.5 bg-white dark:bg-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, examPeriods: f.examPeriods.filter((_, i) => i !== idx) }))}
                      className="p-1.5 text-neutral-400 hover:text-error-600 transition-colors shrink-0"
                      title="Supprimer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.diplomaId && (
            <MultiSelect
              label="Matières associées"
              placeholder="Sélectionner les matières..."
              options={subjectOptionsByDiploma(form.diplomaId)}
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
  programId: string
}

const emptySubjectForm: SubjectForm = { name: '', code: '', description: '', category: '', programId: '' }

function SubjectsTab({
  subjects,
  programs,
  programOptions,
  createSubject,
  updateSubject,
  deleteSubject,
}: {
  subjects: Subject[]
  programs: Program[]
  programOptions: { value: string; label: string }[]
  createSubject: (data: { name: string; code?: string; description?: string; category?: string; programId?: string }) => Promise<Subject>
  updateSubject: (id: string, data: { name?: string; code?: string; description?: string; category?: string; programId?: string }) => Promise<Subject>
  deleteSubject: (id: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectForm>(emptySubjectForm)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    let result = subjects
    if (search) result = filterBySearch(result, search, ['name', 'code'])
    if (programFilter) result = result.filter(s => s.programId === programFilter)
    return result
  }, [subjects, search, programFilter])

  const getProgramName = (programId?: string) => programs.find(p => p.id === programId)?.name || '-'

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptySubjectForm); setSelected(null); setModalMode('create') }
  const openEdit = (s: Subject) => {
    setSelected(s)
    setForm({ name: s.name, code: s.code, description: s.description || '', category: s.category || '', programId: s.programId || '' })
    setModalMode('edit')
  }
  const openDelete = (s: Subject) => { setSelected(s); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createSubject({ ...form, programId: form.programId || undefined })
      } else if (modalMode === 'edit' && selected) {
        await updateSubject(selected.id, { ...form, programId: form.programId || undefined })
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
            options={[{ value: '', label: 'Tous les programmes' }, ...programOptions]}
            value={programFilter}
            onChange={e => setProgramFilter(e.target.value)}
          />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter une matière</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aucune matière"
          description={search || programFilter ? 'Aucune matière ne correspond à vos critères.' : 'Commencez par créer votre première matière.'}
          action={!search && !programFilter ? { label: 'Ajouter une matière', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Code</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Programme</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Catégorie</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Description</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(s => (
                    <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{s.code || '-'}</td>
                      <td className="px-4 py-3">
                        {s.programId ? (
                          <Badge variant="success" size="sm">{getProgramName(s.programId)}</Badge>
                        ) : (
                          <span className="text-sm text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        {s.category ? <Badge variant="warning" size="sm">{s.category}</Badge> : <span className="text-sm text-neutral-400">-</span>}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">{s.description || '-'}</td>
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
          <Select label="Programme" options={[{ value: '', label: 'Sélectionner un programme...' }, ...programOptions]}
            value={form.programId} onChange={e => setForm(f => ({ ...f, programId: e.target.value }))} />
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
          <Button onClick={handleSubmit} isLoading={submitting} disabled={!form.name.trim()}>
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

// ==================== Page principale ====================

const tabs: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'diplomas', label: 'Diplômes', icon: GraduationCap },
  { key: 'programs', label: 'Programmes', icon: FolderOpen },
  { key: 'classes', label: 'Classes', icon: Layers },
  { key: 'subjects', label: 'Matières', icon: BookOpen },
  { key: 'teachers', label: 'Professeurs', icon: UserCheck },
]

function AcademicPage() {
  const [activeTab, setActiveTab] = useState<Tab>('diplomas')
  const {
    programs, diplomas, classes, subjects, teachers, isLoading,
    programOptions, diplomaOptions,
    getSubjectIdsForClass,
    subjectOptionsByDiploma,
    createProgram, updateProgram, deleteProgram,
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Référentiel académique</h1>
          <p className="text-neutral-500 mt-1">
            {programs.length} programme{programs.length > 1 ? 's' : ''}, {diplomas.length} diplôme{diplomas.length > 1 ? 's' : ''}, {classes.length} classe{classes.length > 1 ? 's' : ''}, {subjects.length} matière{subjects.length > 1 ? 's' : ''}, {teachers.length} professeur{teachers.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshAll} className="mt-4 sm:mt-0">
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 mb-6">
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
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:border-neutral-300'
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
          programs={programs}
          createDiploma={createDiploma}
          updateDiploma={updateDiploma}
          deleteDiploma={deleteDiploma}
        />
      )}
      {activeTab === 'programs' && (
        <ProgramsTab
          programs={programs}
          subjects={subjects}
          diplomaOptions={diplomaOptions}
          createProgram={createProgram}
          updateProgram={updateProgram}
          deleteProgram={deleteProgram}
        />
      )}
      {activeTab === 'classes' && (
        <ClassesTab
          classes={classes}
          diplomas={diplomas}
          subjects={subjects}
          diplomaOptions={diplomaOptions}
          subjectOptionsByDiploma={subjectOptionsByDiploma}
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
          programs={programs}
          programOptions={programOptions}
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
