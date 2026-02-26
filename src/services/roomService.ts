/**
 * Service pour la gestion des salles
 * Contient la logique métier pour les salles
 */

import type { Room, CreateRoomData, UpdateRoomData, RoomFilters } from '@/types'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/utils'

export class RoomService {
  // ==================== CRUD OPERATIONS ====================

  /**
   * Récupérer toutes les salles d'un établissement
   */
  static async getRooms(establishmentId: string): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          building:buildings(id, name)
        `)
        .eq('establishment_id', establishmentId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Récupérer une salle par son ID
   */
  static async getRoomById(roomId: string): Promise<Room | null> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          building:buildings(id, name)
        `)
        .eq('id', roomId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Pas de résultat
        throw error
      }

      return data
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Créer une nouvelle salle
   */
  static async createRoom(data: CreateRoomData, establishmentId: string): Promise<Room> {
    try {
      // Vérifier que le code n'existe pas déjà
      const existingRoom = await this.getRoomByCode(data.code, establishmentId)
      if (existingRoom) {
        throw new Error('Une salle avec ce code existe déjà')
      }

      const roomData = {
        name: data.name,
        code: data.code,
        description: data.description,
        capacity: data.capacity,
        room_type: data.roomType,
        establishment_id: establishmentId,
        building_id: data.buildingId,
        floor: data.floor,
        equipment: data.equipment || [],
      }

      const { data: newRoom, error } = await supabase
        .from('rooms')
        .insert(roomData)
        .select(`
          *,
          building:buildings(id, name)
        `)
        .single()

      if (error) throw error
      return newRoom
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Mettre à jour une salle
   */
  static async updateRoom(data: UpdateRoomData): Promise<Room> {
    try {
      // Si le code change, vérifier qu'il n'existe pas déjà
      if (data.code) {
        const existingRoom = await this.getRoomByCode(data.code)
        if (existingRoom && existingRoom.id !== data.id) {
          throw new Error('Une salle avec ce code existe déjà')
        }
      }

      const updateData = {
        name: data.name,
        code: data.code,
        description: data.description,
        capacity: data.capacity,
        room_type: data.roomType,
        building_id: data.buildingId,
        floor: data.floor,
        equipment: data.equipment,
      }

      // Supprimer les propriétés undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData]
        }
      })

      const { data: updatedRoom, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', data.id)
        .select(`
          *,
          building:buildings(id, name)
        `)
        .single()

      if (error) throw error
      return updatedRoom
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Supprimer une salle (soft delete)
   */
  static async deleteRoom(roomId: string): Promise<void> {
    try {
      // Vérifier s'il y a des réservations actives
      const hasActiveBookings = await this.hasActiveBookings(roomId)
      if (hasActiveBookings) {
        throw new Error('Impossible de supprimer une salle avec des réservations actives')
      }

      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', roomId)

      if (error) throw error
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== QUERY OPERATIONS ====================

  /**
   * Récupérer une salle par son code
   */
  static async getRoomByCode(code: string, establishmentId?: string): Promise<Room | null> {
    try {
      let query = supabase
        .from('rooms')
        .select(`
          *,
          building:buildings(id, name)
        `)
        .eq('code', code)
        .eq('is_active', true)

      if (establishmentId) {
        query = query.eq('establishment_id', establishmentId)
      }

      const { data, error } = await query.single()

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
   * Filtrer les salles
   */
  static filterRooms(rooms: Room[], filters: RoomFilters): Room[] {
    return rooms.filter(room => {
      // Filtrer par type
      if (filters.roomType && filters.roomType.length > 0) {
        if (!filters.roomType.includes(room.roomType)) return false
      }

      // Filtrer par bâtiment
      if (filters.buildingId) {
        if (room.buildingId !== filters.buildingId) return false
      }

      // Filtrer par capacité
      if (filters.capacity) {
        if (filters.capacity.min && room.capacity < filters.capacity.min) return false
        if (filters.capacity.max && room.capacity > filters.capacity.max) return false
      }

      // Filtrer par équipement
      if (filters.equipment && filters.equipment.length > 0) {
        const roomEquipmentNames = room.equipment.map(eq => eq.name.toLowerCase())
        const hasRequiredEquipment = filters.equipment.some(equipName =>
          roomEquipmentNames.includes(equipName.toLowerCase())
        )
        if (!hasRequiredEquipment) return false
      }

      // Filtrer par statut
      if (filters.isActive !== undefined) {
        if (room.isActive !== filters.isActive) return false
      }

      return true
    })
  }

  /**
   * Rechercher des salles par nom ou code
   */
  static async searchRooms(query: string, establishmentId: string): Promise<Room[]> {
    try {
      if (!query.trim()) return []

      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          building:buildings(id, name)
        `)
        .eq('establishment_id', establishmentId)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .order('name')
        .limit(10)

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== AVAILABILITY ====================

  /**
   * Vérifier la disponibilité d'une salle
   */
  static async checkRoomAvailability(
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
      
      return !data // true si pas de conflit
    } catch (error) {
      console.error('Error checking room availability:', error)
      return false
    }
  }

  /**
   * Récupérer les créneaux disponibles d'une salle pour une date
   */
  static async getRoomAvailability(roomId: string, date: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_room_availability', {
          p_room_id: roomId,
          p_date: date,
        })

      if (error) throw error
      return data || []
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Récupérer les statistiques d'utilisation des salles
   */
  static async getRoomUsageStats(establishmentId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          room_id,
          room:rooms(name, capacity),
          start_date_time,
          end_date_time,
          status
        `)
        .eq('establishment_id', establishmentId)
        .gte('start_date_time', startDate)
        .lte('start_date_time', endDate)
        .in('status', ['confirmed', 'completed'])

      if (error) throw error

      // Calculer les statistiques par salle
      const stats = new Map<string, {
        roomName: string
        totalBookings: number
        totalHours: number
        capacity: number
      }>()

      data?.forEach(booking => {
        const roomId = booking.room_id
        const duration = new Date(booking.end_date_time).getTime() - 
                        new Date(booking.start_date_time).getTime()
        const hours = duration / (1000 * 60 * 60) // Convertir en heures

        if (!stats.has(roomId)) {
          stats.set(roomId, {
            roomName: (booking.room as any)?.name || 'Salle inconnue',
            totalBookings: 0,
            totalHours: 0,
            capacity: (booking.room as any)?.capacity || 0,
          })
        }

        const roomStats = stats.get(roomId)!
        roomStats.totalBookings++
        roomStats.totalHours += hours
      })

      return Array.from(stats.entries()).map(([roomId, stats]) => ({
        roomId,
        ...stats,
        averageBookingDuration: stats.totalBookings > 0 ? 
          stats.totalHours / stats.totalBookings : 0,
      }))
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== VALIDATION ====================

  /**
   * Valider les données d'une salle
   */
  static validateRoomData(data: CreateRoomData | UpdateRoomData): string[] {
    const errors: string[] = []

    if ('name' in data && data.name && data.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères')
    }

    if ('code' in data && data.code && data.code.trim().length < 2) {
      errors.push('Le code doit contenir au moins 2 caractères')
    }

    if ('capacity' in data && data.capacity && data.capacity < 1) {
      errors.push('La capacité doit être supérieure à 0')
    }

    if ('floor' in data && data.floor && data.floor < 0) {
      errors.push('L\'étage ne peut pas être négatif')
    }

    return errors
  }

  // ==================== HELPERS ====================

  /**
   * Vérifier si une salle a des réservations actives
   */
  private static async hasActiveBookings(roomId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('room_id', roomId)
        .in('status', ['confirmed', 'pending', 'in_progress'])
        .gte('end_date_time', new Date().toISOString())
        .limit(1)

      if (error) throw error
      return (data && data.length > 0) || false
    } catch (error) {
      console.error('Error checking active bookings:', error)
      return true // En cas d'erreur, on considère qu'il y a des réservations
    }
  }
}