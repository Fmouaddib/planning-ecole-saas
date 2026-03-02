/**
 * Utilitaires de planification des classes
 * Vérifie si une date est un "jour de classe" selon le profil de planification
 */

import type { Class, ExamPeriod } from '@/types'
import { differenceInCalendarWeeks, format } from 'date-fns'

// === Constantes ===

export const SCHEDULE_TYPE_OPTIONS = [
  { value: 'initial', label: 'Initial' },
  { value: 'alternance', label: 'Alternance' },
  { value: 'formation_continue', label: 'Formation continue' },
  { value: 'cours_du_soir', label: 'Cours du soir' },
] as const

export const DAY_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
] as const

/** Jours par défaut selon le profil */
export const DEFAULT_DAYS_BY_TYPE: Record<string, number[]> = {
  initial: [1, 2, 3, 4, 5],
  alternance: [1, 2, 3],
  formation_continue: [6],
  cours_du_soir: [1, 2, 3, 4, 5],
}

// === Fonctions ===

export function getScheduleTypeLabel(type: string): string {
  return SCHEDULE_TYPE_OPTIONS.find(o => o.value === type)?.label || type
}

/** Couleur du badge selon le profil */
export function getScheduleTypeBadgeVariant(type: string): 'success' | 'warning' | 'info' | 'neutral' {
  switch (type) {
    case 'initial': return 'success'
    case 'alternance': return 'warning'
    case 'formation_continue': return 'info'
    case 'cours_du_soir': return 'info'
    default: return 'neutral'
  }
}

/** Abréviation des jours pour affichage compact */
export function formatDaysShort(days: number[]): string {
  const labels = ['', 'L', 'M', 'Me', 'J', 'V', 'S', 'D']
  return [...days].sort((a, b) => a - b).map(d => labels[d] || '?').join('-')
}

interface ClassDayResult {
  isPresent: boolean
  reason?: string
}

/** Convertit une Date en string ISO date (yyyy-MM-dd) */
function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/**
 * Vérifie si une date donnée est un jour de classe.
 *
 * Priorité :
 * 1. Exceptions : si la date est dans `schoolDays` → cours (override)
 *                  si la date est dans `companyDays` → pas cours (override)
 * 2. Jour de la semaine : doit être dans `attendanceDays`
 * 3. Cycle alternance : si `alternanceConfig` existe, la semaine doit être "école"
 */
export function isClassDay(
  classData: Pick<Class, 'attendanceDays' | 'alternanceConfig' | 'scheduleExceptions' | 'name'>,
  date: Date | string,
): ClassDayResult {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateStr = toDateStr(d)

  // 1. Exceptions (priorité absolue)
  const exceptions = classData.scheduleExceptions
  if (exceptions) {
    if (exceptions.schoolDays?.includes(dateStr)) {
      return { isPresent: true }
    }
    if (exceptions.companyDays?.includes(dateStr)) {
      return { isPresent: false, reason: 'Jour entreprise exceptionnel' }
    }
  }

  // 2. Jour de la semaine
  const jsDay = d.getDay() // 0=dim, 1=lun ... 6=sam
  const isoDay = jsDay === 0 ? 7 : jsDay // 1=lun ... 7=dim

  const days = classData.attendanceDays
  if (!days.includes(isoDay)) {
    const dayLabel = DAY_OPTIONS.find(o => o.value === isoDay)?.label || ''
    return {
      isPresent: false,
      reason: `${dayLabel} n'est pas un jour de présence (jours : ${formatDaysShort(days)})`,
    }
  }

  // 3. Cycle alternance (semaines école/entreprise)
  const config = classData.alternanceConfig
  if (config && config.schoolWeeks > 0 && config.companyWeeks > 0 && config.referenceDate) {
    const refDate = new Date(config.referenceDate)
    const cycleLength = config.schoolWeeks + config.companyWeeks
    const weeksSinceRef = differenceInCalendarWeeks(d, refDate, { weekStartsOn: 1 })
    const weekInCycle = ((weeksSinceRef % cycleLength) + cycleLength) % cycleLength

    if (weekInCycle >= config.schoolWeeks) {
      const companyWeekNum = weekInCycle - config.schoolWeeks + 1
      return {
        isPresent: false,
        reason: `Semaine entreprise (sem. ${companyWeekNum}/${config.companyWeeks} du cycle)`,
      }
    }
  }

  return { isPresent: true }
}

/**
 * Vérifie si une date tombe dans une période d'examen de la classe.
 * Retourne la période trouvée ou null.
 */
export function getExamPeriod(
  classData: Pick<Class, 'examPeriods'>,
  date: Date | string,
): ExamPeriod | null {
  const periods = classData.examPeriods
  if (!periods || periods.length === 0) return null
  const dateStr = typeof date === 'string' ? date : toDateStr(date)
  return periods.find(p => dateStr >= p.startDate && dateStr <= p.endDate) || null
}
