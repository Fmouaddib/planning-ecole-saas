import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEvent } from '@/types'

interface MiniCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  events: CalendarEvent[]
  miniMonth: Date
  onMiniMonthChange: (date: Date) => void
}

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  events,
  miniMonth,
  onMiniMonthChange,
}: MiniCalendarProps) {
  const monthStart = startOfMonth(miniMonth)
  const monthEnd = endOfMonth(miniMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>()
    events.forEach(e => {
      const d = typeof e.start === 'string' ? parseISO(e.start) : e.start
      const key = format(d, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, new Set())
      map.get(key)!.add(e.type || 'course')
    })
    return map
  }, [events])

  const typeColors: Record<string, string> = {
    course: '#3b82f6',
    exam: '#dc2626',
    meeting: '#059669',
    event: '#7c3aed',
    maintenance: '#6b7280',
  }

  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div className="no-print">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            onClick={() => onMiniMonthChange(subMonths(miniMonth, 1))}
          >
            <ChevronLeft size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 capitalize">
            {format(miniMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <button
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
            onClick={() => onMiniMonthChange(addMonths(miniMonth, 1))}
          >
            <ChevronRight size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((name, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-neutral-400 py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {allDays.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const dayTypes = eventsByDay.get(key)
            const inMonth = isSameMonth(day, miniMonth)
            const isSelected = isSameDay(day, selectedDate)
            const today = isToday(day)

            return (
              <button
                key={key}
                className={`relative flex flex-col items-center py-1 text-xs rounded transition-colors ${
                  !inMonth
                    ? 'text-neutral-300'
                    : isSelected
                    ? 'bg-primary-600 text-white font-bold'
                    : today
                    ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                onClick={() => onSelectDate(day)}
              >
                <span>{format(day, 'd')}</span>
                {/* Event dots */}
                {dayTypes && dayTypes.size > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from(dayTypes).slice(0, 3).map(type => (
                      <span
                        key={type}
                        className="w-1 h-1 rounded-full"
                        style={{
                          backgroundColor: isSelected ? 'white' : (typeColors[type] || '#3b82f6'),
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
