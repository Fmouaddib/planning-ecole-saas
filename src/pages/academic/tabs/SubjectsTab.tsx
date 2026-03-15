import { useState, useMemo, useCallback } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, BookOpen, Rss, Copy, Check, Send, RefreshCcw, Pause, Play, MessageCircle, Globe, FileText, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react'
import { exportSubjects } from '@/utils/export-academic'
import { useCalendarFeeds, getFeedUrl } from '@/hooks/useCalendarFeeds'
import { getAutoSubjectColor } from '@/utils/constants'
import type { CalendarFeed } from '@/hooks/useCalendarFeeds'
import type { Subject, Program } from '@/types'

interface SubjectForm {
  name: string
  code: string
  description: string
  category: string
  programId: string
  color: string
  whatsappLink: string
  webLink: string
  slideLink: string
}

const emptySubjectForm: SubjectForm = { name: '', code: '', description: '', category: '', programId: '', color: '', whatsappLink: '', webLink: '', slideLink: '' }

export function SubjectsTab({
  subjects,
  programs,
  programOptions,
  createSubject,
  updateSubject,
  deleteSubject,
  hasSubjectLinks = false,
}: {
  subjects: Subject[]
  programs: Program[]
  programOptions: { value: string; label: string }[]
  createSubject: (data: { name: string; code?: string; description?: string; category?: string; programId?: string; color?: string; whatsappLink?: string; webLink?: string; slideLink?: string }) => Promise<Subject>
  updateSubject: (id: string, data: { name?: string; code?: string; description?: string; category?: string; programId?: string; color?: string; whatsappLink?: string; webLink?: string; slideLink?: string }) => Promise<Subject>
  deleteSubject: (id: string) => Promise<void>
  hasSubjectLinks?: boolean
}) {
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'ical' | null>(null)
  const [selected, setSelected] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectForm>(emptySubjectForm)
  const [submitting, setSubmitting] = useState(false)

  // Sort state
  type SortKey = 'name' | 'code' | 'program' | 'category' | 'description'
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') } // 3rd click resets
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // iCal feeds
  const { getOrCreateFeed, regenerateToken, toggleFeedActive, shareFeedByEmail } = useCalendarFeeds()
  const [icalFeed, setIcalFeed] = useState<CalendarFeed | null>(null)
  const [icalLoading, setIcalLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const getProgramName = (programId?: string) => programs.find(p => p.id === programId)?.name || '-'

  const filtered = useMemo(() => {
    let result = subjects
    if (search) result = filterBySearch(result, search, ['name', 'code'])
    if (programFilter) result = result.filter(s => s.programId === programFilter)

    // Sort
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        let valA = ''
        let valB = ''
        switch (sortKey) {
          case 'name': valA = a.name; valB = b.name; break
          case 'code': valA = a.code || ''; valB = b.code || ''; break
          case 'program': valA = getProgramName(a.programId); valB = getProgramName(b.programId); break
          case 'category': valA = a.category || ''; valB = b.category || ''; break
          case 'description': valA = a.description || ''; valB = b.description || ''; break
        }
        return valA.localeCompare(valB, 'fr', { sensitivity: 'base' }) * dir
      })
    }

    return result
  }, [subjects, search, programFilter, sortKey, sortDir, programs])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptySubjectForm); setSelected(null); setModalMode('create') }
  const openEdit = (s: Subject) => {
    setSelected(s)
    setForm({ name: s.name, code: s.code, description: s.description || '', category: s.category || '', programId: s.programId || '', color: s.color || getAutoSubjectColor(s.name), whatsappLink: s.whatsappLink || '', webLink: s.webLink || '', slideLink: s.slideLink || '' })
    setModalMode('edit')
  }
  const openDelete = (s: Subject) => { setSelected(s); setModalMode('delete') }
  const openIcal = useCallback(async (s: Subject) => {
    setSelected(s)
    setIcalLoading(true)
    setIcalFeed(null)
    setCopied(false)
    setEmailInput('')
    setModalMode('ical')
    try {
      const feed = await getOrCreateFeed(s.id, s.name)
      setIcalFeed(feed)
    } catch (err) {
      console.error('Erreur création flux iCal:', err)
    } finally {
      setIcalLoading(false)
    }
  }, [getOrCreateFeed])
  const closeModal = () => { setModalMode(null); setSelected(null); setIcalFeed(null); setCopied(false); setEmailInput('') }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createSubject({ ...form, programId: form.programId || undefined, color: form.color || undefined, whatsappLink: form.whatsappLink || undefined, webLink: form.webLink || undefined, slideLink: form.slideLink || undefined })
      } else if (modalMode === 'edit' && selected) {
        await updateSubject(selected.id, { ...form, programId: form.programId || undefined, color: form.color || undefined, whatsappLink: form.whatsappLink || undefined, webLink: form.webLink || undefined, slideLink: form.slideLink || undefined })
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
        {subjects.length > 0 && (
          <Button variant="secondary" leftIcon={Download} onClick={() => exportSubjects(subjects)}>
            Exporter
          </Button>
        )}
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
                    {([
                      { key: 'name' as SortKey, label: 'Nom', className: '' },
                      { key: 'code' as SortKey, label: 'Code', className: '' },
                      { key: 'program' as SortKey, label: 'Programme', className: '' },
                      { key: 'category' as SortKey, label: 'Catégorie', className: 'hidden sm:table-cell' },
                      { key: 'description' as SortKey, label: 'Description', className: 'hidden md:table-cell' },
                    ]).map(col => {
                      const active = sortKey === col.key
                      return (
                        <th
                          key={col.key}
                          className={`${col.className} text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors`}
                          onClick={() => toggleSort(col.key)}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {active ? (
                              sortDir === 'asc' ? <ArrowUp size={12} className="text-primary-500" /> : <ArrowDown size={12} className="text-primary-500" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-30" />
                            )}
                          </span>
                        </th>
                      )
                    })}
                    {hasSubjectLinks && <th className="hidden lg:table-cell text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Liens</th>}
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(s => (
                    <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: s.color || getAutoSubjectColor(s.name) }}
                          />
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                        </div>
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
                      {hasSubjectLinks && (
                        <td className="hidden lg:table-cell px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {s.whatsappLink && (
                              <a href={s.whatsappLink} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors" title="WhatsApp">
                                <MessageCircle size={14} />
                              </a>
                            )}
                            {s.webLink && (
                              <a href={s.webLink} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors" title="Lien web">
                                <Globe size={14} />
                              </a>
                            )}
                            {s.slideLink && (
                              <a href={s.slideLink} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors" title="Support de cours">
                                <FileText size={14} />
                              </a>
                            )}
                            {!s.whatsappLink && !s.webLink && !s.slideLink && (
                              <span className="text-xs text-neutral-300">—</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openIcal(s)} title="Flux calendrier iCal"><Rss size={14} className="text-primary-600" /></Button>
                          <Button variant="ghost" size="sm" aria-label="Modifier" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" aria-label="Supprimer" onClick={() => openDelete(s)}><Trash2 size={14} className="text-error-600" /></Button>
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
          {/* Liens pédagogiques — visible uniquement si le plan l'inclut */}
          {hasSubjectLinks && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                <ExternalLink size={14} /> Liens pédagogiques
              </p>
              <div className="space-y-3">
                <Input label="Groupe WhatsApp" placeholder="https://chat.whatsapp.com/..." value={form.whatsappLink}
                  leftIcon={MessageCircle}
                  onChange={e => setForm(f => ({ ...f, whatsappLink: e.target.value }))} />
                <Input label="Lien web (replay, site, ressources)" placeholder="https://..." value={form.webLink}
                  leftIcon={Globe}
                  onChange={e => setForm(f => ({ ...f, webLink: e.target.value }))} />
                <Input label="Support de cours (slides, PDF)" placeholder="https://docs.google.com/... ou https://..." value={form.slideLink}
                  leftIcon={FileText}
                  onChange={e => setForm(f => ({ ...f, slideLink: e.target.value }))} />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Couleur calendrier</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color || getAutoSubjectColor(form.name || 'Matière')}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-600 cursor-pointer p-0.5"
              />
              <span
                className="w-6 h-6 rounded-full border border-neutral-200 dark:border-neutral-700"
                style={{ backgroundColor: form.color || getAutoSubjectColor(form.name || 'Matière') }}
              />
              <span className="text-xs text-neutral-500">{form.color || 'Auto'}</span>
              {form.color && (
                <button
                  type="button"
                  className="text-xs text-primary-600 hover:underline"
                  onClick={() => setForm(f => ({ ...f, color: '' }))}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
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

      {/* iCal Feed Modal */}
      <Modal isOpen={modalMode === 'ical'} onClose={closeModal}
        title={`Flux calendrier — ${selected?.name || ''}`} size="md">
        {icalLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : icalFeed ? (
          <div className="space-y-5">
            {/* URL + Copy */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">URL d'abonnement</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={getFeedUrl(icalFeed.token)}
                  className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 font-mono select-all"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant={copied ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(getFeedUrl(icalFeed.token))
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              {copied && <p className="text-xs text-success-600 mt-1">Copié !</p>}
            </div>

            {/* Instructions */}
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 text-sm text-neutral-700 dark:text-neutral-300">
              <p className="font-medium text-primary-700 dark:text-primary-400 mb-2">Comment s'abonner ?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Google Calendar</strong> : Autres agendas (+) &gt; A partir de l'URL</li>
                <li><strong>Apple Calendar</strong> : Fichier &gt; Nouvel abonnement</li>
                <li><strong>Outlook</strong> : Ajouter un calendrier &gt; S'abonner depuis le web</li>
              </ul>
            </div>

            {/* Stats */}
            {(icalFeed.accessCount > 0 || icalFeed.lastAccessedAt) && (
              <p className="text-xs text-neutral-500">
                {icalFeed.accessCount} acc&egrave;s
                {icalFeed.lastAccessedAt && (
                  <> &middot; Dernier acc&egrave;s : {new Date(icalFeed.lastAccessedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</>
                )}
              </p>
            )}

            {/* Email sharing */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Envoyer par email</label>
              <textarea
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="emails séparés par virgule ou retour à la ligne..."
                rows={2}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 resize-none"
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                disabled={!emailInput.trim() || sendingEmail}
                isLoading={sendingEmail}
                onClick={async () => {
                  const emails = emailInput.split(/[,\n]+/).map(e => e.trim()).filter(Boolean)
                  if (emails.length === 0) return
                  setSendingEmail(true)
                  try {
                    await shareFeedByEmail(getFeedUrl(icalFeed.token), selected?.name || '', emails)
                    setEmailInput('')
                  } catch (err) {
                    console.error('Erreur envoi email:', err)
                  } finally {
                    setSendingEmail(false)
                  }
                }}
              >
                <Send size={14} className="mr-1" /> Envoyer
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  setIcalLoading(true)
                  try {
                    const updated = await regenerateToken(icalFeed.id)
                    setIcalFeed(updated)
                    setCopied(false)
                  } finally {
                    setIcalLoading(false)
                  }
                }}
              >
                <RefreshCcw size={14} className="mr-1" /> Régénérer le lien
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    await toggleFeedActive(icalFeed.id, !icalFeed.isActive)
                    setIcalFeed(prev => prev ? { ...prev, isActive: !prev.isActive } : null)
                  } catch {}
                }}
              >
                {icalFeed.isActive ? (
                  <><Pause size={14} className="mr-1" /> Désactiver</>
                ) : (
                  <><Play size={14} className="mr-1" /> Réactiver</>
                )}
              </Button>
              {!icalFeed.isActive && (
                <Badge variant="warning" size="sm">Flux désactivé</Badge>
              )}
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 py-4">Impossible de créer le flux. Réessayez.</p>
        )}
      </Modal>
    </>
  )
}
