import { useState, useMemo } from 'react'
import { useRooms } from '@/hooks/useRooms'
import { useBookings } from '@/hooks/useBookings'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner, MultiSelect } from '@/components/ui'
import { ROOM_TYPES, EQUIPMENT_CATEGORY_LABELS } from '@/utils/constants'
import { buildEquipmentCatalog, catalogToOptions, namesToEquipment } from '@/utils/equipmentCatalog'
import { filterBySearch } from '@/utils/helpers'
import type { Room, CreateRoomData, RoomType, EquipmentCategory } from '@/types'
import { Plus, Search, Pencil, Trash2, Building2, RefreshCw, Tag, ChevronDown, ChevronRight } from 'lucide-react'
import { startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns'

const roomTypeLabels: Record<string, string> = {
  classroom: 'Salle de cours',
  lab: 'Laboratoire',
  amphitheater: 'Amphithéâtre',
  conference: 'Salle de conférence',
  library: 'Bibliothèque',
  gym: 'Gymnase',
  office: 'Bureau',
}

const roomTypeOptions = Object.entries(ROOM_TYPES).map(([, value]) => ({
  value,
  label: roomTypeLabels[value] || value,
}))

const roomTypeBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  classroom: 'info',
  lab: 'warning',
  amphitheater: 'success',
  conference: 'neutral',
  library: 'info',
  gym: 'warning',
  office: 'neutral',
}

const emptyForm: CreateRoomData & { equipmentNames: string[] } = {
  name: '',
  code: '',
  capacity: 30,
  roomType: 'classroom',
  description: '',
  floor: 0,
  equipmentNames: [],
}

function RoomsPage() {
  const { rooms, isLoading, error, createRoom, updateRoom, deleteRoom, renameEquipment, deleteEquipment, updateEquipmentCategory, refreshRooms } = useRooms()
  const { bookings } = useBookings()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'rename' | 'deleteEquip' | 'changeCategory' | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [form, setForm] = useState<CreateRoomData & { equipmentNames: string[] }>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [customEquipment, setCustomEquipment] = useState('')
  const [renameOld, setRenameOld] = useState('')
  const [renameNew, setRenameNew] = useState('')
  const [showCatalog, setShowCatalog] = useState(false)
  const [equipToDelete, setEquipToDelete] = useState('')
  const [equipToChangeCategory, setEquipToChangeCategory] = useState('')
  const [newCategory, setNewCategory] = useState<EquipmentCategory>('technology')
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set(Object.keys(EQUIPMENT_CATEGORY_LABELS)))

  // Catalogue d'équipements (prédéfinis + existants)
  const catalog = useMemo(() => buildEquipmentCatalog(rooms), [rooms])
  const equipmentOptions = useMemo(() => catalogToOptions(catalog), [catalog])

  // Comptage : nombre de salles par équipement
  const equipmentCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const room of rooms) {
      if (!Array.isArray(room.equipment)) continue
      for (const eq of room.equipment) {
        if (!eq?.name) continue
        const key = eq.name.toLowerCase()
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }
    return counts
  }, [rooms])

  // Catalogue filtré puis groupé par catégorie
  const filteredCatalog = useMemo(() => {
    const source = catalogCategoryFilter ? catalog.filter(e => e.category === catalogCategoryFilter) : catalog
    const groups: { category: string; label: string; items: typeof catalog }[] = []
    const groupMap = new Map<string, typeof catalog>()
    for (const entry of source) {
      if (!groupMap.has(entry.category)) groupMap.set(entry.category, [])
      groupMap.get(entry.category)!.push(entry)
    }
    for (const [cat, items] of groupMap) {
      groups.push({ category: cat, label: EQUIPMENT_CATEGORY_LABELS[cat] || cat, items })
    }
    return groups
  }, [catalog, catalogCategoryFilter])

  const filteredCatalogCount = useMemo(() => {
    return filteredCatalog.reduce((sum, g) => sum + g.items.length, 0)
  }, [filteredCatalog])

  // Calcul du taux d'occupation par salle (semaine en cours)
  const occupationMap = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const TOTAL_MINUTES = 50 * 60

    const map = new Map<string, number>()

    for (const room of rooms) {
      const roomBookings = bookings.filter(
        b => b.roomId === room.id && b.status !== 'cancelled'
      )

      let totalMinutes = 0

      for (const b of roomBookings) {
        const bStart = new Date(b.startDateTime)
        const bEnd = new Date(b.endDateTime)

        if (bEnd <= weekStart || bStart >= weekEnd) continue

        for (let d = 0; d < 5; d++) {
          const dayStart = new Date(weekStart)
          dayStart.setDate(dayStart.getDate() + d)
          dayStart.setHours(8, 0, 0, 0)

          const dayEnd = new Date(dayStart)
          dayEnd.setHours(18, 0, 0, 0)

          const clippedStart = new Date(Math.max(bStart.getTime(), dayStart.getTime()))
          const clippedEnd = new Date(Math.min(bEnd.getTime(), dayEnd.getTime()))

          if (clippedStart < clippedEnd) {
            totalMinutes += differenceInMinutes(clippedEnd, clippedStart)
          }
        }
      }

      const pct = Math.min(Math.round((totalMinutes / TOTAL_MINUTES) * 100), 100)
      map.set(room.id, pct)
    }

    return map
  }, [rooms, bookings])

  // Filter rooms
  const filtered = useMemo(() => {
    let result = rooms
    if (search) {
      result = filterBySearch(result, search, ['name', 'code'])
    }
    if (typeFilter) {
      result = result.filter(r => r.roomType === typeFilter)
    }
    return result
  }, [rooms, search, typeFilter])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  // Handlers
  const openCreate = () => {
    setForm(emptyForm)
    setCustomEquipment('')
    setSelectedRoom(null)
    setModalMode('create')
  }

  const openEdit = (room: Room) => {
    setSelectedRoom(room)
    setForm({
      name: room.name,
      code: room.code,
      capacity: room.capacity,
      roomType: room.roomType || room.type,
      description: room.description || '',
      floor: room.floor || 0,
      equipmentNames: room.equipment.map(e => e.name),
    })
    setCustomEquipment('')
    setModalMode('edit')
  }

  const openDelete = (room: Room) => {
    setSelectedRoom(room)
    setModalMode('delete')
  }

  const openRename = (equipName: string) => {
    setRenameOld(equipName)
    setRenameNew(equipName)
    setModalMode('rename')
  }

  const openDeleteEquip = (equipName: string) => {
    setEquipToDelete(equipName)
    setModalMode('deleteEquip')
  }

  const openChangeCategory = (equipName: string, currentCategory: string) => {
    setEquipToChangeCategory(equipName)
    setNewCategory(currentCategory as EquipmentCategory)
    setModalMode('changeCategory')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedRoom(null)
  }

  const addCustomEquipment = () => {
    const trimmed = customEquipment.trim()
    if (!trimmed) return
    if (form.equipmentNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) return
    setForm(f => ({ ...f, equipmentNames: [...f.equipmentNames, trimmed] }))
    setCustomEquipment('')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const equipment = namesToEquipment(form.equipmentNames, catalog)
      if (modalMode === 'create') {
        await createRoom({ ...form, equipment })
      } else if (modalMode === 'edit' && selectedRoom) {
        await updateRoom({ id: selectedRoom.id, ...form, equipment })
      }
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRoom) return
    setSubmitting(true)
    try {
      await deleteRoom(selectedRoom.id)
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleRename = async () => {
    const trimmedNew = renameNew.trim()
    if (!trimmedNew || trimmedNew === renameOld) return
    setSubmitting(true)
    try {
      await renameEquipment(renameOld, trimmedNew)
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleDeleteEquip = async () => {
    if (!equipToDelete) return
    setSubmitting(true)
    try {
      await deleteEquipment(equipToDelete)
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangeCategory = async () => {
    if (!equipToChangeCategory) return
    setSubmitting(true)
    try {
      await updateEquipmentCategory(equipToChangeCategory, newCategory)
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  // Category options for select
  const categoryOptions = Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement des salles..." />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-error-600 mb-4">{error}</p>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshRooms}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Gestion des salles</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">{rooms.length} salle{rooms.length > 1 ? 's' : ''} au total</p>
        </div>
        <Button leftIcon={Plus} onClick={openCreate} className="mt-4 sm:mt-0">
          Ajouter une salle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom ou code..."
            leftIcon={Search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: '', label: 'Tous les types' }, ...roomTypeOptions]}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table or Empty */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune salle trouvée"
          description={search || typeFilter ? 'Aucune salle ne correspond à vos critères de recherche.' : 'Commencez par ajouter votre première salle.'}
          action={!search && !typeFilter ? { label: 'Ajouter une salle', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Code</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Capacité</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Occupation</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Étage</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Équipements</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(room => {
                    const eqList = room.equipment || []
                    const MAX_VISIBLE = 3
                    return (
                      <tr key={room.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{room.name}</span>
                          <span className="block md:hidden text-xs text-neutral-400 mt-0.5">{room.code}</span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{room.code}</td>
                        <td className="px-4 py-3">
                          <Badge variant={roomTypeBadgeVariant[room.roomType || room.type] || 'neutral'} size="sm">
                            {roomTypeLabels[room.roomType || room.type] || room.roomType || room.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{room.capacity} places</td>
                        <td className="hidden md:table-cell px-4 py-3">
                          {(() => {
                            const pct = occupationMap.get(room.id) ?? 0
                            const color = pct === 0 ? 'bg-neutral-200' : pct < 50 ? 'bg-success-500' : pct <= 80 ? 'bg-warning-500' : 'bg-error-500'
                            const textColor = pct === 0 ? 'text-neutral-400' : pct < 50 ? 'text-success-700' : pct <= 80 ? 'text-warning-700' : 'text-error-700'
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className={`text-xs font-medium ${textColor}`}>{pct}%</span>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{room.floor ?? '-'}</td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          {eqList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {eqList.slice(0, MAX_VISIBLE).map(eq => (
                                <Badge key={eq.name} variant="neutral" size="sm">{eq.name}</Badge>
                              ))}
                              {eqList.length > MAX_VISIBLE && (
                                <Badge variant="info" size="sm">+{eqList.length - MAX_VISIBLE}</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(room)}>
                              <Pencil size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openDelete(room)}>
                              <Trash2 size={14} className="text-error-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">
                Page {page} sur {totalPages} ({totalItems} résultat{totalItems > 1 ? 's' : ''})
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!canPrev} onClick={prevPage}>
                  Précédent
                </Button>
                <Button variant="secondary" size="sm" disabled={!canNext} onClick={nextPage}>
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bouton catalogue d'équipements */}
      <div className="mt-6 text-center">
        <Button
          variant="secondary"
          leftIcon={Tag}
          onClick={() => setShowCatalog(v => !v)}
        >
          {showCatalog ? 'Masquer le catalogue' : 'Gérer les équipements'}
        </Button>
      </div>

      {showCatalog && (
        <div className="mt-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Catalogue d'équipements</h2>
            <span className="text-sm text-neutral-400">{filteredCatalogCount}/{catalog.length}</span>
            <div className="ml-auto w-44">
              <Select
                options={[{ value: '', label: 'Toutes catégories' }, ...categoryOptions]}
                value={catalogCategoryFilter}
                onChange={e => setCatalogCategoryFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                  <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Salles</th>
                  <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              {filteredCatalog.map(group => {
                const isCollapsed = collapsedCategories.has(group.category)
                return (
                  <tbody key={group.category} className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <tr
                      className="bg-neutral-50/70 dark:bg-neutral-950/70 cursor-pointer select-none hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 transition-colors"
                      onClick={() => toggleCategory(group.category)}
                    >
                      <td colSpan={3} className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          {isCollapsed ? <ChevronRight size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{group.label}</span>
                          <span className="text-xs text-neutral-400">{group.items.length}</span>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed && group.items.map(entry => {
                      const count = equipmentCounts.get(entry.name.toLowerCase()) || 0
                      return (
                        <tr key={entry.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                          <td className="px-4 py-2.5 pl-8">
                            <span className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">{entry.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                            {count > 0 ? count : <span className="text-neutral-400">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openRename(entry.name)} title="Renommer">
                                <Pencil size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openChangeCategory(entry.name, entry.category)} title="Changer la catégorie">
                                <Tag size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openDeleteEquip(entry.name)} title="Supprimer">
                                <Trash2 size={14} className="text-error-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                )
              })}
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Ajouter une salle' : 'Modifier la salle'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nom de la salle"
              placeholder="Ex: Salle A101"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Code"
              placeholder="Ex: A101"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type de salle"
              options={roomTypeOptions}
              value={form.roomType}
              onChange={e => setForm(f => ({ ...f, roomType: e.target.value as RoomType }))}
            />
            <Input
              label="Capacité"
              type="number"
              min={1}
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <Input
            label="Étage"
            type="number"
            value={form.floor || 0}
            onChange={e => setForm(f => ({ ...f, floor: parseInt(e.target.value) || 0 }))}
          />

          {/* Sélecteur d'équipements */}
          <MultiSelect
            label="Équipements"
            placeholder="Sélectionner les équipements..."
            options={equipmentOptions}
            value={form.equipmentNames}
            onChange={names => setForm(f => ({ ...f, equipmentNames: names }))}
          />

          {/* Ajout d'un équipement personnalisé */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Ajouter un équipement personnalisé..."
                value={customEquipment}
                onChange={e => setCustomEquipment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomEquipment() } }}
              />
            </div>
            <Button variant="secondary" onClick={addCustomEquipment} disabled={!customEquipment.trim()}>
              <Plus size={16} />
            </Button>
          </div>

          <Textarea
            label="Description"
            placeholder="Description optionnelle..."
            value={form.description || ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!form.name || !form.code}
          >
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalMode === 'delete'}
        onClose={closeModal}
        title="Supprimer la salle"
        size="sm"
      >
        <p className="text-neutral-600 dark:text-neutral-400">
          Êtes-vous sûr de vouloir supprimer la salle <strong>{selectedRoom?.name}</strong> ?
          Cette action est irréversible.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Rename Equipment Modal */}
      <Modal
        isOpen={modalMode === 'rename'}
        onClose={closeModal}
        title="Renommer un équipement"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom actuel"
            value={renameOld}
            disabled
          />
          <Input
            label="Nouveau nom"
            value={renameNew}
            onChange={e => setRenameNew(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRename() } }}
            autoFocus
          />
          <p className="text-sm text-neutral-500">
            Le renommage sera appliqué à toutes les salles qui possèdent cet équipement
            ({equipmentCounts.get(renameOld.toLowerCase()) || 0} salle{(equipmentCounts.get(renameOld.toLowerCase()) || 0) > 1 ? 's' : ''}).
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button
            onClick={handleRename}
            isLoading={submitting}
            disabled={!renameNew.trim() || renameNew.trim() === renameOld}
          >
            Renommer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Equipment Modal */}
      <Modal
        isOpen={modalMode === 'deleteEquip'}
        onClose={closeModal}
        title="Supprimer un équipement"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-neutral-600 dark:text-neutral-400">
            Êtes-vous sûr de vouloir supprimer l'équipement <strong>{equipToDelete}</strong> du catalogue ?
          </p>
          {(equipmentCounts.get(equipToDelete.toLowerCase()) || 0) > 0 && (
            <p className="text-sm text-warning-600 bg-warning-50 rounded-lg px-3 py-2">
              Cet équipement sera retiré de {equipmentCounts.get(equipToDelete.toLowerCase())} salle{(equipmentCounts.get(equipToDelete.toLowerCase()) || 0) > 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDeleteEquip} isLoading={submitting}>
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Change Category Modal */}
      <Modal
        isOpen={modalMode === 'changeCategory'}
        onClose={closeModal}
        title="Modifier la catégorie"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Équipement"
            value={equipToChangeCategory}
            disabled
          />
          <Select
            label="Nouvelle catégorie"
            options={categoryOptions}
            value={newCategory}
            onChange={e => setNewCategory(e.target.value as EquipmentCategory)}
          />
          {(equipmentCounts.get(equipToChangeCategory.toLowerCase()) || 0) > 0 && (
            <p className="text-sm text-neutral-500">
              Le changement sera appliqué dans {equipmentCounts.get(equipToChangeCategory.toLowerCase())} salle{(equipmentCounts.get(equipToChangeCategory.toLowerCase()) || 0) > 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleChangeCategory} isLoading={submitting}>
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default RoomsPage
