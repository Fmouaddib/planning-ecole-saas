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
import { getErrorMessage } from '@/utils'
import { transformBooking } from '@/utils/transforms'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import { AuditService } from '@/services/auditService'
import toast from 'react-hot-toast'

export function useBookings(): UseBookingsReturn {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

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
          subject:subjects(id, name),
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

      // Vérifier les conflits de réservation
      const hasConflict = await checkBookingConflict(
        data.roomId,
        data.startDateTime,
        data.endDateTime
      )

      if (hasConflict) {
        throw new Error('Cette salle est déjà occupée pour cette période')
      }

      const sessionData = {
        title: data.title,
        description: data.description,
        start_time: data.startDateTime,
        end_time: data.endDateTime,
        room_id: data.roomId,
        trainer_id: user.id,
        center_id: user.establishmentId,
        session_type: 'in_person' as const,  // enum: in_person, online, hybrid
        status: 'scheduled' as const,
        subject_id: data.subjectId || null,
        class_id: data.classId || null,
      }

      const { data: newSession, error: createError } = await supabase
        .from('training_sessions')
        .insert(sessionData)
        .select(`
          *,
          room:rooms(id, name, room_type, capacity),
          trainer:profiles!training_sessions_trainer_id_fkey(id, full_name, email),
          subject:subjects(id, name),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)
        .single()

      if (createError) throw createError

      const transformed = transformBooking(newSession)

      setBookings(prev => [...prev, transformed])
      toast.success(`Séance "${transformed.title}" créée avec succès`)

      // Audit logging
      AuditService.logCrud('created', 'session', transformed.id, user.id, user.establishmentId, { title: transformed.title })

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création de la séance')
      toast.error(message)
      throw error
    }
  }, [user?.id, user?.establishmentId, checkBookingConflict, handleError])

  const updateBooking = useCallback(async (data: UpdateBookingData): Promise<Booking> => {
    try {
      setError(null)

      // Vérifier les conflits si les dates ou la salle changent
      if (data.roomId || data.startDateTime || data.endDateTime) {
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

      const updateData = {
        title: data.title,
        description: data.description,
        start_time: data.startDateTime,
        end_time: data.endDateTime,
        room_id: data.roomId,
        subject_id: data.subjectId,
        class_id: data.classId,
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
          subject:subjects(id, name),
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

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour de la séance')
      toast.error(message)
      throw error
    }
  }, [user, bookings, checkBookingConflict, handleError])

  const deleteBooking = useCallback(async (id: UUID): Promise<void> => {
    try {
      setError(null)

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
  }, [user, handleError])

  const cancelBooking = useCallback(async (id: UUID, _reason?: string): Promise<Booking> => {
    try {
      setError(null)

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
          subject:subjects(id, name),
          class_:classes(id, name, diploma:diplomas(id, title))
        `)
        .single()

      if (cancelError) throw cancelError

      const transformed = transformBooking(cancelledBooking)

      setBookings(prev =>
        prev.map(booking => booking.id === id ? transformed : booking)
      )

      toast.success('Séance annulée avec succès')
      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de l\'annulation de la séance')
      toast.error(message)
      throw error
    }
  }, [user?.id, handleError])

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
          subject:subjects(id, name),
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
      userId: booking.userId,
      userName: booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'Utilisateur inconnu',
      teacher: booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : undefined,
      status: booking.status,
      type: booking.bookingType,
      description: booking.description,
      color: getBookingColor(booking.status, booking.bookingType),
      recurrence: booking.recurrence,
      matiere: booking.matiere,
      diplome: booking.diplome,
      niveau: booking.niveau,
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

  function getBookingColor(status: string, type: string): string {
    if (status === 'cancelled') return '#ef4444'
    if (status === 'pending') return '#f59e0b'
    
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

  return {
    bookings,
    isLoading,
    error,
    createBooking,
    updateBooking,
    deleteBooking,
    cancelBooking,
    createBatchBookings,
    checkBookingConflict,
    checkTrainerConflict,
    getBookingById,
    filterBookings,
    getBookingsByRoom,
    getBookingsByUser,
    refreshBookings,
    clearError,
    // Valeurs calculées additionnelles
    calendarEvents,
    upcomingBookings,
    bookingsByStatus,
  }
}