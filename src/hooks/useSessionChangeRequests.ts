/**
 * Hook CRUD pour session_change_requests
 */
import { useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformSessionChangeRequest } from '@/utils/transforms'
import toast from 'react-hot-toast'
import type { SessionChangeRequest, ChangeRequestType } from '@/types'

// ==================== DEMO DATA ====================
const DEMO_CHANGE_REQUESTS: SessionChangeRequest[] = [
  {
    id: 'demo-cr-1', sessionId: 'demo-session-1', teacherId: 'demo-teacher-1', centerId: 'demo-center',
    changeType: 'time_change', oldValues: { start_time: '08:00', end_time: '10:00' }, newValues: { start_time: '09:00', end_time: '11:00' },
    status: 'pending', requestedBy: 'demo-admin', message: 'Decalage d\'1h pour raison logistique',
    session: { id: 'demo-session-1', title: 'Mathematiques L1' },
    teacher: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont' },
    requester: { id: 'demo-admin', firstName: 'Admin', lastName: 'Centre' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const CHANGE_TYPE_LABELS: Record<ChangeRequestType, string> = {
  time_change: 'Changement d\'horaire',
  room_change: 'Changement de salle',
  cancel: 'Annulation',
  other: 'Autre',
}

const SELECT_QUERY = `
  *,
  teacher:profiles!session_change_requests_teacher_id_fkey(id, full_name),
  requester:profiles!session_change_requests_requested_by_fkey(id, full_name),
  session:training_sessions!session_change_requests_session_id_fkey(id, title)
`

interface CreateChangeRequestData {
  sessionId: string
  teacherId: string
  changeType: ChangeRequestType
  oldValues: Record<string, unknown>
  newValues: Record<string, unknown>
  message?: string
}

export { CHANGE_TYPE_LABELS }

export function useSessionChangeRequests() {
  const { user } = useAuthContext()
  const [changeRequests, setChangeRequests] = useState<SessionChangeRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchChangeRequests = useCallback(async (filter?: { teacherId?: string; status?: string }) => {
    if (isDemoMode) {
      let filtered = DEMO_CHANGE_REQUESTS
      if (filter?.teacherId) filtered = filtered.filter(c => c.teacherId === filter.teacherId)
      if (filter?.status) filtered = filtered.filter(c => c.status === filter.status)
      setChangeRequests(filtered)
      return
    }
    setIsLoading(true)
    try {
      let query = supabase.from('session_change_requests').select(SELECT_QUERY).order('created_at', { ascending: false })
      if (filter?.teacherId) query = query.eq('teacher_id', filter.teacherId)
      if (filter?.status) query = query.eq('status', filter.status)

      const { data, error } = await query
      if (error) throw error
      setChangeRequests((data || []).map(transformSessionChangeRequest))
    } catch (err: any) {
      console.error('Error fetching change requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getForTeacher = useCallback(() => {
    if (!user) return
    return fetchChangeRequests({ teacherId: user.id })
  }, [user, fetchChangeRequests])

  const getPending = useCallback(() => {
    return fetchChangeRequests({ status: 'pending' })
  }, [fetchChangeRequests])

  const create = useCallback(async (data: CreateChangeRequestData) => {
    if (isDemoMode || !user) return
    try {
      const { error } = await supabase.from('session_change_requests').insert({
        session_id: data.sessionId,
        teacher_id: data.teacherId,
        center_id: user.establishmentId,
        change_type: data.changeType,
        old_values: data.oldValues,
        new_values: data.newValues,
        requested_by: user.id,
        message: data.message || null,
      })
      if (error) throw error
      toast.success('Demande de modification envoyee')

      // Notify teacher
      supabase.from('in_app_notifications').insert({
        user_id: data.teacherId,
        center_id: user.establishmentId,
        title: 'Modification de seance',
        message: data.message || `Modification demandee (${CHANGE_TYPE_LABELS[data.changeType]})`,
        type: 'change_request_pending',
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
      // Get the change request to apply values
      const { data: cr, error: fetchErr } = await supabase.from('session_change_requests')
        .select('session_id, new_values, requested_by, change_type')
        .eq('id', id)
        .single()
      if (fetchErr) throw fetchErr

      // Update status
      const { error } = await supabase.from('session_change_requests')
        .update({ status: 'accepted', teacher_response: response || null, responded_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      // Apply new_values to training_sessions (if not a cancel)
      if (cr && cr.change_type !== 'cancel') {
        const newVals = cr.new_values as Record<string, unknown>
        const updateData: Record<string, unknown> = {}
        if (newVals.start_time) updateData.start_time = newVals.start_time
        if (newVals.end_time) updateData.end_time = newVals.end_time
        if (newVals.room_id) updateData.room_id = newVals.room_id
        if (Object.keys(updateData).length > 0) {
          await supabase.from('training_sessions').update(updateData).eq('id', cr.session_id)
        }
      } else if (cr?.change_type === 'cancel') {
        await supabase.from('training_sessions').update({ status: 'cancelled' }).eq('id', cr.session_id)
      }

      toast.success('Modification acceptee')

      // Notify requester
      if (cr?.requested_by) {
        supabase.from('in_app_notifications').insert({
          user_id: cr.requested_by,
          center_id: user.establishmentId,
          title: 'Modification acceptee',
          message: `${user.firstName} ${user.lastName} a accepte la modification`,
          type: 'change_request_accepted',
          link: '/teacher-collab',
          session_id: cr.session_id,
        }).then(() => {})
      }

      setChangeRequests(prev => prev.map(c => c.id === id ? { ...c, status: 'accepted', teacherResponse: response } : c))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user])

  const reject = useCallback(async (id: string, response?: string) => {
    if (isDemoMode || !user) return
    try {
      const { data: cr, error: fetchErr } = await supabase.from('session_change_requests')
        .select('session_id, requested_by')
        .eq('id', id)
        .single()
      if (fetchErr) throw fetchErr

      const { error } = await supabase.from('session_change_requests')
        .update({ status: 'rejected', teacher_response: response || null, responded_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      toast.success('Modification refusee')

      if (cr?.requested_by) {
        supabase.from('in_app_notifications').insert({
          user_id: cr.requested_by,
          center_id: user.establishmentId,
          title: 'Modification refusee',
          message: `${user.firstName} ${user.lastName} a refuse la modification`,
          type: 'change_request_rejected',
          link: '/teacher-collab',
          session_id: cr.session_id,
        }).then(() => {})
      }

      setChangeRequests(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected', teacherResponse: response } : c))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user])

  return {
    changeRequests, isLoading,
    fetchChangeRequests, getForTeacher, getPending,
    create, accept, reject,
  }
}
