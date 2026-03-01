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
import { Repeat, AlertTriangle } from 'lucide-react'
import type { CalendarEvent } from '@/types'
import {
  HOUR_START,
  HOUR_END,
  HOUR_HEIGHT,
  computeOverlapLayout,
  detectRoomConflicts,
  type DragState,
} from './calendar-helpers'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
  onEventUpdate: (eventId: string, newStart: string, newEnd: string) => void
}

export default function WeekView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onEventUpdate,
}: WeekViewProps) {
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
      <div className="min-w-[600px] grid grid-cols-[60px_repeat(5,1fr)] border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
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
      <div className="min-w-[600px] grid grid-cols-[60px_repeat(5,1fr)]">
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
            <div key={day.toISOString()} className="relative border-l border-neutral-200 dark:border-neutral-800">
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
                      className={`h-full rounded-md px-1.5 py-0.5 text-xs text-white overflow-hidden transition-opacity text-left relative ${
                        isConflict ? 'ring-2 ring-red-500 ring-offset-1' : ''
                      } ${isPast ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-90'}`}
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
                        isPast
                          ? `${event.title} - ${event.roomName} (séance passée)`
                          : isConflict
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
                      {/* Resize handle — masqué pour les séances passées */}
                      {!isPast && (
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
