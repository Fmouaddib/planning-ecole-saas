import { useState, useMemo, useEffect } from 'react'
import { startOfWeek, addDays, isSameDay, parseISO, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Building2 } from 'lucide-react'
import type { CalendarEvent } from '@/types'

const HOUR_START = 8
const HOUR_END = 20
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

const bookingTypeLabels: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  meeting: 'Réunion',
  event: 'Événement',
  maintenance: 'Maintenance',
}

export function RoomsView({
  currentDate,
  events,
  onEventClick,
  buildings,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  buildings: { id: string; name: string; rooms: { id: string; name: string; capacity: number }[] }[]
}) {
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  )
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')

  // Reset day index when week changes
  useEffect(() => {
    setSelectedDayIndex(0)
  }, [weekStart.toISOString()])

  const selectedDay = weekDays[selectedDayIndex]

  // Events for the selected day
  const dayEvents = useMemo(
    () =>
      events.filter(e => {
        const d = typeof e.start === 'string' ? parseISO(e.start) : e.start
        return isSameDay(d, selectedDay)
      }),
    [events, selectedDay],
  )

  // Buildings to display (filtered)
  const visibleBuildings = useMemo(
    () =>
      selectedBuilding === 'all'
        ? buildings
        : buildings.filter(b => b.id === selectedBuilding),
    [selectedBuilding, buildings],
  )

  // Map room (by id and name) -> events for quick lookup
  const eventsByRoom = useMemo(() => {
    const byId: Record<string, CalendarEvent[]> = {}
    const byName: Record<string, CalendarEvent[]> = {}
    for (const ev of dayEvents) {
      if (ev.roomId) {
        if (!byId[ev.roomId]) byId[ev.roomId] = []
        byId[ev.roomId].push(ev)
      }
      const name = ev.roomName ?? ''
      if (name) {
        if (!byName[name]) byName[name] = []
        byName[name].push(ev)
      }
    }
    return { byId, byName }
  }, [dayEvents])

  return (
    <div className="flex flex-col">
      {/* Top bar: day tabs + building selector */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 bg-neutral-50 dark:bg-neutral-950">
        {/* Day tabs */}
        <div className="flex gap-1">
          {weekDays.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDayIndex(idx)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                idx === selectedDayIndex
                  ? 'bg-primary-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {format(day, 'EEE d', { locale: fr })}
            </button>
          ))}
        </div>

        {/* Building selector */}
        <select
          value={selectedBuilding}
          onChange={e => setSelectedBuilding(e.target.value)}
          className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tous les bâtiments</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.rooms.length} salles)
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        {/* Hour header */}
        <div className="flex sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800" style={{ minWidth: `${160 + HOURS.length * 80}px` }}>
          <div className="w-40 min-w-[160px] shrink-0 px-3 py-2 text-xs font-semibold text-neutral-500 border-r border-neutral-200 dark:border-neutral-800">
            Salle
          </div>
          <div className="flex-1 flex">
            {HOURS.map(h => (
              <div
                key={h}
                className="flex-1 min-w-[80px] text-center text-xs font-medium text-neutral-500 py-2 border-r border-neutral-100 dark:border-neutral-800"
              >
                {h}h
              </div>
            ))}
          </div>
        </div>

        {/* Building groups */}
        {visibleBuildings.map(building => (
          <div key={building.id}>
            {/* Building header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
              <Building2 size={16} className="text-neutral-500" />
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                {building.name}
              </span>
              <span className="text-xs text-neutral-400">
                {building.rooms.length} salles
              </span>
            </div>

            {/* Room rows */}
            {building.rooms.map(room => {
              const roomEvents = eventsByRoom.byId[room.id] || eventsByRoom.byName[room.name] || []
              return (
                <div
                  key={room.name}
                  className="flex border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors"
                  style={{ minWidth: `${160 + HOURS.length * 80}px` }}
                >
                  {/* Room label */}
                  <div className="w-40 min-w-[160px] shrink-0 px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-center">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {room.name}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {room.capacity} places
                    </span>
                  </div>

                  {/* Time bar */}
                  <div className="flex-1 relative" style={{ minHeight: 48 }}>
                    {/* Hour grid lines */}
                    <div className="absolute inset-0 flex">
                      {HOURS.map(h => (
                        <div
                          key={h}
                          className="flex-1 min-w-[80px] border-r border-neutral-100 dark:border-neutral-800"
                        />
                      ))}
                    </div>

                    {/* Event blocks */}
                    {roomEvents.map(ev => {
                      const start =
                        typeof ev.start === 'string'
                          ? parseISO(ev.start)
                          : ev.start
                      const end =
                        typeof ev.end === 'string'
                          ? parseISO(ev.end)
                          : ev.end
                      const startH =
                        start.getHours() + start.getMinutes() / 60
                      const endH = end.getHours() + end.getMinutes() / 60

                      const leftPct =
                        ((Math.max(startH, HOUR_START) - HOUR_START) /
                          (HOUR_END - HOUR_START)) *
                        100
                      const widthPct =
                        ((Math.min(endH, HOUR_END) -
                          Math.max(startH, HOUR_START)) /
                          (HOUR_END - HOUR_START)) *
                        100

                      if (widthPct <= 0) return null

                      return (
                        <button
                          key={ev.id}
                          onClick={() => onEventClick(ev)}
                          title={`${ev.title}\n${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}\n${ev.teacher ?? ''}`}
                          className="absolute top-1 bottom-1 rounded-md text-white text-[11px] font-medium px-1.5 overflow-hidden truncate cursor-pointer hover:brightness-110 transition-all shadow-sm"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: ev.color || '#3b82f6',
                          }}
                        >
                          <span className="truncate">
                            {ev.title}
                          </span>
                          {widthPct > 12 && (
                            <span className="block text-[10px] opacity-80 truncate">
                              {bookingTypeLabels[ev.type ?? ''] ?? ev.type} · {ev.teacher ?? ''}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Empty state */}
        {visibleBuildings.length === 0 && (
          <div className="text-center py-12 text-neutral-400">
            Aucun bâtiment trouvé
          </div>
        )}
      </div>
    </div>
  )
}
