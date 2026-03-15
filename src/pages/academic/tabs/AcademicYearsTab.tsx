import { useState, useMemo } from 'react'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState } from '@/components/ui'
import { Plus, Pencil, Trash2, Calendar, Star, AlertTriangle } from 'lucide-react'
import type { AcademicYear, Diploma } from '@/types'

interface AcademicYearsTabProps {
  academicYears: AcademicYear[]
  diplomas: Diploma[]
  diplomaOptions: { value: string; label: string }[]
  createAcademicYear: (data: { name: string; diplomaId: string; startDate: string; endDate: string; isCurrent?: boolean }) => Promise<AcademicYear>
  updateAcademicYear: (id: string, data: { name?: string; diplomaId?: string; startDate?: string; endDate?: string; isCurrent?: boolean }) => Promise<AcademicYear>
  deleteAcademicYear: (id: string) => Promise<void>
  deleteAcademicYearSessions: (yearId: string) => Promise<number>
}

interface YearForm {
  name: string
  diplomaId: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

const emptyForm: YearForm = { name: '', diplomaId: '', startDate: '', endDate: '', isCurrent: false }

function generateYearName(startDate: string): string {
  if (!startDate) return ''
  const year = new Date(startDate).getFullYear()
  return `${year}-${year + 1}`
}

export function AcademicYearsTab({
  academicYears, diplomas, diplomaOptions,
  createAcademicYear, updateAcademicYear, deleteAcademicYear, deleteAcademicYearSessions,
}: AcademicYearsTabProps) {
  const [diplomaFilter, setDiplomaFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'delete-sessions' | null>(null)
  const [selected, setSelected] = useState<AcademicYear | null>(null)
  const [form, setForm] = useState<YearForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Group by diploma
  const grouped = useMemo(() => {
    const filtered = diplomaFilter
      ? academicYears.filter(y => y.diplomaId === diplomaFilter)
      : academicYears
    const map = new Map<string, { diploma: { id: string; title: string }; years: AcademicYear[] }>()
    for (const y of filtered) {
      const key = y.diplomaId
      if (!map.has(key)) {
        map.set(key, {
          diploma: y.diploma || { id: key, title: diplomas.find(d => d.id === key)?.title || 'Sans diplôme' },
          years: [],
        })
      }
      map.get(key)!.years.push(y)
    }
    // Sort years within each group (most recent first)
    for (const group of map.values()) {
      group.years.sort((a, b) => b.startDate.localeCompare(a.startDate))
    }
    return Array.from(map.values())
  }, [academicYears, diplomaFilter, diplomas])

  const openCreate = () => {
    setForm({ ...emptyForm, diplomaId: diplomaFilter || '' })
    setSelected(null)
    setModalMode('create')
  }

  const openEdit = (y: AcademicYear) => {
    setSelected(y)
    setForm({
      name: y.name,
      diplomaId: y.diplomaId,
      startDate: y.startDate,
      endDate: y.endDate,
      isCurrent: y.isCurrent,
    })
    setModalMode('edit')
  }

  const openDelete = (y: AcademicYear) => { setSelected(y); setModalMode('delete') }
  const openDeleteSessions = (y: AcademicYear) => { setSelected(y); setModalMode('delete-sessions') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleStartDateChange = (date: string) => {
    const autoName = generateYearName(date)
    const autoEnd = date ? `${new Date(date).getFullYear() + 1}-08-31` : ''
    setForm(f => ({
      ...f,
      startDate: date,
      name: f.name || autoName,
      endDate: f.endDate || autoEnd,
    }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createAcademicYear({
          name: form.name,
          diplomaId: form.diplomaId,
          startDate: form.startDate,
          endDate: form.endDate,
          isCurrent: form.isCurrent,
        })
      } else if (modalMode === 'edit' && selected) {
        await updateAcademicYear(selected.id, {
          name: form.name,
          diplomaId: form.diplomaId,
          startDate: form.startDate,
          endDate: form.endDate,
          isCurrent: form.isCurrent,
        })
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteAcademicYear(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDeleteSessions = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteAcademicYearSessions(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleSetCurrent = async (y: AcademicYear) => {
    try {
      await updateAcademicYear(y.id, { isCurrent: true })
    } catch { /* toast in hook */ }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Select
            options={[{ value: '', label: 'Tous les diplômes' }, ...diplomaOptions]}
            value={diplomaFilter}
            onChange={e => setDiplomaFilter(e.target.value)}
          />
        </div>
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter une année</Button>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucune année académique"
          description="Créez votre première année académique pour organiser vos cours par période et par diplôme."
          action={{ label: 'Ajouter une année', onClick: openCreate, icon: Plus }}
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.diploma.id}>
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
                <Badge variant="success" size="sm">{group.diploma.title}</Badge>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.years.map(y => (
                  <div
                    key={y.id}
                    className={`bg-white dark:bg-neutral-900 rounded-xl border shadow-soft p-5 ${
                      y.isCurrent
                        ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-200 dark:ring-primary-800'
                        : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{y.name}</h4>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          {new Date(y.startDate).toLocaleDateString('fr-FR')} — {new Date(y.endDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      {y.isCurrent && (
                        <Badge variant="info" size="sm">En cours</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      {!y.isCurrent && (
                        <Button variant="ghost" size="sm" onClick={() => handleSetCurrent(y)} title="Définir comme année en cours">
                          <Star size={14} className="text-warning-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(y)} title="Modifier" aria-label="Modifier">
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteSessions(y)} title="Supprimer les séances" aria-label="Supprimer les séances">
                        <AlertTriangle size={14} className="text-warning-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDelete(y)} title="Supprimer l'année" aria-label="Supprimer">
                        <Trash2 size={14} className="text-error-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalMode === 'create' || modalMode === 'edit'} onClose={closeModal}
        title={modalMode === 'create' ? 'Nouvelle année académique' : 'Modifier l\'année'} size="md">
        <div className="space-y-4">
          <Select label="Diplôme" required
            options={[{ value: '', label: 'Sélectionner un diplôme...' }, ...diplomaOptions]}
            value={form.diplomaId}
            onChange={e => setForm(f => ({ ...f, diplomaId: e.target.value }))} />
          <Input label="Nom" placeholder="Ex: 2025-2026" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date de début" type="date" value={form.startDate}
              onChange={e => handleStartDateChange(e.target.value)} required />
            <Input label="Date de fin" type="date" value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={e => setForm(f => ({ ...f, isCurrent: e.target.checked }))}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Année en cours</span>
          </label>
          {form.isCurrent && academicYears.some(y => y.isCurrent && y.diplomaId === form.diplomaId && y.id !== selected?.id) && (
            <p className="text-xs text-warning-600">L'année actuellement "en cours" pour ce diplôme sera automatiquement remplacée.</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={submitting}
            disabled={!form.name.trim() || !form.diplomaId || !form.startDate || !form.endDate}>
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Year Modal */}
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Supprimer l'année" size="sm">
        <p className="text-neutral-600 dark:text-neutral-400">
          Supprimer l'année <strong>{selected?.name}</strong> ({selected?.diploma?.title}) ? Les cours rattachés ne seront pas supprimés mais perdront leur lien avec cette année.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Supprimer</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Sessions Modal */}
      <Modal isOpen={modalMode === 'delete-sessions'} onClose={closeModal} title="Supprimer les séances de l'année" size="sm">
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg px-3 py-2.5">
            <AlertTriangle size={16} className="text-warning-600 shrink-0 mt-0.5" />
            <p className="text-sm text-warning-700 dark:text-warning-400">
              Cette action est <strong>irréversible</strong>. Toutes les séances (cours, examens, etc.) des classes rattachées à l'année <strong>{selected?.name}</strong> ({selected?.diploma?.title}) seront définitivement supprimées.
            </p>
          </div>
          <p className="text-sm text-neutral-500">
            Les classes, matières et affectations ne seront pas affectées.
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDeleteSessions} isLoading={submitting}>
            Supprimer toutes les séances
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
