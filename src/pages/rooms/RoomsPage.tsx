import { useState, useMemo } from 'react'
import { useRooms } from '@/hooks/useRooms'
import { useBookings } from '@/hooks/useBookings'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner } from '@/components/ui'
import { ROOM_TYPES } from '@/utils/constants'
import { filterBySearch } from '@/utils/helpers'
import type { Room, CreateRoomData, RoomType } from '@/types'
import { Plus, Search, Pencil, Trash2, Building2, RefreshCw } from 'lucide-react'
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

const emptyForm: CreateRoomData = {
  name: '',
  code: '',
  capacity: 30,
  roomType: 'classroom',
  description: '',
  floor: 0,
}

function RoomsPage() {
  const { rooms, isLoading, error, createRoom, updateRoom, deleteRoom, refreshRooms } = useRooms()
  const { bookings } = useBookings()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [form, setForm] = useState<CreateRoomData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Calcul du taux d'occupation par salle (semaine en cours)
  const occupationMap = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // lundi
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })     // dimanche
    const TOTAL_MINUTES = 50 * 60 // 50h/semaine (10h/jour × 5 jours)

    const map = new Map<string, number>()

    for (const room of rooms) {
      const roomBookings = bookings.filter(
        b => b.roomId === room.id && b.status !== 'cancelled'
      )

      let totalMinutes = 0

      for (const b of roomBookings) {
        const bStart = new Date(b.startDateTime)
        const bEnd = new Date(b.endDateTime)

        // Ignorer si hors de la semaine
        if (bEnd <= weekStart || bStart >= weekEnd) continue

        // Itérer sur chaque jour de la semaine (lun-ven)
        for (let d = 0; d < 5; d++) {
          const dayStart = new Date(weekStart)
          dayStart.setDate(dayStart.getDate() + d)
          dayStart.setHours(8, 0, 0, 0)

          const dayEnd = new Date(dayStart)
          dayEnd.setHours(18, 0, 0, 0)

          // Clipper aux bornes du jour 8h–18h
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
    })
    setModalMode('edit')
  }

  const openDelete = (room: Room) => {
    setSelectedRoom(room)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedRoom(null)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createRoom(form)
      } else if (modalMode === 'edit' && selectedRoom) {
        await updateRoom({ id: selectedRoom.id, ...form })
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
          <h1 className="text-2xl font-bold text-neutral-900">Gestion des salles</h1>
          <p className="text-neutral-500 mt-1">{rooms.length} salle{rooms.length > 1 ? 's' : ''} au total</p>
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
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
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
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(room => (
                    <tr key={room.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{room.name}</span>
                        <span className="block md:hidden text-xs text-neutral-400 mt-0.5">{room.code}</span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-neutral-600">{room.code}</td>
                      <td className="px-4 py-3">
                        <Badge variant={roomTypeBadgeVariant[room.roomType || room.type] || 'neutral'} size="sm">
                          {roomTypeLabels[room.roomType || room.type] || room.roomType || room.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{room.capacity} places</td>
                      <td className="hidden md:table-cell px-4 py-3">
                        {(() => {
                          const pct = occupationMap.get(room.id) ?? 0
                          const color = pct === 0 ? 'bg-neutral-200' : pct < 50 ? 'bg-success-500' : pct <= 80 ? 'bg-warning-500' : 'bg-error-500'
                          const textColor = pct === 0 ? 'text-neutral-400' : pct < 50 ? 'text-success-700' : pct <= 80 ? 'text-warning-700' : 'text-error-700'
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-xs font-medium ${textColor}`}>{pct}%</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-neutral-600">{room.floor ?? '-'}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-neutral-600">
                        {room.equipment && room.equipment.length > 0
                          ? room.equipment.map(e => e.name).join(', ')
                          : '-'}
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
                  ))}
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
        <p className="text-neutral-600">
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
    </div>
  )
}

export default RoomsPage
