/**
 * Hook personnalisé pour la gestion des réservations
 * Gère toutes les opérations CRUD sur les réservations
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
  CalendarEvent
} from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getErrorMessage } from '@/utils'
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
    if (!user?.establishmentId) return

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email),
          attendees:booking_attendees(
            id,
            user:users(id, first_name, last_name, email),
            attendee_type,
            is_required,
            has_confirmed
          )
        `)
        .eq('establishment_id', user.establishmentId)
        .order('start_date_time', { ascending: true })

      if (fetchError) throw fetchError

      setBookings(data || [])
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des réservations')
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
      const { data, error } = await supabase
        .rpc('check_booking_conflict', {
          p_room_id: roomId,
          p_start_time: startDateTime,
          p_end_time: endDateTime,
          p_booking_id: excludeBookingId || null,
        })

      if (error) throw error
      
      return data as boolean
    } catch (error) {
      console.error('Error checking booking conflict:', error)
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
        const message = `Limite du plan atteinte (${limitCheck.current}/${limitCheck.max} réservations ce mois). Contactez votre administrateur pour upgrader.`
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
        throw new Error('Cette salle est déjà réservée pour cette période')
      }

      const bookingData = {
        title: data.title,
        description: data.description,
        start_date_time: data.startDateTime,
        end_date_time: data.endDateTime,
        room_id: data.roomId,
        user_id: user.id,
        establishment_id: user.establishmentId,
        booking_type: data.bookingType,
        status: 'pending' as const,
      }

      const { data: newBooking, error: createError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (createError) throw createError

      // Créer les participants si fournis
      if (data.attendees && data.attendees.length > 0) {
        const attendeesData = data.attendees.map(attendee => ({
          booking_id: newBooking.id,
          user_id: attendee.userId,
          attendee_type: attendee.attendeeType,
          is_required: attendee.isRequired,
          has_confirmed: attendee.hasConfirmed,
        }))

        const { error: attendeesError } = await supabase
          .from('booking_attendees')
          .insert(attendeesData)

        if (attendeesError) {
          console.error('Error creating attendees:', attendeesError)
        }
      }

      setBookings(prev => [...prev, newBooking])
      toast.success(`Réservation "${newBooking.title}" créée avec succès`)

      // Audit logging
      AuditService.logCrud('created', 'booking', newBooking.id, user.id, user.establishmentId, { title: newBooking.title })

      return newBooking
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création de la réservation')
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
        if (!booking) throw new Error('Réservation introuvable')

        const hasConflict = await checkBookingConflict(
          data.roomId || booking.roomId,
          data.startDateTime || booking.startDateTime,
          data.endDateTime || booking.endDateTime,
          data.id
        )

        if (hasConflict) {
          throw new Error('Cette salle est déjà réservée pour cette période')
        }
      }

      const updateData = {
        title: data.title,
        description: data.description,
        start_date_time: data.startDateTime,
        end_date_time: data.endDateTime,
        room_id: data.roomId,
        booking_type: data.bookingType,
      }

      // Supprimer les propriétés undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData]
        }
      })

      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', data.id)
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (updateError) throw updateError

      setBookings(prev => 
        prev.map(booking => booking.id === data.id ? updatedBooking : booking)
      )
      
      toast.success(`Réservation "${updatedBooking.title}" mise à jour avec succès`)

      // Audit logging
      if (user) {
        AuditService.logCrud('updated', 'booking', data.id, user.id, user.establishmentId, { title: updatedBooking.title })
      }

      return updatedBooking
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour de la réservation')
      toast.error(message)
      throw error
    }
  }, [user, bookings, checkBookingConflict, handleError])

  const deleteBooking = useCallback(async (id: UUID): Promise<void> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setBookings(prev => prev.filter(booking => booking.id !== id))
      toast.success('Réservation supprimée avec succès')

      // Audit logging
      if (user) {
        AuditService.logCrud('deleted', 'booking', id, user.id, user.establishmentId)
      }
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la suppression de la réservation')
      toast.error(message)
      throw error
    }
  }, [user, handleError])

  const cancelBooking = useCallback(async (id: UUID, reason?: string): Promise<Booking> => {
    try {
      setError(null)

      const { data: cancelledBooking, error: cancelError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id,
          cancellation_reason: reason,
        })
        .eq('id', id)
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (cancelError) throw cancelError

      setBookings(prev => 
        prev.map(booking => booking.id === id ? cancelledBooking : booking)
      )
      
      toast.success('Réservation annulée avec succès')
      return cancelledBooking
    } catch (error) {
      const message = handleError(error, 'Erreur lors de l\'annulation de la réservation')
      toast.error(message)
      throw error
    }
  }, [user?.id, handleError])

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
      status: booking.status,
      type: booking.bookingType,
      description: booking.description,
      color: getBookingColor(booking.status, booking.bookingType),
    }))
  }, [bookings])

  const upcomingBookings = useMemo(() => {
    const now = new Date()
    return bookings
      .filter(booking => new Date(booking.startDateTime) > now && booking.status === 'confirmed')
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
    }
  }, [user?.establishmentId, fetchBookings])

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!user?.establishmentId) return

    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `establishment_id=eq.${user.establishmentId}`,
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