import { useState, useMemo, lazy, Suspense } from 'react'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Textarea, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner, HelpBanner } from '@/components/ui'
import { BOOKING_TYPES, BOOKING_STATUS } from '@/utils/constants'
import { filterBySearch, formatDate, formatTimeRange, isTeacherRole } from '@/utils/helpers'
import type { Booking, CreateBookingData, BookingType } from '@/types'
import { Plus, Search, Pencil, Trash2, XCircle, CalendarCheck, RefreshCw, Repeat, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react'
import { navigateTo } from '@/utils/navigation'

const BatchCreateModal = lazy(() => import('../calendar/BatchCreateModal'))

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
  const { bookings, isLoading, error, createBooking, updateBooking, deleteBooking, cancelBooking, refreshBookings, createBatchBookings, checkBookingConflict, checkTrainerConflict } = useBookings()
  const { rooms } = useRooms()
  const { user } = useAuth()
  const isTeacher = isTeacherRole(user?.role)
  const {
    diplomaOptions,
    classOptionsByDiploma,
    subjectOptionsByClass,
    getDiplomaIdByClass,
    teachers,
    getTeachersBySubject,
  } = useAcademicData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterDiplomaId, setFilterDiplomaId] = useState('')
  const [filterClassId, setFilterClassId] = useState('')
  const [filterSubjectId, setFilterSubjectId] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'cancel' | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [form, setForm] = useState<BookingFormData>(emptyForm)
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [sortKey, setSortKey] = useState<'title' | 'room' | 'date' | 'type' | 'status'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const roomOptions = rooms.map(r => ({ value: r.id, label: `${r.name} (${r.code})` }))
  const teacherProfileOptions = useMemo(
    () => teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}`.trim() })),
    [teachers],
  )

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

  // Options cascade pour les filtres
  const filterClassOptions = useMemo(
    () => (filterDiplomaId ? classOptionsByDiploma(filterDiplomaId) : []),
    [filterDiplomaId, classOptionsByDiploma],
  )

  const filterSubjectOptions = useMemo(
    () => (filterClassId ? subjectOptionsByClass(filterClassId) : []),
    [filterClassId, subjectOptionsByClass],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (roomFilter) count++
    if (teacherFilter) count++
    if (dateFrom) count++
    if (dateTo) count++
    if (filterDiplomaId) count++
    if (filterClassId) count++
    if (filterSubjectId) count++
    return count
  }, [roomFilter, teacherFilter, dateFrom, dateTo, filterDiplomaId, filterClassId, filterSubjectId])

  const resetAdvancedFilters = () => {
    setRoomFilter('')
    setTeacherFilter('')
    setDateFrom('')
    setDateTo('')
    setFilterDiplomaId('')
    setFilterClassId('')
    setFilterSubjectId('')
  }

  const handleDiplomaChange = (diplomaId: string) => {
    setForm(f => ({ ...f, diplomaId, classId: '', subjectId: '' }))
  }

  const handleClassChange = (classId: string) => {
    setForm(f => ({ ...f, classId, subjectId: '' }))
  }

  const handleSubjectChange = (subjectId: string) => {
    setForm(f => {
      const newForm = { ...f, subjectId }
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
    if (isTeacher && user?.id) {
      result = result.filter(b => b.userId === user.id)
    }
    if (search) {
      result = filterBySearch(result, search, ['title'])
    }
    if (typeFilter) {
      result = result.filter(b => b.bookingType === typeFilter)
    }
    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter)
    }
    if (roomFilter) {
      result = result.filter(b => b.roomId === roomFilter)
    }
    if (teacherFilter) {
      result = result.filter(b => b.userId === teacherFilter)
    }
    if (dateFrom) {
      result = result.filter(b => b.startDateTime && b.startDateTime.slice(0, 10) >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(b => b.startDateTime && b.startDateTime.slice(0, 10) <= dateTo)
    }
    if (filterSubjectId) {
      result = result.filter(b => b.subjectId === filterSubjectId)
    } else if (filterClassId) {
      result = result.filter(b => b.classId === filterClassId)
    } else if (filterDiplomaId) {
      const classIds = new Set(filterClassOptions.map(c => c.value))
      result = result.filter(b => b.classId && classIds.has(b.classId))
    }
    return result
  }, [bookings, isTeacher, user?.id, search, typeFilter, statusFilter, roomFilter, teacherFilter, dateFrom, dateTo, filterDiplomaId, filterClassId, filterSubjectId, filterClassOptions])

  const sorted = useMemo(() => {
    const list = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return dir * (a.title || '').localeCompare(b.title || '')
        case 'room':
          return dir * (a.room?.name || '').localeCompare(b.room?.name || '')
        case 'date':
          return dir * ((a.startDateTime || '').localeCompare(b.startDateTime || ''))
        case 'type':
          return dir * (a.bookingType || '').localeCompare(b.bookingType || '')
        case 'status':
          return dir * (a.status || '').localeCompare(b.status || '')
        default:
          return 0
      }
    })
    return list
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-neutral-300" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary-600" />
      : <ArrowDown size={12} className="text-primary-600" />
  }

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(sorted)

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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {isTeacher ? 'Mes séances' : 'Gestion des séances'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {isTeacher
              ? `${filtered.length} séance${filtered.length > 1 ? 's' : ''} (mes cours)`
              : `${bookings.length} séance${bookings.length > 1 ? 's' : ''} au total`}
          </p>
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Button variant="secondary" leftIcon={Repeat} onClick={() => setShowBatchModal(true)}>
              Saisie en lot
            </Button>
            <Button leftIcon={Plus} onClick={openCreate}>
              Nouvelle séance
            </Button>
          </div>
        )}
      </div>

      <HelpBanner storageKey={isTeacher ? 'teacher-bookings' : 'admin-bookings'}>
        {isTeacher
          ? (<>Retrouvez ici la liste de vos séances. Filtrez par statut, type ou date pour trouver rapidement une séance. Cliquez sur une séance pour en voir les détails.
              <span className="flex gap-2 mt-2">
                <button onClick={() => navigateTo('/planning')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Mon planning →</button>
                <button onClick={() => navigateTo('/teacher-collab')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Collaboration →</button>
              </span></>)
          : (<>Vue liste de toutes les séances de votre centre. Filtrez par statut, type ou date. Utilisez « Saisie en lot » pour créer plusieurs séances d'un coup.
              <span className="flex gap-2 mt-2">
                <button onClick={() => navigateTo('/planning')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Vue calendrier →</button>
                <button onClick={() => navigateTo('/attendance')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Suivi des présences →</button>
              </span></>)}
      </HelpBanner>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
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
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          onClick={() => setShowAdvancedFilters(v => !v)}
        >
          <SlidersHorizontal size={14} />
          Filtres
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
          {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filtres avancés</span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-error-600 transition-colors"
                onClick={resetAdvancedFilters}
              >
                <X size={12} /> Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Salle"
              options={[{ value: '', label: 'Toutes les salles' }, ...roomOptions]}
              value={roomFilter}
              onChange={e => setRoomFilter(e.target.value)}
            />
            <Select
              label="Professeur"
              options={[{ value: '', label: 'Tous les professeurs' }, ...teacherProfileOptions]}
              value={teacherFilter}
              onChange={e => setTeacherFilter(e.target.value)}
            />
            <Input
              label="Date début"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <Input
              label="Date fin"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          {hasDiplomaData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Diplôme"
                options={[{ value: '', label: 'Tous les diplômes' }, ...diplomaOptions]}
                value={filterDiplomaId}
                onChange={e => { setFilterDiplomaId(e.target.value); setFilterClassId(''); setFilterSubjectId('') }}
              />
              <Select
                label="Classe"
                options={[{ value: '', label: filterDiplomaId ? 'Toutes les classes' : 'Choisir un diplôme' }, ...filterClassOptions]}
                value={filterClassId}
                onChange={e => { setFilterClassId(e.target.value); setFilterSubjectId('') }}
                disabled={!filterDiplomaId}
              />
              <Select
                label="Matière"
                options={[{ value: '', label: filterClassId ? 'Toutes les matières' : 'Choisir une classe' }, ...filterSubjectOptions]}
                value={filterSubjectId}
                onChange={e => setFilterSubjectId(e.target.value)}
                disabled={!filterClassId}
              />
            </div>
          )}
        </div>
      )}
      {!showAdvancedFilters && <div className="mb-3" />}

      {/* Table or Empty */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Aucune séance trouvée"
          description={search || typeFilter || statusFilter || activeFilterCount > 0 ? 'Aucune séance ne correspond à vos critères.' : 'Commencez par créer votre première séance.'}
          action={!search && !typeFilter && !statusFilter && activeFilterCount === 0 ? { label: 'Nouvelle séance', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 transition-colors" onClick={() => toggleSort('title')}>
                      <span className="inline-flex items-center gap-1">Titre <SortIcon col="title" /></span>
                    </th>
                    <th className="hidden sm:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 transition-colors" onClick={() => toggleSort('room')}>
                      <span className="inline-flex items-center gap-1">Salle <SortIcon col="room" /></span>
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 transition-colors" onClick={() => toggleSort('date')}>
                      <span className="inline-flex items-center gap-1">Date/Heure <SortIcon col="date" /></span>
                    </th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 transition-colors" onClick={() => toggleSort('type')}>
                      <span className="inline-flex items-center gap-1">Type <SortIcon col="type" /></span>
                    </th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 transition-colors" onClick={() => toggleSort('status')}>
                      <span className="inline-flex items-center gap-1">Statut <SortIcon col="status" /></span>
                    </th>
                    {!isTeacher && (
                      <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(booking => (
                    <tr key={booking.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{booking.title}</span>
                        <span className="block sm:hidden text-xs text-neutral-400 mt-0.5">{booking.room?.name || '-'}</span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                        {booking.room?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
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
                      {!isTeacher && (
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
                      )}
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
        <p className="text-neutral-600 dark:text-neutral-400">
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
          <p className="text-neutral-600 dark:text-neutral-400">
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

      {/* Batch Create Modal */}
      {showBatchModal && (
        <Suspense fallback={null}>
          <BatchCreateModal
            isOpen={showBatchModal}
            onClose={() => setShowBatchModal(false)}
            onCreateBatch={async (sessions) => { await createBatchBookings(sessions) }}
            checkRoomConflict={checkBookingConflict}
            checkTrainerConflict={checkTrainerConflict}
            rooms={roomOptions}
            teachers={teacherProfileOptions}
            currentUserId={user?.id || ''}
            diplomaOptions={diplomaOptions}
            classOptionsByDiploma={classOptionsByDiploma}
            subjectOptionsByClass={subjectOptionsByClass}
            getTeachersBySubject={getTeachersBySubject}
          />
        </Suspense>
      )}
    </div>
  )
}

export default BookingsPage
