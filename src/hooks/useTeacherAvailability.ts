/**
 * Hook CRUD pour teacher_availabilities
 */
import { useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformTeacherAvailability } from '@/utils/transforms'
import toast from 'react-hot-toast'
import type { TeacherAvailability, AvailabilityRecurrence } from '@/types'

// ==================== DEMO DATA ====================
const DEMO_AVAILABILITIES: TeacherAvailability[] = [
  {
    id: 'demo-av-1', teacherId: 'demo-teacher-1', centerId: 'demo-center',
    date: '2026-03-09', startTime: '08:00', endTime: '12:00',
    recurrence: 'weekly', status: 'confirmed', notes: 'Disponible tous les lundis matin',
    teacher: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont', email: 'marie@demo.com' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-av-2', teacherId: 'demo-teacher-1', centerId: 'demo-center',
    date: '2026-03-10', startTime: '14:00', endTime: '18:00',
    recurrence: 'none', status: 'submitted',
    teacher: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont', email: 'marie@demo.com' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-av-3', teacherId: 'demo-teacher-2', centerId: 'demo-center',
    date: '2026-03-11', startTime: '09:00', endTime: '17:00',
    recurrence: 'weekly', status: 'confirmed',
    teacher: { id: 'demo-teacher-2', firstName: 'Jean', lastName: 'Martin', email: 'jean@demo.com' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

interface CreateAvailabilityData {
  date: string
  startTime: string
  endTime: string
  recurrence?: AvailabilityRecurrence
  notes?: string
}

export function useTeacherAvailability() {
  const { user } = useAuthContext()
  const [availabilities, setAvailabilities] = useState<TeacherAvailability[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const getForTeacher = useCallback(async (teacherId: string, dateRange?: { start: string; end: string }) => {
    if (isDemoMode) {
      setAvailabilities(DEMO_AVAILABILITIES.filter(a => a.teacherId === teacherId))
      return
    }
    setIsLoading(true)
    try {
      let query = supabase
        .from('teacher_availabilities')
        .select('*, teacher:profiles!teacher_availabilities_teacher_id_fkey(id, full_name, email)')
        .eq('teacher_id', teacherId)
        .order('date', { ascending: true })

      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end)
      }

      const { data, error } = await query
      if (error) throw error
      setAvailabilities((data || []).map(transformTeacherAvailability))
    } catch (err: any) {
      console.error('Error fetching availabilities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getForCenter = useCallback(async (dateRange?: { start: string; end: string }) => {
    if (isDemoMode) {
      setAvailabilities(DEMO_AVAILABILITIES)
      return
    }
    setIsLoading(true)
    try {
      let query = supabase
        .from('teacher_availabilities')
        .select('*, teacher:profiles!teacher_availabilities_teacher_id_fkey(id, full_name, email)')
        .order('date', { ascending: true })

      if (dateRange) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end)
      }

      const { data, error } = await query
      if (error) throw error
      setAvailabilities((data || []).map(transformTeacherAvailability))
    } catch (err: any) {
      console.error('Error fetching center availabilities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const create = useCallback(async (data: CreateAvailabilityData) => {
    if (isDemoMode || !user) return
    try {
      const { error } = await supabase.from('teacher_availabilities').insert({
        teacher_id: user.id,
        center_id: user.establishmentId,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        recurrence: data.recurrence || 'none',
        notes: data.notes || null,
      })
      if (error) throw error
      toast.success('Disponibilite ajoutee')
      await getForTeacher(user.id)
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'ajout')
    }
  }, [user, getForTeacher])

  const update = useCallback(async (id: string, data: Partial<CreateAvailabilityData>) => {
    if (isDemoMode) return
    try {
      const updateData: Record<string, unknown> = {}
      if (data.date) updateData.date = data.date
      if (data.startTime) updateData.start_time = data.startTime
      if (data.endTime) updateData.end_time = data.endTime
      if (data.recurrence) updateData.recurrence = data.recurrence
      if (data.notes !== undefined) updateData.notes = data.notes || null

      const { error } = await supabase.from('teacher_availabilities').update(updateData).eq('id', id)
      if (error) throw error
      toast.success('Disponibilite mise a jour')
      setAvailabilities(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise a jour')
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    if (isDemoMode) return
    try {
      const { error } = await supabase.from('teacher_availabilities').delete().eq('id', id)
      if (error) throw error
      toast.success('Disponibilite supprimee')
      setAvailabilities(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression')
    }
  }, [])

  const confirm = useCallback(async (id: string) => {
    if (isDemoMode) return
    try {
      const { error } = await supabase.from('teacher_availabilities')
        .update({ status: 'confirmed' })
        .eq('id', id)
      if (error) throw error
      toast.success('Disponibilite confirmee')
      setAvailabilities(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a))
    } catch (err: any) {
      toast.error(err.message || 'Erreur')
    }
  }, [])

  return {
    availabilities, isLoading,
    getForTeacher, getForCenter,
    create, update, remove, confirm,
  }
}
