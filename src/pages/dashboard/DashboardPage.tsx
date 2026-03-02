import { useState, useEffect, useMemo } from 'react'
import { format, formatDistanceToNow, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Building2,
  CalendarCheck,
  Clock,
  Users,
  Plus,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Gauge,
  BarChart3,
  GraduationCap,
  BookOpen,
  Layers,
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useUsers } from '@/hooks/useUsers'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import { useAcademicData } from '@/hooks/useAcademicData'
import { isTeacherRole, isStudentRole } from '@/utils/helpers'
import { isDemoMode } from '@/lib/supabase'
import { LoadingState } from '@/components/ui'
import type { UsageSummary } from '@/types'

// ==================== CONSTANTES DÉMO ====================

const DEMO_STATS = [
  {
    label: 'Salles',
    value: '12',
    change: '+2 ce mois',
    changeType: 'success' as const,
    icon: Building2,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
  },
  {
    label: 'Séances',
    value: '156',
    change: '+12%',
    changeType: 'success' as const,
    icon: CalendarCheck,
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
  },
  {
    label: 'En cours',
    value: '3',
    change: 'En direct',
    changeType: 'warning' as const,
    icon: Clock,
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
  },
  {
    label: 'Utilisateurs',
    value: '48',
    change: '+5 ce mois',
    changeType: 'success' as const,
    icon: Users,
    iconBg: 'bg-error-100',
    iconColor: 'text-error-600',
  },
]

const DEMO_BOOKINGS = [
  { time: '09:00', title: 'Mathématiques L2', room: 'Salle A101', status: 'confirmed' },
  { time: '10:30', title: 'Physique L3', room: 'Amphi B', status: 'confirmed' },
  { time: '14:00', title: 'Réunion pédagogique', room: 'Salle C305', status: 'pending' },
  { time: '15:30', title: 'TD Informatique', room: 'Labo Info 2', status: 'confirmed' },
  { time: '17:00', title: 'Conseil de département', room: 'Salle du conseil', status: 'pending' },
]

const DEMO_ACTIVITY = [
  { text: 'Jean Martin a planifié Salle A101', time: 'Il y a 2h', color: 'bg-primary-500' },
  { text: 'Nouvelle salle B203 ajoutée', time: 'Il y a 4h', color: 'bg-success-500' },
  { text: 'Conflit détecté : Amphi B, 14h-16h', time: 'Il y a 5h', color: 'bg-error-500' },
  { text: 'Marie Dupont a annulé sa séance', time: 'Hier, 18h', color: 'bg-warning-500' },
  { text: 'Mise à jour du planning semaine 12', time: 'Hier, 14h', color: 'bg-primary-500' },
]

const quickActions = [
  { label: 'Nouvelle séance', icon: Plus, href: '/bookings' },
  { label: 'Gérer les salles', icon: Building2, href: '/rooms' },
  { label: 'Voir le planning', icon: Calendar, href: '/planning' },
]

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-primary-100 text-primary-700',
  in_progress: 'bg-warning-100 text-warning-700',
  completed: 'bg-success-100 text-success-700',
  cancelled: 'bg-error-100 text-error-700',
}

// ==================== COMPOSANT ====================

interface DashboardPageProps {
  onNavigate?: (path: string) => void
}

function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuthContext()
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })
  const displayName = user?.firstName || user?.email?.split('@')[0] || 'utilisateur'

  const isTeacher = isTeacherRole(user?.role)
  const isStudent = isStudentRole(user?.role)

  // Hooks données réelles
  const { bookings, isLoading: bookingsLoading, upcomingBookings, bookingsByStatus } = useBookings()
  const { rooms, isLoading: roomsLoading, totalCapacity } = useRooms()
  const { userStats, isLoading: usersLoading, teachers } = useUsers()
  const { subjects, classes, classSubjects, getSubjectIdsForTeacher, getClassIdsForStudent, teacherSubjects, teachers: academicTeachers } = useAcademicData()

  // Quotas d'utilisation
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null)

  useEffect(() => {
    if (isDemoMode || !user?.establishmentId) return
    SubscriptionLimitsService.getUsageSummary(user.establishmentId).then(setUsageSummary)
  }, [user?.establishmentId])

  // Loading global
  const isLoading = bookingsLoading || roomsLoading || usersLoading

  // ==================== DONNÉES CALCULÉES ====================

  // KPI Stats
  const stats = useMemo(() => {
    if (isDemoMode) return DEMO_STATS

    const inProgressCount = bookingsByStatus['in_progress']?.length ?? 0
    const scheduledCount = bookingsByStatus['scheduled']?.length ?? 0

    return [
      {
        label: 'Salles',
        value: String(rooms.length),
        change: `${totalCapacity} places`,
        changeType: 'success' as const,
        icon: Building2,
        iconBg: 'bg-primary-100',
        iconColor: 'text-primary-600',
      },
      {
        label: 'Séances',
        value: String(bookings.length),
        change: `${scheduledCount} planifiées`,
        changeType: 'success' as const,
        icon: CalendarCheck,
        iconBg: 'bg-success-100',
        iconColor: 'text-success-600',
      },
      {
        label: 'En cours',
        value: String(inProgressCount),
        change: 'En direct',
        changeType: 'warning' as const,
        icon: Clock,
        iconBg: 'bg-warning-100',
        iconColor: 'text-warning-600',
      },
      {
        label: 'Utilisateurs',
        value: String(userStats.total),
        change: `${teachers.length} enseignants`,
        changeType: 'success' as const,
        icon: Users,
        iconBg: 'bg-error-100',
        iconColor: 'text-error-600',
      },
    ]
  }, [isDemoMode, rooms.length, totalCapacity, bookings.length, bookingsByStatus, userStats.total, teachers.length])

  // Prochaines séances
  const nextSessions = useMemo(() => {
    if (isDemoMode) return null // fallback sur DEMO_BOOKINGS dans le JSX

    return upcomingBookings.map(b => ({
      time: format(new Date(b.startDateTime), 'HH:mm'),
      title: b.title,
      room: b.room?.name || 'Salle inconnue',
      status: b.status,
    }))
  }, [isDemoMode, upcomingBookings])

  // Activité récente (dérivée des bookings triés par updatedAt)
  const recentActivity = useMemo(() => {
    if (isDemoMode) return null // fallback sur DEMO_ACTIVITY dans le JSX

    const sorted = [...bookings]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)

    return sorted.map(b => {
      const userName = b.user
        ? `${b.user.firstName} ${b.user.lastName}`.trim()
        : 'Quelqu\'un'

      let text: string
      let color: string
      switch (b.status) {
        case 'scheduled':
          text = `${userName} a planifié "${b.title}"`
          color = 'bg-primary-500'
          break
        case 'in_progress':
          text = `"${b.title}" est en cours`
          color = 'bg-warning-500'
          break
        case 'cancelled':
          text = `${userName} a annulé "${b.title}"`
          color = 'bg-error-500'
          break
        case 'completed':
          text = `"${b.title}" terminée`
          color = 'bg-success-500'
          break
        default:
          text = `"${b.title}" mise à jour`
          color = 'bg-primary-500'
      }

      const time = formatDistanceToNow(new Date(b.updatedAt), { locale: fr, addSuffix: true })

      return { text, time, color }
    })
  }, [isDemoMode, bookings])

  // Taux d'occupation moyen (semaine courante, Lu-Ve, 8h-18h)
  const globalOccupation = useMemo(() => {
    if (isDemoMode || rooms.length === 0) return null

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const TOTAL_MINUTES = 50 * 60 // 5 jours × 10h

    let totalPct = 0

    for (const room of rooms) {
      const roomBookings = bookings.filter(
        b => b.roomId === room.id && b.status !== 'cancelled'
      )

      let totalMinutes = 0

      for (const b of roomBookings) {
        const bStart = new Date(b.startDateTime)
        const bEnd = new Date(b.endDateTime)

        if (bEnd <= weekStart || bStart >= weekEnd) continue

        for (let d = 0; d < 5; d++) {
          const dayStart = new Date(weekStart)
          dayStart.setDate(dayStart.getDate() + d)
          dayStart.setHours(8, 0, 0, 0)

          const dayEnd = new Date(dayStart)
          dayEnd.setHours(18, 0, 0, 0)

          const clippedStart = new Date(Math.max(bStart.getTime(), dayStart.getTime()))
          const clippedEnd = new Date(Math.min(bEnd.getTime(), dayEnd.getTime()))

          if (clippedStart < clippedEnd) {
            totalMinutes += differenceInMinutes(clippedEnd, clippedStart)
          }
        }
      }

      const pct = Math.min(Math.round((totalMinutes / TOTAL_MINUTES) * 100), 100)
      totalPct += pct
    }

    return Math.round(totalPct / rooms.length)
  }, [isDemoMode, rooms, bookings])

  // Quotas barres de progression
  const quotaItems = useMemo(() => {
    if (!usageSummary) return null

    const items = [
      { label: 'Utilisateurs', ...usageSummary.users },
      { label: 'Salles', ...usageSummary.rooms },
      { label: 'Séances ce mois', ...usageSummary.bookingsThisMonth },
    ]

    return items.map(item => {
      const isUnlimited = item.max === -1
      const pct = isUnlimited ? 0 : Math.round((item.current / item.max) * 100)
      const colorClass = isUnlimited
        ? 'bg-primary-500'
        : pct > 90
          ? 'bg-error-500'
          : pct > 70
            ? 'bg-warning-500'
            : 'bg-success-500'

      return {
        label: item.label,
        current: item.current,
        max: item.max,
        pct,
        isUnlimited,
        colorClass,
      }
    })
  }, [usageSummary])

  // ==================== DONNÉES ÉTUDIANT ====================

  const studentData = useMemo(() => {
    if (!isStudent || !user?.id) return null

    // Classes de l'étudiant
    const myClassIds = getClassIdsForStudent(user.id)
    const myClasses = classes.filter(c => myClassIds.includes(c.id))

    // Matières de l'étudiant (via class_subjects filtrées par ses classes)
    const mySubjectIds = new Set<string>()
    for (const cs of classSubjects) {
      if (myClassIds.includes(cs.class_id)) {
        mySubjectIds.add(cs.subject_id)
      }
    }
    const mySubjects = subjects.filter(s => mySubjectIds.has(s.id))

    // Séances de l'étudiant (filtrées par classId)
    const myBookings = bookings.filter(b => b.classId && myClassIds.includes(b.classId))

    // Professeurs (via teacherSubjects liés aux matières de l'étudiant)
    const myTeacherIds = new Set<string>()
    for (const ts of teacherSubjects) {
      if (mySubjectIds.has(ts.subject_id)) {
        myTeacherIds.add(ts.teacher_id)
      }
    }
    const myTeachers = academicTeachers.filter(t => myTeacherIds.has(t.id))

    // Stats semaine courante
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const weekBookings = myBookings.filter(b => {
      if (!b.startDateTime) return false
      const d = new Date(b.startDateTime)
      return d >= weekStart && d <= weekEnd && b.status !== 'cancelled'
    })

    // Prochaines séances (futures, triées)
    const upcoming = myBookings
      .filter(b => b.startDateTime && new Date(b.startDateTime) >= now && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())

    return {
      myClasses,
      mySubjects,
      myTeachers,
      weekSessionCount: weekBookings.length,
      upcoming,
      nextSession: upcoming[0] || null,
    }
  }, [isStudent, user?.id, classes, subjects, classSubjects, bookings, teacherSubjects, academicTeachers, getClassIdsForStudent])

  // ==================== DONNÉES PROFESSEUR ====================

  const teacherData = useMemo(() => {
    if (!isTeacher || !user?.id) return null

    // Matières du professeur
    const mySubjectIds = getSubjectIdsForTeacher(user.id)
    const mySubjects = subjects.filter(s => mySubjectIds.includes(s.id))

    // Classes du professeur (via class_subjects croisé avec ses matières)
    const myClassIds = new Set<string>()
    for (const cs of classSubjects) {
      if (mySubjectIds.includes(cs.subject_id)) {
        myClassIds.add(cs.class_id)
      }
    }
    const myClasses = classes.filter(c => myClassIds.has(c.id))

    // Séances du professeur (userId = trainer_id dans transforms.ts)
    const myBookings = bookings.filter(b => b.userId === user.id)

    // Stats semaine courante
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const weekBookings = myBookings.filter(b => {
      if (!b.startDateTime) return false
      const d = new Date(b.startDateTime)
      return d >= weekStart && d <= weekEnd && b.status !== 'cancelled'
    })

    const weekHours = weekBookings.reduce((acc, b) => {
      if (!b.startDateTime || !b.endDateTime) return acc
      return acc + differenceInMinutes(new Date(b.endDateTime), new Date(b.startDateTime))
    }, 0)

    // Prochaines séances (futures, triées)
    const upcoming = myBookings
      .filter(b => b.startDateTime && new Date(b.startDateTime) >= now && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())

    return {
      mySubjects,
      myClasses,
      weekSessionCount: weekBookings.length,
      weekHours: Math.round(weekHours / 60 * 10) / 10,
      upcoming,
      nextSession: upcoming[0] || null,
    }
  }, [isTeacher, user?.id, subjects, classes, classSubjects, bookings, getSubjectIdsForTeacher])

  // ==================== RENDU ÉTUDIANT ====================

  if (isStudent && studentData) {
    if (isLoading && !isDemoMode) {
      return (
        <div className="flex items-center justify-center py-20">
          <LoadingState size="lg" text="Chargement du tableau de bord..." />
        </div>
      )
    }

    const className = studentData.myClasses.map(c => c.name).join(', ') || 'Aucune classe'

    return (
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Bonjour, {displayName}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 capitalize">{today}</p>
            <p className="text-sm font-medium text-primary-600 mt-1">{className}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Séances cette semaine</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{studentData.weekSessionCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary-100">
                <CalendarCheck size={22} className="text-primary-600" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Mes matières</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{studentData.mySubjects.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-success-100">
                <BookOpen size={22} className="text-success-600" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Mes professeurs</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{studentData.myTeachers.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-error-100">
                <Users size={22} className="text-error-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Prochaine séance mise en avant */}
        {studentData.nextSession && (
          <div className="card border-l-4 border-l-primary-600 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap size={20} className="text-primary-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Prochaine séance</h2>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{studentData.nextSession.title}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {studentData.nextSession.room?.name || 'Salle non définie'}
                </p>
              </div>
              <div className="text-right ml-auto">
                <p className="text-sm font-semibold text-primary-600">
                  {format(new Date(studentData.nextSession.startDateTime), "EEEE d MMM", { locale: fr })}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {format(new Date(studentData.nextSession.startDateTime), 'HH:mm')} - {format(new Date(studentData.nextSession.endDateTime), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two columns: upcoming + subjects/teachers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Prochaines séances */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Prochaines séances</h2>
            </div>
            <div className="space-y-3">
              {studentData.upcoming.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-6">Aucune séance à venir</p>
              ) : (
                studentData.upcoming.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 w-14 shrink-0">
                      {format(new Date(b.startDateTime), 'HH:mm')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{b.title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {b.room?.name || 'Salle inconnue'} · {format(new Date(b.startDateTime), 'EEE d MMM', { locale: fr })}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_COLORS[b.status] || 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Matières & Professeurs */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Mes matières</h2>
              {studentData.mySubjects.length === 0 ? (
                <p className="text-sm text-neutral-400">Aucune matière assignée</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {studentData.mySubjects.map(s => (
                    <span key={s.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Mes professeurs</h2>
              {studentData.myTeachers.length === 0 ? (
                <p className="text-sm text-neutral-400">Aucun professeur assigné</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {studentData.myTeachers.map(t => (
                    <span key={t.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300">
                      {t.firstName} {t.lastName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accès rapide */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Accès rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className="card flex items-center gap-4 hover:border-primary-200 hover:shadow-medium transition-all text-left"
              onClick={() => onNavigate?.('/planning')}
            >
              <div className="p-3 bg-primary-50 rounded-xl">
                <Calendar size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mon emploi du temps</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Voir le calendrier</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==================== RENDU PROFESSEUR ====================

  if (isTeacher && teacherData) {
    if (isLoading && !isDemoMode) {
      return (
        <div className="flex items-center justify-center py-20">
          <LoadingState size="lg" text="Chargement du tableau de bord..." />
        </div>
      )
    }

    return (
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Bonjour, {displayName}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1 capitalize">{today}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Séances cette semaine</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{teacherData.weekSessionCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary-100">
                <CalendarCheck size={22} className="text-primary-600" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Heures cette semaine</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{teacherData.weekHours}h</p>
              </div>
              <div className="p-3 rounded-xl bg-warning-100">
                <Clock size={22} className="text-warning-600" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Mes matières</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{teacherData.mySubjects.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-success-100">
                <BookOpen size={22} className="text-success-600" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Mes classes</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{teacherData.myClasses.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-error-100">
                <Layers size={22} className="text-error-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Prochaine séance mise en avant */}
        {teacherData.nextSession && (
          <div className="card border-l-4 border-l-primary-600 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap size={20} className="text-primary-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Prochaine séance</h2>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{teacherData.nextSession.title}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {teacherData.nextSession.room?.name || 'Salle non définie'}
                </p>
              </div>
              <div className="text-right ml-auto">
                <p className="text-sm font-semibold text-primary-600">
                  {format(new Date(teacherData.nextSession.startDateTime), "EEEE d MMM", { locale: fr })}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {format(new Date(teacherData.nextSession.startDateTime), 'HH:mm')} - {format(new Date(teacherData.nextSession.endDateTime), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two columns: upcoming + subjects/classes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Prochaines séances */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Prochaines séances</h2>
              <button
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                onClick={() => onNavigate?.('/bookings')}
              >
                Voir tout <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {teacherData.upcoming.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-6">Aucune séance à venir</p>
              ) : (
                teacherData.upcoming.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 w-14 shrink-0">
                      {format(new Date(b.startDateTime), 'HH:mm')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{b.title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {b.room?.name || 'Salle inconnue'} · {format(new Date(b.startDateTime), 'EEE d MMM', { locale: fr })}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_COLORS[b.status] || 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Matières & Classes */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Mes matières</h2>
              {teacherData.mySubjects.length === 0 ? (
                <p className="text-sm text-neutral-400">Aucune matière assignée</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teacherData.mySubjects.map(s => (
                    <span key={s.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Mes classes</h2>
              {teacherData.myClasses.length === 0 ? (
                <p className="text-sm text-neutral-400">Aucune classe assignée</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teacherData.myClasses.map(c => (
                    <span key={c.id} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-300">
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accès rapides */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Accès rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className="card flex items-center gap-4 hover:border-primary-200 hover:shadow-medium transition-all text-left"
              onClick={() => onNavigate?.('/planning')}
            >
              <div className="p-3 bg-primary-50 rounded-xl">
                <Calendar size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mon planning</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Voir le calendrier</p>
              </div>
            </button>
            <button
              className="card flex items-center gap-4 hover:border-primary-200 hover:shadow-medium transition-all text-left"
              onClick={() => onNavigate?.('/bookings')}
            >
              <div className="p-3 bg-primary-50 rounded-xl">
                <CalendarCheck size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mes séances</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Liste des séances</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==================== RENDU ADMIN ====================

  // Données affichées (réelles ou démo)
  const displayBookings = nextSessions ?? DEMO_BOOKINGS
  const displayActivity = recentActivity ?? DEMO_ACTIVITY

  if (isLoading && !isDemoMode) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingState size="lg" text="Chargement du tableau de bord..." />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Bonjour, {displayName}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 capitalize">{today}</p>
        </div>
        <button
          className="btn-primary mt-4 sm:mt-0 flex items-center gap-2"
          onClick={() => onNavigate?.('/bookings')}
        >
          <Plus size={18} />
          Nouvelle séance
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                <stat.icon size={22} className={stat.iconColor} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {stat.changeType === 'success' && (
                <ArrowUpRight size={14} className="text-success-600" />
              )}
              {stat.changeType === 'warning' && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning-500" />
                </span>
              )}
              <span className={`text-sm font-medium ${
                stat.changeType === 'success' ? 'text-success-600' : 'text-warning-600'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Taux d'occupation moyen */}
      <div className="mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Gauge size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Taux d'occupation moyen</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Semaine en cours (Lu-Ve, 8h-18h)</p>
            </div>
          </div>
          {!isDemoMode && globalOccupation !== null ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      globalOccupation > 80 ? 'bg-error-500' : globalOccupation > 50 ? 'bg-warning-500' : 'bg-success-500'
                    }`}
                    style={{ width: `${globalOccupation}%` }}
                  />
                </div>
              </div>
              <span className={`text-lg font-bold ${
                globalOccupation > 80 ? 'text-error-600' : globalOccupation > 50 ? 'text-warning-600' : 'text-success-600'
              }`}>
                {globalOccupation}%
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: '62%' }} />
                </div>
              </div>
              <span className="text-lg font-bold text-primary-600">62%</span>
            </div>
          )}
        </div>
      </div>

      {/* Quotas d'utilisation (masqués en mode démo) */}
      {!isDemoMode && quotaItems && (
        <div className="mb-8">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-50 rounded-lg">
                <BarChart3 size={20} className="text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Quotas d'utilisation</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quotaItems.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-neutral-600 dark:text-neutral-400">{item.label}</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {item.current} / {item.isUnlimited ? 'Illimité' : item.max}
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.colorClass}`}
                      style={{ width: item.isUnlimited ? '10%' : `${Math.min(item.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upcoming bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Prochaines séances</h2>
            <button
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              onClick={() => onNavigate?.('/bookings')}
            >
              Voir tout <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {displayBookings.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-6">Aucune séance à venir</p>
            ) : (
              displayBookings.map((booking, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 w-14 shrink-0">
                    {booking.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{booking.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{booking.room}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                    STATUS_COLORS[booking.status] || 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {STATUS_LABELS[booking.status] || booking.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Activité récente</h2>
          </div>
          <div className="space-y-4">
            {displayActivity.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-6">Aucune activité récente</p>
            ) : (
              displayActivity.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color} mt-1.5`} />
                    {i < displayActivity.length - 1 && (
                      <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-700 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{item.text}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="card flex items-center gap-4 hover:border-primary-200 hover:shadow-medium transition-all text-left"
              onClick={() => onNavigate?.(action.href)}
            >
              <div className="p-3 bg-primary-50 rounded-xl">
                <action.icon size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{action.label}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Accès rapide</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
