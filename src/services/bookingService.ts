/**
 * Service pour la gestion des réservations
 * Contient la logique métier pour les réservations
 */

import type { Booking, CreateBookingData, UpdateBookingData, BookingFilters, CalendarEvent } from '@/types'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/utils'

export class BookingService {
  // ==================== CRUD OPERATIONS ====================

  /**
   * Récupérer toutes les réservations d'un établissement
   */
  static async getBookings(establishmentId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
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
        .eq('establishment_id', establishmentId)
        .order('start_date_time', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Récupérer une réservation par son ID
   */
  static async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(id, name, code, room_type, capacity),
          user:users(id, first_name, last_name, email),
          attendees:booking_attendees(
            id,
            user:users(id, first_name, last_name, email, role),
            attendee_type,
            is_required,
            has_confirmed
          )
        `)
        .eq('id', bookingId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Créer une nouvelle réservation
   */
  static async createBooking(data: CreateBookingData, userId: string, establishmentId: string): Promise<Booking> {
    try {
      // Vérifier les conflits
      const hasConflict = await this.checkConflict(
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
        user_id: userId,
        establishment_id: establishmentId,
        booking_type: data.bookingType,
        status: 'pending' as const,
      }

      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (error) throw error

      // Ajouter les participants si fournis
      if (data.attendees && data.attendees.length > 0) {
        await this.addAttendees(newBooking.id, data.attendees)
      }

      return newBooking
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Mettre à jour une réservation
   */
  static async updateBooking(data: UpdateBookingData): Promise<Booking> {
    try {
      // Vérifier les conflits si les dates ou la salle changent
      if (data.roomId || data.startDateTime || data.endDateTime) {
        const existingBooking = await this.getBookingById(data.id)
        if (!existingBooking) {
          throw new Error('Réservation introuvable')
        }

        const hasConflict = await this.checkConflict(
          data.roomId || existingBooking.roomId,
          data.startDateTime || existingBooking.startDateTime,
          data.endDateTime || existingBooking.endDateTime,
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

      const { data: updatedBooking, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', data.id)
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (error) throw error
      return updatedBooking
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Supprimer une réservation
   */
  static async deleteBooking(bookingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Annuler une réservation
   */
  static async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<Booking> {
    try {
      const { data: cancelledBooking, error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          cancellation_reason: reason,
        })
        .eq('id', bookingId)
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (error) throw error
      return cancelledBooking
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== QUERY OPERATIONS ====================

  /**
   * Filtrer les réservations
   */
  static filterBookings(bookings: Booking[], filters: BookingFilters): Booking[] {
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

      // Filtrer par type
      if (filters.bookingType && filters.bookingType.length > 0) {
        if (!filters.bookingType.includes(booking.bookingType)) return false
      }

      return true
    })
  }

  /**
   * Récupérer les réservations d'une salle
   */
  static async getRoomBookings(roomId: string, date?: string): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .eq('room_id', roomId)
        .order('start_date_time')

      if (date) {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        query = query
          .gte('start_date_time', startOfDay.toISOString())
          .lte('start_date_time', endOfDay.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Récupérer les réservations d'un utilisateur
   */
  static async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .eq('user_id', userId)
        .order('start_date_time')

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== CALENDAR OPERATIONS ====================

  /**
   * Convertir les réservations en événements de calendrier
   */
  static toCalendarEvents(bookings: Booking[]): CalendarEvent[] {
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
      color: this.getBookingColor(booking.status, booking.bookingType),
    }))
  }

  /**
   * Récupérer les événements de calendrier pour une période
   */
  static async getCalendarEvents(
    establishmentId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(id, name, code, room_type),
          user:users(id, first_name, last_name, email)
        `)
        .eq('establishment_id', establishmentId)
        .gte('start_date_time', startDate)
        .lte('end_date_time', endDate)
        .order('start_date_time')

      if (error) throw error
      
      return this.toCalendarEvents(data || [])
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== CONFLICT CHECKING ====================

  /**
   * Vérifier les conflits de réservation
   */
  static async checkConflict(
    roomId: string,
    startDateTime: string,
    endDateTime: string,
    excludeBookingId?: string
  ): Promise<boolean> {
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
  }

  // ==================== ATTENDEES MANAGEMENT ====================

  /**
   * Ajouter des participants à une réservation
   */
  static async addAttendees(bookingId: string, attendees: any[]): Promise<void> {
    try {
      const attendeesData = attendees.map(attendee => ({
        booking_id: bookingId,
        user_id: attendee.userId,
        attendee_type: attendee.attendeeType,
        is_required: attendee.isRequired,
        has_confirmed: attendee.hasConfirmed,
      }))

      const { error } = await supabase
        .from('booking_attendees')
        .insert(attendeesData)

      if (error) throw error
    } catch (error) {
      console.error('Error adding attendees:', error)
      // Ne pas lancer d'erreur pour ne pas faire échouer la création de la réservation
    }
  }

  /**
   * Confirmer la participation d'un utilisateur
   */
  static async confirmAttendance(bookingId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('booking_attendees')
        .update({ has_confirmed: true })
        .eq('booking_id', bookingId)
        .eq('user_id', userId)

      if (error) throw error
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Récupérer les statistiques de réservation
   */
  static async getBookingStats(establishmentId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booking_type,
          start_date_time,
          end_date_time,
          room:rooms(id, name),
          user:users(id, first_name, last_name)
        `)
        .eq('establishment_id', establishmentId)
        .gte('start_date_time', startDate)
        .lte('start_date_time', endDate)

      if (error) throw error

      const bookings = data || []
      const stats = {
        total: bookings.length,
        byStatus: this.groupBy(bookings, 'status'),
        byType: this.groupBy(bookings, 'booking_type'),
        byRoom: this.groupBy(bookings, (booking: any) => booking.room?.name || 'Salle inconnue'),
        totalHours: bookings.reduce((total, booking) => {
          const duration = new Date(booking.end_date_time).getTime() - 
                          new Date(booking.start_date_time).getTime()
          return total + (duration / (1000 * 60 * 60))
        }, 0),
      }

      return stats
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Obtenir la couleur d'une réservation selon son statut et type
   */
  private static getBookingColor(status: string, type: string): string {
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

  /**
   * Grouper un tableau par une propriété
   */
  private static groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, number> {
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key])
      groups[groupKey] = (groups[groupKey] || 0) + 1
      return groups
    }, {} as Record<string, number>)
  }

  /**
   * Valider les données d'une réservation
   */
  static validateBookingData(data: CreateBookingData | UpdateBookingData): string[] {
    const errors: string[] = []

    if ('title' in data && data.title && data.title.trim().length < 2) {
      errors.push('Le titre doit contenir au moins 2 caractères')
    }

    if ('startDateTime' in data && 'endDateTime' in data && 
        data.startDateTime && data.endDateTime) {
      if (new Date(data.endDateTime) <= new Date(data.startDateTime)) {
        errors.push('La date de fin doit être après la date de début')
      }
    }

    return errors
  }
}