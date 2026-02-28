import { useState, useMemo } from 'react'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useAcademicData } from '@/hooks/useAcademicData'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner } from '@/components/ui'
import { BOOKING_TYPES, BOOKING_STATUS } from '@/utils/constants'
import { filterBySearch, formatDate, formatTimeRange } from '@/utils/helpers'
import type { Booking, CreateBookingData, BookingType } from '@/types'
import { Plus, Search, Pencil, Trash2, XCircle, CalendarCheck, RefreshCw } from 'lucide-react'

const bookingTypeLabels: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  meeting: 'Réunion',
  event: 'Événement',
  maintenance: 'Maintenance',
}

const bookingTypeOptions = Object.entries(BOOKING_TYPES).map(([, value]) => ({
  value,
  label: bookingTypeLabels[value] || value,
}))

const bookingStatusLabels: Record<string, string> = {
  confirmed: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  completed: 'Terminé',
}

const bookingStatusOptions = Object.entries(BOOKING_STATUS).map(([, value]) => ({
  value,
  label: bookingStatusLabels[value] || value,
}))

const typeBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  course: 'info',
  exam: 'error',
  meeting: 'success',
  event: 'warning',
  maintenance: 'neutral',
}

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'neutral',
}

interface BookingFormData {
  title: string
  roomId: string
  bookingType: BookingType
  startDateTime: string
  endDateTime: string
  description: string
  diplomaId: string
  classId: string
  subjectId: string
}

const emptyForm: BookingFormData = {
  title: '',
  roomId: '',
  bookingType: 'course',
  startDateTime: '',
  endDateTime: '',
  description: '',
  diplomaId: '',
  classId: '',
  subjectId: '',
}

function BookingsPage() {
  const { bookings, isLoading, error, createBooking, updateBooking, deleteBooking, cancelBooking, refreshBookings } = useBookings()
  const { rooms } = useRooms()
  const {
    diplomaOptions,
    classOptionsByDiploma,
    subjectOptionsByClass,
    getDiplomaIdByClass,
  } = useAcademicData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'cancel' | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [form, setForm] = useState<BookingFormData>(emptyForm)
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const roomOptions = rooms.map(r => ({ value: r.id, label: `${r.name} (${r.code})` }))

  // Options cascade pour le formulaire
  const classOptions = useMemo(
    () => (form.diplomaId ? classOptionsByDiploma(form.diplomaId) : []),
    [form.diplomaId, classOptionsByDiploma],
  )

  const subjectOptions = useMemo(
    () => (form.classId ? subjectOptionsByClass(form.classId) : []),
    [form.classId, subjectOptionsByClass],
  )

  const hasDiplomaData = diplomaOptions.length > 0

  const handleDiplomaChange = (diplomaId: string) => {
    setForm(f => ({ ...f, diplomaId, classId: '', subjectId: '' }))
  }

  const handleClassChange = (classId: string) => {
    setForm(f => ({ ...f, classId, subjectId: '' }))
  }

  const handleSubjectChange = (subjectId: string) => {
    setForm(f => {
      const newForm = { ...f, subjectId }
      // Auto-remplir le titre si vide
      if (!f.title.trim()) {
        const subjectLabel = subjectOptions.find(s => s.value === subjectId)?.label
        const classLabel = classOptions.find(c => c.value === f.classId)?.label
        if (subjectLabel && classLabel) {
          newForm.title = `${subjectLabel} - ${classLabel}`
        } else if (subjectLabel) {
          newForm.title = subjectLabel
        }
      }
      return newForm
    })
  }

  const filtered = useMemo(() => {
    let result = bookings
    if (search) {
      result = filterBySearch(result, search, ['title'])
    }
    if (typeFilter) {
      result = result.filter(b => b.bookingType === typeFilter)
    }
    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter)
    }
    return result
  }, [bookings, search, typeFilter, statusFilter])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => {
    setForm(emptyForm)
    setSelectedBooking(null)
    setModalMode('create')
  }

  const openEdit = (booking: Booking) => {
    setSelectedBooking(booking)
    const diplomaId = booking.classId ? (getDiplomaIdByClass(booking.classId) || '') : ''
    setForm({
      title: booking.title,
      roomId: booking.roomId,
      bookingType: booking.bookingType,
      startDateTime: booking.startDateTime?.slice(0, 16) || '',
      endDateTime: booking.endDateTime?.slice(0, 16) || '',
      description: booking.description || '',
      diplomaId,
      classId: booking.classId || '',
      subjectId: booking.subjectId || '',
    })
    setModalMode('edit')
  }

  const openDelete = (booking: Booking) => {
    setSelectedBooking(booking)
    setModalMode('delete')
  }

  const openCancel = (booking: Booking) => {
    setSelectedBooking(booking)
    setCancelReason('')
    setModalMode('cancel')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedBooking(null)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        const data: CreateBookingData = {
          title: form.title,
          roomId: form.roomId,
          bookingType: form.bookingType,
          startDateTime: form.startDateTime,
          endDateTime: form.endDateTime,
          description: form.description,
          subjectId: form.subjectId || undefined,
          classId: form.classId || undefined,
        }
        await createBooking(data)
      } else if (modalMode === 'edit' && selectedBooking) {
        await updateBooking({
          id: selectedBooking.id,
          title: form.title,
          roomId: form.roomId,
          bookingType: form.bookingType,
          startDateTime: form.startDateTime,
          endDateTime: form.endDateTime,
          description: form.description,
          subjectId: form.subjectId || undefined,
          classId: form.classId || undefined,
        })
      }
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBooking) return
    setSubmitting(true)
    try {
      await deleteBooking(selectedBooking.id)
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedBooking) return
    setSubmitting(true)
    try {
      await cancelBooking(selectedBooking.id, cancelReason || undefined)
      closeModal()
    } catch {
      // Error handled by hook toast
    } finally {
      setSubmitting(false)
    }
  }

  const canEdit = (b: Booking) => b.status !== 'cancelled' && b.status !== 'completed'
  const canCancelBooking = (b: Booking) => b.status === 'confirmed' || b.status === 'pending'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement des séances..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-error-600 mb-4">{error}</p>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshBookings}>
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
          <h1 className="text-2xl font-bold text-neutral-900">Gestion des séances</h1>
          <p className="text-neutral-500 mt-1">{bookings.length} séance{bookings.length > 1 ? 's' : ''} au total</p>
        </div>
        <Button leftIcon={Plus} onClick={openCreate} className="mt-4 sm:mt-0">
          Nouvelle séance
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par titre..."
            leftIcon={Search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: '', label: 'Tous les types' }, ...bookingTypeOptions]}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: '', label: 'Tous les statuts' }, ...bookingStatusOptions]}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table or Empty */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Aucune séance trouvée"
          description={search || typeFilter || statusFilter ? 'Aucune séance ne correspond à vos critères.' : 'Commencez par créer votre première séance.'}
          action={!search && !typeFilter && !statusFilter ? { label: 'Nouvelle séance', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Titre</th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Salle</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Date/Heure</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Statut</th>
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedData.map(booking => (
                    <tr key={booking.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{booking.title}</span>
                        <span className="block sm:hidden text-xs text-neutral-400 mt-0.5">{booking.room?.name || '-'}</span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-neutral-600">
                        {booking.room?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        <div>{booking.startDateTime ? formatDate(booking.startDateTime) : '-'}</div>
                        <div className="text-xs text-neutral-400">
                          {booking.startDateTime && booking.endDateTime
                            ? formatTimeRange(booking.startDateTime, booking.endDateTime)
                            : ''}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <Badge variant={typeBadgeVariant[booking.bookingType] || 'neutral'} size="sm">
                          {bookingTypeLabels[booking.bookingType] || booking.bookingType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant[booking.status] || 'neutral'} size="sm">
                          {bookingStatusLabels[booking.status] || booking.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit(booking) && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(booking)}>
                              <Pencil size={14} />
                            </Button>
                          )}
                          {canCancelBooking(booking) && (
                            <Button variant="ghost" size="sm" onClick={() => openCancel(booking)}>
                              <XCircle size={14} className="text-warning-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openDelete(booking)}>
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
        title={modalMode === 'create' ? 'Nouvelle séance' : 'Modifier la séance'}
        size="md"
      >
        <div className="space-y-4">
          {/* Cascade académique */}
          {hasDiplomaData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Diplôme"
                options={[{ value: '', label: 'Sélectionner...' }, ...diplomaOptions]}
                value={form.diplomaId}
                onChange={e => handleDiplomaChange(e.target.value)}
              />
              <Select
                label="Classe"
                options={[{ value: '', label: form.diplomaId ? 'Sélectionner...' : 'Choisir un diplôme' }, ...classOptions]}
                value={form.classId}
                onChange={e => handleClassChange(e.target.value)}
                disabled={!form.diplomaId}
              />
              <Select
                label="Matière"
                options={[{ value: '', label: form.classId ? 'Sélectionner...' : 'Choisir une classe' }, ...subjectOptions]}
                value={form.subjectId}
                onChange={e => handleSubjectChange(e.target.value)}
                disabled={!form.classId}
              />
            </div>
          )}

          <Input
            label="Titre"
            placeholder="Ex: Cours de mathématiques"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Salle"
              options={[{ value: '', label: 'Sélectionner une salle' }, ...roomOptions]}
              value={form.roomId}
              onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
            />
            <Select
              label="Type"
              options={bookingTypeOptions}
              value={form.bookingType}
              onChange={e => setForm(f => ({ ...f, bookingType: e.target.value as BookingType }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Début"
              type="datetime-local"
              value={form.startDateTime}
              onChange={e => setForm(f => ({ ...f, startDateTime: e.target.value }))}
              required
            />
            <Input
              label="Fin"
              type="datetime-local"
              value={form.endDateTime}
              onChange={e => setForm(f => ({ ...f, endDateTime: e.target.value }))}
              required
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Description optionnelle..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!form.title || !form.roomId || !form.startDateTime || !form.endDateTime}
          >
            {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={modalMode === 'delete'}
        onClose={closeModal}
        title="Supprimer la séance"
        size="sm"
      >
        <p className="text-neutral-600">
          Êtes-vous sûr de vouloir supprimer la séance <strong>{selectedBooking?.title}</strong> ?
          Cette action est irréversible.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={modalMode === 'cancel'}
        onClose={closeModal}
        title="Annuler la séance"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Voulez-vous annuler la séance <strong>{selectedBooking?.title}</strong> ?
          </p>
          <Textarea
            label="Raison (optionnel)"
            placeholder="Raison de l'annulation..."
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Retour</Button>
          <Button variant="danger" onClick={handleCancel} isLoading={submitting}>
            Annuler la séance
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default BookingsPage
