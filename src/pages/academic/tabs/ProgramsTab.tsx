import { useState, useMemo } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, FolderOpen } from 'lucide-react'
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
