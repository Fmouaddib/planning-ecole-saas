/**
 * Hook CRUD pour session_assignments + realtime
 */
import { useState, useCallback, useEffect } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformSessionAssignment } from '@/utils/transforms'
import toast from 'react-hot-toast'
import type { SessionAssignment } from '@/types'

// ==================== DEMO DATA ====================
const DEMO_ASSIGNMENTS: SessionAssignment[] = [
  {
    id: 'demo-asgn-1', sessionId: 'demo-session-1', teacherId: 'demo-teacher-1', centerId: 'demo-center',
    status: 'pending', assignedBy: 'demo-admin', message: 'Merci de confirmer votre disponibilite',
    assignedAt: new Date().toISOString(),
    session: { id: 'demo-session-1', title: 'Mathematiques L1', startTime: '2026-03-10T08:00:00Z', endTime: '2026-03-10T10:00:00Z', room: { name: 'Salle A101' } },
    teacher: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont', email: 'marie@demo.com' },
    assigner: { id: 'demo-admin', firstName: 'Admin', lastName: 'Centre' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-asgn-2', sessionId: 'demo-session-2', teacherId: 'demo-teacher-1', centerId: 'demo-center',
    status: 'accepted', assignedBy: 'demo-admin', teacherResponse: 'OK pour moi',
    assignedAt: new Date().toISOString(), respondedAt: new Date().toISOString(),
    session: { id: 'demo-session-2', title: 'Physique L2', startTime: '2026-03-11T14:00:00Z', endTime: '2026-03-11T16:00:00Z', room: { name: 'Labo B203' } },
    teacher: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont', email: 'marie@demo.com' },
    assigner: { id: 'demo-admin', firstName: 'Admin', lastName: 'Centre' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const SELECT_QUERY = `
  *,
  teacher:profiles!session_assignments_teacher_id_fkey(id, full_name, email),
  assigner:profiles!session_assignments_assigned_by_fkey(id, full_name),
  session:training_sessions!session_assignments_session_id_fkey(id, title, start_time, end_time, room:rooms(name))
`

interface AssignData {
  sessionId: string
  teacherId: string
  message?: string
}

export function useSessionAssignments() {
  const { user } = useAuthContext()
  const [assignments, setAssignments] = useState<SessionAssignment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAssignments = useCallback(async (filter?: { teacherId?: string; sessionId?: string; status?: string }) => {
    if (isDemoMode) {
      let filtered = DEMO_ASSIGNMENTS
      if (filter?.teacherId) filtered = filtered.filter(a => a.teacherId === filter.teacherId)
      if (filter?.sessionId) filtered = filtered.filter(a => a.sessionId === filter.sessionId)
      if (filter?.status) filtered = filtered.filter(a => a.status === filter.status)
      setAssignments(filtered)
      return
    }
    setIsLoading(true)
    try {
      let query = supabase.from('session_assignments').select(SELECT_QUERY).order('assigned_at', { ascending: false })
      if (filter?.teacherId) query = query.eq('teacher_id', filter.teacherId)
      if (filter?.sessionId) query = query.eq('session_id', filter.sessionId)
      if (filter?.status) query = query.eq('status', filter.status)

      const { data, error } = await query
      if (error) throw error
      setAssignments((data || []).map(transformSessionAssignment))
    } catch (err: any) {
      console.error('Error fetching assignments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getForTeacher = useCallback(() => {
    if (!user) return
    return fetchAssignments({ teacherId: user.id })
  }, [user, fetchAssignments])

  const getForSession = useCallback((sessionId: string) => {
    return fetchAssignments({ sessionId })
  }, [fetchAssignments])

  const getPending = useCallback(() => {
    return fetchAssignments({ status: 'pending' })
  }, [fetchAssignments])

  const assign = useCallback(async (data: AssignData) => {
    if (isDemoMode || !user) return
    try {
      const { error } = await supabase.from('session_assignments').insert({
        session_id: data.sessionId,
        teacher_id: data.teacherId,
        center_id: user.establishmentId,
        assigned_by: user.id,
        message: data.message || null,
      })
      if (error) throw error
      toast.success('Affectation envoyee')

      // Notify teacher
      const { data: session } = await supabase
        .from('training_sessions')
        .select('title, start_time, end_time')
        .eq('id', data.sessionId)
        .single()

      supabase.from('in_app_notifications').insert({
        user_id: data.teacherId,
        center_id: user.establishmentId,
        title: 'Nouvelle affectation',
        message: session ? `${session.title} — ${session.start_time}` : 'Nouvelle seance a confirmer',
        type: 'assignment_pending',
        link: '/teacher-collab',
        session_id: data.sessionId,
      }).then(() => {})

    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user])

  const accept = useCallback(async (id: string, response?: string) => {
    if (isDemoMode || !user) return
    try {
      const { data: row, error } = await supabase.from('session_assignments')
        .update({ status: 'accepted', teacher_response: response || null, responded_at: new Date().toISOString() })
        .eq('id', id)
        .select('session_id, assigned_by')
        .single()
      if (error) throw error

      // Update trainer_id on training_sessions
      if (row?.session_id) {
        await supabase.from('training_sessions').update({ trainer_id: user.id }).eq('id', row.session_id)
      }

      toast.success('Affectation acceptee')

      // Notify admin
      if (row?.assigned_by) {
        supabase.from('in_app_notifications').insert({
          user_id: row.assigned_by,
          center_id: user.establishmentId,
          title: 'Affectation acceptee',
          message: `${user.firstName} ${user.lastName} a accepte l'affectation`,
          type: 'assignment_accepted',
          link: '/teacher-collab',
          session_id: row.session_id,
        }).then(() => {})
      }

      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'accepted', teacherResponse: response, respondedAt: new Date().toISOString() } : a))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user])

  const reject = useCallback(async (id: string, response?: string) => {
    if (isDemoMode || !user) return
    try {
      const { data: row, error } = await supabase.from('session_assignments')
        .update({ status: 'rejected', teacher_response: response || null, responded_at: new Date().toISOString() })
        .eq('id', id)
        .select('session_id, assigned_by')
        .single()
      if (error) throw error
      toast.success('Affectation refusee')

      if (row?.assigned_by) {
        supabase.from('in_app_notifications').insert({
          user_id: row.assigned_by,
          center_id: user.establishmentId,
          title: 'Affectation refusee',
          message: `${user.firstName} ${user.lastName} a refuse l'affectation`,
          type: 'assignment_rejected',
          link: '/teacher-collab',
          session_id: row.session_id,
        }).then(() => {})
      }

      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', teacherResponse: response, respondedAt: new Date().toISOString() } : a))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user])

  const cancel = useCallback(async (id: string) => {
    if (isDemoMode) return
    try {
      const { error } = await supabase.from('session_assignments')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
      toast.success('Affectation annulee')
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !user) return

    const channel = supabase
      .channel('session_assignments_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_assignments',
      }, () => {
        // Refresh on any change
        if (user.role === 'teacher' || (user.role as string) === 'trainer') {
          fetchAssignments({ teacherId: user.id })
        } else {
          fetchAssignments()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchAssignments])

  return {
    assignments, isLoading,
    fetchAssignments, getForTeacher, getForSession, getPending,
    assign, accept, reject, cancel,
  }
}
