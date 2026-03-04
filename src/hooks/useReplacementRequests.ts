/**
 * Hook pour les demandes de remplacement
 * Admin cree une demande de remplacement → profs eligibles recoivent notif → profs acceptent/refusent → admin selectionne
 */
import { useState, useCallback, useEffect } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useEmailNotifications } from '@/hooks/useEmailNotifications'
import { transformReplacementRequest } from '@/utils/transforms'
import toast from 'react-hot-toast'
import type { ReplacementRequest } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ==================== DEMO DATA ====================

const DEMO_REPLACEMENTS: ReplacementRequest[] = [
  {
    id: 'demo-rr-1',
    centerId: 'demo-center',
    sessionId: 'demo-session-1',
    originalTeacherId: 'demo-teacher-1',
    subjectId: 'demo-subj-1',
    createdBy: 'demo-admin',
    message: 'M. Martin est en arret. Pouvez-vous le remplacer ?',
    status: 'open',
    session: { id: 'demo-session-1', title: 'Mathematiques - Algebre', startTime: '2026-03-12T09:00:00Z', endTime: '2026-03-12T11:00:00Z', room: { name: 'Salle 101' } },
    originalTeacher: { id: 'demo-teacher-1', firstName: 'Jean', lastName: 'Martin' },
    candidates: [
      {
        id: 'demo-rc-1',
        replacementRequestId: 'demo-rr-1',
        teacherId: 'demo-teacher-2',
        centerId: 'demo-center',
        status: 'accepted',
        responseMessage: 'Je suis disponible, pas de souci.',
        respondedAt: '2026-03-05T14:00:00Z',
        teacher: { id: 'demo-teacher-2', firstName: 'Sophie', lastName: 'Leroy', email: 'sophie@demo.fr' },
        createdAt: '2026-03-05T10:00:00Z',
      },
      {
        id: 'demo-rc-2',
        replacementRequestId: 'demo-rr-1',
        teacherId: 'demo-teacher-3',
        centerId: 'demo-center',
        status: 'pending',
        createdAt: '2026-03-05T10:00:00Z',
      },
    ],
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T14:00:00Z',
  },
]

// ==================== SELECT QUERIES ====================

const REPLACEMENT_SELECT = `
  *,
  session:training_sessions(id, title, start_time, end_time, room:rooms(name)),
  original_teacher:profiles!replacement_requests_original_teacher_id_fkey(id, full_name, email),
  selected_teacher:profiles!replacement_requests_selected_teacher_id_fkey(id, full_name, email),
  candidates:replacement_candidates(
    *,
    teacher:profiles!replacement_candidates_teacher_id_fkey(id, full_name, email)
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

export function useReplacementRequests() {
  const { user } = useAuthContext()
  const { notifyCollaboration } = useEmailNotifications()
  const [replacements, setReplacements] = useState<ReplacementRequest[]>(isDemoMode ? DEMO_REPLACEMENTS : [])
  const [isLoading, setIsLoading] = useState(false)

  // ---- FETCH ----
  const fetchReplacements = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('replacement_requests')
        .select(REPLACEMENT_SELECT)
        .eq('center_id', user.establishmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReplacements((data || []).map(transformReplacementRequest))
    } catch (err: any) {
      console.error('fetchReplacementRequests:', err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  useEffect(() => { fetchReplacements() }, [fetchReplacements])

  // ---- CREATE (admin) ----
  const create = useCallback(async (params: {
    sessionId: string
    originalTeacherId: string
    subjectId: string
    message?: string
    sessionTitle: string
    sessionDate: string
    teacherSubjects: { teacher_id: string; subject_id: string }[]
    teachers: { id: string; firstName: string; lastName: string; email: string }[]
  }) => {
    if (isDemoMode || !user?.establishmentId || !user?.id) return
    try {
      // 1. Create replacement_request
      const { data: rr, error: rrError } = await supabase
        .from('replacement_requests')
        .insert({
          center_id: user.establishmentId,
          session_id: params.sessionId,
          original_teacher_id: params.originalTeacherId,
          subject_id: params.subjectId,
          created_by: user.id,
          message: params.message || null,
        })
        .select('id')
        .single()

      if (rrError) throw rrError

      // 2. Find other teachers for this subject (exclude original)
      const teacherIds = params.teacherSubjects
        .filter(ts => ts.subject_id === params.subjectId && ts.teacher_id !== params.originalTeacherId)
        .map(ts => ts.teacher_id)
      const candidates = params.teachers.filter(t => teacherIds.includes(t.id))

      // 3. Insert candidates
      if (candidates.length > 0) {
        const { error: rcError } = await supabase
          .from('replacement_candidates')
          .insert(candidates.map(t => ({
            replacement_request_id: rr.id,
            teacher_id: t.id,
            center_id: user.establishmentId,
          })))

        if (rcError) throw rcError

        // 4. Notify each candidate (in-app)
        for (const teacher of candidates) {
          insertNotification({
            userId: teacher.id,
            centerId: user.establishmentId!,
            title: 'Demande de remplacement',
            message: `Pouvez-vous remplacer pour "${params.sessionTitle}" le ${format(new Date(params.sessionDate), 'd MMM HH:mm', { locale: fr })} ?`,
            type: 'replacement_request_sent',
            link: '/teacher-collab',
          })
        }

        // 5. Send emails
        await notifyCollaboration(
          'replacement_request_sent',
          candidates.map(t => ({ email: t.email, name: `${t.firstName} ${t.lastName}`, userId: t.id })),
          {
            session_title: params.sessionTitle,
            session_date: format(new Date(params.sessionDate), 'EEEE d MMMM yyyy a HH:mm', { locale: fr }),
            message: params.message || '',
            app_url: window.location.origin,
          },
          user.establishmentId,
        )
      }

      toast.success(`Demande de remplacement envoyee a ${candidates.length} professeur(s)`)
      fetchReplacements()
    } catch (err: any) {
      console.error('createReplacementRequest:', err.message)
      toast.error('Erreur lors de la creation de la demande')
    }
  }, [user, notifyCollaboration, fetchReplacements])

  // ---- ACCEPT CANDIDATE (teacher) ----
  const acceptCandidate = useCallback(async (candidateId: string, responseMessage?: string) => {
    if (isDemoMode || !user?.id || !user?.establishmentId) return
    try {
      const { error } = await supabase
        .from('replacement_candidates')
        .update({
          status: 'accepted',
          response_message: responseMessage || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', candidateId)

      if (error) throw error

      // Notify admin
      const rr = replacements.find(r => r.candidates?.some(c => c.id === candidateId))
      if (rr) {
        insertNotification({
          userId: rr.createdBy,
          centerId: user.establishmentId,
          title: 'Candidat disponible',
          message: `${user.firstName} ${user.lastName} accepte de remplacer pour "${rr.session?.title || 'Seance'}"`,
          type: 'replacement_candidate_accepted',
          link: '/teacher-collab',
        })
      }

      toast.success('Acceptation enregistree')
      fetchReplacements()
    } catch (err: any) {
      console.error('acceptCandidate:', err.message)
      toast.error('Erreur')
    }
  }, [user, replacements, fetchReplacements])

  // ---- REJECT CANDIDATE (teacher) ----
  const rejectCandidate = useCallback(async (candidateId: string, responseMessage?: string) => {
    if (isDemoMode || !user?.id) return
    try {
      const { error } = await supabase
        .from('replacement_candidates')
        .update({
          status: 'rejected',
          response_message: responseMessage || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', candidateId)

      if (error) throw error
      toast.success('Refus enregistre')
      fetchReplacements()
    } catch (err: any) {
      console.error('rejectCandidate:', err.message)
      toast.error('Erreur')
    }
  }, [user?.id, fetchReplacements])

  // ---- SELECT TEACHER (admin) ----
  const selectTeacher = useCallback(async (replacementRequestId: string, teacherId: string) => {
    if (isDemoMode || !user?.establishmentId) return
    try {
      const rr = replacements.find(r => r.id === replacementRequestId)
      if (!rr) return

      // 1. Update replacement_request
      const { error: rrErr } = await supabase
        .from('replacement_requests')
        .update({ status: 'fulfilled', selected_teacher_id: teacherId })
        .eq('id', replacementRequestId)
      if (rrErr) throw rrErr

      // 2. Mark selected candidate
      const { error: selErr } = await supabase
        .from('replacement_candidates')
        .update({ status: 'selected' })
        .eq('replacement_request_id', replacementRequestId)
        .eq('teacher_id', teacherId)
      if (selErr) throw selErr

      // 3. Reject others who accepted/pending
      const { error: rejErr } = await supabase
        .from('replacement_candidates')
        .update({ status: 'rejected' })
        .eq('replacement_request_id', replacementRequestId)
        .neq('teacher_id', teacherId)
        .in('status', ['accepted', 'pending'])
      if (rejErr) throw rejErr

      // 4. Update training_session trainer_id
      const { error: sessErr } = await supabase
        .from('training_sessions')
        .update({ trainer_id: teacherId, needs_reschedule: false })
        .eq('id', rr.sessionId)
      if (sessErr) throw sessErr

      // 5. Notify selected teacher
      const selectedTeacher = rr.candidates?.find(c => c.teacherId === teacherId)?.teacher
      if (selectedTeacher) {
        insertNotification({
          userId: teacherId,
          centerId: user.establishmentId!,
          title: 'Vous etes selectionne',
          message: `Vous avez ete selectionne(e) pour remplacer sur "${rr.session?.title || 'Seance'}"`,
          type: 'replacement_selected',
          link: '/teacher-collab',
        })

        await notifyCollaboration(
          'replacement_selected',
          [{ email: selectedTeacher.email, name: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`, userId: teacherId }],
          {
            session_title: rr.session?.title || 'Seance',
            session_date: rr.session?.startTime ? format(new Date(rr.session.startTime), 'EEEE d MMMM yyyy a HH:mm', { locale: fr }) : '',
            app_url: window.location.origin,
          },
          user.establishmentId,
        )
      }

      toast.success('Professeur selectionne, seance mise a jour')
      fetchReplacements()
    } catch (err: any) {
      console.error('selectTeacher:', err.message)
      toast.error('Erreur lors de la selection')
    }
  }, [user, replacements, notifyCollaboration, fetchReplacements])

  // ---- MARK NO REPLACEMENT (admin) ----
  const markNoReplacement = useCallback(async (replacementRequestId: string) => {
    if (isDemoMode || !user?.establishmentId || !user?.id) return
    try {
      const rr = replacements.find(r => r.id === replacementRequestId)
      if (!rr) return

      // 1. Update replacement_request
      const { error: rrErr } = await supabase
        .from('replacement_requests')
        .update({ status: 'no_replacement' })
        .eq('id', replacementRequestId)
      if (rrErr) throw rrErr

      // 2. Mark session needs_reschedule
      const { error: sessErr } = await supabase
        .from('training_sessions')
        .update({ needs_reschedule: true })
        .eq('id', rr.sessionId)
      if (sessErr) throw sessErr

      // 3. Notify admin (self)
      insertNotification({
        userId: user.id,
        centerId: user.establishmentId,
        title: 'Seance a replanifier',
        message: `La seance "${rr.session?.title || 'Seance'}" n'a pas pu etre remplacee.`,
        type: 'session_needs_reschedule',
        link: '/planning',
      })

      toast.success('Seance marquee comme "a replanifier"')
      fetchReplacements()
    } catch (err: any) {
      console.error('markNoReplacement:', err.message)
      toast.error('Erreur')
    }
  }, [user, replacements, fetchReplacements])

  // ---- REALTIME ----
  useEffect(() => {
    if (isDemoMode || !user?.establishmentId) return
    const channel = supabase
      .channel('replacement-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacement_requests', filter: `center_id=eq.${user.establishmentId}` }, () => {
        fetchReplacements()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacement_candidates', filter: `center_id=eq.${user.establishmentId}` }, () => {
        fetchReplacements()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.establishmentId, fetchReplacements])

  // ---- Filter for teacher: requests where I'm a candidate ----
  const getReplacementsForTeacher = useCallback((teacherId: string) => {
    return replacements.filter(r => r.candidates?.some(c => c.teacherId === teacherId))
  }, [replacements])

  return {
    replacements,
    isLoading,
    fetchReplacements,
    create,
    acceptCandidate,
    rejectCandidate,
    selectTeacher,
    markNoReplacement,
    getReplacementsForTeacher,
  }
}
