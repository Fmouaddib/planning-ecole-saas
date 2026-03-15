/**
 * Hook for attendance tracking (session_attendance)
 */
import { useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformAttendance } from '@/utils/transforms'
import type { SessionAttendance, AttendanceStatus } from '@/types'
import toast from 'react-hot-toast'

export function useAttendance() {
  const { user } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)

  const getAttendanceForSession = useCallback(async (sessionId: string): Promise<SessionAttendance[]> => {
    if (isDemoMode) return []
    const { data, error } = await supabase
      .from('session_attendance')
      .select('*, student:profiles!student_id(id, full_name, email)')
      .eq('session_id', sessionId)
      .order('student(full_name)')
    if (error) { console.error('Error fetching attendance:', error); return [] }
    return (data || []).map(transformAttendance)
  }, [])

  const getAttendanceForStudent = useCallback(async (studentId: string): Promise<SessionAttendance[]> => {
    if (isDemoMode) return []
    const { data, error } = await supabase
      .from('session_attendance')
      .select('*, session:training_sessions!session_id(id, title, start_time)')
      .eq('student_id', studentId)
      .order('marked_at', { ascending: false })
      .limit(100)
    if (error) { console.error('Error fetching student attendance:', error); return [] }
    return (data || []).map(transformAttendance)
  }, [])

  const getAttendanceForClass = useCallback(async (classId: string): Promise<SessionAttendance[]> => {
    if (isDemoMode) return []
    // Get sessions for this class, then attendance for those sessions
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('class_id', classId)
    if (!sessions?.length) return []
    const sessionIds = sessions.map(s => s.id)
    const { data, error } = await supabase
      .from('session_attendance')
      .select('*, student:profiles!student_id(id, full_name, email), session:training_sessions!session_id(id, title, start_time)')
      .in('session_id', sessionIds)
    if (error) { console.error('Error fetching class attendance:', error); return [] }
    return (data || []).map(transformAttendance)
  }, [])

  const markAttendance = useCallback(async (
    sessionId: string,
    records: { studentId: string; status: AttendanceStatus; lateMinutes?: number; excuseReason?: string; notes?: string }[]
  ) => {
    if (isDemoMode) { toast.success('Présences enregistrées (mode démo)'); return }
    // Role check: only teacher, admin, or staff can mark attendance
    const allowedRoles = ['teacher', 'admin', 'super_admin', 'staff']
    if (!user?.role || !allowedRoles.includes(user.role)) {
      toast.error('Permission refusée : rôle insuffisant')
      return
    }
    setIsLoading(true)
    try {
      const centerId = user?.establishmentId
      if (!centerId) throw new Error('Centre non trouvé')

      const rows = records.map(r => ({
        session_id: sessionId,
        student_id: r.studentId,
        center_id: centerId,
        status: r.status,
        late_minutes: r.lateMinutes || null,
        excuse_reason: r.excuseReason || null,
        notes: r.notes || null,
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('session_attendance')
        .upsert(rows, { onConflict: 'session_id,student_id' })

      if (error) throw error
      toast.success('Présences enregistrées')
    } catch (err) {
      console.error('Error marking attendance:', err)
      toast.error('Erreur lors de l\'enregistrement des présences')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.establishmentId])

  const computeAttendanceStats = useCallback((records: SessionAttendance[]) => {
    const byStudent = new Map<string, SessionAttendance[]>()
    for (const r of records) {
      const list = byStudent.get(r.studentId) || []
      list.push(r)
      byStudent.set(r.studentId, list)
    }

    return Array.from(byStudent.entries()).map(([studentId, recs]) => ({
      studentId,
      studentName: recs[0]?.student ? `${recs[0].student.firstName} ${recs[0].student.lastName}` : 'Inconnu',
      totalSessions: recs.length,
      present: recs.filter(r => r.status === 'present').length,
      absent: recs.filter(r => r.status === 'absent').length,
      late: recs.filter(r => r.status === 'late').length,
      excused: recs.filter(r => r.status === 'excused').length,
      attendanceRate: recs.length > 0
        ? Math.round((recs.filter(r => r.status === 'present' || r.status === 'late').length / recs.length) * 100)
        : 0,
    }))
  }, [])

  return {
    isLoading,
    getAttendanceForSession,
    getAttendanceForStudent,
    getAttendanceForClass,
    markAttendance,
    computeAttendanceStats,
  }
}
