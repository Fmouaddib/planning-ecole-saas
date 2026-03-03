import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import { SIDEBAR_DATE_EVENT } from '@/components/layout/SidebarCalendar'
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useAuth } from '@/hooks/useAuth'
import { Button, Select, Modal, ModalFooter, Badge, LoadingSpinner, MultiSelect } from '@/components/ui'
import { formatTimeRange, isTeacherRole, isStudentRole } from '@/utils/helpers'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useVisio } from '@/hooks/useVisio'
import type { CalendarEvent, ExportFormat, BookingType } from '@/types'
import { isDemoMode } from '@/lib/supabase'
import { mockCalendarData } from '@/data/mock-calendar-data'
import { mockBuildingRooms } from '@/data/mock-room-buildings'
import { ColorLegend } from './ColorLegend'
import { CreateBookingModal } from './CreateBookingModal'
import { RoomsView } from './RoomsView'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Download,
  ChevronDown,
  X,
  Printer,
  Repeat,
  AlertTriangle,
  Video,
} from 'lucide-react'

// Lazy-loaded views
const WeekView = lazy(() => import('./WeekView'))
const MonthView = lazy(() => import('./MonthView'))
const DayView = lazy(() => import('./DayView'))
const BatchCreateModal = lazy(() => import('./BatchCreateModal'))

type ViewMode = 'week' | 'month' | 'day' | 'rooms'

const bookingTypeLabels: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  meeting: 'Réunion',
  event: 'Événement',
  maintenance: 'Maintenance',
}

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  completed: 'Terminé',
}

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'neutral',
}

const recurrenceLabels: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
}

// ==================== MAIN COMPONENT ====================

function CalendarPage() {
  const { calendarEvents, isLoading, error, refreshBookings, createBooking, updateBooking, createBatchBookings, checkBookingConflict, checkTrainerConflict } = useBookings()
  const { rooms, buildingsWithRooms } = useRooms()
  const {
    diplomaOptions,
    classOptionsByDiploma,
    subjectOptionsByClass,
    allSubjectOptions,
    allDiplomaOptions,
    allClassOptions,
    teachers,
    getTeachersBySubject,
    getClassById,
    getClassIdsForStudent,
  } = useAcademicData()
  const { virtualRooms } = useVisio()

  const virtualRoomOptions = useMemo(
    () => virtualRooms.map(r => ({
      value: r.id,
      label: `${r.name} (${r.platform === 'teams' ? 'Teams' : r.platform === 'zoom' ? 'Zoom' : 'Autre'})`,
      url: r.meetingUrl,
    })),
    [virtualRooms],
  )

  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [roomFilter, setRoomFilter] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([])
  const [selectedDiplomes, setSelectedDiplomes] = useState<string[]>([])
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([])
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Create booking modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [createHour, setCreateHour] = useState<number | null>(null)

  // Batch create modal state
  const [showBatchModal, setShowBatchModal] = useState(false)
  const { user } = useAuth()
  const isTeacher = isTeacherRole(user?.role)
  const isStudent = isStudentRole(user?.role)
  const isReadOnly = isTeacher || isStudent
  const [showOnlyMine, setShowOnlyMine] = useState(isTeacher ?? false)

  // Sync showOnlyMine quand user charge après le montage (useState n'update pas)
  useEffect(() => {
    if (isTeacher) setShowOnlyMine(true)
  }, [isTeacher])

  // Class IDs for student filtering
  const studentClassIds = useMemo(() => {
    if (!isStudent || !user?.id) return []
    return getClassIdsForStudent(user.id)
  }, [isStudent, user?.id, getClassIdsForStudent])

  const teacherProfileOptions = useMemo(
    () => teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}`.trim() })),
    [teachers],
  )

  // Pending move confirmation state (drag & drop)
  const [pendingMove, setPendingMove] = useState<{
    eventId: string
    event: CalendarEvent
    newStart: string
    newEnd: string
  } | null>(null)

  // Editable move form state
  const [moveDate, setMoveDate] = useState('')
  const [moveStartTime, setMoveStartTime] = useState('')
  const [moveEndTime, setMoveEndTime] = useState('')
  const [moveRoomId, setMoveRoomId] = useState('')

  // Initialize editable fields when pendingMove changes
  useEffect(() => {
    if (pendingMove) {
      const newStart = parseISO(pendingMove.newStart)
      setMoveDate(format(newStart, 'yyyy-MM-dd'))
      setMoveStartTime(format(newStart, 'HH:mm'))
      const newEnd = parseISO(pendingMove.newEnd)
      setMoveEndTime(format(newEnd, 'HH:mm'))
      setMoveRoomId(pendingMove.event.roomId || '')
    }
  }, [pendingMove])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roomOptions = rooms.map(r => ({ value: r.id, label: r.name }))

  // F1 - Extract unique teachers
  const allEvents = useMemo(
    () => (isDemoMode ? mockCalendarData : calendarEvents),
    [calendarEvents],
  )

  const teacherOptions = useMemo(() => {
    const teachers = new Set<string>()
    allEvents.forEach(e => {
      const t = e.teacher || e.userName
      if (t) teachers.add(t)
    })
    return Array.from(teachers)
      .sort()
      .map(t => ({ value: t, label: t }))
  }, [allEvents])

  const activeFilterCount =
    (roomFilter ? 1 : 0) +
    (selectedMatieres.length > 0 ? 1 : 0) +
    (selectedDiplomes.length > 0 ? 1 : 0) +
    (selectedNiveaux.length > 0 ? 1 : 0) +
    (selectedTeachers.length > 0 ? 1 : 0) +
    (activeTypes.length > 0 ? 1 : 0)

  const resetFilters = () => {
    setRoomFilter('')
    setSelectedMatieres([])
    setSelectedDiplomes([])
    setSelectedNiveaux([])
    setSelectedTeachers([])
    setActiveTypes([])
  }

  const filteredEvents = useMemo(() => {
    let events = allEvents
    if (isStudent) {
      // Étudiant : TOUJOURS filtré par sa classe (pas de toggle)
      // Sans classe assignée → aucune séance visible
      events = studentClassIds.length > 0
        ? events.filter(e => e.classId && studentClassIds.includes(e.classId))
        : []
    } else if (showOnlyMine && user?.id) {
      // Professeur : filtrer par userId
      events = events.filter(e => e.userId === user.id)
    }
    if (roomFilter) events = events.filter(e => e.roomId === roomFilter)
    if (selectedMatieres.length) events = events.filter(e => e.matiere && selectedMatieres.includes(e.matiere))
    if (selectedDiplomes.length) events = events.filter(e => e.diplome && selectedDiplomes.includes(e.diplome))
    if (selectedNiveaux.length) events = events.filter(e => e.niveau && selectedNiveaux.includes(e.niveau))
    if (selectedTeachers.length) {
      events = events.filter(e => {
        const t = e.teacher || e.userName
        return t && selectedTeachers.includes(t)
      })
    }
    if (activeTypes.length) events = events.filter(e => e.type && activeTypes.includes(e.type))
    return events
  }, [allEvents, showOnlyMine, isStudent, studentClassIds, user?.id, roomFilter, selectedMatieres, selectedDiplomes, selectedNiveaux, selectedTeachers, activeTypes])

  const totalRooms = useMemo(() => {
    if (roomFilter) return 1
    if (isDemoMode) return mockBuildingRooms.reduce((s, b) => s + b.rooms.length, 0)
    return rooms.length || 1
  }, [roomFilter, rooms.length])

  const handleToggleType = (type: string) => {
    setActiveTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    )
  }

  const handleExport = async (fmt: ExportFormat, mode: 'list' | 'calendar' = 'list') => {
    const exportModule = await import('@/utils/export')
    const filename = `planning-${format(currentDate, 'yyyy-MM-dd')}`
    if (mode === 'calendar') {
      const calFilename = `${filename}-calendrier`
      switch (fmt) {
        case 'excel': await exportModule.exportToExcelCalendar(filteredEvents, currentDate, calFilename); break
        case 'csv': exportModule.exportToCSVCalendar(filteredEvents, currentDate, calFilename); break
        case 'pdf': exportModule.exportToPDFCalendar(filteredEvents, currentDate, calFilename); break
        case 'word': exportModule.exportToWordCalendar(filteredEvents, currentDate, calFilename); break
      }
    } else {
      switch (fmt) {
        case 'excel': await exportModule.exportToExcel(filteredEvents, filename); break
        case 'csv': exportModule.exportToCSV(filteredEvents, filename); break
        case 'pdf': exportModule.exportToPDF(filteredEvents, filename); break
        case 'word': exportModule.exportToWord(filteredEvents, filename); break
      }
    }
    setShowExportMenu(false)
  }

  const handlePrint = () => {
    window.print()
  }

  // Navigation
  const goToToday = () => setCurrentDate(new Date())
  const goNext = () => {
    if (view === 'week' || view === 'rooms') setCurrentDate(d => addWeeks(d, 1))
    else if (view === 'month') setCurrentDate(d => addMonths(d, 1))
    else setCurrentDate(d => addDays(d, 1))
  }
  const goPrev = () => {
    if (view === 'week' || view === 'rooms') setCurrentDate(d => subWeeks(d, 1))
    else if (view === 'month') setCurrentDate(d => subMonths(d, 1))
    else setCurrentDate(d => subDays(d, 1))
  }

  // Listen for sidebar mini-calendar date selection
  useEffect(() => {
    // Check if a date was set before mount (e.g. navigating from another page)
    const stored = sessionStorage.getItem('planning-target-date')
    if (stored) {
      sessionStorage.removeItem('planning-target-date')
      setCurrentDate(new Date(stored))
      setView('day')
    }

    const handler = (e: Event) => {
      const date = (e as CustomEvent<Date>).detail
      setCurrentDate(date)
      setView('day')
    }
    window.addEventListener(SIDEBAR_DATE_EVENT, handler)
    return () => window.removeEventListener(SIDEBAR_DATE_EVENT, handler)
  }, [])

  // Notify sidebar when currentDate changes (for sync)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('calendar-date-change', { detail: currentDate }))
  }, [currentDate])

  // Create event from calendar click
  const handleSlotClick = (date: Date, hour: number | null) => {
    if (isReadOnly) return
    setCreateDate(date)
    setCreateHour(hour)
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: {
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
    } catch {
      // Error handled by hook toast
    }
  }

  // Drag & drop handler — ouvre la modale de confirmation au lieu de sauvegarder directement
  const handleEventUpdate = (eventId: string, newStart: string, newEnd: string) => {
    if (isReadOnly) return
    const event = filteredEvents.find(e => e.id === eventId)
    if (!event) return
    setPendingMove({ eventId, event, newStart, newEnd })
  }

  // Validation : fin > début
  const moveTimeError = moveStartTime && moveEndTime && moveEndTime <= moveStartTime
    ? 'L\'heure de fin doit être après l\'heure de début'
    : ''

  // Confirmation du déplacement après validation modale
  const confirmMove = async () => {
    if (!pendingMove || !moveDate || !moveStartTime || !moveEndTime || moveTimeError) return
    const startDateTime = `${moveDate}T${moveStartTime}:00`
    const endDateTime = `${moveDate}T${moveEndTime}:00`
    const updateData: { id: string; startDateTime: string; endDateTime: string; roomId?: string } = {
      id: pendingMove.eventId,
      startDateTime,
      endDateTime,
    }
    if (moveRoomId && moveRoomId !== pendingMove.event.roomId) {
      updateData.roomId = moveRoomId
    }
    try {
      await updateBooking(updateData)
    } catch {
      // Erreur gérée par le toast du hook (conflit inclus)
    }
    setPendingMove(null)
  }

  const headerLabel = useMemo(() => {
    if (view === 'week' || view === 'rooms') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`
    }
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: fr })
    return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
  }, [currentDate, view])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement du calendrier..." />
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
      {/* Print header - visible only when printing */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Calendrier - Planning</h1>
        <p className="text-neutral-600 capitalize">{headerLabel}</p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Calendrier</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 capitalize">{headerLabel}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goPrev}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
          <Button variant="secondary" size="sm" onClick={goNext}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {(['day', 'week', 'month', ...(!isReadOnly ? ['rooms'] : [])] as ViewMode[]).map(v => (
              <button
                key={v}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v ? 'bg-primary-600 text-white' : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                onClick={() => setView(v)}
              >
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Salles'}
              </button>
            ))}
          </div>

          <button
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtres
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Print button */}
          <button
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            onClick={handlePrint}
            title="Imprimer"
          >
            <Printer size={16} />
            Imprimer
          </button>

          {/* Teacher toggle: Mes cours / Tout le centre (pas pour étudiants) */}
          {isTeacher && (
            <button
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                showOnlyMine
                  ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
              onClick={() => setShowOnlyMine(v => !v)}
            >
              {showOnlyMine ? 'Mes cours' : 'Tout le centre'}
            </button>
          )}

          {/* Batch create button — admin uniquement */}
          {user?.role === 'admin' && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
              onClick={() => setShowBatchModal(true)}
            >
              <Repeat size={16} />
              Saisie en lot
            </button>
          )}

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download size={16} />
              Export
              <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 z-50 mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Grille semaine</div>
                {([
                  { fmt: 'excel' as ExportFormat, label: 'Excel', ext: '.xlsx' },
                  { fmt: 'pdf' as ExportFormat, label: 'PDF', ext: '.pdf' },
                  { fmt: 'word' as ExportFormat, label: 'Word', ext: '.doc' },
                  { fmt: 'csv' as ExportFormat, label: 'CSV', ext: '.csv' },
                ]).map(({ fmt, label, ext }) => (
                  <button
                    key={`cal-${fmt}`}
                    className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-700 transition-colors flex items-center justify-between"
                    onClick={() => handleExport(fmt, 'calendar')}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] text-neutral-400">{ext}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Liste</div>
                {([
                  { fmt: 'excel' as ExportFormat, label: 'Excel', ext: '.xlsx' },
                  { fmt: 'pdf' as ExportFormat, label: 'PDF', ext: '.pdf' },
                  { fmt: 'word' as ExportFormat, label: 'Word', ext: '.doc' },
                  { fmt: 'csv' as ExportFormat, label: 'CSV', ext: '.csv' },
                ]).map(({ fmt, label, ext }) => (
                  <button
                    key={`list-${fmt}`}
                    className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-700 transition-colors flex items-center justify-between"
                    onClick={() => handleExport(fmt, 'list')}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] text-neutral-400">{ext}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 mb-4 no-print">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Filtres avancés</h3>
            {activeFilterCount > 0 && (
              <button
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                onClick={resetFilters}
              >
                <X size={12} />
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Select
                label="Salle"
                options={[{ value: '', label: 'Toutes les salles' }, ...roomOptions]}
                value={roomFilter}
                onChange={e => setRoomFilter(e.target.value)}
              />
            </div>
            <MultiSelect
              label="Professeur"
              options={teacherOptions}
              value={selectedTeachers}
              onChange={setSelectedTeachers}
              placeholder="Tous les professeurs"
            />
            <MultiSelect
              label="Matière"
              options={allSubjectOptions}
              value={selectedMatieres}
              onChange={setSelectedMatieres}
              placeholder="Toutes les matières"
            />
            <MultiSelect
              label="Diplôme"
              options={allDiplomaOptions}
              value={selectedDiplomes}
              onChange={setSelectedDiplomes}
              placeholder="Tous les diplômes"
            />
            <MultiSelect
              label="Classe"
              options={allClassOptions}
              value={selectedNiveaux}
              onChange={setSelectedNiveaux}
              placeholder="Toutes les classes"
            />
          </div>
        </div>
      )}

      {/* F2 - Color Legend */}
      <ColorLegend activeTypes={activeTypes} onToggleType={handleToggleType} />

      {/* Calendar Views */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden print-calendar">
        <Suspense fallback={<div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={setSelectedEvent}
              onSlotClick={handleSlotClick}
              onEventUpdate={handleEventUpdate}
            />
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={setSelectedEvent}
              onDayClick={(day) => handleSlotClick(day, null)}
              totalRooms={totalRooms}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={setSelectedEvent}
              onSlotClick={handleSlotClick}
              onEventUpdate={handleEventUpdate}
            />
          )}
        </Suspense>
        {view === 'rooms' && (
          <RoomsView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={setSelectedEvent}
            buildings={isDemoMode
              ? mockBuildingRooms.map(b => ({
                  ...b,
                  rooms: b.rooms.map(r => ({ id: r.name, name: r.name, capacity: r.capacity })),
                }))
              : buildingsWithRooms
            }
          />
        )}
      </div>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Détail de la séance"
        size="sm"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{selectedEvent.title}</h3>
              {selectedEvent.recurrence && (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                  <Repeat size={12} />
                  {recurrenceLabels[selectedEvent.recurrence.frequency] || selectedEvent.recurrence.frequency}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Salle</label>
                <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.roomName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Type</label>
                <p className="text-neutral-900 dark:text-neutral-100">{bookingTypeLabels[selectedEvent.type || ''] || selectedEvent.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Horaire</label>
                <p className="text-neutral-900 dark:text-neutral-100">
                  {selectedEvent.start && selectedEvent.end
                    ? formatTimeRange(selectedEvent.start as string, selectedEvent.end as string)
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Date</label>
                <p className="text-neutral-900 dark:text-neutral-100">
                  {selectedEvent.start
                    ? format(typeof selectedEvent.start === 'string' ? parseISO(selectedEvent.start) : selectedEvent.start, 'dd/MM/yyyy', { locale: fr })
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Statut</label>
                <div className="mt-1">
                  <Badge variant={statusBadgeVariant[selectedEvent.status || ''] || 'neutral'} size="sm">
                    {statusLabels[selectedEvent.status || ''] || selectedEvent.status}
                  </Badge>
                </div>
              </div>
              {(selectedEvent.teacher || selectedEvent.userName) && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Professeur</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.teacher || selectedEvent.userName}</p>
                </div>
              )}
              {selectedEvent.matiere && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Matière</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.matiere}</p>
                </div>
              )}
              {selectedEvent.diplome && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Diplôme</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.diplome}</p>
                </div>
              )}
              {selectedEvent.niveau && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Classe</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.niveau}</p>
                </div>
              )}
              {selectedEvent.sessionType && selectedEvent.sessionType !== 'in_person' && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Mode</label>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {selectedEvent.sessionType === 'online' ? 'En ligne' : 'Hybride'}
                  </p>
                </div>
              )}
            </div>
            {selectedEvent.meetingUrl && (
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Lien visio</label>
                <a
                  href={selectedEvent.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-1 text-sm font-medium"
                >
                  <Video size={16} />
                  Rejoindre la visio
                </a>
              </div>
            )}
            {selectedEvent.description && (
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Description</label>
                <p className="text-neutral-700 dark:text-neutral-300 mt-1">{selectedEvent.description}</p>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Fermer</Button>
        </ModalFooter>
      </Modal>

      {/* F5 - Create Booking Modal */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        prefilledDate={createDate}
        prefilledHour={createHour}
        rooms={roomOptions}
        virtualRooms={virtualRoomOptions}
        diplomaOptions={diplomaOptions}
        classOptionsByDiploma={classOptionsByDiploma}
        subjectOptionsByClass={subjectOptionsByClass}
        getClassById={getClassById}
      />

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
            getClassById={getClassById}
          />
        </Suspense>
      )}

      {/* Move Confirmation Modal */}
      <Modal
        isOpen={!!pendingMove}
        onClose={() => setPendingMove(null)}
        title="Déplacer la séance"
        size="sm"
      >
        {pendingMove && (() => {
          const oldStart = typeof pendingMove.event.start === 'string' ? parseISO(pendingMove.event.start) : pendingMove.event.start
          const oldRoomName = pendingMove.event.roomName || roomOptions.find(r => r.value === pendingMove.event.roomId)?.label || '—'
          return (
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">{pendingMove.event.title}</p>

              {/* Ancien créneau (lecture seule) */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                <p className="font-medium mb-0.5">Séance d'origine :</p>
                <p>{format(oldStart, 'EEEE d MMM', { locale: fr })}</p>
                <p>{formatTimeRange(pendingMove.event.start as string, pendingMove.event.end as string)} · {oldRoomName}</p>
              </div>

              {/* Formulaire éditable */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={moveDate}
                    onChange={e => setMoveDate(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Début</label>
                    <input
                      type="time"
                      value={moveStartTime}
                      onChange={e => setMoveStartTime(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Fin</label>
                    <input
                      type="time"
                      value={moveEndTime}
                      onChange={e => setMoveEndTime(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                {moveTimeError && (
                  <p className="text-sm text-error-600 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    {moveTimeError}
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Salle</label>
                  <Select
                    value={moveRoomId}
                    onChange={e => setMoveRoomId(e.target.value)}
                    options={roomOptions}
                    placeholder="Sélectionner une salle"
                  />
                </div>
              </div>
            </div>
          )
        })()}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setPendingMove(null)}>Annuler</Button>
          <Button onClick={confirmMove} disabled={!moveDate || !moveStartTime || !moveEndTime || !!moveTimeError}>
            Confirmer le déplacement
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default CalendarPage
