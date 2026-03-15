import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
  isToday,
  isBefore,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { Repeat, AlertTriangle, Video } from 'lucide-react'
import type { CalendarEvent } from '@/types'
import {
  HOUR_START,
  HOUR_END,
  HOUR_HEIGHT,
  computeOverlapLayout,
  detectRoomConflicts,
  type DragState,
} from './calendar-helpers'

export type CalendarLabel = 'title' | 'room' | 'teacher' | 'matiere' | 'time'
const DEFAULT_LABELS: CalendarLabel[] = ['title', 'room', 'teacher']

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
  onEventUpdate: (eventId: string, newStart: string, newEnd: string) => void
  hourStart?: number
  hourEnd?: number
  workingDays?: number[]
  calendarLabels?: CalendarLabel[]
}

export default function WeekView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onEventUpdate,
  hourStart = HOUR_START,
  hourEnd = HOUR_END,
  workingDays = [1, 2, 3, 4, 5],
  calendarLabels = DEFAULT_LABELS,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })
  // Filter to working days only (getDay: 0=dim, 1=lun...)
  const days = allDays.filter(d => workingDays.includes(d.getDay()))

  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i)

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
    const top = (startH - hourStart) * HOUR_HEIGHT
    const height = Math.max(duration * HOUR_HEIGHT, 20)
    return { top, height }
  }

  // Snap to 15 minutes
  const snapToGrid = (px: number) => {
    const quarterHourPx = HOUR_HEIGHT / 4
    return Math.round(px / quarterHourPx) * quarterHourPx
  }

  const pxToTime = (px: number) => {
    const totalMinutes = (px / HOUR_HEIGHT) * 60 + hourStart * 60
    const h = Math.floor(totalMinutes / 60)
    const m = Math.round(totalMinutes % 60)
    return { h: Math.max(hourStart, Math.min(h, hourEnd)), m: Math.min(m, 59) }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, event: CalendarEvent, mode: 'move' | 'resize', dayIndex: number) => {
      // Check pointer: fine only (no touch)
      if (window.matchMedia('(pointer: coarse)').matches) return

      // Bloquer le drag des séances passées
      const eventStart = typeof event.start === 'string' ? parseISO(event.start) : event.start
      if (isBefore(eventStart, new Date())) return

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
            const dayWidth = (rect.width - hourColWidth) / days.length
            const relX = e.clientX - rect.left - hourColWidth
            newDayIndex = Math.max(0, Math.min(days.length - 1, Math.floor(relX / dayWidth)))
          }
          return {
            ...prev,
            active: true,
            currentTop: Math.max(0, Math.min(newTop, (hourEnd - hourStart) * HOUR_HEIGHT - prev.originHeight)),
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
      <div className="min-w-[600px] grid border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
        <div className="p-2" />
        {days.map(day => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-l border-neutral-200 dark:border-neutral-800 ${
              isToday(day) ? 'bg-primary-50 dark:bg-primary-950' : ''
            }`}
          >
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">
              {format(day, 'EEE', { locale: fr })}
            </div>
            <div className={`text-lg font-semibold ${
              isToday(day) ? 'text-primary-600' : 'text-neutral-900 dark:text-neutral-100'
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="min-w-[600px] grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
        {/* Hours column */}
        <div>
          {hours.map(hour => (
            <div key={hour} className="border-b border-neutral-100 dark:border-neutral-800 text-right pr-2 text-xs text-neutral-400" style={{ height: `${HOUR_HEIGHT}px` }}>
              <span className="relative -top-2">{`${hour}:00`}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          const dayEvents = getEventsForDay(day)
          const overlapLayout = computeOverlapLayout(dayEvents)

          return (
            <div key={day.toISOString()} className="relative border-l border-neutral-200 dark:border-neutral-800">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-primary-50/30 transition-colors cursor-pointer"
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
                const eventStart = typeof event.start === 'string' ? parseISO(event.start) : event.start
                const isPast = isBefore(eventStart, new Date())

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
                      className={`h-full rounded-md px-1.5 py-0.5 text-xs overflow-hidden transition-opacity text-left relative ${
                        event.isGhost ? 'text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 border-dashed' : 'text-white'
                      } ${isConflict && !event.isGhost ? 'ring-2 ring-red-500 ring-offset-1' : ''
                      } ${event.isGhost ? 'cursor-pointer opacity-50' : isPast ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-90'}`}
                      style={{
                        backgroundColor: event.isGhost ? 'rgba(156, 163, 175, 0.15)' : (event.color || '#3b82f6'),
                        backgroundImage: isConflict && !event.isGhost
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)'
                          : undefined,
                      }}
                      onClick={(e) => {
                        if (!drag?.active) {
                          e.stopPropagation()
                          onEventClick(event)
                        }
                      }}
                      onPointerDown={(e) => { if (!event.isGhost) handlePointerDown(e, event, 'move', dayIndex) }}
                      title={
                        isPast
                          ? `${event.title} - ${event.roomName} (séance passée)`
                          : isConflict
                            ? `⚠ Conflit de salle : ${event.roomName}`
                            : `${event.title} - ${event.roomName}`
                      }
                    >
                      {calendarLabels.includes('title') && (
                        <div className="flex items-center gap-1">
                          {event.meetingUrl && <Video size={10} className="flex-shrink-0 opacity-90" />}
                          <span className="font-medium truncate">{event.title}</span>
                          {event.recurrence && <Repeat size={10} className="flex-shrink-0 opacity-80" />}
                          {isConflict && <AlertTriangle size={10} className="flex-shrink-0 text-yellow-200" />}
                        </div>
                      )}
                      {calendarLabels.includes('room') && event.roomName && <div className="opacity-80 truncate">{event.roomName}</div>}
                      {calendarLabels.includes('teacher') && (event.teacher || event.userName) && <div className="opacity-70 truncate text-[10px]">{event.teacher || event.userName}</div>}
                      {calendarLabels.includes('matiere') && event.matiere && <div className="opacity-70 truncate text-[10px]">{event.matiere}</div>}
                      {calendarLabels.includes('time') && (
                        <div className="opacity-70 truncate text-[10px]">
                          {format(parseISO(typeof event.start === 'string' ? event.start : event.start.toISOString()), 'HH:mm')} - {format(parseISO(typeof event.end === 'string' ? event.end : event.end.toISOString()), 'HH:mm')}
                        </div>
                      )}
                      {/* Resize handle — masqué pour les séances passées et ghost */}
                      {!isPast && !event.isGhost && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20"
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            handlePointerDown(e, event, 'resize', dayIndex)
                          }}
                        />
                      )}
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
