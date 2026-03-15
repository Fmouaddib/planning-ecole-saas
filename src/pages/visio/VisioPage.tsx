import { useState, useMemo, useCallback, lazy, Suspense } from 'react'
import { useVisio, detectPlatform } from '@/hooks/useVisio'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useCenterSettings } from '@/hooks/useCenterSettings'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState, LoadingSpinner, HelpBanner, MultiSelect } from '@/components/ui'
import { VISIO_PLATFORMS } from '@/utils/constants'
import { navigateTo } from '@/utils/navigation'
import { filterBySearch, localToISO } from '@/utils/helpers'
import type { VirtualRoom, CreateVirtualRoomData, VirtualRoomPlatform, Booking, BookingType } from '@/types'
import {
  Video,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  BarChart3,
  Calendar,
  Star,
  RefreshCw,
  XCircle,
  Link2,
  Filter,
  ChevronDown,
  X,
} from 'lucide-react'

const CreateBookingModal = lazy(() => import('@/pages/calendar/CreateBookingModal').then(m => ({ default: m.CreateBookingModal })))
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

type Tab = 'upcoming' | 'rooms' | 'stats'

const platformOptions = [
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'meet', label: 'Google Meet' },
  { value: 'other', label: 'Autre' },
]

const emptyForm: CreateVirtualRoomData = {
  name: '',
  platform: 'teams',
  meetingUrl: '',
  isDefault: false,
}

function PlatformBadge({ platform }: { platform: VirtualRoomPlatform }) {
  const config = VISIO_PLATFORMS[platform] || VISIO_PLATFORMS.other
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: config.color, backgroundColor: config.bgColor }}
    >
      {config.label}
    </span>
  )
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success('Lien copié dans le presse-papier'),
    () => toast.error('Impossible de copier le lien')
  )
}

function VisioPage() {
  const {
    virtualRooms,
    isLoading,
    createVirtualRoom,
    updateVirtualRoom,
    deleteVirtualRoom,
    refreshVirtualRooms,
    upcomingSessions,
    inProgressSessions,
    stats,
  } = useVisio()
  const { createBooking, updateBooking, cancelBooking, refreshBookings } = useBookings()
  const { rooms } = useRooms()
  const {
    diplomaOptions,
    classOptionsByDiploma,
    subjectOptionsByClass,
    getClassById,
  } = useAcademicData()
  const { settings: centerSettings } = useCenterSettings()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'staff'

  const roomOptions = useMemo(() => rooms.map(r => ({ value: r.id, label: r.name })), [rooms])
  const virtualRoomOptions = useMemo(
    () => virtualRooms.map(r => ({
      value: r.id,
      label: `${r.name} (${r.platform === 'teams' ? 'Teams' : r.platform === 'zoom' ? 'Zoom' : r.platform === 'meet' ? 'Meet' : 'Autre'})`,
      url: r.meetingUrl,
    })),
    [virtualRooms],
  )

  const [tab, setTab] = useState<Tab>('upcoming')
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([])
  const [selectedDiplomes, setSelectedDiplomes] = useState<string[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'cancel-session' | 'edit-session' | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<VirtualRoom | null>(null)
  const [selectedSession, setSelectedSession] = useState<Booking | null>(null)
  const [form, setForm] = useState<CreateVirtualRoomData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Edit session form state
  const [editSessionTitle, setEditSessionTitle] = useState('')
  const [editSessionDate, setEditSessionDate] = useState('')
  const [editSessionStartTime, setEditSessionStartTime] = useState('')
  const [editSessionEndTime, setEditSessionEndTime] = useState('')
  const [editSessionMeetingUrl, setEditSessionMeetingUrl] = useState('')
  const [editSessionDescription, setEditSessionDescription] = useState('')
  const [editSessionType, setEditSessionType] = useState<'in_person' | 'online' | 'hybrid'>('online')
  const [editSessionRoomId, setEditSessionRoomId] = useState('')

  // ==================== Filter options ====================

  const teacherOptions = useMemo(() => {
    const teachers = new Set<string>()
    upcomingSessions.forEach(s => {
      const t = s.user ? `${s.user.firstName} ${s.user.lastName}` : null
      if (t) teachers.add(t)
    })
    return Array.from(teachers).sort().map(t => ({ value: t, label: t }))
  }, [upcomingSessions])

  const matiereOptions = useMemo(() => {
    const matieres = new Set<string>()
    upcomingSessions.forEach(s => { if (s.matiere) matieres.add(s.matiere) })
    return Array.from(matieres).sort().map(m => ({ value: m, label: m }))
  }, [upcomingSessions])

  const diplomeOptions = useMemo(() => {
    const diplomes = new Set<string>()
    upcomingSessions.forEach(s => { if (s.diplome) diplomes.add(s.diplome) })
    return Array.from(diplomes).sort().map(d => ({ value: d, label: d }))
  }, [upcomingSessions])

  const advancedFilterCount =
    (selectedTeachers.length > 0 ? 1 : 0) +
    (selectedMatieres.length > 0 ? 1 : 0) +
    (selectedDiplomes.length > 0 ? 1 : 0)

  const resetAdvancedFilters = () => {
    setSelectedTeachers([])
    setSelectedMatieres([])
    setSelectedDiplomes([])
  }

  // ==================== TAB: Prochaines visios ====================

  const filteredSessions = useMemo(() => {
    let sessions = upcomingSessions
    if (platformFilter) {
      sessions = sessions.filter(s => detectPlatform(s.meetingUrl || '') === platformFilter)
    }
    if (search.trim()) {
      sessions = filterBySearch(sessions, search, ['title'] as (keyof Booking)[])
    }
    if (selectedTeachers.length) {
      sessions = sessions.filter(s => {
        const t = s.user ? `${s.user.firstName} ${s.user.lastName}` : null
        return t && selectedTeachers.includes(t)
      })
    }
    if (selectedMatieres.length) {
      sessions = sessions.filter(s => s.matiere && selectedMatieres.includes(s.matiere))
    }
    if (selectedDiplomes.length) {
      sessions = sessions.filter(s => s.diplome && selectedDiplomes.includes(s.diplome))
    }
    return sessions
  }, [upcomingSessions, platformFilter, search, selectedTeachers, selectedMatieres, selectedDiplomes])

  const sessionsPagination = usePagination(filteredSessions, { initialPageSize: 10 })

  // ==================== TAB: Salles virtuelles ====================

  const filteredRooms = useMemo(() => {
    let rooms = virtualRooms
    if (platformFilter) {
      rooms = rooms.filter(r => r.platform === platformFilter)
    }
    if (search.trim()) {
      rooms = filterBySearch(rooms, search, ['name', 'meetingUrl'] as (keyof VirtualRoom)[])
    }
    return rooms
  }, [virtualRooms, platformFilter, search])

  const roomsPagination = usePagination(filteredRooms, { initialPageSize: 10 })

  // ==================== MODAL HANDLERS ====================

  const openCreateModal = () => {
    setForm(emptyForm)
    setSelectedRoom(null)
    setModalMode('create')
  }

  const openEditModal = (room: VirtualRoom) => {
    setSelectedRoom(room)
    setForm({
      name: room.name,
      platform: room.platform,
      meetingUrl: room.meetingUrl,
      isDefault: room.isDefault,
    })
    setModalMode('edit')
  }

  const openDeleteModal = (room: VirtualRoom) => {
    setSelectedRoom(room)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedRoom(null)
    setSelectedSession(null)
    setForm(emptyForm)
  }

  const openEditSession = useCallback((session: Booking) => {
    setSelectedSession(session)
    setEditSessionTitle(session.title)
    const startDt = new Date(session.startDateTime)
    const endDt = new Date(session.endDateTime)
    setEditSessionDate(format(startDt, 'yyyy-MM-dd'))
    setEditSessionStartTime(format(startDt, 'HH:mm'))
    setEditSessionEndTime(format(endDt, 'HH:mm'))
    setEditSessionMeetingUrl(session.meetingUrl || '')
    setEditSessionDescription(session.description || '')
    setEditSessionType(session.sessionType || 'online')
    setEditSessionRoomId(session.roomId || '')
    setModalMode('edit-session')
  }, [])

  const handleEditSession = async () => {
    if (!selectedSession || !editSessionTitle.trim()) return
    setSubmitting(true)
    try {
      await updateBooking({
        id: selectedSession.id,
        title: editSessionTitle.trim(),
        startDateTime: localToISO(editSessionDate, editSessionStartTime),
        endDateTime: localToISO(editSessionDate, editSessionEndTime),
        meetingUrl: editSessionMeetingUrl.trim() || undefined,
        description: editSessionDescription.trim() || undefined,
        sessionType: editSessionType,
        roomId: editSessionRoomId || undefined,
      })
      await refreshBookings()
      closeModal()
    } catch {
      // handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  const openCancelSession = useCallback((session: Booking) => {
    setSelectedSession(session)
    setModalMode('cancel-session')
  }, [])

  const handleCancelSession = async () => {
    if (!selectedSession) return
    setSubmitting(true)
    try {
      await cancelBooking(selectedSession.id)
      closeModal()
    } catch {
      // handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.meetingUrl.trim()) {
      toast.error('Nom et URL sont obligatoires')
      return
    }

    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await createVirtualRoom(form)
      } else if (modalMode === 'edit' && selectedRoom) {
        await updateVirtualRoom({ id: selectedRoom.id, ...form })
      }
      closeModal()
    } catch {
      // handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRoom) return
    setSubmitting(true)
    try {
      await deleteVirtualRoom(selectedRoom.id)
      closeModal()
    } catch {
      // handled in hook
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateSession = async (data: {
    title: string
    roomId: string
    type: BookingType
    startDateTime: string
    endDateTime: string
    description: string
    subjectId?: string
    classId?: string
    sessionType?: 'in_person' | 'online' | 'hybrid'
    meetingUrl?: string
  }) => {
    try {
      await createBooking({
        title: data.title,
        roomId: data.roomId,
        bookingType: data.type,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        description: data.description,
        subjectId: data.subjectId,
        classId: data.classId,
        sessionType: data.sessionType,
        meetingUrl: data.meetingUrl,
      })
      setShowCreateSession(false)
    } catch {
      // Error handled by hook toast
    }
  }

  // ==================== RENDER ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
    { key: 'upcoming', label: 'Prochaines visios', icon: Calendar },
    { key: 'rooms', label: 'Liens favoris', icon: Link2 },
    { key: 'stats', label: 'Statistiques', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Video className="h-7 w-7 text-primary-600" />
            Classes virtuelles
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Gérez vos sessions en ligne et vos salles virtuelles
          </p>
        </div>

        <div className="flex items-center gap-3">
          {inProgressSessions.length > 0 && (
            <Badge variant="success">
              {inProgressSessions.length} en cours
            </Badge>
          )}
          {stats.upcoming > 0 && (
            <Badge variant="info">
              {stats.upcoming} à venir
            </Badge>
          )}
          {isAdmin && (
            <Button onClick={() => setShowCreateSession(true)} size="sm">
              <Plus size={16} className="mr-1" />
              Nouvelle séance
            </Button>
          )}
          {tab === 'rooms' && (
            <Button onClick={openCreateModal} size="sm" variant="secondary">
              <Plus size={16} className="mr-1" />
              Nouveau lien favori
            </Button>
          )}
          <button
            onClick={refreshVirtualRooms}
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <HelpBanner storageKey="admin-visio">
        Suivez les sessions en ligne à venir et gérez vos liens favoris (Teams, Zoom, Meet). Si la création automatique est activée dans Paramètres, un lien unique est généré pour chaque séance. Les liens favoris servent de raccourcis réutilisables.
        <span className="flex gap-2 mt-2">
          <button onClick={() => navigateTo('/settings')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Configurer la visio →</button>
        </span>
      </HelpBanner>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="flex gap-6">
          {tabs.map(t => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch(''); setPlatformFilter(''); resetAdvancedFilters(); setShowAdvancedFilters(false) }}
                className={`flex items-center gap-2 px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Filters (for upcoming & rooms tabs) */}
      {tab !== 'stats' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder={tab === 'upcoming' ? 'Rechercher une session...' : 'Rechercher une salle...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
            >
              <option value="">Toutes les plateformes</option>
              <option value="teams">Teams</option>
              <option value="zoom">Zoom</option>
              <option value="meet">Google Meet</option>
              <option value="other">Autre</option>
            </select>
            {tab === 'upcoming' && (
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showAdvancedFilters || advancedFilterCount > 0
                    ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                    : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter size={16} />
                Filtres
                {advancedFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
                    {advancedFilterCount}
                  </span>
                )}
                <ChevronDown size={14} className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {tab === 'upcoming' && showAdvancedFilters && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Filtres avancés</h3>
                {advancedFilterCount > 0 && (
                  <button
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    onClick={resetAdvancedFilters}
                  >
                    <X size={12} />
                    Réinitialiser
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MultiSelect
                  label="Professeur"
                  options={teacherOptions}
                  value={selectedTeachers}
                  onChange={setSelectedTeachers}
                  placeholder="Tous les professeurs"
                />
                <MultiSelect
                  label="Matière"
                  options={matiereOptions}
                  value={selectedMatieres}
                  onChange={setSelectedMatieres}
                  placeholder="Toutes les matières"
                />
                <MultiSelect
                  label="Diplôme"
                  options={diplomeOptions}
                  value={selectedDiplomes}
                  onChange={setSelectedDiplomes}
                  placeholder="Tous les diplômes"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      {tab === 'upcoming' && (
        <UpcomingTab
          sessions={sessionsPagination.paginatedData}
          pagination={sessionsPagination}
          totalFiltered={filteredSessions.length}
          isAdmin={isAdmin}
          onCancelSession={openCancelSession}
          onEditSession={openEditSession}
        />
      )}

      {tab === 'rooms' && (
        <RoomsTab
          rooms={roomsPagination.paginatedData}
          pagination={roomsPagination}
          totalFiltered={filteredRooms.length}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          onCreate={openCreateModal}
        />
      )}

      {tab === 'stats' && (
        <StatsTab stats={stats} />
      )}

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <Modal
          isOpen
          onClose={closeModal}
          title={modalMode === 'create' ? 'Nouveau lien favori' : 'Modifier le lien favori'}
          size="md"
        >
          <div className="space-y-4 p-4">
            {/* Guide explicatif */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
              <p className="font-medium">Qu'est-ce qu'un lien favori ?</p>
              <p>
                Un lien favori est un <strong>lien de visioconférence permanent et réutilisable</strong> (ex : une salle Teams récurrente, un lien Zoom personnel).
                Il permet de sélectionner rapidement un lien existant lors de la création d'une séance en ligne.
              </p>
              <p className="text-blue-600 dark:text-blue-400">
                Si la <strong>création automatique</strong> est activée dans Paramètres &gt; Visioconférence,
                un lien unique est généré pour chaque séance. Les liens favoris sont alors optionnels et servent de raccourcis ou de liens alternatifs.
              </p>
            </div>

            <Input
              label="Nom"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Salle Teams principale"
            />
            <Select
              label="Plateforme"
              value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value as VirtualRoomPlatform }))}
              options={platformOptions}
            />
            <Input
              label="URL de la réunion"
              value={form.meetingUrl}
              onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))}
              placeholder={
                form.platform === 'teams' ? 'https://teams.microsoft.com/l/meetup-join/...' :
                form.platform === 'zoom' ? 'https://us02web.zoom.us/j/...' :
                form.platform === 'meet' ? 'https://meet.google.com/xxx-xxxx-xxx' :
                'https://...'
              }
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2">
              Collez ici le lien permanent de votre salle de réunion. Ce lien sera proposé lors de la création de séances en ligne ou hybrides.
            </p>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.isDefault ?? false}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Salle par défaut
            </label>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={closeModal}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enregistrement...' : modalMode === 'create' ? 'Créer' : 'Enregistrer'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Delete Virtual Room Confirmation Modal */}
      {modalMode === 'delete' && selectedRoom && (
        <Modal isOpen onClose={closeModal} title="Supprimer le lien favori" size="sm">
          <div className="p-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Supprimer le lien favori <strong>"{selectedRoom.name}"</strong> ? Cette action est irréversible.
            </p>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={closeModal}>Annuler</Button>
            <Button variant="danger" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Create Session Modal */}
      {showCreateSession && (
        <Suspense fallback={null}>
          <CreateBookingModal
            isOpen={showCreateSession}
            onClose={() => setShowCreateSession(false)}
            onSubmit={handleCreateSession}
            prefilledDate={new Date()}
            prefilledHour={null}
            rooms={roomOptions}
            virtualRooms={virtualRoomOptions}
            diplomaOptions={diplomaOptions}
            classOptionsByDiploma={classOptionsByDiploma}
            subjectOptionsByClass={subjectOptionsByClass}
            getClassById={getClassById}
            isVisioAutoCreate={!!centerSettings.visio_provider && !!centerSettings.visio_auto_create}
            visioProviderName={centerSettings.visio_provider === 'zoom' ? 'Zoom' : centerSettings.visio_provider === 'teams' ? 'Teams' : centerSettings.visio_provider === 'meet' ? 'Google Meet' : undefined}
            openingTime={centerSettings.opening_time || '08:00'}
            closingTime={centerSettings.closing_time || '20:00'}
          />
        </Suspense>
      )}

      {/* Edit Session Modal */}
      {modalMode === 'edit-session' && selectedSession && (
        <Modal isOpen onClose={closeModal} title="Modifier la séance" size="md">
          <div className="p-4 space-y-4">
            <Input
              label="Titre"
              value={editSessionTitle}
              onChange={e => setEditSessionTitle(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Date"
                type="date"
                value={editSessionDate}
                onChange={e => setEditSessionDate(e.target.value)}
              />
              <Input
                label="Début"
                type="time"
                value={editSessionStartTime}
                onChange={e => setEditSessionStartTime(e.target.value)}
              />
              <Input
                label="Fin"
                type="time"
                value={editSessionEndTime}
                onChange={e => setEditSessionEndTime(e.target.value)}
              />
            </div>
            {editSessionEndTime && editSessionStartTime && editSessionEndTime <= editSessionStartTime && (
              <p className="text-xs text-red-500">L'heure de fin doit être après l'heure de début</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Mode"
                value={editSessionType}
                onChange={e => setEditSessionType(e.target.value as 'in_person' | 'online' | 'hybrid')}
                options={[
                  { value: 'in_person', label: 'Présentiel' },
                  { value: 'online', label: 'En ligne' },
                  { value: 'hybrid', label: 'Hybride' },
                ]}
              />
              {rooms.length > 0 && (
                <Select
                  label="Salle (optionnel)"
                  value={editSessionRoomId}
                  onChange={e => setEditSessionRoomId(e.target.value)}
                  options={[{ value: '', label: '— Aucune —' }, ...roomOptions]}
                />
              )}
            </div>
            <div>
              <Input
                label="Lien visio"
                value={editSessionMeetingUrl}
                onChange={e => setEditSessionMeetingUrl(e.target.value)}
                placeholder="https://..."
              />
              {editSessionMeetingUrl && (
                <div className="flex items-center gap-2 mt-1.5">
                  <a
                    href={editSessionMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink size={12} />
                    Tester le lien
                  </a>
                  <button
                    onClick={() => copyToClipboard(editSessionMeetingUrl)}
                    className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    <Copy size={12} />
                    Copier
                  </button>
                </div>
              )}
            </div>
            <Input
              label="Description (optionnel)"
              value={editSessionDescription}
              onChange={e => setEditSessionDescription(e.target.value)}
            />
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={closeModal}>Annuler</Button>
            <Button
              onClick={handleEditSession}
              disabled={submitting || !editSessionTitle.trim() || (editSessionEndTime <= editSessionStartTime)}
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Cancel Session Confirmation Modal */}
      {modalMode === 'cancel-session' && selectedSession && (
        <Modal isOpen onClose={closeModal} title="Annuler la séance" size="sm">
          <div className="p-4 space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Annuler la séance <strong>"{selectedSession.title}"</strong> ?
            </p>
            {selectedSession.visioMeetingId && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                Le lien visio associé sera également supprimé.
              </p>
            )}
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={closeModal}>Fermer</Button>
            <Button variant="danger" onClick={handleCancelSession} disabled={submitting}>
              {submitting ? 'Annulation...' : 'Annuler la séance'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}

// ==================== SUB-COMPONENTS ====================

function UpcomingTab({
  sessions,
  pagination,
  totalFiltered,
  isAdmin,
  onCancelSession,
  onEditSession,
}: {
  sessions: Booking[]
  pagination: ReturnType<typeof usePagination<Booking>>
  totalFiltered: number
  isAdmin: boolean
  onCancelSession: (session: Booking) => void
  onEditSession: (session: Booking) => void
}) {
  if (totalFiltered === 0) {
    return (
      <EmptyState
        icon={Video}
        title="Aucune session en ligne à venir"
        description="Les sessions en ligne avec un lien de visioconférence apparaîtront ici."
      />
    )
  }

  return (
    <div>
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Titre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Date & Heure</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase hidden md:table-cell">Professeur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Plateforme</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sessions.map(session => {
              const platform = detectPlatform(session.meetingUrl || '')
              return (
                <tr key={session.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{session.title}</div>
                    {session.matiere && (
                      <div className="text-xs text-neutral-500">{session.matiere}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <div>{format(new Date(session.startTime), 'EEE dd MMM', { locale: fr })}</div>
                    <div className="text-xs">
                      {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 hidden md:table-cell">
                    {session.user ? `${session.user.firstName} ${session.user.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <PlatformBadge platform={platform} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => copyToClipboard(session.meetingUrl || '')}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Copier le lien"
                      >
                        <Copy size={14} />
                      </button>
                      <a
                        href={session.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
                        title="Rejoindre"
                      >
                        <ExternalLink size={14} />
                      </a>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => onEditSession(session)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            title="Modifier la séance"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onCancelSession(session)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            title="Annuler la séance"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <PaginationBar pagination={pagination} totalFiltered={totalFiltered} />
      )}
    </div>
  )
}

function RoomsTab({
  rooms,
  pagination,
  totalFiltered,
  onEdit,
  onDelete,
  onCreate,
}: {
  rooms: VirtualRoom[]
  pagination: ReturnType<typeof usePagination<VirtualRoom>>
  totalFiltered: number
  onEdit: (room: VirtualRoom) => void
  onDelete: (room: VirtualRoom) => void
  onCreate: () => void
}) {
  if (totalFiltered === 0) {
    return (
      <EmptyState
        icon={Link2}
        title="Aucun lien favori"
        description="Enregistrez des liens de visioconférence permanents (Teams, Zoom, Meet) pour les réutiliser facilement lors de la création de séances."
        action={{ label: 'Ajouter un lien', onClick: onCreate, icon: Plus }}
      />
    )
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map(room => (
          <div
            key={room.id}
            className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{room.name}</h3>
                {room.isDefault && (
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                )}
              </div>
              <PlatformBadge platform={room.platform} />
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mb-4" title={room.meetingUrl}>
              {room.meetingUrl}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => copyToClipboard(room.meetingUrl)}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors"
              >
                <Copy size={12} />
                Copier le lien
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(room)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Modifier"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(room)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <PaginationBar pagination={pagination} totalFiltered={totalFiltered} />
      )}
    </div>
  )
}

function StatsTab({
  stats,
}: {
  stats: ReturnType<typeof useVisio>['stats']
}) {
  const kpis = [
    { label: 'Total sessions', value: stats.totalSessions, color: 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300' },
    { label: 'Sessions Teams', value: stats.byPlatform.teams, color: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' },
    { label: 'Sessions Zoom', value: stats.byPlatform.zoom, color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
    { label: 'Sessions à venir', value: stats.upcoming, color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
  ]

  const total = stats.totalSessions || 1

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`rounded-xl p-5 ${kpi.color}`}>
            <div className="text-sm font-medium opacity-80">{kpi.label}</div>
            <div className="text-3xl font-bold mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Répartition par plateforme */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Répartition par plateforme
        </h3>

        {stats.totalSessions === 0 ? (
          <p className="text-sm text-neutral-500">Aucune session enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {(['teams', 'zoom', 'meet', 'other'] as VirtualRoomPlatform[]).map(platform => {
              const count = stats.byPlatform[platform]
              const pct = Math.round((count / total) * 100)
              const config = VISIO_PLATFORMS[platform]
              return (
                <div key={platform}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{config.label}</span>
                    <span className="text-neutral-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: config.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PaginationBar({
  pagination,
  totalFiltered,
}: {
  pagination: ReturnType<typeof usePagination<any>>
  totalFiltered: number
}) {
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-neutral-500">
      <span>
        {totalFiltered} résultat{totalFiltered > 1 ? 's' : ''} — page {pagination.page}/{pagination.totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={pagination.prevPage}
          disabled={!pagination.canPrev}
          className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Précédent
        </button>
        <button
          onClick={pagination.nextPage}
          disabled={!pagination.canNext}
          className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Suivant
        </button>
      </div>
    </div>
  )
}

export default VisioPage
