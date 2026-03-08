import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  parseISO,
  getHours,
  getMinutes,
  isToday,
  getDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Repeat,
  BarChart3,
  Clock,
  Building2,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import type { CalendarEvent } from '@/types'
import { HOUR_START, HOUR_END } from './calendar-helpers'

function getOccupationStyle(rate: number) {
  if (rate === 0) return { bg: 'bg-neutral-50 dark:bg-neutral-900', text: 'text-neutral-400', bar: 'bg-neutral-300 dark:bg-neutral-600' }
  if (rate <= 25) return { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' }
  if (rate <= 50) return { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' }
  if (rate <= 75) return { bg: 'bg-orange-100', text: 'text-orange-800', bar: 'bg-orange-500' }
  return { bg: 'bg-red-100', text: 'text-red-800', bar: 'bg-red-500' }
}

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
  onDayClick: (day: Date) => void
  totalRooms: number
  hourStart?: number
  hourEnd?: number
}

export default function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  totalRooms,
  hourStart = HOUR_START,
  hourEnd = HOUR_END,
}: MonthViewProps) {
  const [showOccupation, setShowOccupation] = useState(false)

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

  const occupationData = useMemo(() => {
    const data = new Map<string, { rate: number; bookedHours: number; roomsUsed: number }>()
    const slotStart = hourStart
    const slotEnd = hourEnd
    const slotHours = slotEnd - slotStart // 12h
    const maxHours = totalRooms * slotHours

    for (const day of allDays) {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayEvents = getEventsForDay(day)

      if (dayEvents.length === 0) {
        data.set(dateKey, { rate: 0, bookedHours: 0, roomsUsed: 0 })
        continue
      }

      // Group events by room
      const roomMap = new Map<string, { start: number; end: number }[]>()
      for (const ev of dayEvents) {
        const evStart = typeof ev.start === 'string' ? parseISO(ev.start) : ev.start
        const evEnd = typeof ev.end === 'string' ? parseISO(ev.end) : ev.end
        const roomKey = ev.roomId || ev.roomName || '_noroom_'

        // Clamp to 8h-20h slot
        const startMins = Math.max(getHours(evStart) * 60 + getMinutes(evStart), slotStart * 60)
        const endMins = Math.min(getHours(evEnd) * 60 + getMinutes(evEnd), slotEnd * 60)
        if (endMins <= startMins) continue

        if (!roomMap.has(roomKey)) roomMap.set(roomKey, [])
        roomMap.get(roomKey)!.push({ start: startMins, end: endMins })
      }

      // Merge overlapping intervals per room and sum hours
      let totalMinutes = 0
      for (const [, intervals] of roomMap) {
        intervals.sort((a, b) => a.start - b.start)
        const merged: { start: number; end: number }[] = []
        for (const iv of intervals) {
          if (merged.length > 0 && iv.start < merged[merged.length - 1].end) {
            merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end)
          } else {
            merged.push({ ...iv })
          }
        }
        for (const m of merged) {
          totalMinutes += m.end - m.start
        }
      }

      const bookedHours = Math.round((totalMinutes / 60) * 10) / 10
      const rate = maxHours > 0 ? Math.round((bookedHours / maxHours) * 100) : 0
      data.set(dateKey, { rate: Math.min(rate, 100), bookedHours, roomsUsed: roomMap.size })
    }

    return data
  }, [allDays, events, totalRooms])

  const monthStats = useMemo(() => {
    let totalRate = 0
    let workdayCount = 0
    let peakRate = 0
    let peakDate = ''
    let totalHours = 0

    for (const day of allDays) {
      if (!isSameMonth(day, currentDate)) continue
      const wd = getDay(day) // 0=Sun, 6=Sat
      if (wd === 0 || wd === 6) continue // skip weekends

      const dateKey = format(day, 'yyyy-MM-dd')
      const d = occupationData.get(dateKey)
      if (!d) continue

      totalRate += d.rate
      totalHours += d.bookedHours
      workdayCount++

      if (d.rate > peakRate) {
        peakRate = d.rate
        peakDate = format(day, 'EEE d MMM', { locale: fr })
      }
    }

    return {
      avgRate: workdayCount > 0 ? Math.round(totalRate / workdayCount) : 0,
      peakRate,
      peakDate: peakDate || '-',
      totalHours: Math.round(totalHours * 10) / 10,
      totalRooms,
    }
  }, [allDays, currentDate, occupationData, totalRooms])

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div>
      {/* Toggle bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
        <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-lg p-0.5">
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              !showOccupation ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
            onClick={() => setShowOccupation(false)}
          >
            <Calendar size={12} className="inline mr-1" />
            Événements
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              showOccupation ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
            onClick={() => setShowOccupation(true)}
          >
            <BarChart3 size={12} className="inline mr-1" />
            Occupation
          </button>
        </div>
        <div className="text-xs text-neutral-400">
          {totalRooms} salle{totalRooms > 1 ? 's' : ''} · {hourStart}h-{hourEnd}h
        </div>
      </div>

      {/* Month stats (occupation mode only) */}
      {showOccupation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary-50">
            <TrendingUp size={16} className="text-primary-500" />
            <div>
              <div className="text-lg font-bold text-primary-700">{monthStats.avgRate}%</div>
              <div className="text-[10px] text-primary-500">Taux moyen</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
            <BarChart3 size={16} className="text-red-500" />
            <div>
              <div className="text-sm font-bold text-red-700">{monthStats.peakRate}%</div>
              <div className="text-[10px] text-red-500 truncate" title={monthStats.peakDate}>Pic : {monthStats.peakDate}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50">
            <Clock size={16} className="text-amber-500" />
            <div>
              <div className="text-lg font-bold text-amber-700">{monthStats.totalHours}h</div>
              <div className="text-[10px] text-amber-500">Heures de séances</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50">
            <Building2 size={16} className="text-emerald-500" />
            <div>
              <div className="text-lg font-bold text-emerald-700">{monthStats.totalRooms}</div>
              <div className="text-[10px] text-emerald-500">Salles</div>
            </div>
          </div>
        </div>
      )}

      {/* Day names header + Day cells (scrollable on mobile) */}
      <div className="overflow-x-auto">
      <div className="min-w-[500px] grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800">
        {dayNames.map(name => (
          <div key={name} className="p-2 text-center text-xs font-semibold text-neutral-500 uppercase">
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="min-w-[500px] grid grid-cols-7">
        {allDays.map(day => {
          const dayEvents = getEventsForDay(day)
          const inCurrentMonth = isSameMonth(day, currentDate)
          const dateKey = format(day, 'yyyy-MM-dd')
          const occ = occupationData.get(dateKey)

          if (showOccupation) {
            // === OCCUPATION MODE ===
            const rate = occ?.rate ?? 0
            const style = getOccupationStyle(rate)
            const isWeekend = getDay(day) === 0 || getDay(day) === 6

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border-b border-r border-neutral-100 dark:border-neutral-800 p-1.5 cursor-pointer transition-colors relative group ${
                  !inCurrentMonth ? 'opacity-40' : ''
                } ${isWeekend ? 'bg-neutral-50 dark:bg-neutral-900' : style.bg} ${isToday(day) ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                onClick={() => onDayClick(day)}
                title={`${occ?.bookedHours ?? 0}h de séances / ${totalRooms * (hourEnd - hourStart)}h possibles (${occ?.roomsUsed ?? 0} salle${(occ?.roomsUsed ?? 0) > 1 ? 's' : ''} active${(occ?.roomsUsed ?? 0) > 1 ? 's' : ''})`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    !inCurrentMonth ? 'text-neutral-300' : isToday(day) ? 'text-primary-600' : 'text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {!isWeekend && inCurrentMonth && rate > 0 && (
                    <span className={`text-xs font-bold ${style.text}`}>{rate}%</span>
                  )}
                </div>
                {!isWeekend && inCurrentMonth && (
                  <div className="mt-1">
                    {/* Mini progress bar */}
                    <div className="w-full h-1.5 bg-neutral-200/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${style.bar}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    {rate > 0 && (
                      <div className={`text-[10px] mt-1 ${style.text}`}>
                        {occ?.bookedHours}h · {occ?.roomsUsed} salle{(occ?.roomsUsed ?? 0) > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          }

          // === EVENTS MODE (original) ===
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] border-b border-r border-neutral-100 dark:border-neutral-800 p-1 cursor-pointer hover:bg-primary-50/30 transition-colors ${
                !inCurrentMonth ? 'bg-neutral-50 dark:bg-neutral-900' : ''
              } ${isToday(day) ? 'bg-primary-50 dark:bg-primary-950' : ''}`}
              onClick={() => onDayClick(day)}
            >
              <div className={`text-sm font-medium mb-1 ${
                !inCurrentMonth ? 'text-neutral-300' : isToday(day) ? 'text-primary-600' : 'text-neutral-700 dark:text-neutral-300'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <button
                    key={event.id}
                    className={`w-full text-left text-xs rounded px-1 py-0.5 truncate hover:opacity-90 transition-opacity flex items-center gap-0.5 ${
                      event.isGhost ? 'text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 opacity-50' : 'text-white'
                    }`}
                    style={{ backgroundColor: event.isGhost ? 'rgba(156, 163, 175, 0.15)' : (event.color || '#3b82f6') }}
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
      </div>{/* end overflow-x-auto */}

      {/* Occupation legend */}
      {showOccupation && (
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
          <span className="text-[10px] text-neutral-400 uppercase font-semibold mr-1">Légende :</span>
          {[
            { label: '0%', style: getOccupationStyle(0) },
            { label: '1-25%', style: getOccupationStyle(10) },
            { label: '26-50%', style: getOccupationStyle(30) },
            { label: '51-75%', style: getOccupationStyle(60) },
            { label: '76-100%', style: getOccupationStyle(90) },
          ].map(({ label, style }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-4 h-3 rounded ${style.bg} border border-neutral-200 dark:border-neutral-700`} />
              <span className={`text-[10px] font-medium ${style.text}`}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
