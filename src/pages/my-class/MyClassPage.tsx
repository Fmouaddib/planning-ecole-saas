import { useState, useMemo, useEffect } from 'react'
import {
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  Clock,
  User,
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useCenterSettings } from '@/hooks/useCenterSettings'
import { isStudentRole } from '@/utils/helpers'
import { supabase, isDemoMode } from '@/lib/supabase'
import { LoadingState, Badge } from '@/components/ui'
import { getScheduleTypeLabel, getScheduleTypeBadgeVariant, DAY_OPTIONS } from '@/utils/scheduleUtils'
import { transformUser } from '@/utils/transforms'
import type { User as UserType } from '@/types'

function MyClassPage() {
  const { user } = useAuthContext()
  const {
    classes,
    subjects,
    teachers,
    classStudents,
    studentSubjects,
    getClassIdsForStudent,
    getClassSubjectsForClass,
    getClassById,
    isLoading: academicLoading,
  } = useAcademicData()
  const { settings: centerSettings } = useCenterSettings()
  const hideSubjects = !!centerSettings.hide_subjects
  const hideClassmates = !!centerSettings.hide_classmates

  const [classmates, setClassmates] = useState<UserType[]>([])
  const [classmatesLoading, setClassmatesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const isStudent = isStudentRole(user?.role)

  // Classes de l'étudiant
  const myClassIds = useMemo(() => {
    if (!user?.id) return []
    return getClassIdsForStudent(user.id)
  }, [user?.id, getClassIdsForStudent])

  const myClasses = useMemo(() => {
    return myClassIds.map(id => getClassById(id)).filter(Boolean) as NonNullable<ReturnType<typeof getClassById>>[]
  }, [myClassIds, getClassById])

  const currentClass = myClasses[activeTab] || null

  // Inscriptions de l'étudiant (depuis student_subjects)
  const myEnrollments = useMemo(() => {
    if (!user?.id) return []
    return studentSubjects.filter(ss => ss.student_id === user.id)
  }, [user?.id, studentSubjects])

  // Matières du programme (class-type, inscrites + dispensées)
  const classEnrollments = useMemo(() => {
    if (!currentClass) return []
    return myEnrollments.filter(ss => ss.class_id === currentClass.id && ss.enrollment_type === 'class')
  }, [currentClass, myEnrollments])

  // Matières libres
  const freeEnrollments = useMemo(() => {
    return myEnrollments.filter(ss => ss.enrollment_type === 'free' && ss.status === 'enrolled')
  }, [myEnrollments])

  // Fallback : si pas encore de student_subjects, utiliser classSubjects
  const hasStudentSubjects = myEnrollments.length > 0

  // Matières de la classe courante avec infos trainer + heures
  const classSubjectDetails = useMemo(() => {
    if (!currentClass) return []

    if (hasStudentSubjects) {
      // Utiliser student_subjects pour l'affichage individualisé
      const links = getClassSubjectsForClass(currentClass.id)
      return classEnrollments.map(enrollment => {
        const subject = subjects.find(s => s.id === enrollment.subject_id)
        const link = links.find(l => l.subject_id === enrollment.subject_id)
        const trainer = link?.trainer_id ? teachers.find(t => t.id === link.trainer_id) : undefined
        return {
          subjectId: enrollment.subject_id,
          subjectName: subject?.name || 'Matière inconnue',
          subjectCode: subject?.code || '',
          trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}`.trim() : undefined,
          hoursPlanned: link?.hours_planned || undefined,
          isDispensed: enrollment.status === 'dispensed',
          dispensationReason: enrollment.dispensation_reason,
        }
      }).sort((a, b) => {
        // Dispensés en bas
        if (a.isDispensed !== b.isDispensed) return a.isDispensed ? 1 : -1
        return a.subjectName.localeCompare(b.subjectName)
      })
    }

    // Fallback : ancien comportement
    const links = getClassSubjectsForClass(currentClass.id)
    return links.map(link => {
      const subject = subjects.find(s => s.id === link.subject_id)
      const trainer = link.trainer_id ? teachers.find(t => t.id === link.trainer_id) : undefined
      return {
        subjectId: link.subject_id,
        subjectName: subject?.name || 'Matière inconnue',
        subjectCode: subject?.code || '',
        trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}`.trim() : undefined,
        hoursPlanned: link.hours_planned || undefined,
        isDispensed: false,
        dispensationReason: undefined as string | undefined,
      }
    }).sort((a, b) => a.subjectName.localeCompare(b.subjectName))
  }, [currentClass, hasStudentSubjects, classEnrollments, getClassSubjectsForClass, subjects, teachers])

  // Détails des matières libres
  const freeSubjectDetails = useMemo(() => {
    return freeEnrollments.map(enrollment => {
      const subject = subjects.find(s => s.id === enrollment.subject_id)
      return {
        subjectId: enrollment.subject_id,
        subjectName: subject?.name || 'Matière inconnue',
        subjectCode: subject?.code || '',
      }
    }).sort((a, b) => a.subjectName.localeCompare(b.subjectName))
  }, [freeEnrollments, subjects])

  // Camarades de classe (skip si masqué par le centre)
  useEffect(() => {
    if (!currentClass || isDemoMode || !user?.id || hideClassmates) {
      setClassmates([])
      return
    }

    const studentIds = classStudents
      .filter(cs => cs.class_id === currentClass.id && cs.student_id !== user.id)
      .map(cs => cs.student_id)

    if (studentIds.length === 0) {
      setClassmates([])
      return
    }

    setClassmatesLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .in('id', studentIds)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data, error }) => {
        if (!error && data) {
          setClassmates(data.map(transformUser))
        }
        setClassmatesLoading(false)
      })
  }, [currentClass?.id, classStudents, user?.id, hideClassmates])

  // Jours de présence
  const attendanceDays = currentClass?.attendanceDays || []

  if (academicLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingState size="lg" text="Chargement..." />
      </div>
    )
  }

  if (!isStudent) {
    return (
      <div className="text-center py-20">
        <GraduationCap size={48} className="mx-auto text-neutral-300 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Page réservée aux étudiants</h2>
        <p className="text-neutral-500 dark:text-neutral-400">Cette page n'est accessible qu'aux comptes étudiants.</p>
      </div>
    )
  }

  if (myClasses.length === 0) {
    return (
      <div className="text-center py-20">
        <GraduationCap size={48} className="mx-auto text-neutral-300 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Aucune classe assignée</h2>
        <p className="text-neutral-500 dark:text-neutral-400">Vous n'êtes inscrit dans aucune classe pour le moment.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Ma classe</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Informations sur votre classe, matières et camarades
          </p>
        </div>
      </div>

      {/* Tabs multi-classe */}
      {myClasses.length > 1 && (
        <div className="flex gap-2 mb-6">
          {myClasses.map((cls, idx) => (
            <button
              key={cls.id}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === idx
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>
      )}

      {currentClass && (
        <div className="space-y-6">
          {/* Section 1 — En-tête classe */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-50 dark:bg-primary-950 rounded-xl">
                <GraduationCap size={24} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {currentClass.name}
                  </h2>
                  <Badge variant={getScheduleTypeBadgeVariant(currentClass.scheduleType)} size="sm">
                    {getScheduleTypeLabel(currentClass.scheduleType)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {currentClass.diploma && (
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      {currentClass.diploma.title}
                    </span>
                  )}
                  {currentClass.academicYear && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {currentClass.academicYear}
                    </span>
                  )}
                  {currentClass.startDate && currentClass.endDate && (
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {currentClass.startDate} &rarr; {currentClass.endDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 — Mes matières (masquable par le centre) */}
          {!hideSubjects && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={20} className="text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Mes matières
                  {classSubjectDetails.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-neutral-400">({classSubjectDetails.length})</span>
                  )}
                </h2>
              </div>
              {classSubjectDetails.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucune matière assignée à cette classe</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-700">
                        <th className="text-left py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">Matière</th>
                        <th className="text-left py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">Code</th>
                        <th className="text-left py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">Professeur</th>
                        <th className="text-right py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">Volume (h)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSubjectDetails.map(d => (
                        <tr key={d.subjectId} className={`border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors ${d.isDispensed ? 'opacity-50' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}>
                          <td className="py-2.5 px-3">
                            <span className={`font-medium ${d.isDispensed ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                              {d.subjectName}
                            </span>
                            {d.isDispensed && (
                              <Badge variant="warning" size="sm" className="ml-2">Dispensé</Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400">{d.subjectCode || '—'}</td>
                          <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                            {d.trainerName ? (
                              <span className="flex items-center gap-1.5">
                                <User size={14} className="text-neutral-400" />
                                {d.trainerName}
                              </span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                            {d.hoursPlanned != null ? `${d.hoursPlanned}h` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {classSubjectDetails.filter(d => !d.isDispensed).some(d => d.hoursPlanned != null) && (
                      <tfoot>
                        <tr className="border-t border-neutral-200 dark:border-neutral-700">
                          <td colSpan={3} className="py-2.5 px-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Total</td>
                          <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                            {classSubjectDetails.filter(d => !d.isDispensed).reduce((sum, d) => sum + (d.hoursPlanned || 0), 0)}h
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 2b — Matières libres */}
          {!hideSubjects && freeSubjectDetails.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={20} className="text-info-600 dark:text-info-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Matières libres
                  <span className="ml-2 text-sm font-normal text-neutral-400">({freeSubjectDetails.length})</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {freeSubjectDetails.map(d => (
                  <div key={d.subjectId} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-info-200 dark:border-info-800 bg-info-50 dark:bg-info-950">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{d.subjectName}</span>
                    {d.subjectCode && <span className="text-xs text-neutral-400">({d.subjectCode})</span>}
                    <Badge variant="info" size="sm">Libre</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3 — Mes camarades (masquable par le centre) */}
          {!hideClassmates && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-primary-600 dark:text-primary-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Mes camarades
                  {classmates.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-neutral-400">({classmates.length})</span>
                  )}
                </h2>
              </div>
              {classmatesLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingState size="sm" text="Chargement..." />
                </div>
              ) : classmates.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4 text-center">Aucun camarade dans cette classe</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classmates.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-semibold text-primary-700 dark:text-primary-300">
                        {(c.firstName?.[0] || '').toUpperCase()}{(c.lastName?.[0] || '').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{c.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4 — Jours de présence */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Jours de présence</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map(day => {
                const isActive = attendanceDays.includes(day.value)
                return (
                  <span
                    key={day.value}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                    }`}
                  >
                    {day.label}
                  </span>
                )
              })}
            </div>
            {currentClass.scheduleType === 'alternance' && currentClass.alternanceConfig && (
              <div className="mt-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800">
                <p className="text-sm font-medium text-warning-700 dark:text-warning-300">
                  Alternance : {currentClass.alternanceConfig.schoolWeeks} semaine{currentClass.alternanceConfig.schoolWeeks > 1 ? 's' : ''} école / {currentClass.alternanceConfig.companyWeeks} semaine{currentClass.alternanceConfig.companyWeeks > 1 ? 's' : ''} entreprise
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MyClassPage
