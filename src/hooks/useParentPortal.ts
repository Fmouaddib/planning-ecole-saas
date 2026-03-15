/**
 * Hook for the parent portal — fetches student data via access token (no auth required).
 * Uses the Supabase anon client; RLS policies gate access through the token.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { parseFullName } from '@/utils/transforms'
import { startOfWeek, endOfWeek } from 'date-fns'

// ── Types local to the parent portal ──

export interface ParentStudentProfile {
  id: string
  fullName: string
  email: string
  className: string | null
  classId: string | null
}

export interface ParentGradeEntry {
  evaluationTitle: string
  subjectName: string
  date: string
  grade: number | null
  maxGrade: number
  isAbsent: boolean
  coefficient: number
  evaluationType: string
}

export interface ParentSubjectAverage {
  subjectName: string
  average: number | null
  evaluationCount: number
}

export interface ParentAttendanceSummary {
  totalSessions: number
  present: number
  absent: number
  late: number
  excused: number
  attendanceRate: number
}

export interface ParentAttendanceEntry {
  sessionTitle: string
  date: string
  status: string
  lateMinutes?: number
  excuseReason?: string
}

export interface ParentBulletinEntry {
  id: string
  periodLabel: string
  generalAverage: number | null
  createdAt: string
}

export interface ParentScheduleEntry {
  id: string
  title: string
  startTime: string
  endTime: string
  roomName: string | null
  teacherName: string | null
  subjectName: string | null
}

export interface ParentContactInfo {
  firstName: string
  lastName: string
  relationship: string
  receiveBulletins: boolean
  receiveAbsences: boolean
}

export interface ParentPortalData {
  contact: ParentContactInfo
  student: ParentStudentProfile
  grades: ParentGradeEntry[]
  subjectAverages: ParentSubjectAverage[]
  attendance: ParentAttendanceSummary
  recentAbsences: ParentAttendanceEntry[]
  bulletins: ParentBulletinEntry[]
  weekSchedule: ParentScheduleEntry[]
}

export function useParentPortal(token: string) {
  const [data, setData] = useState<ParentPortalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Lien invalide.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Lookup the contact by access_token
      const { data: contactRow, error: contactErr } = await supabase
        .from('student_contacts')
        .select('student_id, first_name, last_name, relationship, receive_bulletins, receive_absences')
        .eq('access_token', token)
        .single()

      if (contactErr || !contactRow) {
        setError('Lien d\'acces invalide ou expire.')
        setIsLoading(false)
        return
      }

      const studentId = contactRow.student_id
      const contactInfo: ParentContactInfo = {
        firstName: contactRow.first_name,
        lastName: contactRow.last_name,
        relationship: contactRow.relationship,
        receiveBulletins: contactRow.receive_bulletins ?? true,
        receiveAbsences: contactRow.receive_absences ?? true,
      }

      // 2. Fetch student profile
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', studentId)
        .single()

      if (!profileRow) {
        setError('Profil etudiant introuvable.')
        setIsLoading(false)
        return
      }

      // Get class_id from student_subjects (profiles has no class_id)
      const { data: ssRow } = await supabase
        .from('student_subjects')
        .select('class_id')
        .eq('student_id', studentId)
        .not('class_id', 'is', null)
        .limit(1)
        .maybeSingle()

      const classId = ssRow?.class_id || null

      // Fetch class name if student has a class
      let className: string | null = null
      if (classId) {
        const { data: classRow } = await supabase
          .from('classes')
          .select('name')
          .eq('id', classId)
          .single()
        className = classRow?.name || null
      }

      const student: ParentStudentProfile = {
        id: profileRow.id,
        fullName: profileRow.full_name || 'Etudiant',
        email: profileRow.email || '',
        className,
        classId,
      }

      // 3. Fetch grades (if receiveBulletins)
      let grades: ParentGradeEntry[] = []
      let subjectAverages: ParentSubjectAverage[] = []

      if (contactInfo.receiveBulletins) {
        const { data: gradeRows } = await supabase
          .from('grades')
          .select('grade, is_absent, evaluation:evaluations!evaluation_id(title, date, coefficient, max_grade, evaluation_type, is_published, subject:subjects!subject_id(name))')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (gradeRows) {
          for (const g of gradeRows) {
            const ev = g.evaluation as any
            if (!ev || !ev.is_published) continue
            grades.push({
              evaluationTitle: ev.title || '',
              subjectName: ev.subject?.name || '',
              date: ev.date || '',
              grade: g.grade != null ? parseFloat(String(g.grade)) : null,
              maxGrade: ev.max_grade || 20,
              isAbsent: g.is_absent || false,
              coefficient: ev.coefficient || 1,
              evaluationType: ev.evaluation_type || 'exam',
            })
          }
        }

        // Compute subject averages
        const bySubject = new Map<string, { total: number; coeff: number; count: number }>()
        for (const g of grades) {
          if (g.grade == null || g.isAbsent) continue
          const key = g.subjectName
          const entry = bySubject.get(key) || { total: 0, coeff: 0, count: 0 }
          const normalized = (g.grade / g.maxGrade) * 20
          entry.total += normalized * g.coefficient
          entry.coeff += g.coefficient
          entry.count++
          bySubject.set(key, entry)
        }
        subjectAverages = Array.from(bySubject.entries()).map(([name, v]) => ({
          subjectName: name,
          average: v.coeff > 0 ? Math.round((v.total / v.coeff) * 100) / 100 : null,
          evaluationCount: v.count,
        }))
      }

      // 4. Fetch attendance (if receiveAbsences)
      let attendanceSummary: ParentAttendanceSummary = {
        totalSessions: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0,
      }
      let recentAbsences: ParentAttendanceEntry[] = []

      if (contactInfo.receiveAbsences) {
        const { data: attRows } = await supabase
          .from('session_attendance')
          .select('status, late_minutes, excuse_reason, session:training_sessions!session_id(title, start_time)')
          .eq('student_id', studentId)
          .order('marked_at', { ascending: false })
          .limit(200)

        if (attRows) {
          const present = attRows.filter((r: any) => r.status === 'present').length
          const absent = attRows.filter((r: any) => r.status === 'absent').length
          const late = attRows.filter((r: any) => r.status === 'late').length
          const excused = attRows.filter((r: any) => r.status === 'excused').length
          const total = attRows.length
          attendanceSummary = {
            totalSessions: total,
            present,
            absent,
            late,
            excused,
            attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
          }

          // Recent absences/lates (last 20)
          recentAbsences = attRows
            .filter((r: any) => r.status === 'absent' || r.status === 'late' || r.status === 'excused')
            .slice(0, 20)
            .map((r: any) => ({
              sessionTitle: r.session?.title || '',
              date: r.session?.start_time || '',
              status: r.status,
              lateMinutes: r.late_minutes || undefined,
              excuseReason: r.excuse_reason || undefined,
            }))
        }
      }

      // 5. Fetch bulletins (if receiveBulletins)
      let bulletins: ParentBulletinEntry[] = []
      if (contactInfo.receiveBulletins) {
        const { data: bulletinRows } = await supabase
          .from('bulletins')
          .select('id, period_label, general_average, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (bulletinRows) {
          bulletins = bulletinRows.map((b: any) => ({
            id: b.id,
            periodLabel: b.period_label || '',
            generalAverage: b.general_average != null ? parseFloat(String(b.general_average)) : null,
            createdAt: b.created_at,
          }))
        }
      }

      // 6. Fetch current week schedule
      let weekSchedule: ParentScheduleEntry[] = []
      if (student.classId) {
        const now = new Date()
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

        const { data: sessRows } = await supabase
          .from('training_sessions')
          .select('id, title, start_time, end_time, room:rooms!room_id(name), trainer:profiles!trainer_id(full_name), subject:subjects!subject_id(name)')
          .eq('class_id', student.classId)
          .gte('start_time', weekStart.toISOString())
          .lte('start_time', weekEnd.toISOString())
          .neq('status', 'cancelled')
          .order('start_time')

        if (sessRows) {
          weekSchedule = sessRows.map((s: any) => {
            const trainerName = s.trainer ? parseFullName(s.trainer.full_name) : null
            return {
              id: s.id,
              title: s.title || '',
              startTime: s.start_time,
              endTime: s.end_time,
              roomName: s.room?.name || null,
              teacherName: trainerName ? `${trainerName.firstName} ${trainerName.lastName}` : null,
              subjectName: s.subject?.name || null,
            }
          })
        }
      }

      setData({
        contact: contactInfo,
        student,
        grades,
        subjectAverages,
        attendance: attendanceSummary,
        recentAbsences,
        bulletins,
        weekSchedule,
      })
    } catch (err) {
      console.error('Parent portal error:', err)
      setError('Une erreur est survenue lors du chargement des donnees.')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
