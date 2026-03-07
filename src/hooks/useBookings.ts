/**
 * Hook personnalisé pour la gestion des séances
 * Gère toutes les opérations CRUD sur les séances
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  Booking,
  CreateBookingData,
  UpdateBookingData,
  BookingFilters,
  UseBookingsReturn,
  UUID,
  DateString,
  CalendarEvent,
  BatchCreateSessionInput,
  BatchCreateResult,
} from '@/types'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useEmailNotifications } from './useEmailNotifications'
import { useVisioMeetings } from './useVisioMeetings'
import { useCenterSettings } from './useCenterSettings'
import { getErrorMessage } from '@/utils'
import { transformBooking } from '@/utils/transforms'
import { getAutoSubjectColor } from '@/utils/constants'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import { AuditService } from '@/services/auditService'
import toast from 'react-hot-toast'

export function useBookings(): UseBookingsReturn {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { notifySession } = useEmailNotifications()
  const { createMeeting, updateMeeting, deleteMeeting } = useVisioMeetings()
  const { settings: centerSettings } = useCenterSettings()

  // ==================== HELPER FUNCTIONS ====================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: unknown, _defaultMessage = 'Une erreur est survenue') => {
    const message = getErrorMessage(error)
    setError(message)
    console.error('Bookings Error:', error)
    return message
  }, [])

  // ==================== FETCH FUNCTIONS ====================

  const fetchBookings = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('training_sessions')
        .select(`
          *,
          room:rooms(id, name, room_type, capacity),
          trainer:profiles!training_sessions_trainer_id_fkey(id, full_name, email),
          subject:subjects(id, name, color),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)
        .eq('center_id', user.establishmentId)
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      setBookings((data || []).map(transformBooking))
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des séances')
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId, handleError])

  const refreshBookings = useCallback(async (): Promise<void> => {
    await fetchBookings()
  }, [fetchBookings])

  // ==================== CONFLICT CHECK ====================

  const checkBookingConflict = useCallback(async (
    roomId: UUID,
    startDateTime: DateString,
    endDateTime: DateString,
    excludeBookingId?: UUID
  ): Promise<boolean> => {
    try {
      let query = supabase
        .from('training_sessions')
        .select('id')
        .eq('room_id', roomId)
        .in('status', ['scheduled', 'in_progress'])
        .lt('start_time', endDateTime)
        .gt('end_time', startDateTime)

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      const { data, error } = await query.limit(1)

      if (error) throw error
      return (data?.length ?? 0) > 0
    } catch (error) {
      console.error('Error checking booking conflict:', error)
      return false
    }
  }, [])

  const checkTrainerConflict = useCallback(async (
    trainerId: UUID,
    startDateTime: DateString,
    endDateTime: DateString,
    excludeBookingId?: UUID
  ): Promise<boolean> => {
    try {
      let query = supabase
        .from('training_sessions')
        .select('id')
        .eq('trainer_id', trainerId)
        .in('status', ['scheduled', 'in_progress'])
        .lt('start_time', endDateTime)
        .gt('end_time', startDateTime)

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      const { data, error } = await query.limit(1)

      if (error) throw error
      return (data?.length ?? 0) > 0
    } catch (error) {
      console.error('Error checking trainer conflict:', error)
      return false
    }
  }, [])

  // ==================== CRUD FUNCTIONS ====================

  const createBooking = useCallback(async (data: CreateBookingData): Promise<Booking> => {
    if (!user?.establishmentId) {
      throw new Error('Utilisateur non connecté')
    }

    try {
      setError(null)

      // Vérifier les limites d'abonnement
      const limitCheck = await SubscriptionLimitsService.checkLimit(user.establishmentId, 'bookings')
      if (!limitCheck.allowed) {
        const message = `Limite du plan atteinte (${limitCheck.current}/${limitCheck.max} séances ce mois). Contactez votre administrateur pour upgrader.`
        toast.error(message)
        throw new Error(message)
      }

      // Vérifier les conflits de réservation (seulement si une salle est sélectionnée)
      if (data.roomId) {
        const hasConflict = await checkBookingConflict(
          data.roomId,
          data.startDateTime,
          data.endDateTime
        )

        if (hasConflict) {
          throw new Error('Cette salle est déjà occupée pour cette période')
        }
      }

      const sessionData = {
        title: data.title,
        description: data.description,
        start_time: data.startDateTime,
        end_time: data.endDateTime,
        room_id: data.roomId || null,
        additional_room_ids: data.additionalRoomIds?.length ? data.additionalRoomIds : [],
        trainer_id: user.id,
        center_id: user.establishmentId,
        session_type: data.sessionType || 'in_person',
        status: 'scheduled' as const,
        subject_id: data.subjectId || null,
        class_id: data.classId || null,
        meeting_url: data.meetingUrl || null,
      }

      const { data: newSession, error: createError } = await supabase
        .from('training_sessions')
        .insert(sessionData)
        .select(`
          *,
          room:rooms(id, name, room_type, capacity),
          trainer:profiles!training_sessions_trainer_id_fkey(id, full_name, email),
          subject:subjects(id, name, color),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)
        .single()

      if (createError) throw createError

      const transformed = transformBooking(newSession)

      setBookings(prev => [...prev, transformed])
      toast.success(`Séance "${transformed.title}" créée avec succès`)

      // Audit logging
      AuditService.logCrud('created', 'session', transformed.id, user.id, user.establishmentId, { title: transformed.title })

      // Notification email (async, non-bloquant)
      notifySession('session_created', transformed, transformed.room?.name)

      // Visio auto-create (async, non-bloquant)
      const visioProvider = centerSettings.visio_provider
      if (
        visioProvider &&
        centerSettings.visio_auto_create &&
        transformed.sessionType !== 'in_person' &&
        !data.meetingUrl
      ) {
        const startDt = new Date(transformed.startDateTime)
        const endDt = new Date(transformed.endDateTime)
        const durationMin = Math.round((endDt.getTime() - startDt.getTime()) / 60000)

        const providerLabel = visioProvider === 'zoom' ? 'Zoom' : visioProvider === 'teams' ? 'Teams' : 'Google Meet'

        createMeeting({
          topic: transformed.title,
          startTime: transformed.startDateTime,
          duration: durationMin,
        }).then(async (visio) => {
          // Update DB with visio info
          await supabase
            .from('training_sessions')
            .update({
              meeting_url: visio.join_url,
              visio_meeting_id: visio.meeting_id,
              visio_join_url: visio.join_url,
              visio_password: visio.password,
              visio_provider: visioProvider,
            })
            .eq('id', transformed.id)

          // Update local state
          setBookings(prev =>
            prev.map(b =>
              b.id === transformed.id
                ? { ...b, meetingUrl: visio.join_url, visioMeetingId: visio.meeting_id, visioProvider }
                : b
            )
          )
          toast.success(`Lien ${providerLabel} créé automatiquement`)
        }).catch(err => {
          console.error('[Visio] auto-create failed:', err)
          toast.error(`Visio : ${(err as Error).message}`)
        })
      }

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création de la séance')
      toast.error(message)
      throw error
    }
  }, [user?.id, user?.establishmentId, checkBookingConflict, handleError, notifySession, centerSettings, createMeeting])

  const updateBooking = useCallback(async (data: UpdateBookingData): Promise<Booking> => {
    try {
      setError(null)

      // Vérifier les conflits si les dates ou la salle changent (seulement si une salle est définie)
      const effectiveRoomId = data.roomId ?? bookings.find(b => b.id === data.id)?.roomId
      if (effectiveRoomId && (data.roomId || data.startDateTime || data.endDateTime)) {
        const booking = bookings.find(b => b.id === data.id)
        if (!booking) throw new Error('Séance introuvable')

        const hasConflict = await checkBookingConflict(
          data.roomId || booking.roomId,
          data.startDateTime || booking.startDateTime,
          data.endDateTime || booking.endDateTime,
          data.id
        )

        if (hasConflict) {
          throw new Error('Cette salle est déjà occupée pour cette période')
        }
      }

      const updateData: Record<string, any> = {
        title: data.title,
        description: data.description,
        start_time: data.startDateTime,
        end_time: data.endDateTime,
        room_id: data.roomId,
        subject_id: data.subjectId,
        class_id: data.classId,
        meeting_url: data.meetingUrl,
        session_type: data.sessionType,
      }
      if (data.additionalRoomIds !== undefined) {
        updateData.additional_room_ids = data.additionalRoomIds
      }

      // Supprimer les propriétés undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData]
        }
      })

      const { data: updatedBooking, error: updateError } = await supabase
        .from('training_sessions')
        .update(updateData)
        .eq('id', data.id)
        .select(`
          *,
          room:rooms(id, name, room_type, capacity),
          trainer:profiles!training_sessions_trainer_id_fkey(id, full_name, email),
          subject:subjects(id, name, color),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)
        .single()

      if (updateError) throw updateError

      const transformed = transformBooking(updatedBooking)

      setBookings(prev =>
        prev.map(booking => booking.id === data.id ? transformed : booking)
      )

      toast.success(`Séance "${transformed.title}" mise à jour avec succès`)

      // Audit logging
      if (user) {
        AuditService.logCrud('updated', 'session', data.id, user.id, user.establishmentId, { title: transformed.title })
      }

      // Notification email (async, non-bloquant)
      notifySession('session_updated', transformed, transformed.room?.name)

      // Visio update/delete (async, non-bloquant)
      const oldBooking = bookings.find(b => b.id === data.id)
      if (oldBooking?.visioMeetingId) {
        if (data.sessionType === 'in_person') {
          // Session became in_person → delete visio meeting
          deleteMeeting(oldBooking.visioMeetingId, oldBooking.visioProvider).then(async () => {
            await supabase
              .from('training_sessions')
              .update({ meeting_url: null, visio_meeting_id: null, visio_join_url: null, visio_password: null, visio_provider: null })
              .eq('id', data.id)
            setBookings(prev =>
              prev.map(b => b.id === data.id ? { ...b, meetingUrl: undefined, visioMeetingId: undefined, visioProvider: undefined } : b)
            )
          }).catch(err => console.error('[Visio] delete on type change failed:', err))
        } else if (data.title || data.startDateTime || data.endDateTime) {
          // Title or schedule changed → update visio meeting
          const newStart = data.startDateTime || oldBooking.startDateTime
          const newEnd = data.endDateTime || oldBooking.endDateTime
          const durationMin = Math.round((new Date(newEnd).getTime() - new Date(newStart).getTime()) / 60000)
          updateMeeting(oldBooking.visioMeetingId, {
            topic: data.title || oldBooking.title,
            startTime: newStart,
            duration: durationMin,
            provider: oldBooking.visioProvider,
          }).catch(err => console.error('[Visio] update failed:', err))
        }
      }

      // Auto-create change request if session has accepted assignment (teacher collab)
      if (user && (data.startDateTime || data.endDateTime || data.roomId)) {
        const oldBooking = bookings.find(b => b.id === data.id)
        if (oldBooking) {
          supabase.from('session_assignments')
            .select('id, teacher_id')
            .eq('session_id', data.id)
            .eq('status', 'accepted')
            .limit(1)
            .single()
            .then(({ data: assignment }) => {
              if (assignment) {
                const oldVals: Record<string, unknown> = {}
                const newVals: Record<string, unknown> = {}
                if (data.startDateTime && data.startDateTime !== oldBooking.startDateTime) {
                  oldVals.start_time = oldBooking.startDateTime; newVals.start_time = data.startDateTime
                }
                if (data.endDateTime && data.endDateTime !== oldBooking.endDateTime) {
                  oldVals.end_time = oldBooking.endDateTime; newVals.end_time = data.endDateTime
                }
                if (data.roomId && data.roomId !== oldBooking.roomId) {
                  oldVals.room_id = oldBooking.roomId; newVals.room_id = data.roomId
                }
                if (Object.keys(newVals).length > 0) {
                  supabase.from('session_change_requests').insert({
                    session_id: data.id,
                    teacher_id: assignment.teacher_id,
                    center_id: user.establishmentId,
                    change_type: data.roomId && data.roomId !== oldBooking.roomId ? 'room_change' : 'time_change',
                    old_values: oldVals,
                    new_values: newVals,
                    requested_by: user.id,
                  }).then(() => {})
                }
              }
            })
        }
      }

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour de la séance')
      toast.error(message)
      throw error
    }
  }, [user, bookings, checkBookingConflict, handleError, notifySession, updateMeeting, deleteMeeting])

  const deleteBooking = useCallback(async (id: UUID): Promise<void> => {
    try {
      setError(null)

      // Visio delete (fire-and-forget)
      const booking = bookings.find(b => b.id === id)
      if (booking?.visioMeetingId) {
        deleteMeeting(booking.visioMeetingId, booking.visioProvider).catch(err =>
          console.error('[Visio] delete on session delete failed:', err)
        )
      }

      const { error: deleteError } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setBookings(prev => prev.filter(booking => booking.id !== id))
      toast.success('Séance supprimée avec succès')

      // Audit logging
      if (user) {
        AuditService.logCrud('deleted', 'session', id, user.id, user.establishmentId)
      }
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la suppression de la séance')
      toast.error(message)
      throw error
    }
  }, [user, bookings, handleError, deleteMeeting])

  const cancelBooking = useCallback(async (id: UUID, _reason?: string): Promise<Booking> => {
    try {
      setError(null)

      // Visio delete (fire-and-forget)
      const existingBooking = bookings.find(b => b.id === id)
      if (existingBooking?.visioMeetingId) {
        deleteMeeting(existingBooking.visioMeetingId, existingBooking.visioProvider).catch(err =>
          console.error('[Visio] delete on cancel failed:', err)
        )
      }

      const { data: cancelledBooking, error: cancelError } = await supabase
        .from('training_sessions')
        .update({
          status: 'cancelled',
        })
        .eq('id', id)
        .select(`
          *,
          room:rooms(id, name, room_type, capacity),
          trainer:profiles!training_sessions_trainer_id_fkey(id, full_name, email),
          subject:subjects(id, name, color),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)
        .single()

      if (cancelError) throw cancelError

      const transformed = transformBooking(cancelledBooking)

      setBookings(prev =>
        prev.map(booking => booking.id === id ? transformed : booking)
      )

      toast.success('Séance annulée avec succès')

      // Notification email (async, non-bloquant)
      notifySession('session_cancelled', transformed, transformed.room?.name)

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de l\'annulation de la séance')
      toast.error(message)
      throw error
    }
  }, [user?.id, bookings, handleError, notifySession, deleteMeeting])

  const reactivateBooking = useCallback(async (id: UUID): Promise<Booking> => {
    try {
      setError(null)

      const { data: reactivated, error: reactivateError } = await supabase
        .from('training_sessions')
        .update({ status: 'scheduled' })
        .eq('id', id)
        .select(`
          *,
          room:rooms(id, name, room_type, capacity),
          trainer:profiles!training_sessions_trainer_id_fkey(id, full_name, email),
          subject:subjects(id, name, color),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)
        .single()

      if (reactivateError) throw reactivateError

      const transformed = transformBooking(reactivated)
      setBookings(prev => prev.map(b => b.id === id ? transformed : b))
      toast.success('Séance réactivée avec succès')
      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la réactivation')
      toast.error(message)
      throw error
    }
  }, [handleError])

  const createBatchBookings = useCallback(async (sessions: BatchCreateSessionInput[]): Promise<BatchCreateResult> => {
    if (!user?.establishmentId) {
      throw new Error('Utilisateur non connecté')
    }
    if (sessions.length === 0) {
      return { created: 0, failed: [] }
    }

    try {
      setError(null)

      const limitCheck = await SubscriptionLimitsService.checkLimit(user.establishmentId, 'bookings')
      if (!limitCheck.allowed) {
        const message = `Limite du plan atteinte (${limitCheck.current}/${limitCheck.max} séances ce mois). Contactez votre administrateur pour upgrader.`
        toast.error(message)
        throw new Error(message)
      }

      const allData = sessions.map(s => ({
        title: s.title,
        description: s.description || null,
        start_time: s.startDateTime,
        end_time: s.endDateTime,
        room_id: s.roomId,
        trainer_id: s.trainerId,
        center_id: user.establishmentId,
        session_type: 'in_person' as const,
        status: 'scheduled' as const,
        subject_id: s.subjectId || null,
        class_id: s.classId || null,
      }))

      const { data: newSessions, error: insertError } = await supabase
        .from('training_sessions')
        .insert(allData)
        .select(`
          *,
          room:rooms(id, name, room_type, capacity),
          trainer:profiles!training_sessions_trainer_id_fkey(id, full_name, email),
          subject:subjects(id, name, color),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)

      if (insertError) throw insertError

      const transformed = (newSessions || []).map(transformBooking)
      setBookings(prev => [...prev, ...transformed])

      toast.success(`${transformed.length} séance${transformed.length > 1 ? 's' : ''} créée${transformed.length > 1 ? 's' : ''} avec succès`)

      AuditService.logCrud('created', 'session', 'batch', user.id, user.establishmentId, { count: transformed.length, batch: true })

      return { created: transformed.length, failed: [] }
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création en lot')
      toast.error(message)
      throw error
    }
  }, [user?.id, user?.establishmentId, handleError])

  // ==================== QUERY FUNCTIONS ====================

  const getBookingById = useCallback((id: UUID): Booking | undefined => {
    return bookings.find(booking => booking.id === id)
  }, [bookings])

  const filterBookings = useCallback((filters: BookingFilters): Booking[] => {
    return bookings.filter(booking => {
      // Filtrer par date de début
      if (filters.startDate) {
        if (new Date(booking.startDateTime) < new Date(filters.startDate)) return false
      }

      // Filtrer par date de fin
      if (filters.endDate) {
        if (new Date(booking.startDateTime) > new Date(filters.endDate)) return false
      }

      // Filtrer par salle
      if (filters.roomId) {
        if (booking.roomId !== filters.roomId) return false
      }

      // Filtrer par utilisateur
      if (filters.userId) {
        if (booking.userId !== filters.userId) return false
      }

      // Filtrer par statut
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(booking.status)) return false
      }

      // Filtrer par type de réservation
      if (filters.bookingType && filters.bookingType.length > 0) {
        if (!filters.bookingType.includes(booking.bookingType)) return false
      }

      return true
    })
  }, [bookings])

  const getBookingsByRoom = useCallback((roomId: UUID, date?: DateString): Booking[] => {
    return bookings.filter(booking => {
      if (booking.roomId !== roomId) return false
      
      if (date) {
        const bookingDate = new Date(booking.startDateTime).toDateString()
        const filterDate = new Date(date).toDateString()
        return bookingDate === filterDate
      }
      
      return true
    })
  }, [bookings])

  const getBookingsByUser = useCallback((userId: UUID): Booking[] => {
    return bookings.filter(booking => booking.userId === userId)
  }, [bookings])

  // ==================== COMPUTED VALUES ====================

  const calendarEvents = useMemo((): CalendarEvent[] => {
    return bookings.map(booking => ({
      id: booking.id,
      title: booking.title,
      start: booking.startDateTime,
      end: booking.endDateTime,
      roomId: booking.roomId,
      roomName: booking.room?.name || 'Salle inconnue',
      additionalRoomIds: booking.additionalRoomIds || [],
      userId: booking.userId,
      userName: booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'Utilisateur inconnu',
      teacher: booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : undefined,
      status: booking.status,
      type: booking.bookingType,
      description: booking.description,
      color: getBookingColor(
        booking.status,
        booking.bookingType,
        booking.subjectColor || (booking.matiere ? getAutoSubjectColor(booking.matiere) : undefined)
      ),
      recurrence: booking.recurrence,
      matiere: booking.matiere,
      diplome: booking.diplome,
      niveau: booking.niveau,
      classId: booking.classId,
      subjectId: booking.subjectId,
      meetingUrl: booking.meetingUrl,
      sessionType: booking.sessionType,
      visioMeetingId: booking.visioMeetingId,
      visioProvider: booking.visioProvider,
    }))
  }, [bookings])

  const upcomingBookings = useMemo(() => {
    const now = new Date()
    return bookings
      .filter(booking => new Date(booking.startDateTime) > now && booking.status === 'scheduled')
      .slice(0, 5)
  }, [bookings])

  const bookingsByStatus = useMemo(() => {
    return bookings.reduce((acc, booking) => {
      if (!acc[booking.status]) {
        acc[booking.status] = []
      }
      acc[booking.status].push(booking)
      return acc
    }, {} as Record<string, Booking[]>)
  }, [bookings])

  // ==================== HELPER FUNCTIONS ====================

  function getBookingColor(status: string, type: string, subjectColor?: string): string {
    if (status === 'cancelled') return '#ef4444'
    if (status === 'pending') return '#f59e0b'
    if (subjectColor) return subjectColor

    switch (type) {
      case 'course': return '#3b82f6'
      case 'exam': return '#dc2626'
      case 'meeting': return '#059669'
      case 'event': return '#7c3aed'
      case 'maintenance': return '#6b7280'
      default: return '#3b82f6'
    }
  }

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (user?.establishmentId) {
      fetchBookings()
    } else {
      setIsLoading(false)
    }
  }, [user?.establishmentId, fetchBookings])

  // Écouter les changements en temps réel
  useEffect(() => {
    if (isDemoMode || !user?.establishmentId) return

    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_sessions',
          filter: `center_id=eq.${user.establishmentId}`,
        },
        (payload) => {
          console.log('Booking change detected:', payload)

          switch (payload.eventType) {
            case 'INSERT':
              fetchBookings() // Refetch to get joined data
              break

            case 'UPDATE':
              fetchBookings() // Refetch to get joined data
              break

            case 'DELETE':
              setBookings(prev => prev.filter(booking => booking.id !== payload.old.id))
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.establishmentId, fetchBookings])

  const toggleAttendanceMarking = useCallback(async (sessionId: string, enabled: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('training_sessions')
        .update({ attendance_marking_enabled: enabled })
        .eq('id', sessionId)
      if (updateError) throw updateError
      setBookings(prev => prev.map(b => b.id === sessionId ? { ...b, attendanceMarkingEnabled: enabled } : b))
      toast.success(enabled ? 'Saisie présences activée' : 'Saisie présences désactivée')
    } catch (err) {
      console.error('Error toggling attendance marking:', err)
      toast.error('Erreur lors de la modification')
    }
  }, [])

  return {
    bookings,
    isLoading,
    error,
    createBooking,
    updateBooking,
    deleteBooking,
    cancelBooking,
    reactivateBooking,
    createBatchBookings,
    checkBookingConflict,
    checkTrainerConflict,
    getBookingById,
    filterBookings,
    getBookingsByRoom,
    getBookingsByUser,
    refreshBookings,
    clearError,
    toggleAttendanceMarking,
    // Valeurs calculées additionnelles
    calendarEvents,
    upcomingBookings,
    bookingsByStatus,
  }
}