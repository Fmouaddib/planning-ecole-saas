/**
 * Hook personnalisé pour la gestion des salles
 * Gère toutes les opérations CRUD sur les salles
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Room, CreateRoomData, UpdateRoomData, RoomFilters, UseRoomsReturn, UUID } from '@/types'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getErrorMessage } from '@/utils'
import { transformRoom } from '@/utils/transforms'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import { AuditService } from '@/services/auditService'
import toast from 'react-hot-toast'

export function useRooms(): UseRoomsReturn {
  const [rooms, setRooms] = useState<Room[]>([])
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
    console.error('Rooms Error:', error)
    return message
  }, [])

  // ==================== FETCH FUNCTIONS ====================

  const fetchRooms = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('center_id', user.establishmentId)
        .eq('is_available', true)
        .order('name')

      if (fetchError) throw fetchError

      setRooms((data || []).map(transformRoom))
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des salles')
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId, handleError])

  const refreshRooms = useCallback(async (): Promise<void> => {
    await fetchRooms()
  }, [fetchRooms])

  // ==================== CRUD FUNCTIONS ====================

  const createRoom = useCallback(async (data: CreateRoomData): Promise<Room> => {
    if (!user?.establishmentId) {
      throw new Error('Utilisateur non connecté')
    }

    try {
      setError(null)

      // Vérifier les limites d'abonnement
      const limitCheck = await SubscriptionLimitsService.checkLimit(user.establishmentId, 'rooms')
      if (!limitCheck.allowed) {
        const message = `Limite du plan atteinte (${limitCheck.current}/${limitCheck.max} salles). Contactez votre administrateur pour upgrader.`
        toast.error(message)
        throw new Error(message)
      }

      const roomData = {
        name: data.name,
        capacity: data.capacity,
        room_type: data.roomType,
        center_id: user.establishmentId,
        location: data.buildingId || '',
        equipment: data.equipment || [],
      }

      const { data: newRoom, error: createError } = await supabase
        .from('rooms')
        .insert(roomData)
        .select('*')
        .single()

      if (createError) throw createError

      const transformed = transformRoom(newRoom)

      setRooms(prev => [...prev, transformed])
      toast.success(`Salle "${transformed.name}" créée avec succès`)

      // Audit logging
      AuditService.logCrud('created', 'room', transformed.id, user.id, user.establishmentId, { name: transformed.name })

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création de la salle')
      toast.error(message)
      throw error
    }
  }, [user?.establishmentId, user?.id, handleError])

  const updateRoom = useCallback(async (data: UpdateRoomData): Promise<Room> => {
    try {
      setError(null)

      const updateData = {
        name: data.name,
        capacity: data.capacity,
        room_type: data.roomType,
        location: data.buildingId,
        equipment: data.equipment,
      }

      // Supprimer les propriétés undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData]
        }
      })

      const { data: updatedRoom, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', data.id)
        .select('*')
        .single()

      if (updateError) throw updateError

      const transformed = transformRoom(updatedRoom)

      setRooms(prev =>
        prev.map(room => room.id === data.id ? transformed : room)
      )

      toast.success(`Salle "${transformed.name}" mise à jour avec succès`)

      // Audit logging
      if (user) {
        AuditService.logCrud('updated', 'room', data.id, user.id, user.establishmentId, { name: transformed.name })
      }

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour de la salle')
      toast.error(message)
      throw error
    }
  }, [user, handleError])

  const deleteRoom = useCallback(async (id: UUID): Promise<void> => {
    try {
      setError(null)

      // Soft delete - marquer comme non disponible
      const { error: deleteError } = await supabase
        .from('rooms')
        .update({ is_available: false })
        .eq('id', id)

      if (deleteError) throw deleteError

      setRooms(prev => prev.filter(room => room.id !== id))
      toast.success('Salle supprimée avec succès')

      // Audit logging
      if (user) {
        AuditService.logCrud('deleted', 'room', id, user.id, user.establishmentId)
      }
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la suppression de la salle')
      toast.error(message)
      throw error
    }
  }, [user, handleError])

  // ==================== QUERY FUNCTIONS ====================

  const getRoomById = useCallback((id: UUID): Room | undefined => {
    return rooms.find(room => room.id === id)
  }, [rooms])

  const filterRooms = useCallback((filters: RoomFilters): Room[] => {
    return rooms.filter(room => {
      // Filtrer par type de salle
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

      // Filtrer par statut actif
      if (filters.isActive !== undefined) {
        if (room.isActive !== filters.isActive) return false
      }

      return true
    })
  }, [rooms])

  // ==================== COMPUTED VALUES ====================

  const roomsByType = useMemo(() => {
    return rooms.reduce((acc, room) => {
      if (!acc[room.roomType]) {
        acc[room.roomType] = []
      }
      acc[room.roomType].push(room)
      return acc
    }, {} as Record<string, Room[]>)
  }, [rooms])

  const roomsByBuilding = useMemo(() => {
    return rooms.reduce((acc, room) => {
      const buildingId = room.buildingId || 'no-building'
      if (!acc[buildingId]) {
        acc[buildingId] = []
      }
      acc[buildingId].push(room)
      return acc
    }, {} as Record<string, Room[]>)
  }, [rooms])

  const totalCapacity = useMemo(() => {
    return rooms.reduce((total, room) => total + room.capacity, 0)
  }, [rooms])

  // Grouper par type de salle (pas de buildings dans ce schéma)
  const roomTypeLabels: Record<string, string> = {
    classroom: 'Salles de cours',
    lab: 'Laboratoires',
    amphitheater: 'Amphithéâtres',
    meeting_room: 'Salles de réunion',
    computer_lab: 'Salles informatiques',
    gym: 'Équipements sportifs',
    library: 'Bibliothèques',
    other: 'Autres',
  }

  const buildingsWithRooms = useMemo(() => {
    const groupMap = new Map<string, { id: string; name: string; rooms: { id: string; name: string; capacity: number }[] }>()

    for (const room of rooms) {
      const groupId = room.roomType || 'other'
      const groupName = roomTypeLabels[groupId] || groupId

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { id: groupId, name: groupName, rooms: [] })
      }
      groupMap.get(groupId)!.rooms.push({ id: room.id, name: room.name, capacity: room.capacity })
    }

    return Array.from(groupMap.values())
  }, [rooms])

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (user?.establishmentId) {
      fetchRooms()
    } else {
      setIsLoading(false)
    }
  }, [user?.establishmentId, fetchRooms])

  // Écouter les changements en temps réel
  useEffect(() => {
    if (isDemoMode || !user?.establishmentId) return

    const channel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `center_id=eq.${user.establishmentId}`,
        },
        (payload) => {
          console.log('Room change detected:', payload)

          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              fetchRooms() // Refetch to get joined data (building)
              break

            case 'DELETE':
              setRooms(prev => prev.filter(room => room.id !== payload.old.id))
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.establishmentId, fetchRooms])

  return {
    rooms,
    isLoading,
    error,
    createRoom,
    updateRoom,
    deleteRoom,
    getRoomById,
    filterRooms,
    refreshRooms,
    clearError,
    // Valeurs calculées additionnelles
    roomsByType,
    roomsByBuilding,
    totalCapacity,
    buildingsWithRooms,
  }
}