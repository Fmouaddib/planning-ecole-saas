import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  isSameDay,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes,
  isBefore,
} from 'date-fns'
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

interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
  onEventUpdate: (eventId: string, newStart: string, newEnd: string) => void
}

export default function DayView({
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  onEventUpdate,
}: DayViewProps) {
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
            <div key={hour} className="border-b border-neutral-100 dark:border-neutral-800 text-right pr-2 text-xs text-neutral-400" style={{ height: `${HOUR_HEIGHT}px` }}>
              <span className="relative -top-2">{`${hour}:00`}</span>
            </div>
          ))}
        </div>

        {/* Events */}
        <div className="relative border-l border-neutral-200 dark:border-neutral-800">
          {hours.map(hour => (
            <div
              key={hour}
              className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-primary-50/30 transition-colors cursor-pointer"
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
            const eventStart = typeof event.start === 'string' ? parseISO(event.start) : event.start
            const isPast = isBefore(eventStart, new Date())

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
                  className={`h-full rounded-md px-2 py-1 text-sm text-white overflow-hidden transition-opacity text-left relative ${
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
                  onPointerDown={(e) => handlePointerDown(e, event, 'move')}
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
                    {event.recurrence && <Repeat size={12} className="flex-shrink-0 opacity-80" />}
                    {isConflict && <AlertTriangle size={12} className="flex-shrink-0 text-yellow-200" />}
                  </div>
                  <div className="opacity-80 truncate">{event.roomName}</div>
                  {/* Resize handle — masqué pour les séances passées */}
                  {!isPast && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20"
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        handlePointerDown(e, event, 'resize')
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
