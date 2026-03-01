import { useState, useEffect } from 'react'
import { useBookings } from '@/hooks/useBookings'
import { MiniCalendar } from '@/pages/calendar/MiniCalendar'

/** Custom event name for sidebar → CalendarPage date sync */
export const SIDEBAR_DATE_EVENT = 'sidebar-date-select'

interface SidebarCalendarProps {
  onNavigate?: (path: string) => void
}

export function SidebarCalendar({ onNavigate }: SidebarCalendarProps) {
  const { calendarEvents } = useBookings()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [miniMonth, setMiniMonth] = useState(new Date())

  // Listen for CalendarPage date changes to keep sidebar in sync
  useEffect(() => {
    const handler = (e: Event) => {
      const date = (e as CustomEvent<Date>).detail
      setSelectedDate(date)
      setMiniMonth(date)
    }
    window.addEventListener('calendar-date-change', handler)
    return () => window.removeEventListener('calendar-date-change', handler)
  }, [])

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    // Store for CalendarPage to pick up on mount
    sessionStorage.setItem('planning-target-date', date.toISOString())
    // Notify already-mounted CalendarPage
    window.dispatchEvent(new CustomEvent(SIDEBAR_DATE_EVENT, { detail: date }))
    // Navigate to planning
    onNavigate?.('/planning')
  }

  return (
    <MiniCalendar
      selectedDate={selectedDate}
      onSelectDate={handleSelectDate}
      events={calendarEvents}
      miniMonth={miniMonth}
      onMiniMonthChange={setMiniMonth}
    />
  )
}
