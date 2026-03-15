import { useState, useMemo } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Textarea, Modal, ModalFooter, Badge, EmptyState } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, GraduationCap, ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react'
import { exportDiplomas } from '@/utils/export-academic'
import type { Diploma, Program } from '@/types'

interface DiplomaForm {
  title: string
  description: string
  durationYears: number
}

const emptyDiplomaForm: DiplomaForm = { title: '', description: '', durationYears: 1 }

export function DiplomasTab({
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

  type SortKey = 'title' | 'programs' | 'description' | 'duration'
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { if (sortDir === 'asc') setSortDir('desc'); else { setSortKey(null); setSortDir('asc') } }
    else { setSortKey(key); setSortDir('asc') }
  }

  const getProgramCount = (diplomaId: string) => programs.filter(p => p.diplomaId === diplomaId).length

  const filtered = useMemo(() => {
    let result = search ? filterBySearch(diplomas, search, ['title']) : [...diplomas]
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        switch (sortKey) {
          case 'title': return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }) * dir
          case 'programs': return (getProgramCount(a.id) - getProgramCount(b.id)) * dir
          case 'description': return (a.description || '').localeCompare(b.description || '', 'fr', { sensitivity: 'base' }) * dir
          case 'duration': return (a.durationYears - b.durationYears) * dir
          default: return 0
        }
      })
    }
    return result
  }, [diplomas, search, sortKey, sortDir, programs])

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
        {diplomas.length > 0 && (
          <Button variant="secondary" leftIcon={Download} onClick={() => exportDiplomas(diplomas, programs)}>
            Exporter
          </Button>
        )}
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
                    {([
                      { key: 'title' as SortKey, label: 'Titre', className: '' },
                      { key: 'programs' as SortKey, label: 'Programmes', className: '' },
                      { key: 'description' as SortKey, label: 'Description', className: 'hidden md:table-cell' },
                      { key: 'duration' as SortKey, label: 'Durée', className: '' },
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
                          <Button variant="ghost" size="sm" aria-label="Modifier" onClick={() => openEdit(d)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" aria-label="Supprimer" onClick={() => openDelete(d)}><Trash2 size={14} className="text-error-600" /></Button>
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
