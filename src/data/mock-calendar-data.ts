import { startOfWeek, addDays } from 'date-fns'
import type { CalendarEvent, RecurrenceRule } from '@/types'

const TEACHERS = [
  'Mme Dupont',
  'M. Martin',
  'Mme Bernard',
  'M. Lefebvre',
  'Mme Moreau',
  'M. Laurent',
]

function getWeekDates() {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
}

function makeEvent(
  id: number,
  day: Date,
  startHour: number,
  durationHours: number,
  title: string,
  room: string,
  type: string,
  status: string,
  matiere: string,
  diplome: string,
  niveau: string,
  color: string,
  teacher?: string,
  recurrence?: RecurrenceRule,
): CalendarEvent {
  const start = new Date(day)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(day)
  end.setHours(startHour + durationHours, 0, 0, 0)
  return {
    id: `mock-${id}`,
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    color,
    roomId: `room-${room.toLowerCase().replace(/\s/g, '')}`,
    roomName: room,
    type,
    status,
    matiere,
    diplome,
    niveau,
    userName: teacher || TEACHERS[id % TEACHERS.length],
    teacher: teacher || TEACHERS[id % TEACHERS.length],
    recurrence,
  }
}

const colors: Record<string, string> = {
  course: '#3b82f6',
  exam: '#dc2626',
  meeting: '#059669',
  event: '#7c3aed',
  maintenance: '#6b7280',
}

const weeklyRecurrence: RecurrenceRule = {
  frequency: 'weekly',
  interval: 1,
}

function generateMockEvents(): CalendarEvent[] {
  const days = getWeekDates()
  const events: CalendarEvent[] = []
  let id = 1

  // Lundi
  events.push(makeEvent(id++, days[0], 8, 2, 'Cours de Mathématiques - L2', 'A101', 'course', 'confirmed', 'mathematiques', 'licence', '2eme_annee', colors.course, 'Mme Dupont', weeklyRecurrence))
  events.push(makeEvent(id++, days[0], 10, 2, 'TD Physique-Chimie', 'B203', 'course', 'confirmed', 'physique_chimie', 'licence', '1ere_annee', colors.course, 'M. Martin', weeklyRecurrence))
  events.push(makeEvent(id++, days[0], 13, 1, 'Réunion pédagogique', 'C105', 'meeting', 'pending', 'informatique', 'master', '1ere_annee', colors.meeting, 'M. Lefebvre'))
  events.push(makeEvent(id++, days[0], 14, 3, 'Cours d\'Informatique - M1', 'D301', 'course', 'confirmed', 'informatique', 'master', '1ere_annee', colors.course, 'M. Lefebvre', weeklyRecurrence))
  events.push(makeEvent(id++, days[0], 16, 2, 'Cours de Français - BTS1', 'A102', 'course', 'confirmed', 'francais', 'bts', '1ere_annee', colors.course, 'Mme Bernard'))
  events.push(makeEvent(id++, days[0], 10, 1, 'Cours d\'Anglais - L1', 'A103', 'course', 'confirmed', 'anglais', 'licence', '1ere_annee', colors.course, 'Mme Moreau', weeklyRecurrence))

  // Mardi
  events.push(makeEvent(id++, days[1], 8, 2, 'Examen Économie - L3', 'Amphi A', 'exam', 'confirmed', 'economie', 'licence', '3eme_annee', colors.exam, 'M. Laurent'))
  events.push(makeEvent(id++, days[1], 9, 2, 'Cours Histoire-Géo - Bac', 'B101', 'course', 'confirmed', 'histoire_geo', 'bac_general', '1ere_annee', colors.course, 'Mme Dupont', weeklyRecurrence))
  events.push(makeEvent(id++, days[1], 11, 2, 'TD SVT - L1', 'Labo 1', 'course', 'confirmed', 'svt', 'licence', '1ere_annee', colors.course, 'M. Martin'))
  events.push(makeEvent(id++, days[1], 14, 2, 'Cours de Droit - M2', 'C201', 'course', 'confirmed', 'droit', 'master', '2eme_annee', colors.course, 'Mme Bernard', weeklyRecurrence))
  events.push(makeEvent(id++, days[1], 14, 2, 'Cours de Philosophie - Bac', 'A201', 'course', 'pending', 'philosophie', 'bac_general', '1ere_annee', colors.course, 'M. Lefebvre'))
  events.push(makeEvent(id++, days[1], 16, 2, 'TP Informatique - BTS2', 'D302', 'course', 'confirmed', 'informatique', 'bts', '2eme_annee', colors.course, 'M. Laurent', weeklyRecurrence))

  // Mercredi
  events.push(makeEvent(id++, days[2], 8, 3, 'Cours de Mathématiques - M1', 'A101', 'course', 'confirmed', 'mathematiques', 'master', '1ere_annee', colors.course, 'Mme Dupont', weeklyRecurrence))
  events.push(makeEvent(id++, days[2], 9, 2, 'EPS - L2', 'Gymnase', 'course', 'confirmed', 'eps', 'licence', '2eme_annee', colors.course, 'Mme Moreau'))
  events.push(makeEvent(id++, days[2], 11, 1, 'Réunion départementale', 'C105', 'meeting', 'confirmed', 'mathematiques', 'licence', '1ere_annee', colors.meeting, 'M. Martin'))
  events.push(makeEvent(id++, days[2], 13, 2, 'Cours d\'Arts - CAP', 'Atelier', 'course', 'confirmed', 'arts', 'cap', '1ere_annee', colors.course, 'Mme Bernard'))
  events.push(makeEvent(id++, days[2], 14, 2, 'TD Anglais - M1', 'B102', 'course', 'pending', 'anglais', 'master', '1ere_annee', colors.course, 'Mme Moreau', weeklyRecurrence))
  events.push(makeEvent(id++, days[2], 16, 2, 'Cours Physique-Chimie - L2', 'Labo 2', 'course', 'confirmed', 'physique_chimie', 'licence', '2eme_annee', colors.course, 'M. Lefebvre'))
  // Événement spécial + maintenance pour tester d'autres types
  events.push(makeEvent(id++, days[2], 12, 1, 'Journée portes ouvertes', 'Amphi A', 'event', 'confirmed', 'informatique', 'licence', '1ere_annee', colors.event, 'M. Laurent'))
  events.push(makeEvent(id++, days[2], 18, 1, 'Maintenance Labo 1', 'Labo 1', 'maintenance', 'confirmed', 'informatique', 'licence', '1ere_annee', colors.maintenance, 'M. Laurent'))

  // Jeudi
  events.push(makeEvent(id++, days[3], 8, 2, 'Examen Mathématiques - L1', 'Amphi B', 'exam', 'confirmed', 'mathematiques', 'licence', '1ere_annee', colors.exam, 'Mme Dupont'))
  events.push(makeEvent(id++, days[3], 9, 2, 'Cours Économie - BTS1', 'B201', 'course', 'confirmed', 'economie', 'bts', '1ere_annee', colors.course, 'M. Laurent', weeklyRecurrence))
  events.push(makeEvent(id++, days[3], 10, 2, 'TD Français - L2', 'A104', 'course', 'confirmed', 'francais', 'licence', '2eme_annee', colors.course, 'Mme Bernard'))
  events.push(makeEvent(id++, days[3], 13, 3, 'TP Informatique - L3', 'D303', 'course', 'confirmed', 'informatique', 'licence', '3eme_annee', colors.course, 'M. Lefebvre', weeklyRecurrence))
  events.push(makeEvent(id++, days[3], 14, 2, 'Cours SVT - Bac Pro', 'Labo 1', 'course', 'pending', 'svt', 'bac_pro', '1ere_annee', colors.course, 'M. Martin'))
  events.push(makeEvent(id++, days[3], 16, 2, 'Cours de Droit - L3', 'C202', 'course', 'confirmed', 'droit', 'licence', '3eme_annee', colors.course, 'Mme Bernard', weeklyRecurrence))
  // Conflit volontaire : même salle A101, même horaire
  events.push(makeEvent(id++, days[3], 8, 2, 'Cours supplémentaire Maths', 'A101', 'course', 'confirmed', 'mathematiques', 'licence', '2eme_annee', colors.course, 'Mme Moreau'))

  // Vendredi
  events.push(makeEvent(id++, days[4], 8, 2, 'Cours Histoire-Géo - L1', 'B101', 'course', 'confirmed', 'histoire_geo', 'licence', '1ere_annee', colors.course, 'Mme Dupont', weeklyRecurrence))
  events.push(makeEvent(id++, days[4], 9, 2, 'Cours de Philosophie - L2', 'A202', 'course', 'confirmed', 'philosophie', 'licence', '2eme_annee', colors.course, 'M. Lefebvre'))
  events.push(makeEvent(id++, days[4], 10, 2, 'Examen Anglais - BTS2', 'Amphi A', 'exam', 'confirmed', 'anglais', 'bts', '2eme_annee', colors.exam, 'Mme Moreau'))
  events.push(makeEvent(id++, days[4], 13, 2, 'TD Mathématiques - L3', 'A101', 'course', 'confirmed', 'mathematiques', 'licence', '3eme_annee', colors.course, 'Mme Dupont'))
  events.push(makeEvent(id++, days[4], 14, 2, 'Cours EPS - Bac Techno', 'Gymnase', 'course', 'confirmed', 'eps', 'bac_techno', '1ere_annee', colors.course, 'Mme Moreau'))
  events.push(makeEvent(id++, days[4], 16, 1, 'Réunion fin de semaine', 'C105', 'meeting', 'pending', 'informatique', 'master', '1ere_annee', colors.meeting, 'M. Laurent'))

  return events
}

export const mockCalendarData = generateMockEvents()
