import { parseISO } from 'date-fns'
import type { CalendarEvent } from '@/types'

export const HOUR_START = 8
export const HOUR_END = 20
export const HOUR_HEIGHT = 60 // px per hour

// ==================== OVERLAP ALGORITHM ====================

export interface OverlapColumn {
  event: CalendarEvent
  column: number
  totalColumns: number
}

export function computeOverlapLayout(events: CalendarEvent[]): Map<string, OverlapColumn> {
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
export function detectRoomConflicts(events: CalendarEvent[]): Set<string> {
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

export interface DragState {
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
