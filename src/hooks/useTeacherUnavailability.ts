/**
 * Hook CRUD pour teacher_unavailabilities
 */
import { useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformTeacherUnavailability } from '@/utils/transforms'
import toast from 'react-hot-toast'
import type { TeacherUnavailability, UnavailabilityReason } from '@/types'

// ==================== DEMO DATA ====================
const DEMO_UNAVAILABILITIES: TeacherUnavailability[] = [
  {
    id: 'demo-unav-1', teacherId: 'demo-teacher-1', centerId: 'demo-center',
    startDate: '2026-03-16', endDate: '2026-03-20',
    reason: 'vacation', description: 'Vacances de printemps',
    status: 'approved', adminResponse: 'OK, bon repos !',
    requestedAt: new Date().toISOString(),
    respondedAt: new Date().toISOString(),
    teacher: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont', email: 'marie@demo.com' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-unav-2', teacherId: 'demo-teacher-2', centerId: 'demo-center',
    startDate: '2026-03-23', endDate: '2026-03-23',
    reason: 'training', description: 'Formation pedagogique',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    teacher: { id: 'demo-teacher-2', firstName: 'Jean', lastName: 'Martin', email: 'jean@demo.com' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const REASON_LABELS: Record<UnavailabilityReason, string> = {
  vacation: 'Vacances',
  sick: 'Maladie',
  personal: 'Personnel',
  training: 'Formation',
  other: 'Autre',
}

interface CreateUnavailabilityData {
  startDate: string
  endDate: string
  reason: UnavailabilityReason
  description?: string
}

export { REASON_LABELS }

export function useTeacherUnavailability() {
  const { user } = useAuthContext()
  const [unavailabilities, setUnavailabilities] = useState<TeacherUnavailability[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const getAll = useCallback(async (teacherId?: string) => {
    if (isDemoMode) {
      setUnavailabilities(teacherId ? DEMO_UNAVAILABILITIES.filter(u => u.teacherId === teacherId) : DEMO_UNAVAILABILITIES)
      return
    }
    setIsLoading(true)
    try {
      let query = supabase
        .from('teacher_unavailabilities')
        .select('*, teacher:profiles!teacher_unavailabilities_teacher_id_fkey(id, full_name, email)')
        .order('start_date', { ascending: false })

      if (teacherId) query = query.eq('teacher_id', teacherId)

      const { data, error } = await query
      if (error) throw error
      setUnavailabilities((data || []).map(transformTeacherUnavailability))
    } catch (err: any) {
      console.error('Error fetching unavailabilities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const create = useCallback(async (data: CreateUnavailabilityData) => {
    if (isDemoMode || !user) return
    try {
      const { error } = await supabase.from('teacher_unavailabilities').insert({
        teacher_id: user.id,
        center_id: user.establishmentId,
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason,
        description: data.description || null,
      })
      if (error) throw error
      toast.success('Indisponibilite declaree')

      // Notify admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('center_id', user.establishmentId)
        .in('role', ['admin', 'coordinator'])

      if (admins && admins.length > 0) {
        const notifRows = admins.map(a => ({
          user_id: a.id,
          center_id: user.establishmentId,
          title: 'Indisponibilite declaree',
          message: `${user.firstName} ${user.lastName} — du ${data.startDate} au ${data.endDate} (${REASON_LABELS[data.reason]})`,
          type: 'unavailability_declared',
          link: '/teacher-collab',
        }))
        supabase.from('in_app_notifications').insert(notifRows).then(({ error: nErr }) => {
          if (nErr) console.error('Notif insert error:', nErr)
        })
      }

      await getAll(user.id)
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user, getAll])

  const approve = useCallback(async (id: string, response?: string) => {
    if (isDemoMode || !user) return
    try {
      const { data: row, error } = await supabase.from('teacher_unavailabilities')
        .update({ status: 'approved', admin_response: response || null, responded_at: new Date().toISOString(), responded_by: user.id })
        .eq('id', id)
        .select('teacher_id')
        .single()
      if (error) throw error
      toast.success('Indisponibilite approuvee')

      // Notify teacher
      if (row?.teacher_id) {
        supabase.from('in_app_notifications').insert({
          user_id: row.teacher_id,
          center_id: user.establishmentId,
          title: 'Indisponibilite approuvee',
          message: response || 'Votre demande d\'indisponibilite a ete approuvee.',
          type: 'unavailability_declared',
          link: '/teacher-collab',
        }).then(() => {})
      }

      setUnavailabilities(prev => prev.map(u => u.id === id ? { ...u, status: 'approved', adminResponse: response } : u))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user])

  const reject = useCallback(async (id: string, response?: string) => {
    if (isDemoMode || !user) return
    try {
      const { data: row, error } = await supabase.from('teacher_unavailabilities')
        .update({ status: 'rejected', admin_response: response || null, responded_at: new Date().toISOString(), responded_by: user.id })
        .eq('id', id)
        .select('teacher_id')
        .single()
      if (error) throw error
      toast.success('Indisponibilite refusee')

      if (row?.teacher_id) {
        supabase.from('in_app_notifications').insert({
          user_id: row.teacher_id,
          center_id: user.establishmentId,
          title: 'Indisponibilite refusee',
          message: response || 'Votre demande d\'indisponibilite a ete refusee.',
          type: 'unavailability_declared',
          link: '/teacher-collab',
        }).then(() => {})
      }

      setUnavailabilities(prev => prev.map(u => u.id === id ? { ...u, status: 'rejected', adminResponse: response } : u))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [user])

  return {
    unavailabilities, isLoading,
    getAll, create, approve, reject,
  }
}
