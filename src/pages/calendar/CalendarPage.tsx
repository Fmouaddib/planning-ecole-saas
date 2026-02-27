import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isSameDay,
  isSameMonth,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
  isToday,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { Button, Select, Modal, ModalFooter, Badge, LoadingSpinner, MultiSelect } from '@/components/ui'
import { formatTimeRange } from '@/utils/helpers'
import { MATIERES, DIPLOMES, NIVEAUX } from '@/utils/constants'
import { exportToExcel, exportToCSV, exportToPDF, exportToWord } from '@/utils/export'
import { mockCalendarData } from '@/data/mock-calendar-data'
import { ColorLegend } from './ColorLegend'
import { MiniCalendar } from './MiniCalendar'
import { CreateBookingModal } from './CreateBookingModal'
import type { CalendarEvent, ExportFormat, BookingType } from '@/types'
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
} from 'lucide-react'

type ViewMode = 'week' | 'month' | 'day'

const HOUR_START = 8
const HOUR_END = 20
const HOUR_HEIGHT = 60 // px per hour

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

// ==================== OVERLAP ALGORITHM ====================

interface OverlapColumn {
  event: CalendarEvent
  column: number
  totalColumns: number
}

function computeOverlapLayout(events: CalendarEvent[]): Map<string, OverlapColumn> {
  const result = new Map<string, OverlapColumn>()
  if (events.length === 0) return result

  const sorted = [...events].sort((a, b) => {
    const aStart = typeof a.start === 'string' ? parseISO(a.start) : a.start
    const bStart = typeof b.start === 'string' ? parseISO(b.start) : b.start
    return aStart.getTime() - bStart.getTime()
  })

  // Group overlapping events
  const groups: CalendarEvent[][] = []
  let currentGroup: CalendarEvent[] = []
  let groupEnd = 0

  for (const event of sorted) {
    const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
    const end = typeof event.end === 'string' ? parseISO(event.end) : event.end

    if (currentGroup.length === 0 || start.getTime() < groupEnd) {
      currentGroup.push(event)
      groupEnd = Math.max(groupEnd, end.getTime())
    } else {
      groups.push(currentGroup)
      currentGroup = [event]
      groupEnd = end.getTime()
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  // Assign columns within each group
  for (const group of groups) {
    const columns: { end: number }[] = []

    for (const event of group) {
      const eStart = typeof event.start === 'string' ? parseISO(event.start) : event.start
      const eEnd = typeof event.end === 'string' ? parseISO(event.end) : event.end

      let placed = false
      for (let c = 0; c < columns.length; c++) {
        if (eStart.getTime() >= columns[c].end) {
          columns[c].end = eEnd.getTime()
          result.set(event.id, { event, column: c, totalColumns: 0 })
          placed = true
          break
        }
      }
      if (!placed) {
        result.set(event.id, { event, column: columns.length, totalColumns: 0 })
        columns.push({ end: eEnd.getTime() })
      }
    }

    const totalCols = columns.length
    for (const event of group) {
      const entry = result.get(event.id)
      if (entry) entry.totalColumns = totalCols
    }
  }

  return result
}

// Detect room conflicts (same room, overlapping time)
function detectRoomConflicts(events: CalendarEvent[]): Set<string> {
  const conflicts = new Set<string>()
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]
      const b = events[j]
      if (!a.roomId || !b.roomId || a.roomId !== b.roomId) continue
      const aStart = (typeof a.start === 'string' ? parseISO(a.start) : a.start).getTime()
      const aEnd = (typeof a.end === 'string' ? parseISO(a.end) : a.end).getTime()
      const bStart = (typeof b.start === 'string' ? parseISO(b.start) : b.start).getTime()
      const bEnd = (typeof b.end === 'string' ? parseISO(b.end) : b.end).getTime()
      if (aStart < bEnd && bStart < aEnd) {
        conflicts.add(a.id)
        conflicts.add(b.id)
      }
    }
  }
  return conflicts
}

// ==================== DRAG & DROP STATE ====================

interface DragState {
  eventId: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  originTop: number
  originHeight: number
  originDayIndex: number
  currentTop: number
  currentHeight: number
  currentDayIndex: number
  active: boolean
}

// ==================== MAIN COMPONENT ====================

function CalendarPage() {
  const { calendarEvents, isLoading, error, refreshBookings, createBooking, updateBooking } = useBookings()
  const { rooms } = useRooms()
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

  // Mini-calendar state
  const [miniMonth, setMiniMonth] = useState(new Date())

  // Create booking modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [createHour, setCreateHour] = useState<number | null>(null)

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
    () => (calendarEvents.length > 0 ? calendarEvents : mockCalendarData),
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
  }, [allEvents, roomFilter, selectedMatieres, selectedDiplomes, selectedNiveaux, selectedTeachers, activeTypes])

  const handleToggleType = (type: string) => {
    setActiveTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    )
  }

  const handleExport = (fmt: ExportFormat) => {
    const filename = `planning-${format(currentDate, 'yyyy-MM-dd')}`
    switch (fmt) {
      case 'excel': exportToExcel(filteredEvents, filename); break
      case 'csv': exportToCSV(filteredEvents, filename); break
      case 'pdf': exportToPDF(filteredEvents, filename); break
      case 'word': exportToWord(filteredEvents, filename); break
    }
    setShowExportMenu(false)
  }

  const handlePrint = () => {
    window.print()
  }

  // Navigation
  const goToToday = () => setCurrentDate(new Date())
  const goNext = () => {
    if (view === 'week') setCurrentDate(d => addWeeks(d, 1))
    else if (view === 'month') setCurrentDate(d => addMonths(d, 1))
    else setCurrentDate(d => addDays(d, 1))
  }
  const goPrev = () => {
    if (view === 'week') setCurrentDate(d => subWeeks(d, 1))
    else if (view === 'month') setCurrentDate(d => subMonths(d, 1))
    else setCurrentDate(d => subDays(d, 1))
  }

  // Mini-calendar: select date -> go to day view
  const handleMiniCalendarSelect = (date: Date) => {
    setCurrentDate(date)
    setView('day')
  }

  // Create event from calendar click
  const handleSlotClick = (date: Date, hour: number | null) => {
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
  }) => {
    try {
      await createBooking({
        title: data.title,
        roomId: data.roomId,
        bookingType: data.type,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        description: data.description,
      })
    } catch {
      // Error handled by hook toast
    }
  }

  // Drag & drop handler for event move/resize
  const handleEventUpdate = async (eventId: string, newStart: string, newEnd: string) => {
    try {
      await updateBooking({
        id: eventId,
        startDateTime: newStart,
        endDateTime: newEnd,
      })
    } catch {
      // Error handled by hook toast
    }
  }

  const headerLabel = useMemo(() => {
    if (view === 'week') {
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
          <h1 className="text-2xl font-bold text-neutral-900">Calendrier</h1>
          <p className="text-neutral-500 mt-1 capitalize">{headerLabel}</p>
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
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button
                key={v}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
                onClick={() => setView(v)}
              >
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>

          <button
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
            onClick={handlePrint}
            title="Imprimer"
          >
            <Printer size={16} />
            Imprimer
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download size={16} />
              Export
              <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 z-50 mt-1 w-44 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
                {([
                  { fmt: 'excel' as ExportFormat, label: 'Excel (.xlsx)', icon: '📊' },
                  { fmt: 'csv' as ExportFormat, label: 'CSV (.csv)', icon: '📄' },
                  { fmt: 'pdf' as ExportFormat, label: 'PDF (.pdf)', icon: '📕' },
                  { fmt: 'word' as ExportFormat, label: 'Word (.doc)', icon: '📝' },
                ]).map(({ fmt, label, icon }) => (
                  <button
                    key={fmt}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-2"
                    onClick={() => handleExport(fmt)}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-4 mb-4 no-print">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-700">Filtres avancés</h3>
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
              options={MATIERES}
              value={selectedMatieres}
              onChange={setSelectedMatieres}
              placeholder="Toutes les matières"
            />
            <MultiSelect
              label="Diplôme"
              options={DIPLOMES}
              value={selectedDiplomes}
              onChange={setSelectedDiplomes}
              placeholder="Tous les diplômes"
            />
            <MultiSelect
              label="Niveau"
              options={NIVEAUX}
              value={selectedNiveaux}
              onChange={setSelectedNiveaux}
              placeholder="Tous les niveaux"
            />
          </div>
        </div>
      )}

      {/* F2 - Color Legend */}
      <ColorLegend activeTypes={activeTypes} onToggleType={handleToggleType} />

      {/* Main layout: MiniCalendar + Calendar */}
      <div className="flex gap-4">
        {/* F6 - Mini Calendar (desktop only) */}
        <MiniCalendar
          selectedDate={currentDate}
          onSelectDate={handleMiniCalendarSelect}
          events={filteredEvents}
          miniMonth={miniMonth}
          onMiniMonthChange={setMiniMonth}
        />

        {/* Calendar Views */}
        <div className="flex-1 bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden print-calendar">
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
        </div>
      </div>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Détail de la réservation"
        size="sm"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900">{selectedEvent.title}</h3>
              {selectedEvent.recurrence && (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                  <Repeat size={12} />
                  {recurrenceLabels[selectedEvent.recurrence.frequency] || selectedEvent.recurrence.frequency}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-500">Salle</label>
                <p className="text-neutral-900">{selectedEvent.roomName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">Type</label>
                <p className="text-neutral-900">{bookingTypeLabels[selectedEvent.type || ''] || selectedEvent.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">Horaire</label>
                <p className="text-neutral-900">
                  {selectedEvent.start && selectedEvent.end
                    ? formatTimeRange(selectedEvent.start as string, selectedEvent.end as string)
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">Date</label>
                <p className="text-neutral-900">
                  {selectedEvent.start
                    ? format(typeof selectedEvent.start === 'string' ? parseISO(selectedEvent.start) : selectedEvent.start, 'dd/MM/yyyy', { locale: fr })
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500">Statut</label>
                <div className="mt-1">
                  <Badge variant={statusBadgeVariant[selectedEvent.status || ''] || 'neutral'} size="sm">
                    {statusLabels[selectedEvent.status || ''] || selectedEvent.status}
                  </Badge>
                </div>
              </div>
              {(selectedEvent.teacher || selectedEvent.userName) && (
                <div>
                  <label className="text-sm font-medium text-neutral-500">Professeur</label>
                  <p className="text-neutral-900">{selectedEvent.teacher || selectedEvent.userName}</p>
                </div>
              )}
              {selectedEvent.matiere && (
                <div>
                  <label className="text-sm font-medium text-neutral-500">Matière</label>
                  <p className="text-neutral-900">{MATIERES.find(m => m.value === selectedEvent.matiere)?.label || selectedEvent.matiere}</p>
                </div>
              )}
              {selectedEvent.diplome && (
                <div>
                  <label className="text-sm font-medium text-neutral-500">Diplôme</label>
                  <p className="text-neutral-900">{DIPLOMES.find(d => d.value === selectedEvent.diplome)?.label || selectedEvent.diplome}</p>
                </div>
              )}
              {selectedEvent.niveau && (
                <div>
                  <label className="text-sm font-medium text-neutral-500">Niveau</label>
                  <p className="text-neutral-900">{NIVEAUX.find(n => n.value === selectedEvent.niveau)?.label || selectedEvent.niveau}</p>
                </div>
              )}
            </div>
            {selectedEvent.description && (
              <div>
                <label className="text-sm font-medium text-neutral-500">Description</label>
                <p className="text-neutral-700 mt-1">{selectedEvent.description}</p>
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
      />
    </div>
  )
}

// ==================== WEEK VIEW ====================

function WeekView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onEventUpdate,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
  onEventUpdate: (eventId: string, newStart: string, newEnd: string) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  }).slice(0, 5)

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  const getEventsForDay = (day: Date) =>
    events.filter(e => {
      const eventDate = typeof e.start === 'string' ? parseISO(e.start) : e.start
      return isSameDay(eventDate, day)
    })

  const roomConflicts = useMemo(() => detectRoomConflicts(events), [events])

  // Drag & drop state
  const [drag, setDrag] = useState<DragState | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragThreshold = 5

  const getEventPosition = (event: CalendarEvent) => {
    const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
    const end = typeof event.end === 'string' ? parseISO(event.end) : event.end
    const startH = getHours(start) + getMinutes(start) / 60
    const duration = differenceInMinutes(end, start) / 60
    const top = (startH - HOUR_START) * HOUR_HEIGHT
    const height = Math.max(duration * HOUR_HEIGHT, 20)
    return { top, height }
  }

  // Snap to 15 minutes
  const snapToGrid = (px: number) => {
    const quarterHourPx = HOUR_HEIGHT / 4
    return Math.round(px / quarterHourPx) * quarterHourPx
  }

  const pxToTime = (px: number) => {
    const totalMinutes = (px / HOUR_HEIGHT) * 60 + HOUR_START * 60
    const h = Math.floor(totalMinutes / 60)
    const m = Math.round(totalMinutes % 60)
    return { h: Math.max(HOUR_START, Math.min(h, HOUR_END)), m: Math.min(m, 59) }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, event: CalendarEvent, mode: 'move' | 'resize', dayIndex: number) => {
      // Check pointer: fine only (no touch)
      if (window.matchMedia('(pointer: coarse)').matches) return

      e.preventDefault()
      e.stopPropagation()

      const { top, height } = getEventPosition(event)

      setDrag({
        eventId: event.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        originTop: top,
        originHeight: height,
        originDayIndex: dayIndex,
        currentTop: top,
        currentHeight: height,
        currentDayIndex: dayIndex,
        active: false,
      })
    },
    [],
  )

  useEffect(() => {
    if (!drag) return

    const handleMove = (e: PointerEvent) => {
      setDrag(prev => {
        if (!prev) return null
        const dx = e.clientX - prev.startX
        const dy = e.clientY - prev.startY

        if (!prev.active && Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) {
          return prev
        }

        if (prev.mode === 'move') {
          const newTop = snapToGrid(prev.originTop + dy)
          // Determine day column from X position
          let newDayIndex = prev.originDayIndex
          if (gridRef.current) {
            const rect = gridRef.current.getBoundingClientRect()
            const hourColWidth = 60
            const dayWidth = (rect.width - hourColWidth) / 5
            const relX = e.clientX - rect.left - hourColWidth
            newDayIndex = Math.max(0, Math.min(4, Math.floor(relX / dayWidth)))
          }
          return {
            ...prev,
            active: true,
            currentTop: Math.max(0, Math.min(newTop, (HOUR_END - HOUR_START) * HOUR_HEIGHT - prev.originHeight)),
            currentDayIndex: newDayIndex,
          }
        } else {
          // resize
          const newHeight = snapToGrid(Math.max(HOUR_HEIGHT / 4, prev.originHeight + dy))
          return {
            ...prev,
            active: true,
            currentHeight: newHeight,
          }
        }
      })
    }

    const handleUp = () => {
      if (drag?.active) {
        const event = events.find(ev => ev.id === drag.eventId)
        if (event) {
          const day = days[drag.currentDayIndex]
          const { h: startH, m: startM } = pxToTime(drag.currentTop)
          const durationMin = (drag.currentHeight / HOUR_HEIGHT) * 60

          const newStart = new Date(day)
          newStart.setHours(startH, startM, 0, 0)
          const newEnd = new Date(newStart.getTime() + durationMin * 60000)

          onEventUpdate(event.id, newStart.toISOString(), newEnd.toISOString())
        }
      }
      setDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [drag, events, days, onEventUpdate])

  return (
    <div className="overflow-auto" ref={gridRef}>
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-neutral-200 sticky top-0 bg-white z-10">
        <div className="p-2" />
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-l border-neutral-200 ${
              isToday(day) ? 'bg-primary-50' : ''
            }`}
          >
            <div className="text-xs text-neutral-500 uppercase">
              {format(day, 'EEE', { locale: fr })}
            </div>
            <div className={`text-lg font-semibold ${
              isToday(day) ? 'text-primary-600' : 'text-neutral-900'
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(5,1fr)]">
        {/* Hours column */}
        <div>
          {hours.map(hour => (
            <div key={hour} className="border-b border-neutral-100 text-right pr-2 text-xs text-neutral-400" style={{ height: `${HOUR_HEIGHT}px` }}>
              <span className="relative -top-2">{`${hour}:00`}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          const dayEvents = getEventsForDay(day)
          const overlapLayout = computeOverlapLayout(dayEvents)

          return (
            <div key={day.toISOString()} className="relative border-l border-neutral-200">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="border-b border-neutral-100 hover:bg-primary-50/30 transition-colors cursor-pointer"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  onClick={() => onSlotClick(day, hour)}
                />
              ))}
              {/* Events */}
              {dayEvents.map(event => {
                const { top, height } = getEventPosition(event)
                const overlap = overlapLayout.get(event.id)
                const col = overlap?.column || 0
                const totalCols = overlap?.totalColumns || 1
                const widthPct = 100 / totalCols
                const leftPct = col * widthPct

                const isDragging = drag?.active && drag.eventId === event.id

                const eventStyle: React.CSSProperties = isDragging
                  ? {
                      top: `${drag!.currentTop}px`,
                      height: `${drag!.currentHeight}px`,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      opacity: 0.7,
                      border: '2px dashed white',
                      zIndex: 20,
                      // If moved to different day, hide from original
                      display: drag!.currentDayIndex !== dayIndex ? 'none' : undefined,
                    }
                  : {
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }

                const isConflict = roomConflicts.has(event.id)

                return (
                  <div
                    key={event.id}
                    className="absolute"
                    style={eventStyle}
                  >
                    <div
                      className={`h-full rounded-md px-1.5 py-0.5 text-xs text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity text-left relative ${
                        isConflict ? 'ring-2 ring-red-500 ring-offset-1' : ''
                      }`}
                      style={{
                        backgroundColor: event.color || '#3b82f6',
                        backgroundImage: isConflict
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)'
                          : undefined,
                      }}
                      onClick={(e) => {
                        if (!drag?.active) {
                          e.stopPropagation()
                          onEventClick(event)
                        }
                      }}
                      onPointerDown={(e) => handlePointerDown(e, event, 'move', dayIndex)}
                      title={
                        isConflict
                          ? `⚠ Conflit de salle : ${event.roomName}`
                          : `${event.title} - ${event.roomName}`
                      }
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-medium truncate">{event.title}</span>
                        {event.recurrence && <Repeat size={10} className="flex-shrink-0 opacity-80" />}
                        {isConflict && <AlertTriangle size={10} className="flex-shrink-0 text-yellow-200" />}
                      </div>
                      <div className="opacity-80 truncate">{event.roomName}</div>
                      {/* Resize handle */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20"
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          handlePointerDown(e, event, 'resize', dayIndex)
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              {/* Ghost element for drag to different day */}
              {drag?.active && drag.currentDayIndex === dayIndex && !dayEvents.find(e => e.id === drag.eventId) && (
                <div
                  className="absolute left-0.5 right-0.5 rounded-md border-2 border-dashed border-primary-400 bg-primary-100/30 z-20 pointer-events-none"
                  style={{
                    top: `${drag.currentTop}px`,
                    height: `${drag.currentHeight}px`,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== MONTH VIEW ====================

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onDayClick: (day: Date) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const getEventsForDay = (day: Date) =>
    events.filter(e => {
      const eventDate = typeof e.start === 'string' ? parseISO(e.start) : e.start
      return isSameDay(eventDate, day)
    })

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div>
      {/* Day names header */}
      <div className="grid grid-cols-7 border-b border-neutral-200">
        {dayNames.map(name => (
          <div key={name} className="p-2 text-center text-xs font-semibold text-neutral-500 uppercase">
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {allDays.map(day => {
          const dayEvents = getEventsForDay(day)
          const inCurrentMonth = isSameMonth(day, currentDate)

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] border-b border-r border-neutral-100 p-1 cursor-pointer hover:bg-primary-50/30 transition-colors ${
                !inCurrentMonth ? 'bg-neutral-50' : ''
              } ${isToday(day) ? 'bg-primary-50' : ''}`}
              onClick={() => onDayClick(day)}
            >
              <div className={`text-sm font-medium mb-1 ${
                !inCurrentMonth ? 'text-neutral-300' : isToday(day) ? 'text-primary-600' : 'text-neutral-700'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <button
                    key={event.id}
                    className="w-full text-left text-xs rounded px-1 py-0.5 text-white truncate hover:opacity-90 transition-opacity flex items-center gap-0.5"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                  >
                    <span className="truncate">{event.title}</span>
                    {event.recurrence && <Repeat size={8} className="flex-shrink-0 opacity-80" />}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-neutral-400 px-1">
                    +{dayEvents.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== DAY VIEW ====================

function DayView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onEventUpdate,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
  onEventUpdate: (eventId: string, newStart: string, newEnd: string) => void
}) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  const dayEvents = events.filter(e => {
    const eventDate = typeof e.start === 'string' ? parseISO(e.start) : e.start
    return isSameDay(eventDate, currentDate)
  })

  const overlapLayout = useMemo(() => computeOverlapLayout(dayEvents), [dayEvents])
  const roomConflicts = useMemo(() => detectRoomConflicts(dayEvents), [dayEvents])

  // Drag state
  const [drag, setDrag] = useState<DragState | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const getEventPosition = (event: CalendarEvent) => {
    const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
    const end = typeof event.end === 'string' ? parseISO(event.end) : event.end
    const startH = getHours(start) + getMinutes(start) / 60
    const duration = differenceInMinutes(end, start) / 60
    const top = (startH - HOUR_START) * HOUR_HEIGHT
    const height = Math.max(duration * HOUR_HEIGHT, 20)
    return { top, height }
  }

  const snapToGrid = (px: number) => {
    const quarterHourPx = HOUR_HEIGHT / 4
    return Math.round(px / quarterHourPx) * quarterHourPx
  }

  const pxToTime = (px: number) => {
    const totalMinutes = (px / HOUR_HEIGHT) * 60 + HOUR_START * 60
    const h = Math.floor(totalMinutes / 60)
    const m = Math.round(totalMinutes % 60)
    return { h: Math.max(HOUR_START, Math.min(h, HOUR_END)), m: Math.min(m, 59) }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, event: CalendarEvent, mode: 'move' | 'resize') => {
      if (window.matchMedia('(pointer: coarse)').matches) return
      e.preventDefault()
      e.stopPropagation()
      const { top, height } = getEventPosition(event)
      setDrag({
        eventId: event.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        originTop: top,
        originHeight: height,
        originDayIndex: 0,
        currentTop: top,
        currentHeight: height,
        currentDayIndex: 0,
        active: false,
      })
    },
    [],
  )

  useEffect(() => {
    if (!drag) return

    const handleMove = (e: PointerEvent) => {
      setDrag(prev => {
        if (!prev) return null
        const dy = e.clientY - prev.startY
        const dx = e.clientX - prev.startX
        if (!prev.active && Math.abs(dx) < 5 && Math.abs(dy) < 5) return prev

        if (prev.mode === 'move') {
          const newTop = snapToGrid(prev.originTop + dy)
          return {
            ...prev,
            active: true,
            currentTop: Math.max(0, Math.min(newTop, (HOUR_END - HOUR_START) * HOUR_HEIGHT - prev.originHeight)),
          }
        } else {
          const newHeight = snapToGrid(Math.max(HOUR_HEIGHT / 4, prev.originHeight + dy))
          return { ...prev, active: true, currentHeight: newHeight }
        }
      })
    }

    const handleUp = () => {
      if (drag?.active) {
        const event = dayEvents.find(ev => ev.id === drag.eventId)
        if (event) {
          const { h: startH, m: startM } = pxToTime(drag.currentTop)
          const durationMin = (drag.currentHeight / HOUR_HEIGHT) * 60
          const newStart = new Date(currentDate)
          newStart.setHours(startH, startM, 0, 0)
          const newEnd = new Date(newStart.getTime() + durationMin * 60000)
          onEventUpdate(event.id, newStart.toISOString(), newEnd.toISOString())
        }
      }
      setDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [drag, dayEvents, currentDate, onEventUpdate])

  return (
    <div className="overflow-auto" ref={gridRef}>
      <div className="grid grid-cols-[60px_1fr]">
        {/* Hours */}
        <div>
          {hours.map(hour => (
            <div key={hour} className="border-b border-neutral-100 text-right pr-2 text-xs text-neutral-400" style={{ height: `${HOUR_HEIGHT}px` }}>
              <span className="relative -top-2">{`${hour}:00`}</span>
            </div>
          ))}
        </div>

        {/* Events */}
        <div className="relative border-l border-neutral-200">
          {hours.map(hour => (
            <div
              key={hour}
              className="border-b border-neutral-100 hover:bg-primary-50/30 transition-colors cursor-pointer"
              style={{ height: `${HOUR_HEIGHT}px` }}
              onClick={() => onSlotClick(currentDate, hour)}
            />
          ))}
          {dayEvents.map(event => {
            const { top, height } = getEventPosition(event)
            const overlap = overlapLayout.get(event.id)
            const col = overlap?.column || 0
            const totalCols = overlap?.totalColumns || 1
            const widthPct = 100 / totalCols
            const leftPct = col * widthPct
            const isConflict = roomConflicts.has(event.id)
            const isDragging = drag?.active && drag.eventId === event.id

            const eventStyle: React.CSSProperties = isDragging
              ? {
                  top: `${drag!.currentTop}px`,
                  height: `${drag!.currentHeight}px`,
                  left: `calc(${leftPct}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                  opacity: 0.7,
                  border: '2px dashed white',
                  zIndex: 20,
                }
              : {
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `calc(${leftPct}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                }

            return (
              <div key={event.id} className="absolute" style={eventStyle}>
                <div
                  className={`h-full rounded-md px-2 py-1 text-sm text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity text-left relative ${
                    isConflict ? 'ring-2 ring-red-500 ring-offset-1' : ''
                  }`}
                  style={{
                    backgroundColor: event.color || '#3b82f6',
                    backgroundImage: isConflict
                      ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)'
                      : undefined,
                  }}
                  onClick={(e) => {
                    if (!drag?.active) {
                      e.stopPropagation()
                      onEventClick(event)
                    }
                  }}
                  onPointerDown={(e) => handlePointerDown(e, event, 'move')}
                  title={
                    isConflict
                      ? `⚠ Conflit de salle : ${event.roomName}`
                      : `${event.title} - ${event.roomName}`
                  }
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{event.title}</span>
                    {event.recurrence && <Repeat size={12} className="flex-shrink-0 opacity-80" />}
                    {isConflict && <AlertTriangle size={12} className="flex-shrink-0 text-yellow-200" />}
                  </div>
                  <div className="opacity-80 truncate">{event.roomName}</div>
                  {/* Resize handle */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      handlePointerDown(e, event, 'resize')
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CalendarPage
