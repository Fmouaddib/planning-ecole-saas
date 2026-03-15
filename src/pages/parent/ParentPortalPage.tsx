/**
 * ParentPortalPage — public read-only dashboard for parents/guardians.
 * Accessed via /parent/:token (no authentication required).
 * The access token in the URL is the sole credential.
 */
import { useMemo } from 'react'
import { useParentPortal } from '@/hooks/useParentPortal'
import type { ParentScheduleEntry } from '@/hooks/useParentPortal'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  GraduationCap,
  CalendarDays,
  ClipboardCheck,
  FileText,

  MapPin,
  User,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'

interface Props {
  token: string
}

// ── Helpers ──

function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), 'EEEE d MMM yyyy, HH:mm', { locale: fr })
  } catch {
    return iso
  }
}

function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm', { locale: fr })
  } catch {
    return iso
  }
}

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd MMM yyyy', { locale: fr })
  } catch {
    return iso
  }
}

function dayLabel(iso: string): string {
  try {
    const d = parseISO(iso)
    if (isToday(d)) return "Aujourd'hui"
    if (isTomorrow(d)) return 'Demain'
    return format(d, 'EEEE d MMM', { locale: fr })
  } catch {
    return iso
  }
}

const statusLabels: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'En retard',
  excused: 'Excuse',
}

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  excused: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}

const evalTypeLabels: Record<string, string> = {
  exam: 'Examen',
  assignment: 'Devoir',
  project: 'Projet',
  oral: 'Oral',
  quiz: 'Quiz',
  continuous: 'Controle continu',
}

function gradeColor(grade: number, max: number): string {
  const ratio = grade / max
  if (ratio >= 0.7) return 'text-green-600 dark:text-green-400'
  if (ratio >= 0.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// ── Components ──

function SectionCard({ title, icon: Icon, children, hidden }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  hidden?: boolean
}) {
  if (hidden) return null
  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
        <Icon size={18} className="text-primary-500" />
        <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      </div>
      <div className="px-4 py-4 sm:px-6">{children}</div>
    </section>
  )
}

function StatBadge({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl ${color}`}>
      <span className="text-lg sm:text-xl font-bold">{value}</span>
      <span className="text-[11px] sm:text-xs font-medium opacity-80">{label}</span>
    </div>
  )
}

// ── Main Page ──

export default function ParentPortalPage({ token }: Props) {
  const { data, isLoading, error, refetch } = useParentPortal(token)

  // Group schedule by day
  const scheduleByDay = useMemo(() => {
    if (!data?.weekSchedule.length) return []
    const map = new Map<string, ParentScheduleEntry[]>()
    for (const s of data.weekSchedule) {
      const dayKey = s.startTime.slice(0, 10) // YYYY-MM-DD
      const list = map.get(dayKey) || []
      list.push(s)
      map.set(dayKey, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [data?.weekSchedule])

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Chargement du portail parent...</p>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Acces refuse</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            {error || 'Impossible de charger les donnees.'}
          </p>
          <p className="text-neutral-400 dark:text-neutral-500 text-xs">
            Si vous pensez qu'il s'agit d'une erreur, contactez l'etablissement de votre enfant.
          </p>
        </div>
      </div>
    )
  }

  const { contact, student, grades, subjectAverages, attendance, recentAbsences, bulletins, weekSchedule } = data

  const relationLabels: Record<string, string> = {
    parent: 'Parent',
    tuteur_pro: 'Tuteur professionnel',
    responsable_legal: 'Responsable legal',
    autre: 'Contact',
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                Portail Parent
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                {relationLabels[contact.relationship] || 'Contact'} : {contact.firstName} {contact.lastName}
              </p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} className="text-neutral-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Student card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {student.fullName}
              </h2>
              {student.className && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <BookOpen size={14} />
                  {student.className}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Schedule */}
        <SectionCard title="Emploi du temps (semaine)" icon={CalendarDays}>
          {weekSchedule.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
              Aucune seance cette semaine.
            </p>
          ) : (
            <div className="space-y-4">
              {scheduleByDay.map(([dayKey, sessions]) => (
                <div key={dayKey}>
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    {dayLabel(dayKey + 'T00:00:00')}
                  </h3>
                  <div className="space-y-2">
                    {sessions.map(s => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl px-3 py-2.5"
                      >
                        <div className="flex-shrink-0 text-center min-w-[52px]">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {formatTime(s.startTime)}
                          </p>
                          <p className="text-[11px] text-neutral-400">{formatTime(s.endTime)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {s.subjectName || s.title}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {s.teacherName && (
                              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                <User size={10} /> {s.teacherName}
                              </span>
                            )}
                            {s.roomName && (
                              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                <MapPin size={10} /> {s.roomName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Grades */}
        <SectionCard title="Notes" icon={TrendingUp} hidden={!contact.receiveBulletins}>
          {grades.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
              Aucune note publiee pour le moment.
            </p>
          ) : (
            <>
              {/* Subject averages */}
              {subjectAverages.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Moyennes par matiere
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {subjectAverages.map(sa => (
                      <div
                        key={sa.subjectName}
                        className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl px-3 py-2 text-center"
                      >
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mb-0.5">
                          {sa.subjectName}
                        </p>
                        <p className={`text-lg font-bold ${sa.average != null ? gradeColor(sa.average, 20) : 'text-neutral-400'}`}>
                          {sa.average != null ? sa.average.toFixed(2) : '-'}
                          <span className="text-[10px] font-normal text-neutral-400">/20</span>
                        </p>
                        <p className="text-[10px] text-neutral-400">{sa.evaluationCount} eval.</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent grades */}
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                Dernieres notes
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {grades.slice(0, 20).map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 rounded-xl px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {g.evaluationTitle}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {g.subjectName} -- {evalTypeLabels[g.evaluationType] || g.evaluationType} -- {formatDate(g.date)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {g.isAbsent ? (
                        <span className="text-xs font-medium text-red-500">ABS</span>
                      ) : g.grade != null ? (
                        <span className={`text-base font-bold ${gradeColor(g.grade, g.maxGrade)}`}>
                          {g.grade}<span className="text-[10px] font-normal text-neutral-400">/{g.maxGrade}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* Attendance */}
        <SectionCard title="Presences" icon={ClipboardCheck} hidden={!contact.receiveAbsences}>
          {attendance.totalSessions === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
              Aucune donnee de presence disponible.
            </p>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <StatBadge
                  label="Taux"
                  value={`${attendance.attendanceRate}%`}
                  color={attendance.attendanceRate >= 80
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : attendance.attendanceRate >= 60
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }
                />
                <StatBadge label="Present" value={attendance.present} color="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" />
                <StatBadge label="Absent" value={attendance.absent} color="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" />
                <StatBadge label="Retard" value={attendance.late} color="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" />
                <StatBadge label="Excuse" value={attendance.excused} color="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" />
              </div>

              {/* Recent absences */}
              {recentAbsences.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Dernieres absences / retards
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recentAbsences.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 rounded-xl px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {a.sessionTitle}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {formatDateTime(a.date)}
                            {a.lateMinutes ? ` (+${a.lateMinutes} min)` : ''}
                          </p>
                          {a.excuseReason && (
                            <p className="text-[11px] text-neutral-400 italic mt-0.5">Motif : {a.excuseReason}</p>
                          )}
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${statusColors[a.status] || ''}`}>
                          {statusLabels[a.status] || a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* Bulletins */}
        <SectionCard title="Bulletins" icon={FileText} hidden={!contact.receiveBulletins}>
          {bulletins.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-4">
              Aucun bulletin disponible pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {bulletins.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 rounded-xl px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {b.periodLabel}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Genere le {formatDate(b.createdAt)}
                    </p>
                  </div>
                  {b.generalAverage != null && (
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold ${gradeColor(b.generalAverage, 20)}`}>
                        {b.generalAverage.toFixed(2)}<span className="text-[10px] font-normal text-neutral-400">/20</span>
                      </p>
                      <p className="text-[10px] text-neutral-400">Moy. gen.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Portail parent -- Anti-Planning
          </p>
          <p className="text-[10px] text-neutral-300 dark:text-neutral-600 mt-1">
            Ce lien est personnel et confidentiel. Ne le partagez pas.
          </p>
        </div>
      </footer>
    </div>
  )
}
