/**
 * Page Presences - Suivi des presences etudiants
 * 3 vues selon le role: Teacher / Admin / Student
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  ClipboardCheck, UserCheck, Clock, AlertTriangle,
  Calendar, Filter, Search, Check, X,
  BarChart3, Download, Send, ToggleLeft, ToggleRight, Lock,
} from 'lucide-react'
import { isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { FeatureGate } from '@/components/addons/FeatureGate'
import { Button, Badge, Card, CardContent, HelpBanner } from '@/components/ui'
import { useBookings } from '@/hooks/useBookings'
import { useBulletins } from '@/hooks/useBulletins'
import { useStudentContacts } from '@/hooks/useStudentContacts'
import { generateAttendanceCertificatePDF } from '@/utils/export-bulletin'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ==================== TYPES ====================

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface AttendanceRecord {
  id: string
  sessionId: string
  sessionTitle: string
  studentId: string
  studentName: string
  status: AttendanceStatus
  date: string
  time: string
  markedBy?: string
  comment?: string
}

interface SessionForAttendance {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  className: string
  room: string
  totalStudents: number
  markedCount: number
}

interface StudentAttendanceStats {
  studentId: string
  studentName: string
  className: string
  totalSessions: number
  present: number
  absent: number
  late: number
  excused: number
  rate: number
}

// ==================== DEMO DATA ====================

const DEMO_SESSIONS: SessionForAttendance[] = [
  {
    id: '1', title: 'Mathematiques - Algebre', date: '2026-03-04',
    startTime: '09:00', endTime: '11:00', className: 'BTS SIO 1A',
    room: 'Salle 101', totalStudents: 25, markedCount: 0,
  },
  {
    id: '2', title: 'Anglais Professionnel', date: '2026-03-04',
    startTime: '11:15', endTime: '12:45', className: 'BTS SIO 1A',
    room: 'Salle 203', totalStudents: 25, markedCount: 25,
  },
  {
    id: '3', title: 'Developpement Web', date: '2026-03-04',
    startTime: '14:00', endTime: '16:00', className: 'BTS SIO 2A',
    room: 'Labo Info 1', totalStudents: 22, markedCount: 20,
  },
]

const DEMO_STUDENTS_IN_SESSION = [
  { id: 's1', name: 'Dupont Alice', status: null as AttendanceStatus | null },
  { id: 's2', name: 'Martin Lucas', status: null as AttendanceStatus | null },
  { id: 's3', name: 'Bernard Emma', status: null as AttendanceStatus | null },
  { id: 's4', name: 'Petit Thomas', status: null as AttendanceStatus | null },
  { id: 's5', name: 'Robert Julie', status: null as AttendanceStatus | null },
  { id: 's6', name: 'Richard Hugo', status: null as AttendanceStatus | null },
  { id: 's7', name: 'Moreau Lea', status: null as AttendanceStatus | null },
  { id: 's8', name: 'Simon Nathan', status: null as AttendanceStatus | null },
]

const DEMO_ADMIN_STATS: StudentAttendanceStats[] = [
  { studentId: 's1', studentName: 'Dupont Alice', className: 'BTS SIO 1A', totalSessions: 48, present: 45, absent: 1, late: 2, excused: 0, rate: 93.8 },
  { studentId: 's2', studentName: 'Martin Lucas', className: 'BTS SIO 1A', totalSessions: 48, present: 40, absent: 5, late: 3, excused: 0, rate: 83.3 },
  { studentId: 's3', studentName: 'Bernard Emma', className: 'BTS SIO 2A', totalSessions: 52, present: 50, absent: 0, late: 1, excused: 1, rate: 96.2 },
  { studentId: 's4', studentName: 'Petit Thomas', className: 'BTS SIO 2A', totalSessions: 52, present: 35, absent: 12, late: 3, excused: 2, rate: 67.3 },
  { studentId: 's5', studentName: 'Robert Julie', className: 'Licence Pro', totalSessions: 40, present: 38, absent: 1, late: 1, excused: 0, rate: 95.0 },
  { studentId: 's6', studentName: 'Richard Hugo', className: 'Licence Pro', totalSessions: 40, present: 32, absent: 6, late: 2, excused: 0, rate: 80.0 },
]

const DEMO_STUDENT_HISTORY: AttendanceRecord[] = [
  { id: '1', sessionId: 's1', sessionTitle: 'Mathematiques - Algebre', studentId: 'me', studentName: 'Moi', status: 'present', date: '2026-03-04', time: '09:00' },
  { id: '2', sessionId: 's2', sessionTitle: 'Anglais Professionnel', studentId: 'me', studentName: 'Moi', status: 'present', date: '2026-03-04', time: '11:15' },
  { id: '3', sessionId: 's3', sessionTitle: 'Developpement Web', studentId: 'me', studentName: 'Moi', status: 'late', date: '2026-03-03', time: '14:00', comment: 'Retard 10 min' },
  { id: '4', sessionId: 's4', sessionTitle: 'Base de donnees', studentId: 'me', studentName: 'Moi', status: 'absent', date: '2026-03-02', time: '09:00' },
  { id: '5', sessionId: 's5', sessionTitle: 'Mathematiques - Algebre', studentId: 'me', studentName: 'Moi', status: 'excused', date: '2026-02-28', time: '09:00', comment: 'Certificat medical' },
  { id: '6', sessionId: 's6', sessionTitle: 'Anglais Professionnel', studentId: 'me', studentName: 'Moi', status: 'present', date: '2026-02-28', time: '11:15' },
  { id: '7', sessionId: 's7', sessionTitle: 'Developpement Web', studentId: 'me', studentName: 'Moi', status: 'present', date: '2026-02-27', time: '14:00' },
  { id: '8', sessionId: 's8', sessionTitle: 'Base de donnees', studentId: 'me', studentName: 'Moi', status: 'present', date: '2026-02-27', time: '09:00' },
]

// ==================== STATUS HELPERS ====================

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; badgeVariant: 'success' | 'error' | 'warning' | 'info'; icon: typeof Check }> = {
  present: { label: 'Present', color: 'text-emerald-600', badgeVariant: 'success', icon: Check },
  absent: { label: 'Absent', color: 'text-red-600', badgeVariant: 'error', icon: X },
  late: { label: 'Retard', color: 'text-amber-600', badgeVariant: 'warning', icon: Clock },
  excused: { label: 'Excuse', color: 'text-blue-600', badgeVariant: 'info', icon: AlertTriangle },
}

// ==================== SUB-COMPONENTS ====================

/** Modal de marquage des presences pour une seance */
function AttendanceMarkingModal({
  session,
  onClose,
}: {
  session: SessionForAttendance
  onClose: () => void
}) {
  const [students, setStudents] = useState(
    DEMO_STUDENTS_IN_SESSION.map(s => ({ ...s }))
  )

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, status } : s)
    )
  }

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' as AttendanceStatus })))
  }

  const markedCount = students.filter(s => s.status !== null).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {session.title}
              </h3>
              <p className="text-sm text-neutral-500 mt-0.5">
                {session.className} &middot; {session.room} &middot; {session.startTime} - {session.endTime}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
              <X size={20} className="text-neutral-500" />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <Button size="sm" variant="secondary" leftIcon={UserCheck} onClick={markAllPresent}>
              Tous presents
            </Button>
            <span className="text-sm text-neutral-500">
              {markedCount}/{students.length} marques
            </span>
          </div>
        </div>

        {/* Student list */}
        <div className="overflow-y-auto max-h-[55vh] divide-y divide-neutral-100 dark:divide-neutral-800">
          {students.map(student => (
            <div key={student.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {student.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => {
                  const cfg = STATUS_CONFIG[status]
                  const Icon = cfg.icon
                  const isSelected = student.status === status
                  return (
                    <button
                      key={status}
                      onClick={() => setStatus(student.id, status)}
                      title={cfg.label}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                        isSelected
                          ? `ring-2 ring-offset-1 ${
                              status === 'present' ? 'bg-emerald-100 text-emerald-700 ring-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-300' :
                              status === 'absent' ? 'bg-red-100 text-red-700 ring-red-400 dark:bg-red-900/40 dark:text-red-300' :
                              status === 'late' ? 'bg-amber-100 text-amber-700 ring-amber-400 dark:bg-amber-900/40 dark:text-amber-300' :
                              'bg-blue-100 text-blue-700 ring-blue-400 dark:bg-blue-900/40 dark:text-blue-300'
                            }`
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            leftIcon={Check}
            disabled={markedCount < students.length}
            onClick={() => {
              // In real mode this would call useAttendance().markAttendance()
              onClose()
            }}
          >
            Enregistrer ({markedCount}/{students.length})
          </Button>
        </div>
      </div>
    </div>
  )
}

// ==================== TEACHER VIEW ====================

function TeacherView() {
  const [selectedSession, setSelectedSession] = useState<SessionForAttendance | null>(null)
  const { bookings } = useBookings()
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })

  // Check real booking data for attendance_marking_enabled
  const sessionsWithMarkingStatus = useMemo(() => {
    return DEMO_SESSIONS.map(s => {
      const realBooking = bookings.find(b => b.id === s.id)
      return { ...s, markingEnabled: realBooking?.attendanceMarkingEnabled ?? true }
    })
  }, [bookings])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Mes seances du jour
          </h2>
          <p className="text-sm text-neutral-500 capitalize">{today}</p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={Calendar}>
          Autre date
        </Button>
      </div>

      {/* Session cards */}
      <div className="space-y-3">
        {sessionsWithMarkingStatus.map(session => {
          const isComplete = session.markedCount === session.totalStudents
          const isPartial = session.markedCount > 0 && !isComplete
          const isDisabled = !session.markingEnabled
          return (
            <div
              key={session.id}
              className={`bg-white dark:bg-neutral-900 rounded-xl border p-4 transition-all ${
                isDisabled
                  ? 'border-neutral-200 dark:border-neutral-700 opacity-60'
                  : isComplete
                    ? 'border-emerald-200 dark:border-emerald-800 hover:shadow-md cursor-pointer'
                    : isPartial
                      ? 'border-amber-200 dark:border-amber-800 hover:shadow-md cursor-pointer'
                      : 'border-neutral-200 dark:border-neutral-700 hover:shadow-md cursor-pointer'
              }`}
              onClick={() => !isDisabled && setSelectedSession(session)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isComplete
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-primary-100 dark:bg-primary-900/30'
                  }`}>
                    {isComplete
                      ? <Check size={20} className="text-emerald-600" />
                      : <ClipboardCheck size={20} className="text-primary-600" />
                    }
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                      {session.title}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {session.startTime} - {session.endTime} &middot; {session.room} &middot; {session.className}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {session.markedCount}/{session.totalStudents}
                    </div>
                    <div className="text-xs text-neutral-500">marques</div>
                  </div>
                  {isDisabled ? (
                    <Badge variant="neutral" size="sm" icon={Lock}>Desactive</Badge>
                  ) : isComplete ? (
                    <Badge variant="success" size="sm">Termine</Badge>
                  ) : isPartial ? (
                    <Badge variant="warning" size="sm">En cours</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">A faire</Badge>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isComplete ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-neutral-300'
                  }`}
                  style={{ width: `${session.totalStudents > 0 ? (session.markedCount / session.totalStudents) * 100 : 0}%` }}
                />
              </div>
              {isDisabled && (
                <p className="mt-2 text-xs text-neutral-500 italic flex items-center gap-1">
                  <Lock size={12} /> La saisie des presences est desactivee par l'administration
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Marking modal */}
      {selectedSession && (
        <AttendanceMarkingModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}

// ==================== ADMIN VIEW ====================

function AdminView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [selectedAdminSession, setSelectedAdminSession] = useState<SessionForAttendance | null>(null)
  const { bookings, toggleAttendanceMarking } = useBookings()
  const { sendAbsenceReport } = useBulletins()
  const { fetchContacts } = useStudentContacts()

  useEffect(() => { fetchContacts() }, [fetchContacts])
  // sendAbsenceReport used in handleSignalAbsences for real data
  void sendAbsenceReport

  // Today's sessions for admin marking
  const todaySessions = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return bookings
      .filter(b => b.startDateTime?.startsWith(today) && b.status !== 'cancelled')
      .map(b => ({
        id: b.id,
        title: b.title,
        date: today,
        startTime: b.startDateTime ? format(new Date(b.startDateTime), 'HH:mm') : '',
        endTime: b.endDateTime ? format(new Date(b.endDateTime), 'HH:mm') : '',
        className: b.niveau || '',
        room: b.room?.name || '',
        totalStudents: 0,
        markedCount: 0,
        attendanceMarkingEnabled: b.attendanceMarkingEnabled ?? true,
        bookingId: b.id,
      }))
  }, [bookings])

  const handleToggleMarking = useCallback(async (sessionId: string, enabled: boolean) => {
    await toggleAttendanceMarking(sessionId, enabled)
  }, [toggleAttendanceMarking])

  const handleSignalAbsences = useCallback(async (sessionId: string) => {
    const booking = bookings.find(b => b.id === sessionId)
    if (!booking) return
    // This would use real attendance data in production
    // Demo: just show toast
    const toast = (await import('react-hot-toast')).default
    toast.success('Signalements d\'absence envoyés aux contacts (demo)')
  }, [bookings])

  const classes = useMemo(() => {
    const set = new Set(DEMO_ADMIN_STATS.map(s => s.className))
    return Array.from(set)
  }, [])

  const filteredStats = useMemo(() => {
    let result = DEMO_ADMIN_STATS
    if (classFilter !== 'all') {
      result = result.filter(s => s.className === classFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.studentName.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)
      )
    }
    return result
  }, [searchQuery, classFilter])

  const globalRate = useMemo(() => {
    if (filteredStats.length === 0) return 0
    return filteredStats.reduce((sum, s) => sum + s.rate, 0) / filteredStats.length
  }, [filteredStats])

  const worstStudent = useMemo(() => {
    if (filteredStats.length === 0) return null
    return filteredStats.reduce((min, s) => s.rate < min.rate ? s : min, filteredStats[0])
  }, [filteredStats])

  const totalAbsences = useMemo(() =>
    filteredStats.reduce((sum, s) => sum + s.absent, 0),
    [filteredStats]
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UserCheck size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Taux global</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{globalRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Absences totales</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalAbsences}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <BarChart3 size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Etudiants suivis</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{filteredStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <AlertTriangle size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Pire taux</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {worstStudent ? `${worstStudent.rate.toFixed(1)}%` : '-'}
                </p>
                {worstStudent && (
                  <p className="text-xs text-neutral-500 truncate max-w-[140px]">{worstStudent.studentName}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin: today's sessions for marking + toggle */}
      {todaySessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
            Seances du jour — Marquage & controle
          </h3>
          {todaySessions.map(session => (
            <div key={session.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100">{session.title}</h4>
                  <p className="text-xs text-neutral-500">
                    {session.startTime} - {session.endTime} &middot; {session.room} &middot; {session.className}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleMarking(session.id, !session.attendanceMarkingEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      session.attendanceMarkingEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}
                    title={session.attendanceMarkingEnabled ? 'Saisie prof activee' : 'Saisie prof desactivee'}
                  >
                    {session.attendanceMarkingEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    Prof
                  </button>
                  <Button variant="secondary" size="sm" leftIcon={ClipboardCheck}
                    onClick={() => setSelectedAdminSession(session)}>
                    Marquer
                  </Button>
                  <Button variant="ghost" size="sm" leftIcon={Send}
                    onClick={() => handleSignalAbsences(session.id)}>
                    Signaler
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher un etudiant..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-neutral-400" />
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Toutes les classes</option>
            {classes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Button variant="secondary" size="sm" leftIcon={Download}>
          Exporter
        </Button>
      </div>

      {/* Stats table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Etudiant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Classe</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Seances</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span className="text-emerald-600">P</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span className="text-red-600">A</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span className="text-amber-600">R</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  <span className="text-blue-600">E</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Taux</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Certificat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredStats.map(stat => (
                <tr key={stat.studentId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {stat.studentName}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{stat.className}</td>
                  <td className="px-4 py-3 text-center text-neutral-600 dark:text-neutral-400">{stat.totalSessions}</td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-medium">{stat.present}</td>
                  <td className="px-4 py-3 text-center text-red-600 font-medium">{stat.absent}</td>
                  <td className="px-4 py-3 text-center text-amber-600 font-medium">{stat.late}</td>
                  <td className="px-4 py-3 text-center text-blue-600 font-medium">{stat.excused}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${
                      stat.rate >= 90 ? 'text-emerald-600' :
                      stat.rate >= 75 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {stat.rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        const doc = generateAttendanceCertificatePDF({
                          studentName: stat.studentName,
                          className: stat.className,
                          centerName: 'Mon Centre',
                          periodLabel: `${format(new Date(), 'yyyy')}`,
                          totalSessions: stat.totalSessions,
                          present: stat.present,
                          absent: stat.absent,
                          late: stat.late,
                          excused: stat.excused,
                          attendanceRate: stat.rate,
                        })
                        doc.save(`certificat_assiduite_${stat.studentName.replace(/\s+/g, '_')}.pdf`)
                      }}
                      className="text-primary-600 hover:text-primary-700"
                      title="Télécharger certificat d'assiduité"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStats.length === 0 && (
          <div className="text-center py-10 text-neutral-500">
            Aucun etudiant ne correspond aux filtres.
          </div>
        )}
      </div>

      {/* Admin marking modal */}
      {selectedAdminSession && (
        <AttendanceMarkingModal
          session={selectedAdminSession}
          onClose={() => setSelectedAdminSession(null)}
        />
      )}
    </div>
  )
}

// ==================== STUDENT VIEW ====================

function StudentView() {
  const totalSessions = DEMO_STUDENT_HISTORY.length
  const presentCount = DEMO_STUDENT_HISTORY.filter(r => r.status === 'present').length
  const absentCount = DEMO_STUDENT_HISTORY.filter(r => r.status === 'absent').length
  const lateCount = DEMO_STUDENT_HISTORY.filter(r => r.status === 'late').length
  const rate = totalSessions > 0 ? ((presentCount + lateCount) / totalSessions) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Personal summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-2">
              <BarChart3 size={20} className="text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{rate.toFixed(1)}%</p>
            <p className="text-xs text-neutral-500">Taux de presence</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
              <Check size={20} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
            <p className="text-xs text-neutral-500">Presences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
              <X size={20} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            <p className="text-xs text-neutral-500">Absences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
              <Clock size={20} className="text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
            <p className="text-xs text-neutral-500">Retards</p>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Historique
        </h3>
        <div className="space-y-2">
          {DEMO_STUDENT_HISTORY.map(record => {
            const cfg = STATUS_CONFIG[record.status]
            const StatusIcon = cfg.icon
            return (
              <div
                key={record.id}
                className={`flex items-center justify-between bg-white dark:bg-neutral-900 rounded-xl border px-4 py-3 ${
                  record.status === 'present' ? 'border-neutral-200 dark:border-neutral-700' :
                  record.status === 'absent' ? 'border-l-4 border-l-red-400 border-neutral-200 dark:border-neutral-700' :
                  record.status === 'late' ? 'border-l-4 border-l-amber-400 border-neutral-200 dark:border-neutral-700' :
                  'border-l-4 border-l-blue-400 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    record.status === 'present' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    record.status === 'absent' ? 'bg-red-100 dark:bg-red-900/30' :
                    record.status === 'late' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <StatusIcon size={16} className={cfg.color} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {record.sessionTitle}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {format(new Date(record.date), 'EEEE d MMMM', { locale: fr })} &middot; {record.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.comment && (
                    <span className="text-xs text-neutral-400 italic hidden sm:inline">{record.comment}</span>
                  )}
                  <Badge variant={cfg.badgeVariant} size="sm">
                    {cfg.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function AttendancePage() {
  const { user } = useAuthContext()
  const role = user?.role

  return (
    <FeatureGate feature="attendance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <ClipboardCheck size={22} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Presences
            </h1>
            <p className="text-sm text-neutral-500">
              {role === 'teacher'
                ? 'Marquez les presences de vos seances'
                : role === 'student'
                  ? 'Consultez votre historique de presences'
                  : 'Vue globale des presences par classe et etudiant'}
            </p>
          </div>
        </div>

        <HelpBanner storageKey={role === 'teacher' ? 'teacher-attendance' : role === 'student' ? 'student-attendance' : 'admin-attendance'}>
          {role === 'teacher'
            ? "Saisissez les présences de vos étudiants séance par séance. Sélectionnez une séance dans la liste, puis marquez chaque étudiant comme présent, absent, en retard ou excusé."
            : role === 'student'
              ? "Consultez votre historique de présences et votre taux d'assiduité. Les absences non excusées apparaissent en rouge. Contactez l'administration pour justifier une absence."
              : "Suivez les présences de vos étudiants : taux global, absences par matière, signalement aux contacts. Vous pouvez saisir directement les présences ou activer/désactiver la saisie par les professeurs."}
        </HelpBanner>

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle size={16} />
            Mode demonstration : les donnees affichees sont fictives.
          </div>
        )}

        {/* Role-based view */}
        {role === 'teacher' && <TeacherView />}
        {role === 'student' && <StudentView />}
        {(role === 'admin' || role === 'super_admin' || role === 'staff') && <AdminView />}
        {!role && <AdminView />}
      </div>
    </FeatureGate>
  )
}
