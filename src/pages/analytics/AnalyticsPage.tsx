import { useMemo, useState, useRef, useEffect } from 'react'
import { startOfWeek, endOfWeek, getDay, isWithinInterval, differenceInMinutes, format, subWeeks } from 'date-fns'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useUsers } from '@/hooks/useUsers'
import { useAcademicData } from '@/hooks/useAcademicData'
import { isDemoMode } from '@/lib/supabase'
import { LoadingSpinner, BarChart, DonutChart, HeatmapGrid } from '@/components/ui'
import { CalendarCheck, Gauge, GraduationCap, Users, Award, School, BookOpen, Monitor, Download, ChevronDown } from 'lucide-react'
import { getScheduleTypeLabel } from '@/utils/scheduleUtils'
import type { AnalyticsExportData } from '@/utils/export-analytics'

// ==================== LABELS & COULEURS ====================

const statusLabels: Record<string, string> = {
  scheduled: 'Planifié',
  confirmed: 'Confirmé',
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  confirmed: '#8b5cf6',
  pending: '#f97316',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
}

const modalityLabels: Record<string, string> = {
  in_person: 'Présentiel',
  online: 'En ligne',
  hybrid: 'Hybride',
}

const modalityColors: Record<string, string> = {
  in_person: '#3b82f6',
  online: '#8b5cf6',
  hybrid: '#0d9488',
}

const scheduleTypeColors: Record<string, string> = {
  initial: '#22c55e',
  alternance: '#f59e0b',
  formation_continue: '#3b82f6',
  cours_du_soir: '#6366f1',
}

const enrollmentLabels: Record<string, string> = {
  class: 'Via classe',
  free: 'Libre',
}

const enrollmentColors: Record<string, string> = {
  class: '#3b82f6',
  free: '#f59e0b',
}

const enrollmentStatusLabels: Record<string, string> = {
  enrolled: 'Inscrit',
  dispensed: 'Dispensé',
}

const enrollmentStatusColors: Record<string, string> = {
  enrolled: '#22c55e',
  dispensed: '#ef4444',
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const SLOT_LABELS = ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h']

// ==================== DONNÉES DÉMO ====================

const DEMO_WEEK_BARS = [
  { label: 'Lun', value: 5, color: '#3b82f6' },
  { label: 'Mar', value: 8, color: '#2563eb' },
  { label: 'Mer', value: 3, color: '#60a5fa' },
  { label: 'Jeu', value: 7, color: '#3b82f6' },
  { label: 'Ven', value: 4, color: '#2563eb' },
]

const DEMO_STATUS_DONUT = [
  { label: 'Planifié', value: 65, color: '#3b82f6' },
  { label: 'En cours', value: 3, color: '#f59e0b' },
  { label: 'Terminé', value: 78, color: '#22c55e' },
  { label: 'Annulé', value: 10, color: '#ef4444' },
]

const DEMO_HEATMAP: number[][] = [
  [0.2, 0.8, 0.6, 0.4, 0.9, 0.3, 0.7, 0.5, 0.1, 0.0],
  [0.5, 0.7, 0.3, 0.6, 0.8, 0.2, 0.9, 0.4, 0.3, 0.1],
  [0.1, 0.3, 0.5, 0.7, 0.4, 0.6, 0.2, 0.8, 0.5, 0.0],
  [0.8, 0.6, 0.4, 0.9, 0.3, 0.7, 0.5, 0.2, 0.6, 0.1],
  [0.3, 0.5, 0.7, 0.2, 0.6, 0.4, 0.8, 0.3, 0.1, 0.0],
]

const DEMO_TEACHER_BARS = [
  { label: 'J. Martin', value: 14, color: '#3b82f6' },
  { label: 'M. Dupont', value: 12, color: '#2563eb' },
  { label: 'S. Bernard', value: 10, color: '#60a5fa' },
  { label: 'P. Leroy', value: 9, color: '#3b82f6' },
  { label: 'C. Moreau', value: 7, color: '#2563eb' },
  { label: 'A. Thomas', value: 6, color: '#60a5fa' },
  { label: 'L. Petit', value: 5, color: '#3b82f6' },
  { label: 'F. Robert', value: 4, color: '#2563eb' },
]

const DEMO_MODALITY_DONUT = [
  { label: 'Présentiel', value: 98, color: '#3b82f6' },
  { label: 'En ligne', value: 35, color: '#8b5cf6' },
  { label: 'Hybride', value: 23, color: '#0d9488' },
]

const DEMO_ROOM_BARS = [
  { label: 'Salle A101', value: 18, color: '#3b82f6' },
  { label: 'Amphi B', value: 15, color: '#2563eb' },
  { label: 'Labo Info 2', value: 12, color: '#60a5fa' },
  { label: 'Salle C305', value: 10, color: '#3b82f6' },
  { label: 'Salle conseil', value: 8, color: '#2563eb' },
]

const DEMO_SUBJECTS_BY_PROGRAM = [
  { label: 'Dev Web', value: 8, color: '#3b82f6' },
  { label: 'Réseaux', value: 6, color: '#2563eb' },
  { label: 'Marketing', value: 5, color: '#60a5fa' },
  { label: 'Gestion', value: 4, color: '#3b82f6' },
  { label: 'RH', value: 3, color: '#2563eb' },
]

const DEMO_HOURS_BY_DIPLOMA = [
  { label: 'BTS SIO', value: 420, color: '#3b82f6' },
  { label: 'Licence Pro', value: 380, color: '#2563eb' },
  { label: 'Master RH', value: 350, color: '#60a5fa' },
  { label: 'BTS MCO', value: 290, color: '#3b82f6' },
]

const DEMO_CLASSES_BY_PROFILE = [
  { label: 'Initial', value: 8, color: '#22c55e' },
  { label: 'Alternance', value: 5, color: '#f59e0b' },
  { label: 'Formation continue', value: 3, color: '#3b82f6' },
  { label: 'Cours du soir', value: 2, color: '#6366f1' },
]

const DEMO_TEACHER_COVERAGE = [
  { label: '0 enseignant', value: 4, color: '#ef4444' },
  { label: '1 enseignant', value: 12, color: '#f59e0b' },
  { label: '2+ enseignants', value: 8, color: '#22c55e' },
]

const DEMO_ENROLLMENT_TYPE = [
  { label: 'Via classe', value: 145, color: '#3b82f6' },
  { label: 'Libre', value: 18, color: '#f59e0b' },
]

const DEMO_ENROLLMENT_STATUS = [
  { label: 'Inscrit', value: 148, color: '#22c55e' },
  { label: 'Dispensé', value: 15, color: '#ef4444' },
]

const DEMO_STUDENTS_BY_CLASS = [
  { label: 'BTS SIO 1', value: 28, color: '#3b82f6' },
  { label: 'BTS SIO 2', value: 25, color: '#2563eb' },
  { label: 'LP Web 1', value: 22, color: '#60a5fa' },
  { label: 'M1 RH', value: 18, color: '#3b82f6' },
  { label: 'BTS MCO 1', value: 15, color: '#2563eb' },
]

const DEMO_DISPENSATIONS_BY_SUBJECT = [
  { label: 'Anglais', value: 5, color: '#ef4444' },
  { label: 'Sport', value: 4, color: '#f87171' },
  { label: 'Droit', value: 3, color: '#ef4444' },
  { label: 'Économie', value: 2, color: '#f87171' },
]

// ==================== SECTION HEADER ====================

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 mt-2">
      <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
    </div>
  )
}

// ==================== COMPOSANT ====================

function AnalyticsPage() {
  const { bookings, isLoading: bookingsLoading } = useBookings()
  const { rooms, isLoading: roomsLoading } = useRooms()
  const { users, isLoading: usersLoading, students, teachers: usersTeachers } = useUsers()
  const {
    diplomas, programs, classes, subjects,
    classSubjects, teacherSubjects, classStudents, studentSubjects,
    isLoading: academicLoading,
  } = useAcademicData()

  const isLoading = bookingsLoading || roomsLoading || usersLoading || academicLoading

  // ==================== EXPORT ====================
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleExport(fmt: 'pdf' | 'excel') {
    const exportData: AnalyticsExportData = {
      kpis,
      weekBarData: weekBarData.map(d => ({ label: d.label, value: d.value })),
      statusData: statusDonutData.map(d => ({ label: d.label, value: d.value })),
      heatmapData,
      dayLabels: DAY_LABELS,
      slotLabels: SLOT_LABELS,
      teacherData: teacherBarData.map(d => ({ label: d.label, value: d.value })),
      modalityData: modalityDonutData.map(d => ({ label: d.label, value: d.value })),
      roomData: roomBarData.map(d => ({ label: d.label, value: d.value })),
      subjectsByProgramData: subjectsByProgramData.map(d => ({ label: d.label, value: d.value })),
      hoursByDiplomaData: hoursByDiplomaData.map(d => ({ label: d.label, value: d.value })),
      classesByProfileData: classesByProfileData.map(d => ({ label: d.label, value: d.value })),
      teacherCoverageData: teacherCoverageData.map(d => ({ label: d.label, value: d.value })),
      enrollmentTypeData: enrollmentTypeData.map(d => ({ label: d.label, value: d.value })),
      enrollmentStatusData: enrollmentStatusData.map(d => ({ label: d.label, value: d.value })),
      studentsByClassData: studentsByClassData.map(d => ({ label: d.label, value: d.value })),
      dispensationsBySubjectData: dispensationsBySubjectData.map(d => ({ label: d.label, value: d.value })),
    }
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    const filename = `statistiques-${dateStr}`
    const mod = await import('@/utils/export-analytics')
    if (fmt === 'pdf') mod.exportAnalyticsToPDF(exportData, filename)
    else await mod.exportAnalyticsToExcel(exportData, filename)
    setShowExportMenu(false)
  }

  // ==================== DONNÉES CALCULÉES — KPIs ====================

  const kpis = useMemo(() => {
    if (isDemoMode) {
      return {
        totalSessions: 156,
        totalSessionsTrend: '+12 cette sem.',
        occupancyRate: 62,
        occupancySub: '7/12 salles utilisées',
        studentCount: 142,
        studentSub: '128 en classe',
        activeTeacherCount: 18,
        activeTeacherSub: '24 total',
        diplomaCount: 6,
        diplomaSub: '14 programmes',
        classCount: 12,
        classSub: '128 étudiants affectés',
        subjectCount: 32,
        subjectSub: '45 affect. profs',
        onlineCount: 23,
        onlineSub: '15% du total',
      }
    }

    // Trend: sessions this week vs last week
    const now = new Date()
    const wStart = startOfWeek(now, { weekStartsOn: 1 })
    const wEnd = endOfWeek(now, { weekStartsOn: 1 })
    const prevWStart = subWeeks(wStart, 1)
    const prevWEnd = subWeeks(wEnd, 1)
    let thisWeek = 0
    let lastWeek = 0
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const d = new Date(b.startDateTime)
      if (isWithinInterval(d, { start: wStart, end: wEnd })) thisWeek++
      if (isWithinInterval(d, { start: prevWStart, end: prevWEnd })) lastWeek++
    }
    const diff = thisWeek - lastWeek
    const trendStr = diff >= 0 ? `+${diff} cette sem.` : `${diff} cette sem.`

    // Occupancy
    const TOTAL_MINUTES = 50 * 60
    let totalPct = 0
    let usedRoomCount = 0
    for (const room of rooms) {
      const roomBookings = bookings.filter(b => b.roomId === room.id && b.status !== 'cancelled')
      let totalMinutes = 0
      for (const b of roomBookings) {
        const bStart = new Date(b.startDateTime)
        const bEnd = new Date(b.endDateTime)
        if (bEnd <= wStart || bStart >= wEnd) continue
        for (let d = 0; d < 5; d++) {
          const dayStart = new Date(wStart)
          dayStart.setDate(dayStart.getDate() + d)
          dayStart.setHours(8, 0, 0, 0)
          const dayEnd = new Date(dayStart)
          dayEnd.setHours(18, 0, 0, 0)
          const cs = new Date(Math.max(bStart.getTime(), dayStart.getTime()))
          const ce = new Date(Math.min(bEnd.getTime(), dayEnd.getTime()))
          if (cs < ce) totalMinutes += differenceInMinutes(ce, cs)
        }
      }
      if (totalMinutes > 0) usedRoomCount++
      totalPct += rooms.length > 0 ? Math.min(Math.round((totalMinutes / TOTAL_MINUTES) * 100), 100) : 0
    }
    const occRate = rooms.length > 0 ? Math.round(totalPct / rooms.length) : 0

    // Active teachers (with ≥1 non-cancelled session)
    const teacherIdsWithSession = new Set<string>()
    for (const b of bookings) {
      if (b.status !== 'cancelled' && b.userId) teacherIdsWithSession.add(b.userId)
    }
    const activeTeacherCount = usersTeachers.filter(t => teacherIdsWithSession.has(t.id)).length

    // Unique students in classes
    const uniqueClassStudents = new Set(classStudents.map(cs => cs.student_id)).size

    // Teacher-subject count
    const tsCount = teacherSubjects.length

    // Online/hybrid sessions
    const onlineHybrid = bookings.filter(b => b.sessionType === 'online' || b.sessionType === 'hybrid').length
    const onlinePct = bookings.length > 0 ? Math.round((onlineHybrid / bookings.length) * 100) : 0

    return {
      totalSessions: bookings.length,
      totalSessionsTrend: trendStr,
      occupancyRate: occRate,
      occupancySub: `${usedRoomCount}/${rooms.length} salles utilisées`,
      studentCount: students.length,
      studentSub: `${uniqueClassStudents} en classe`,
      activeTeacherCount,
      activeTeacherSub: `${usersTeachers.length} total`,
      diplomaCount: diplomas.length,
      diplomaSub: `${programs.length} programmes`,
      classCount: classes.length,
      classSub: `${uniqueClassStudents} étudiants affectés`,
      subjectCount: subjects.length,
      subjectSub: `${tsCount} affect. profs`,
      onlineCount: onlineHybrid,
      onlineSub: `${onlinePct}% du total`,
    }
  }, [bookings, rooms, users, students, usersTeachers, diplomas, programs, classes, subjects, classSubjects, teacherSubjects, classStudents])

  // ==================== SECTION 2 — ACTIVITÉ OPÉRATIONNELLE ====================

  // Séances par jour (semaine courante)
  const weekBarData = useMemo(() => {
    if (isDemoMode) return DEMO_WEEK_BARS
    const now = new Date()
    const wStart = startOfWeek(now, { weekStartsOn: 1 })
    const wEnd = endOfWeek(now, { weekStartsOn: 1 })
    const dayColors = ['#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb']
    const counts = [0, 0, 0, 0, 0]
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const d = new Date(b.startDateTime)
      if (isWithinInterval(d, { start: wStart, end: wEnd })) {
        const dow = getDay(d)
        if (dow >= 1 && dow <= 5) counts[dow - 1]++
      }
    }
    return DAY_LABELS.map((label, i) => ({ label, value: counts[i], color: dayColors[i] }))
  }, [bookings])

  // Répartition par statut
  const statusDonutData = useMemo(() => {
    if (isDemoMode) return DEMO_STATUS_DONUT
    const counts: Record<string, number> = {}
    for (const b of bookings) counts[b.status] = (counts[b.status] || 0) + 1
    return Object.entries(statusLabels).map(([key, label]) => ({
      label, value: counts[key] || 0, color: statusColors[key] || '#6b7280',
    }))
  }, [bookings])

  // Heatmap
  const heatmapData = useMemo(() => {
    if (isDemoMode) return DEMO_HEATMAP
    const now = new Date()
    const wStart = startOfWeek(now, { weekStartsOn: 1 })
    const totalRooms = Math.max(rooms.length, 1)
    const grid: number[][] = Array.from({ length: 5 }, () => Array(10).fill(0))
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const bStart = new Date(b.startDateTime)
      const bEnd = new Date(b.endDateTime)
      for (let d = 0; d < 5; d++) {
        const dayBase = new Date(wStart)
        dayBase.setDate(dayBase.getDate() + d)
        for (let s = 0; s < 10; s++) {
          const slotStart = new Date(dayBase)
          slotStart.setHours(8 + s, 0, 0, 0)
          const slotEnd = new Date(dayBase)
          slotEnd.setHours(9 + s, 0, 0, 0)
          if (bStart < slotEnd && bEnd > slotStart) grid[d][s]++
        }
      }
    }
    return grid.map(row => row.map(v => Math.min(v / totalRooms, 1)))
  }, [bookings, rooms])

  // Charge enseignante
  const teacherBarData = useMemo(() => {
    if (isDemoMode) return DEMO_TEACHER_BARS
    const counts: Record<string, { name: string; count: number }> = {}
    for (const b of bookings) {
      if (b.status === 'cancelled' || !b.user) continue
      const name = `${b.user.firstName} ${b.user.lastName}`.trim()
      if (!name) continue
      if (!counts[b.userId]) counts[b.userId] = { name, count: 0 }
      counts[b.userId].count++
    }
    const barColors = ['#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb']
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t, i) => ({
        label: t.name.length > 14 ? t.name.slice(0, 12) + '…' : t.name,
        value: t.count,
        color: barColors[i % barColors.length],
      }))
  }, [bookings])

  // Séances par modalité (REMPLACE "par type")
  const modalityDonutData = useMemo(() => {
    if (isDemoMode) return DEMO_MODALITY_DONUT
    const counts: Record<string, number> = {}
    for (const b of bookings) {
      const mod = b.sessionType || 'in_person'
      counts[mod] = (counts[mod] || 0) + 1
    }
    return Object.entries(modalityLabels).map(([key, label]) => ({
      label, value: counts[key] || 0, color: modalityColors[key] || '#6b7280',
    }))
  }, [bookings])

  // Utilisation des salles
  const roomBarData = useMemo(() => {
    if (isDemoMode) return DEMO_ROOM_BARS
    const counts: Record<string, number> = {}
    for (const b of bookings) {
      if (b.room?.name) counts[b.room.name] = (counts[b.room.name] || 0) + 1
    }
    const barColors = ['#3b82f6', '#2563eb', '#60a5fa']
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count], i) => ({
        label: name.length > 14 ? name.slice(0, 12) + '…' : name,
        value: count,
        color: barColors[i % barColors.length],
      }))
  }, [bookings])

  // ==================== SECTION 3 — RÉFÉRENTIEL ACADÉMIQUE ====================

  // Matières par programme
  const subjectsByProgramData = useMemo(() => {
    if (isDemoMode) return DEMO_SUBJECTS_BY_PROGRAM
    const programMap = new Map(programs.map(p => [p.id, p.name]))
    const counts: Record<string, { name: string; count: number }> = {}
    for (const s of subjects) {
      const pId = s.programId
      if (!pId) continue
      const pName = programMap.get(pId) || 'Sans programme'
      if (!counts[pId]) counts[pId] = { name: pName, count: 0 }
      counts[pId].count++
    }
    const barColors = ['#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb']
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p, i) => ({
        label: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
        value: p.count,
        color: barColors[i % barColors.length],
      }))
  }, [subjects, programs])

  // Volume horaire par diplôme
  const hoursByDiplomaData = useMemo(() => {
    if (isDemoMode) return DEMO_HOURS_BY_DIPLOMA
    // Build class → diploma map
    const classDiplomaMap = new Map(classes.map(c => [c.id, c.diplomaId]))
    const diplomaMap = new Map(diplomas.map(d => [d.id, d.title]))
    const hours: Record<string, { name: string; total: number }> = {}
    for (const cs of classSubjects) {
      const diplomaId = classDiplomaMap.get(cs.class_id)
      if (!diplomaId) continue
      const dName = diplomaMap.get(diplomaId) || 'Sans diplôme'
      if (!hours[diplomaId]) hours[diplomaId] = { name: dName, total: 0 }
      hours[diplomaId].total += cs.hours_planned || 0
    }
    const barColors = ['#3b82f6', '#2563eb', '#60a5fa', '#3b82f6']
    return Object.values(hours)
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((d, i) => ({
        label: d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name,
        value: d.total,
        color: barColors[i % barColors.length],
      }))
  }, [classSubjects, classes, diplomas])

  // Classes par profil (scheduleType)
  const classesByProfileData = useMemo(() => {
    if (isDemoMode) return DEMO_CLASSES_BY_PROFILE
    const counts: Record<string, number> = {}
    for (const c of classes) {
      const t = c.scheduleType || 'initial'
      counts[t] = (counts[t] || 0) + 1
    }
    return Object.entries(counts).map(([key, value]) => ({
      label: getScheduleTypeLabel(key),
      value,
      color: scheduleTypeColors[key] || '#6b7280',
    }))
  }, [classes])

  // Couverture enseignants (par matière : 0, 1, 2+)
  const teacherCoverageData = useMemo(() => {
    if (isDemoMode) return DEMO_TEACHER_COVERAGE
    const teacherCountPerSubject: Record<string, number> = {}
    for (const ts of teacherSubjects) {
      teacherCountPerSubject[ts.subject_id] = (teacherCountPerSubject[ts.subject_id] || 0) + 1
    }
    let zero = 0, one = 0, twoPlus = 0
    for (const s of subjects) {
      const cnt = teacherCountPerSubject[s.id] || 0
      if (cnt === 0) zero++
      else if (cnt === 1) one++
      else twoPlus++
    }
    return [
      { label: '0 enseignant', value: zero, color: '#ef4444' },
      { label: '1 enseignant', value: one, color: '#f59e0b' },
      { label: '2+ enseignants', value: twoPlus, color: '#22c55e' },
    ]
  }, [subjects, teacherSubjects])

  // ==================== SECTION 4 — INSCRIPTIONS ÉTUDIANTS ====================

  // Type d'inscriptions
  const enrollmentTypeData = useMemo(() => {
    if (isDemoMode) return DEMO_ENROLLMENT_TYPE
    const counts: Record<string, number> = {}
    for (const ss of studentSubjects) {
      counts[ss.enrollment_type] = (counts[ss.enrollment_type] || 0) + 1
    }
    return Object.entries(enrollmentLabels).map(([key, label]) => ({
      label, value: counts[key] || 0, color: enrollmentColors[key] || '#6b7280',
    }))
  }, [studentSubjects])

  // Statut des inscriptions
  const enrollmentStatusData = useMemo(() => {
    if (isDemoMode) return DEMO_ENROLLMENT_STATUS
    const counts: Record<string, number> = {}
    for (const ss of studentSubjects) {
      counts[ss.status] = (counts[ss.status] || 0) + 1
    }
    return Object.entries(enrollmentStatusLabels).map(([key, label]) => ({
      label, value: counts[key] || 0, color: enrollmentStatusColors[key] || '#6b7280',
    }))
  }, [studentSubjects])

  // Étudiants par classe (top 10)
  const studentsByClassData = useMemo(() => {
    if (isDemoMode) return DEMO_STUDENTS_BY_CLASS
    const classMap = new Map(classes.map(c => [c.id, c.name]))
    const counts: Record<string, { name: string; count: number }> = {}
    for (const cs of classStudents) {
      const cName = classMap.get(cs.class_id) || 'Inconnue'
      if (!counts[cs.class_id]) counts[cs.class_id] = { name: cName, count: 0 }
      counts[cs.class_id].count++
    }
    const barColors = ['#3b82f6', '#2563eb', '#60a5fa', '#3b82f6', '#2563eb']
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((c, i) => ({
        label: c.name.length > 14 ? c.name.slice(0, 12) + '…' : c.name,
        value: c.count,
        color: barColors[i % barColors.length],
      }))
  }, [classStudents, classes])

  // Dispensations par matière (top 10)
  const dispensationsBySubjectData = useMemo(() => {
    if (isDemoMode) return DEMO_DISPENSATIONS_BY_SUBJECT
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]))
    const counts: Record<string, { name: string; count: number }> = {}
    for (const ss of studentSubjects) {
      if (ss.status !== 'dispensed') continue
      const sName = subjectMap.get(ss.subject_id) || 'Inconnue'
      if (!counts[ss.subject_id]) counts[ss.subject_id] = { name: sName, count: 0 }
      counts[ss.subject_id].count++
    }
    const barColors = ['#ef4444', '#f87171', '#ef4444', '#f87171']
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((s, i) => ({
        label: s.name.length > 14 ? s.name.slice(0, 12) + '…' : s.name,
        value: s.count,
        color: barColors[i % barColors.length],
      }))
  }, [studentSubjects, subjects])

  // ==================== RENDU ====================

  if (isLoading && !isDemoMode) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement des statistiques..." />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Statistiques</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Vue d'ensemble de l'activité</p>
        </div>

        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download size={16} />
            Export
            <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 z-50 mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
              {([
                { fmt: 'pdf' as const, label: 'PDF', ext: '.pdf' },
                { fmt: 'excel' as const, label: 'Excel', ext: '.xlsx' },
              ]).map(({ fmt, label, ext }) => (
                <button
                  key={fmt}
                  className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-700 transition-colors flex items-center justify-between"
                  onClick={() => handleExport(fmt)}
                >
                  <span>{label}</span>
                  <span className="text-[10px] text-neutral-400">{ext}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== KPIs — Ligne 1 ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total séances', value: kpis.totalSessions, sub: kpis.totalSessionsTrend, icon: CalendarCheck, iconBg: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600 dark:text-primary-400' },
          { label: 'Taux d\'occupation', value: `${kpis.occupancyRate}%`, sub: kpis.occupancySub, icon: Gauge, iconBg: 'bg-success-100 dark:bg-success-900/30', iconColor: 'text-success-600 dark:text-success-400' },
          { label: 'Étudiants', value: kpis.studentCount, sub: kpis.studentSub, icon: GraduationCap, iconBg: 'bg-warning-100 dark:bg-warning-900/30', iconColor: 'text-warning-600 dark:text-warning-400' },
          { label: 'Enseignants actifs', value: kpis.activeTeacherCount, sub: kpis.activeTeacherSub, icon: Users, iconBg: 'bg-error-100 dark:bg-error-900/30', iconColor: 'text-error-600 dark:text-error-400' },
        ].map(kpi => (
          <div key={kpi.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{kpi.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{kpi.value}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{kpi.sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${kpi.iconBg}`}>
                <kpi.icon size={22} className={kpi.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================== KPIs — Ligne 2 ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Diplômes', value: kpis.diplomaCount, sub: kpis.diplomaSub, icon: Award, iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
          { label: 'Classes', value: kpis.classCount, sub: kpis.classSub, icon: School, iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
          { label: 'Matières', value: kpis.subjectCount, sub: kpis.subjectSub, icon: BookOpen, iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
          { label: 'Sessions en ligne', value: kpis.onlineCount, sub: kpis.onlineSub, icon: Monitor, iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
        ].map(kpi => (
          <div key={kpi.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{kpi.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{kpi.value}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{kpi.sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${kpi.iconBg}`}>
                <kpi.icon size={22} className={kpi.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================== SECTION 2 — Activité opérationnelle ==================== */}
      <SectionHeader title="Activité opérationnelle" description="Séances, occupation et charge enseignante" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Répartition par statut</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Toutes les séances</p>
          <DonutChart data={statusDonutData} size={140} thickness={22} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Séances par modalité</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Présentiel / En ligne / Hybride</p>
          <DonutChart data={modalityDonutData} size={140} thickness={22} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Séances par jour</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Semaine courante (Lu-Ve)</p>
          <BarChart data={weekBarData} height={55} showValues />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Charge enseignante</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Top 8 — nombre de séances</p>
          {teacherBarData.length > 0 ? (
            <BarChart data={teacherBarData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Occupation des salles</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Par créneau horaire (semaine courante)</p>
          <HeatmapGrid data={heatmapData} rowLabels={DAY_LABELS} colLabels={SLOT_LABELS} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Utilisation des salles</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Top 10 — nombre de séances</p>
          {roomBarData.length > 0 ? (
            <BarChart data={roomBarData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* ==================== SECTION 3 — Référentiel académique ==================== */}
      <SectionHeader title="Référentiel académique" description="Diplômes, programmes, matières et couverture enseignants" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Matières par programme</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Nombre de matières rattachées</p>
          {subjectsByProgramData.length > 0 ? (
            <BarChart data={subjectsByProgramData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Volume horaire par diplôme</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Heures planifiées (via class_subjects)</p>
          {hoursByDiplomaData.length > 0 ? (
            <BarChart data={hoursByDiplomaData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Classes par profil</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Répartition par type de planification</p>
          <DonutChart data={classesByProfileData} size={140} thickness={22} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Couverture enseignants</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Nombre d'enseignants par matière</p>
          <DonutChart data={teacherCoverageData} size={140} thickness={22} />
        </div>
      </div>

      {/* ==================== SECTION 4 — Inscriptions étudiants ==================== */}
      <SectionHeader title="Inscriptions étudiants" description="Types, statuts et répartition des inscriptions" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Type d'inscriptions</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Via classe vs matière libre</p>
          <DonutChart data={enrollmentTypeData} size={140} thickness={22} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Statut des inscriptions</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Inscrit vs dispensé</p>
          <DonutChart data={enrollmentStatusData} size={140} thickness={22} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Étudiants par classe</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Top 10 — effectifs</p>
          {studentsByClassData.length > 0 ? (
            <BarChart data={studentsByClassData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Dispensations par matière</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Top 10 — nombre de dispensations</p>
          {dispensationsBySubjectData.length > 0 ? (
            <BarChart data={dispensationsBySubjectData} horizontal showValues />
          ) : (
            <p className="text-sm text-neutral-400 text-center py-6">Aucune donnée</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
