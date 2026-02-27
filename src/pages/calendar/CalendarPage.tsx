import { useState, useMemo } from 'react'
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
import { Button, Select, Modal, ModalFooter, Badge, LoadingSpinner } from '@/components/ui'
import { formatTimeRange } from '@/utils/helpers'
import type { CalendarEvent } from '@/types'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

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

function CalendarPage() {
  const { calendarEvents, isLoading, error, refreshBookings } = useBookings()
  const { rooms } = useRooms()
  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [roomFilter, setRoomFilter] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const roomOptions = rooms.map(r => ({ value: r.id, label: r.name }))

  const filteredEvents = useMemo(() => {
    if (!roomFilter) return calendarEvents
    return calendarEvents.filter(e => e.roomId === roomFilter)
  }, [calendarEvents, roomFilter])

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Calendrier</h1>
          <p className="text-neutral-500 mt-1 capitalize">{headerLabel}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
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
          <div className="w-48">
            <Select
              options={[{ value: '', label: 'Toutes les salles' }, ...roomOptions]}
              value={roomFilter}
              onChange={e => setRoomFilter(e.target.value)}
            />
          </div>
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
        </div>
      </div>

      {/* Calendar Views */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft overflow-hidden">
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={setSelectedEvent}
          />
        )}
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={setSelectedEvent}
          />
        )}
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={setSelectedEvent}
          />
        )}
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
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">{selectedEvent.title}</h3>
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
              {selectedEvent.userName && (
                <div>
                  <label className="text-sm font-medium text-neutral-500">Créé par</label>
                  <p className="text-neutral-900">{selectedEvent.userName}</p>
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
    </div>
  )
}

// ==================== WEEK VIEW ====================

function WeekView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  }).slice(0, 5) // Mon-Fri

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  const getEventsForDay = (day: Date) =>
    events.filter(e => {
      const eventDate = typeof e.start === 'string' ? parseISO(e.start) : e.start
      return isSameDay(eventDate, day)
    })

  const getEventStyle = (event: CalendarEvent) => {
    const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
    const end = typeof event.end === 'string' ? parseISO(event.end) : event.end
    const startH = getHours(start) + getMinutes(start) / 60
    const duration = differenceInMinutes(end, start) / 60
    const top = (startH - HOUR_START) * HOUR_HEIGHT
    const height = Math.max(duration * HOUR_HEIGHT, 20)
    return { top: `${top}px`, height: `${height}px` }
  }

  return (
    <div className="overflow-auto">
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
        {days.map(day => (
          <div key={day.toISOString()} className="relative border-l border-neutral-200">
            {hours.map(hour => (
              <div key={hour} className="border-b border-neutral-100" style={{ height: `${HOUR_HEIGHT}px` }} />
            ))}
            {/* Events */}
            {getEventsForDay(day).map(event => (
              <button
                key={event.id}
                className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-xs text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity text-left"
                style={{
                  ...getEventStyle(event),
                  backgroundColor: event.color || '#3b82f6',
                }}
                onClick={() => onEventClick(event)}
              >
                <div className="font-medium truncate">{event.title}</div>
                <div className="opacity-80 truncate">{event.roomName}</div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== MONTH VIEW ====================

function MonthView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
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
              className={`min-h-[100px] border-b border-r border-neutral-100 p-1 ${
                !inCurrentMonth ? 'bg-neutral-50' : ''
              } ${isToday(day) ? 'bg-primary-50' : ''}`}
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
                    className="w-full text-left text-xs rounded px-1 py-0.5 text-white truncate hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                    onClick={() => onEventClick(event)}
                  >
                    {event.title}
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
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  const dayEvents = events.filter(e => {
    const eventDate = typeof e.start === 'string' ? parseISO(e.start) : e.start
    return isSameDay(eventDate, currentDate)
  })

  const getEventStyle = (event: CalendarEvent) => {
    const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
    const end = typeof event.end === 'string' ? parseISO(event.end) : event.end
    const startH = getHours(start) + getMinutes(start) / 60
    const duration = differenceInMinutes(end, start) / 60
    const top = (startH - HOUR_START) * HOUR_HEIGHT
    const height = Math.max(duration * HOUR_HEIGHT, 20)
    return { top: `${top}px`, height: `${height}px` }
  }

  return (
    <div className="overflow-auto">
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
            <div key={hour} className="border-b border-neutral-100" style={{ height: `${HOUR_HEIGHT}px` }} />
          ))}
          {dayEvents.map(event => (
            <button
              key={event.id}
              className="absolute left-1 right-1 rounded-md px-2 py-1 text-sm text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity text-left"
              style={{
                ...getEventStyle(event),
                backgroundColor: event.color || '#3b82f6',
              }}
              onClick={() => onEventClick(event)}
            >
              <div className="font-medium truncate">{event.title}</div>
              <div className="opacity-80 truncate">{event.roomName}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CalendarPage
