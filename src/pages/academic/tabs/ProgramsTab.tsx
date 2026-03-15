import { useState, useMemo, useCallback } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, FolderOpen, ArrowUp, ArrowDown, ArrowUpDown, BookOpen, X as XIcon, Download } from 'lucide-react'
import { exportPrograms } from '@/utils/export-academic'
import type { Program, Subject } from '@/types'

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

export function ProgramsTab({
  programs,
  subjects,
  diplomaOptions,
  createProgram,
  updateProgram,
  deleteProgram,
  updateSubject,
}: {
  programs: Program[]
  subjects: Subject[]
  diplomaOptions: { value: string; label: string }[]
  createProgram: (data: { name: string; code?: string; description?: string; durationHours?: number; maxParticipants?: number; color?: string; diplomaId?: string }) => Promise<Program>
  updateProgram: (id: string, data: { name?: string; code?: string; description?: string; durationHours?: number; maxParticipants?: number; color?: string; diplomaId?: string }) => Promise<Program>
  deleteProgram: (id: string) => Promise<void>
  updateSubject: (id: string, data: { name?: string; code?: string; description?: string; category?: string; programId?: string; color?: string; whatsappLink?: string; webLink?: string; slideLink?: string }) => Promise<Subject>
}) {
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Program | null>(null)
  const [form, setForm] = useState<ProgramForm>(emptyProgramForm)
  const [submitting, setSubmitting] = useState(false)
  const [subjectSearch, setSubjectSearch] = useState('')

  // Subjects linked to the currently selected program
  const linkedSubjectIds = useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(subjects.filter(s => s.programId === selected.id).map(s => s.id))
  }, [subjects, selected])

  // All subjects available (not linked to another program, or linked to this one)
  const availableSubjects = useMemo(() => {
    if (!selected) return []
    return subjects
      .filter(s => !s.programId || s.programId === selected.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [subjects, selected])

  const filteredAvailableSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return availableSubjects
    const q = subjectSearch.toLowerCase()
    return availableSubjects.filter(s =>
      s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q))
    )
  }, [availableSubjects, subjectSearch])

  const toggleSubjectLink = useCallback(async (subjectId: string, linked: boolean) => {
    try {
      await updateSubject(subjectId, { programId: linked ? undefined : selected?.id })
    } catch { /* toast in hook */ }
  }, [updateSubject, selected])

  type SortKey = 'name' | 'code' | 'duration' | 'maxParticipants' | 'diploma' | 'subjects'
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { if (sortDir === 'asc') setSortDir('desc'); else { setSortKey(null); setSortDir('asc') } }
    else { setSortKey(key); setSortDir('asc') }
  }

  const getSubjectCount = (programId: string) => subjects.filter(s => s.programId === programId).length

  const filtered = useMemo(() => {
    let result = search ? filterBySearch(programs, search, ['name', 'code']) : [...programs]
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        switch (sortKey) {
          case 'name': return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) * dir
          case 'code': return (a.code || '').localeCompare(b.code || '', 'fr', { sensitivity: 'base' }) * dir
          case 'duration': return (a.durationHours - b.durationHours) * dir
          case 'maxParticipants': return (a.maxParticipants - b.maxParticipants) * dir
          case 'diploma': return (a.diploma?.title || '').localeCompare(b.diploma?.title || '', 'fr', { sensitivity: 'base' }) * dir
          case 'subjects': return (getSubjectCount(a.id) - getSubjectCount(b.id)) * dir
          default: return 0
        }
      })
    }
    return result
  }, [programs, search, sortKey, sortDir, subjects])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptyProgramForm); setSelected(null); setModalMode('create') }
  const openEdit = (p: Program) => {
    setSelected(p)
    setForm({
      name: p.name, code: p.code || '', description: p.description || '',
      durationHours: p.durationHours, maxParticipants: p.maxParticipants, color: p.color,
      diplomaId: p.diplomaId || '',
    })
    setSubjectSearch('')
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

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par nom ou code..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {programs.length > 0 && (
          <Button variant="secondary" leftIcon={Download} onClick={() => exportPrograms(programs, subjects)}>
            Exporter
          </Button>
        )}
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
                    {([
                      { key: 'name' as SortKey, label: 'Programme', className: '' },
                      { key: 'code' as SortKey, label: 'Code', className: '' },
                      { key: 'duration' as SortKey, label: 'Durée (h)', className: 'hidden sm:table-cell' },
                      { key: 'maxParticipants' as SortKey, label: 'Max participants', className: 'hidden md:table-cell' },
                      { key: 'diploma' as SortKey, label: 'Diplôme', className: 'hidden lg:table-cell' },
                      { key: 'subjects' as SortKey, label: 'Matières', className: 'hidden lg:table-cell' },
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
                            <Button variant="ghost" size="sm" aria-label="Modifier" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                            <Button variant="ghost" size="sm" aria-label="Supprimer" onClick={() => openDelete(p)}><Trash2 size={14} className="text-error-600" /></Button>
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
        title={modalMode === 'create' ? 'Ajouter un programme' : 'Modifier le programme'} size={modalMode === 'edit' ? 'lg' : 'md'}>
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

          {/* Section matières — uniquement en mode édition */}
          {modalMode === 'edit' && selected && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                <BookOpen size={14} className="inline mr-1.5 -mt-0.5" />
                Matières du programme ({linkedSubjectIds.size})
              </label>

              {/* Matières liées */}
              {linkedSubjectIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {subjects.filter(s => linkedSubjectIds.has(s.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(s => (
                    <span key={s.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      {s.name}{s.code ? ` (${s.code})` : ''}
                      <button type="button" onClick={() => toggleSubjectLink(s.id, true)}
                        className="ml-0.5 hover:text-error-600 transition-colors" title="Retirer du programme">
                        <XIcon size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Recherche + ajout */}
              <Input
                placeholder="Rechercher une matière à ajouter..."
                leftIcon={Search}
                value={subjectSearch}
                onChange={e => setSubjectSearch(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                {filteredAvailableSubjects.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-3">
                    {subjectSearch ? 'Aucune matière trouvée' : 'Toutes les matières sont déjà rattachées à un programme'}
                  </p>
                ) : (
                  filteredAvailableSubjects.map(s => {
                    const isLinked = linkedSubjectIds.has(s.id)
                    return (
                      <button key={s.id} type="button"
                        onClick={() => toggleSubjectLink(s.id, isLinked)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 ${
                          isLinked ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                        }`}>
                        <span className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isLinked ? 'bg-primary-500 border-primary-500' : 'border-neutral-300 dark:border-neutral-600'
                          }`}>
                            {isLinked && <span className="text-white text-[10px] font-bold">✓</span>}
                          </span>
                          <span className="text-neutral-900 dark:text-neutral-100">{s.name}</span>
                          {s.code && <span className="text-neutral-400 text-xs">({s.code})</span>}
                        </span>
                        {s.programId && s.programId !== selected.id && (
                          <Badge variant="warning" size="sm">Autre programme</Badge>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
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
