/**
 * Hook pour les demandes de disponibilites (workflow admin → profs)
 * Admin cree une demande → profs concernes recoivent notif + email → profs repondent
 */
import { useState, useCallback, useEffect } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useEmailNotifications } from '@/hooks/useEmailNotifications'
import { transformAvailabilityRequest } from '@/utils/transforms'
import toast from 'react-hot-toast'
import type { AvailabilityRequest, AvailabilityResponseType, UnavailableSlot } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ==================== DEMO DATA ====================

const DEMO_REQUESTS: AvailabilityRequest[] = [
  {
    id: 'demo-ar-1',
    centerId: 'demo-center',
    createdBy: 'demo-admin',
    subjectId: 'demo-subj-1',
    classId: 'demo-class-1',
    periodStart: '2026-03-10',
    periodEnd: '2026-03-28',
    message: 'Merci de declarer vos disponibilites pour les cours de Mathematiques de la classe BTS SIO 1.',
    status: 'open',
    creator: { id: 'demo-admin', firstName: 'Marie', lastName: 'Dupont' },
    subject: { id: 'demo-subj-1', name: 'Mathematiques' },
    class_: { id: 'demo-class-1', name: 'BTS SIO 1' },
    responses: [
      {
        id: 'demo-arr-1',
        requestId: 'demo-ar-1',
        teacherId: 'demo-teacher-1',
        centerId: 'demo-center',
        responseType: 'fully_available',
        unavailableSlots: [],
        respondedAt: '2026-03-05T10:00:00Z',
        teacher: { id: 'demo-teacher-1', firstName: 'Jean', lastName: 'Martin', email: 'jean@demo.fr' },
        createdAt: '2026-03-05T10:00:00Z',
      },
    ],
    createdAt: '2026-03-04T09:00:00Z',
    updatedAt: '2026-03-04T09:00:00Z',
  },
  {
    id: 'demo-ar-2',
    centerId: 'demo-center',
    createdBy: 'demo-admin',
    subjectId: 'demo-subj-2',
    classId: 'demo-class-2',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    status: 'responded',
    creator: { id: 'demo-admin', firstName: 'Marie', lastName: 'Dupont' },
    subject: { id: 'demo-subj-2', name: 'Anglais' },
    class_: { id: 'demo-class-2', name: 'BTS SIO 2' },
    responses: [
      {
        id: 'demo-arr-2',
        requestId: 'demo-ar-2',
        teacherId: 'demo-teacher-2',
        centerId: 'demo-center',
        responseType: 'has_unavailabilities',
        unavailableSlots: [
          { date: '2026-04-10', startTime: '08:00', endTime: '12:00', reason: 'RDV medical' },
          { date: '2026-04-15', startTime: '14:00', endTime: '18:00', reason: 'Formation' },
        ],
        notes: 'Disponible tous les autres creneaux.',
        respondedAt: '2026-03-04T14:00:00Z',
        teacher: { id: 'demo-teacher-2', firstName: 'Sophie', lastName: 'Leroy', email: 'sophie@demo.fr' },
        createdAt: '2026-03-04T14:00:00Z',
      },
    ],
    createdAt: '2026-03-03T09:00:00Z',
    updatedAt: '2026-03-04T14:00:00Z',
  },
]

// ==================== SELECT QUERIES ====================

const REQUEST_SELECT = `
  *,
  creator:profiles!availability_requests_created_by_fkey(id, full_name, email),
  subject:subjects(id, name),
  class_:classes(id, name),
  responses:availability_request_responses(
    *,
    teacher:profiles!availability_request_responses_teacher_id_fkey(id, full_name, email)
  )
`

// ==================== HELPER ====================

function insertNotification(params: { userId: string; centerId: string; title: string; message: string; type: string; link?: string }) {
  supabase.from('in_app_notifications').insert({
    user_id: params.userId,
    center_id: params.centerId,
    title: params.title,
    message: params.message,
    type: params.type,
    link: params.link || null,
  }).then(({ error }) => {
    if (error) console.error('Notification insert error:', error)
  })
}

// ==================== HOOK ====================

export function useAvailabilityRequests() {
  const { user } = useAuthContext()
  const { notifyCollaboration } = useEmailNotifications()
  const [requests, setRequests] = useState<AvailabilityRequest[]>(isDemoMode ? DEMO_REQUESTS : [])
  const [isLoading, setIsLoading] = useState(false)

  // ---- FETCH ----
  const fetchRequests = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('availability_requests')
        .select(REQUEST_SELECT)
        .eq('center_id', user.establishmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests((data || []).map(transformAvailabilityRequest))
    } catch (err: any) {
      console.error('fetchAvailabilityRequests:', err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  // ---- CREATE (admin) ----
  const create = useCallback(async (params: {
    subjectId: string
    classId: string
    periodStart: string
    periodEnd: string
    message?: string
    teacherSubjects: { teacher_id: string; subject_id: string }[]
    teachers: { id: string; firstName: string; lastName: string; email: string }[]
    subjectName: string
    className: string
  }) => {
    if (isDemoMode || !user?.establishmentId || !user?.id) return
    try {
      const { data, error } = await supabase
        .from('availability_requests')
        .insert({
          center_id: user.establishmentId,
          created_by: user.id,
          subject_id: params.subjectId,
          class_id: params.classId,
          period_start: params.periodStart,
          period_end: params.periodEnd,
          message: params.message || null,
        })
        .select(REQUEST_SELECT)
        .single()

      if (error) throw error

      // Find teachers for this subject
      const teacherIds = params.teacherSubjects
        .filter(ts => ts.subject_id === params.subjectId)
        .map(ts => ts.teacher_id)
      const targetTeachers = params.teachers.filter(t => teacherIds.includes(t.id))

      // Notify each teacher (in-app)
      for (const teacher of targetTeachers) {
        insertNotification({
          userId: teacher.id,
          centerId: user.establishmentId,
          title: 'Demande de disponibilites',
          message: `Declarez vos disponibilites pour ${params.subjectName} — ${params.className} (${format(new Date(params.periodStart + 'T00:00:00'), 'd MMM', { locale: fr })} au ${format(new Date(params.periodEnd + 'T00:00:00'), 'd MMM yyyy', { locale: fr })})`,
          type: 'availability_demand_sent',
          link: '/teacher-collab',
        })
      }

      // Send emails
      if (targetTeachers.length > 0) {
        await notifyCollaboration(
          'availability_demand_sent',
          targetTeachers.map(t => ({ email: t.email, name: `${t.firstName} ${t.lastName}`, userId: t.id })),
          {
            subject_name: params.subjectName,
            class_name: params.className,
            period_start: format(new Date(params.periodStart + 'T00:00:00'), 'd MMMM yyyy', { locale: fr }),
            period_end: format(new Date(params.periodEnd + 'T00:00:00'), 'd MMMM yyyy', { locale: fr }),
            message: params.message || '',
            app_url: window.location.origin,
          },
          user.establishmentId,
        )
      }

      setRequests(prev => [transformAvailabilityRequest(data), ...prev])
      toast.success(`Demande envoyee a ${targetTeachers.length} professeur(s)`)
    } catch (err: any) {
      console.error('createAvailabilityRequest:', err.message)
      toast.error('Erreur lors de la creation de la demande')
    }
  }, [user, notifyCollaboration])

  // ---- RESPOND (teacher) ----
  const respond = useCallback(async (requestId: string, params: {
    responseType: AvailabilityResponseType
    unavailableSlots?: UnavailableSlot[]
    notes?: string
  }) => {
    if (isDemoMode || !user?.establishmentId || !user?.id) return
    try {
      const { error } = await supabase
        .from('availability_request_responses')
        .upsert({
          request_id: requestId,
          teacher_id: user.id,
          center_id: user.establishmentId,
          response_type: params.responseType,
          unavailable_slots: params.unavailableSlots || [],
          notes: params.notes || null,
          responded_at: new Date().toISOString(),
        }, { onConflict: 'request_id,teacher_id' })

      if (error) throw error

      // Notify admin
      const req = requests.find(r => r.id === requestId)
      if (req) {
        insertNotification({
          userId: req.createdBy,
          centerId: user.establishmentId,
          title: 'Reponse disponibilite recue',
          message: `${user.firstName} ${user.lastName} a repondu : ${params.responseType === 'fully_available' ? 'entierement disponible' : 'a des indisponibilites'}`,
          type: 'availability_response_received',
          link: '/teacher-collab',
        })
      }

      toast.success('Reponse enregistree')
      fetchRequests()
    } catch (err: any) {
      console.error('respondAvailabilityRequest:', err.message)
      toast.error('Erreur lors de l\'envoi de la reponse')
    }
  }, [user, requests, fetchRequests])

  // ---- CLOSE (admin) ----
  const close = useCallback(async (requestId: string) => {
    if (isDemoMode || !user?.establishmentId) return
    try {
      const { error } = await supabase
        .from('availability_requests')
        .update({ status: 'closed' })
        .eq('id', requestId)

      if (error) throw error
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'closed' as const } : r))
      toast.success('Demande fermee')
    } catch (err: any) {
      console.error('closeAvailabilityRequest:', err.message)
      toast.error('Erreur lors de la fermeture')
    }
  }, [user?.establishmentId])

  // ---- REALTIME ----
  useEffect(() => {
    if (isDemoMode || !user?.establishmentId) return
    const channel = supabase
      .channel('availability-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_requests', filter: `center_id=eq.${user.establishmentId}` }, () => {
        fetchRequests()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_request_responses', filter: `center_id=eq.${user.establishmentId}` }, () => {
        fetchRequests()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.establishmentId, fetchRequests])

  // ---- Filter for teacher: only requests where I teach the subject ----
  const getRequestsForTeacher = useCallback((teacherSubjectIds: string[]) => {
    return requests.filter(r => r.subjectId && teacherSubjectIds.includes(r.subjectId))
  }, [requests])

  return {
    requests,
    isLoading,
    fetchRequests,
    create,
    respond,
    close,
    getRequestsForTeacher,
  }
}
