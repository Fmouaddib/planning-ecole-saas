import { useState, useMemo } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState, MultiSelect, LoadingSpinner } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, Layers, CalendarDays, FileText, X, Users } from 'lucide-react'
import { SCHEDULE_TYPE_OPTIONS, DAY_OPTIONS, DEFAULT_DAYS_BY_TYPE, getScheduleTypeLabel, getScheduleTypeBadgeVariant, formatDaysShort } from '@/utils/scheduleUtils'
import type { Class, Diploma, Subject, AlternanceConfig, ScheduleExceptions, ExamPeriod } from '@/types'
import type { StudentSubjectLink } from '@/hooks/useAcademicData'
import { supabase } from '@/lib/supabase'

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

export function ClassesTab({
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
  classStudents,
  toggleDispensation,
  getStudentSubjectsForClass,
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
  classStudents: { student_id: string; class_id: string }[]
  toggleDispensation: (id: string, dispensed: boolean, reason?: string) => Promise<void>
  getStudentSubjectsForClass: (classId: string) => StudentSubjectLink[]
}) {
  const [search, setSearch] = useState('')
  const [diplomaFilter, setDiplomaFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Class | null>(null)
  const [enrollmentClass, setEnrollmentClass] = useState<Class | null>(null)
  const [enrollmentStudents, setEnrollmentStudents] = useState<{ id: string; name: string }[]>([])
  const [enrollmentLoading, setEnrollmentLoading] = useState(false)
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

  const openEnrollment = async (c: Class) => {
    setEnrollmentClass(c)
    setEnrollmentLoading(true)
    // Charger les noms des étudiants de cette classe
    const studentIds = classStudents.filter(cs => cs.class_id === c.id).map(cs => cs.student_id)
    if (studentIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)
        .eq('is_active', true)
        .order('full_name')
      setEnrollmentStudents((data || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Sans nom' })))
    } else {
      setEnrollmentStudents([])
    }
    setEnrollmentLoading(false)
  }

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
                            <Button variant="ghost" size="sm" title="Inscriptions matières" onClick={() => openEnrollment(c)}><Users size={14} className="text-primary-600" /></Button>
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

      {/* Enrollment Modal */}
      <Modal
        isOpen={!!enrollmentClass}
        onClose={() => setEnrollmentClass(null)}
        title={`Inscriptions — ${enrollmentClass?.name || ''}`}
        size="lg"
      >
        {enrollmentLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" text="Chargement des étudiants..." />
          </div>
        ) : enrollmentStudents.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">Aucun étudiant dans cette classe</p>
        ) : (() => {
          const classId = enrollmentClass!.id
          const subjectIds = getSubjectIdsForClass(classId)
          const classSubjectList = subjects.filter(s => subjectIds.includes(s.id)).sort((a, b) => a.name.localeCompare(b.name))
          const enrollments = getStudentSubjectsForClass(classId)

          if (classSubjectList.length === 0) {
            return <p className="text-sm text-neutral-400 text-center py-8">Aucune matière dans cette classe</p>
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-2 px-2 font-semibold text-neutral-600 dark:text-neutral-400 sticky left-0 bg-white dark:bg-neutral-900 z-10 min-w-[140px]">
                      Étudiant
                    </th>
                    {classSubjectList.map(s => (
                      <th key={s.id} className="py-2 px-1 font-medium text-neutral-500 text-center min-w-[60px]">
                        <span className="writing-mode-vertical inline-block transform -rotate-45 origin-bottom-left whitespace-nowrap text-[11px]">
                          {s.name.length > 12 ? s.name.slice(0, 12) + '...' : s.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enrollmentStudents.map(student => (
                    <tr key={student.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="py-1.5 px-2 font-medium text-neutral-900 dark:text-neutral-100 sticky left-0 bg-white dark:bg-neutral-900 z-10">
                        {student.name}
                      </td>
                      {classSubjectList.map(subject => {
                        const enrollment = enrollments.find(
                          ss => ss.student_id === student.id && ss.subject_id === subject.id
                        )
                        const isDispensed = enrollment?.status === 'dispensed'

                        return (
                          <td key={subject.id} className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={async () => {
                                if (enrollment) {
                                  await toggleDispensation(enrollment.id, !isDispensed)
                                }
                              }}
                              disabled={!enrollment}
                              className={`w-7 h-7 rounded-md border-2 transition-all ${
                                !enrollment
                                  ? 'border-neutral-200 bg-neutral-100 cursor-not-allowed'
                                  : isDispensed
                                    ? 'border-warning-400 bg-warning-100 dark:bg-warning-900/30 hover:border-warning-500'
                                    : 'border-success-400 bg-success-100 dark:bg-success-900/30 hover:border-success-500'
                              }`}
                              title={isDispensed ? 'Dispensé — cliquer pour réinscrire' : 'Inscrit — cliquer pour dispenser'}
                            >
                              {enrollment && !isDispensed && (
                                <span className="text-success-600 font-bold text-xs">✓</span>
                              )}
                              {enrollment && isDispensed && (
                                <span className="text-warning-600 font-bold text-xs">—</span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded border-2 border-success-400 bg-success-100 inline-flex items-center justify-center text-success-600 text-[10px] font-bold">✓</span>
                  Inscrit
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded border-2 border-warning-400 bg-warning-100 inline-flex items-center justify-center text-warning-600 text-[10px] font-bold">—</span>
                  Dispensé
                </span>
              </div>
            </div>
          )
        })()}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEnrollmentClass(null)}>Fermer</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
