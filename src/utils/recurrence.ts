/**
 * Moteur de récurrence — fonctions pures pour la saisie en lot de séances
 */

import {
  eachDayOfInterval,
  addWeeks,
  addMonths,
  getDay,
  format,
  parseISO,
} from 'date-fns'

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number // toutes les N unités
  daysOfWeek: number[] // 0=dim, 1=lun, ..., 6=sam (pour weekly)
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  exceptions?: string[] // dates à exclure (YYYY-MM-DD)
}

export interface GeneratedSession {
  id: string // crypto.randomUUID()
  date: string // YYYY-MM-DD
  title: string
  roomId: string
  trainerId: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  bookingType: string
  subjectId?: string
  classId?: string
  description?: string
}

const MAX_DATES = 200

/**
 * Génère un tableau de dates YYYY-MM-DD selon la config de récurrence
 */
export function generateRecurrenceDates(config: RecurrenceConfig): string[] {
  const { frequency, interval, daysOfWeek, startDate, endDate, exceptions = [] } = config
  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (start > end) return []

  const exceptionsSet = new Set(exceptions)
  const dates: string[] = []

  if (frequency === 'daily') {
    const allDays = eachDayOfInterval({ start, end })
    for (const day of allDays) {
      if (dates.length >= MAX_DATES) break
      // Respecter l'intervalle : seulement tous les N jours depuis start
      const diffDays = Math.round((day.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays % interval !== 0) continue
      const dateStr = format(day, 'yyyy-MM-dd')
      if (!exceptionsSet.has(dateStr)) {
        dates.push(dateStr)
      }
    }
  } else if (frequency === 'weekly') {
    // Parcourir semaine par semaine depuis startDate
    let currentWeekStart = start
    while (currentWeekStart <= end && dates.length < MAX_DATES) {
      // Pour chaque jour sélectionné de la semaine
      for (const dow of daysOfWeek.sort((a, b) => a - b)) {
        if (dates.length >= MAX_DATES) break
        // Calculer le jour exact de cette semaine
        const currentDow = getDay(currentWeekStart)
        const diff = dow - currentDow
        const day = new Date(currentWeekStart)
        day.setDate(day.getDate() + diff)

        if (day < start || day > end) continue
        const dateStr = format(day, 'yyyy-MM-dd')
        if (!exceptionsSet.has(dateStr)) {
          dates.push(dateStr)
        }
      }
      currentWeekStart = addWeeks(currentWeekStart, interval)
    }
  } else if (frequency === 'monthly') {
    let current = start
    while (current <= end && dates.length < MAX_DATES) {
      const dateStr = format(current, 'yyyy-MM-dd')
      if (!exceptionsSet.has(dateStr)) {
        dates.push(dateStr)
      }
      current = addMonths(current, interval)
    }
  }

  // Dédupliquer et trier
  return [...new Set(dates)].sort()
}

/**
 * Construit les sessions générées à partir des dates + template
 */
export function buildGeneratedSessions(params: {
  dates: string[]
  title: string
  roomId: string
  trainerId: string
  startTime: string
  endTime: string
  bookingType: string
  subjectId?: string
  classId?: string
  description?: string
}): GeneratedSession[] {
  const { dates, title, roomId, trainerId, startTime, endTime, bookingType, subjectId, classId, description } = params

  return dates.map(date => ({
    id: crypto.randomUUID(),
    date,
    title,
    roomId,
    trainerId,
    startTime,
    endTime,
    bookingType,
    subjectId,
    classId,
    description,
  }))
}
