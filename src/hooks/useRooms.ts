/**
 * Hook personnalisé pour la gestion des salles et bâtiments
 * Gère toutes les opérations CRUD sur les salles + bâtiments
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Room, Building, CreateRoomData, UpdateRoomData, RoomFilters, UseRoomsReturn, UUID, EquipmentCategory } from '@/types'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getErrorMessage } from '@/utils'
import { transformRoom, transformBuilding } from '@/utils/transforms'
import { computeRenameUpdates, computeDeleteUpdates, computeCategoryUpdates } from '@/utils/equipmentCatalog'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import { AuditService } from '@/services/auditService'
import toast from 'react-hot-toast'

export function useRooms(): UseRoomsReturn {
  const [rooms, setRooms] = useState<Room[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
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

  const fetchBuildings = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) return

    const { data, error: fetchError } = await supabase
      .from('buildings')
      .select('*')
      .eq('center_id', user.establishmentId)
      .eq('is_available', true)
      .order('name')

    if (fetchError) throw fetchError
    setBuildings((data || []).map(transformBuilding))
  }, [user?.establishmentId])

  const fetchRooms = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch buildings + rooms with building join in parallel
      const [roomsResult] = await Promise.all([
        supabase
          .from('rooms')
          .select('*, building:buildings(id, name)')
          .eq('center_id', user.establishmentId)
          .eq('is_available', true)
          .order('name'),
        fetchBuildings(),
      ])

      if (roomsResult.error) throw roomsResult.error

      setRooms((roomsResult.data || []).map(transformRoom))
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des salles')
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId, handleError, fetchBuildings])

  const refreshRooms = useCallback(async (): Promise<void> => {
    await fetchRooms()
  }, [fetchRooms])

  // ==================== BUILDING CRUD ====================

  const createBuilding = useCallback(async (data: { name: string; address?: string; floorCount?: number }): Promise<Building> => {
    if (!user?.establishmentId) throw new Error('Utilisateur non connecté')

    try {
      setError(null)
      const { data: newBuilding, error: createError } = await supabase
        .from('buildings')
        .insert({
          name: data.name,
          address: data.address || '',
          floor_count: data.floorCount || 1,
          center_id: user.establishmentId,
          is_available: true,
        })
        .select('*')
        .single()

      if (createError) throw createError

      const transformed = transformBuilding(newBuilding)
      setBuildings(prev => [...prev, transformed].sort((a, b) => a.name.localeCompare(b.name)))
      toast.success(`Bâtiment "${transformed.name}" créé`)
      AuditService.logCrud('created', 'building', transformed.id, user.id, user.establishmentId, { name: transformed.name })
      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création du bâtiment')
      toast.error(message)
      throw error
    }
  }, [user?.establishmentId, user?.id, handleError])

  const updateBuilding = useCallback(async (id: string, data: { name?: string; address?: string; floorCount?: number }): Promise<Building> => {
    try {
      setError(null)
      const updateData: Record<string, unknown> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.address !== undefined) updateData.address = data.address
      if (data.floorCount !== undefined) updateData.floor_count = data.floorCount

      const { data: updated, error: updateError } = await supabase
        .from('buildings')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single()

      if (updateError) throw updateError

      const transformed = transformBuilding(updated)
      setBuildings(prev => prev.map(b => b.id === id ? transformed : b))
      toast.success(`Bâtiment "${transformed.name}" mis à jour`)
      if (user) AuditService.logCrud('updated', 'building', id, user.id, user.establishmentId, { name: transformed.name })
      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour du bâtiment')
      toast.error(message)
      throw error
    }
  }, [user, handleError])

  const deleteBuilding = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)
      // Soft delete
      const { error: deleteError } = await supabase
        .from('buildings')
        .update({ is_available: false })
        .eq('id', id)

      if (deleteError) throw deleteError

      // Détacher les salles de ce bâtiment
      await supabase
        .from('rooms')
        .update({ building_id: null })
        .eq('building_id', id)

      setBuildings(prev => prev.filter(b => b.id !== id))
      // Refresh rooms pour mettre à jour le buildingId
      await fetchRooms()
      toast.success('Bâtiment supprimé')
      if (user) AuditService.logCrud('deleted', 'building', id, user.id, user.establishmentId)
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la suppression du bâtiment')
      toast.error(message)
      throw error
    }
  }, [user, handleError, fetchRooms])

  // ==================== ROOM CRUD FUNCTIONS ====================

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

      const roomData: Record<string, unknown> = {
        name: data.name,
        capacity: data.capacity,
        room_type: data.roomType,
        center_id: user.establishmentId,
        location: data.buildingId || '',
        equipment: data.equipment || [],
        is_available: true,
      }
      // Stocker building_id si fourni (UUID valide)
      if (data.buildingId && data.buildingId.length > 10) {
        roomData.building_id = data.buildingId
        roomData.location = ''
      }

      const { data: newRoom, error: createError } = await supabase
        .from('rooms')
        .insert(roomData)
        .select('*, building:buildings(id, name)')
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

      const updateData: Record<string, unknown> = {
        name: data.name,
        capacity: data.capacity,
        room_type: data.roomType,
        equipment: data.equipment,
      }

      // Gérer building_id
      if (data.buildingId !== undefined) {
        if (data.buildingId && data.buildingId.length > 10) {
          updateData.building_id = data.buildingId
          updateData.location = ''
        } else {
          updateData.building_id = null
          updateData.location = data.buildingId || ''
        }
      }

      // Supprimer les propriétés undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      const { data: updatedRoom, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', data.id)
        .select('*, building:buildings(id, name)')
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

  const renameEquipment = useCallback(async (oldName: string, newName: string): Promise<void> => {
    try {
      setError(null)
      const updates = computeRenameUpdates(rooms, oldName, newName)

      if (updates.length === 0) {
        toast('Aucune salle ne possède cet équipement')
        return
      }

      // Batch update chaque salle affectée
      for (const { roomId, newEquipment } of updates) {
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ equipment: newEquipment })
          .eq('id', roomId)

        if (updateError) throw updateError
      }

      await fetchRooms()
      toast.success(`Équipement renommé "${oldName}" → "${newName}" dans ${updates.length} salle${updates.length > 1 ? 's' : ''}`)
    } catch (error) {
      const message = handleError(error, 'Erreur lors du renommage de l\'équipement')
      toast.error(message)
      throw error
    }
  }, [rooms, fetchRooms, handleError])

  const deleteEquipment = useCallback(async (name: string): Promise<void> => {
    try {
      setError(null)
      const updates = computeDeleteUpdates(rooms, name)

      if (updates.length === 0) {
        toast('Aucune salle ne possède cet équipement')
        return
      }

      for (const { roomId, newEquipment } of updates) {
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ equipment: newEquipment })
          .eq('id', roomId)

        if (updateError) throw updateError
      }

      await fetchRooms()
      toast.success(`Équipement "${name}" supprimé de ${updates.length} salle${updates.length > 1 ? 's' : ''}`)
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la suppression de l\'équipement')
      toast.error(message)
      throw error
    }
  }, [rooms, fetchRooms, handleError])

  const updateEquipmentCategory = useCallback(async (name: string, newCategory: EquipmentCategory): Promise<void> => {
    try {
      setError(null)
      const updates = computeCategoryUpdates(rooms, name, newCategory)

      if (updates.length === 0) {
        toast('Aucune salle ne possède cet équipement')
        return
      }

      for (const { roomId, newEquipment } of updates) {
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ equipment: newEquipment })
          .eq('id', roomId)

        if (updateError) throw updateError
      }

      await fetchRooms()
      toast.success(`Catégorie de "${name}" modifiée dans ${updates.length} salle${updates.length > 1 ? 's' : ''}`)
    } catch (error) {
      const message = handleError(error, 'Erreur lors du changement de catégorie')
      toast.error(message)
      throw error
    }
  }, [rooms, fetchRooms, handleError])

  // ==================== QUERY FUNCTIONS ====================

  const getRoomById = useCallback((id: UUID): Room | undefined => {
    return rooms.find(room => room.id === id)
  }, [rooms])

  const filterRooms = useCallback((filters: RoomFilters): Room[] => {
    return rooms.filter(room => {
      if (filters.roomType && filters.roomType.length > 0) {
        if (!filters.roomType.includes(room.roomType)) return false
      }
      if (filters.buildingId) {
        if (room.buildingId !== filters.buildingId) return false
      }
      if (filters.capacity) {
        if (filters.capacity.min && room.capacity < filters.capacity.min) return false
        if (filters.capacity.max && room.capacity > filters.capacity.max) return false
      }
      if (filters.equipment && filters.equipment.length > 0) {
        const roomEquipmentNames = room.equipment.map(eq => eq.name.toLowerCase())
        const hasRequiredEquipment = filters.equipment.some(equipName =>
          roomEquipmentNames.includes(equipName.toLowerCase())
        )
        if (!hasRequiredEquipment) return false
      }
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

  // Grouper par bâtiment (vrais bâtiments si existants, sinon par type)
  const buildingsWithRooms = useMemo(() => {
    if (buildings.length > 0) {
      const result: { id: string; name: string; rooms: { id: string; name: string; capacity: number }[] }[] = []
      const buildingMap = new Map<string, { id: string; name: string; rooms: { id: string; name: string; capacity: number }[] }>()

      for (const b of buildings) {
        buildingMap.set(b.id, { id: b.id, name: b.name, rooms: [] })
      }

      // Bâtiment "non assigné" pour les salles sans bâtiment
      const unassigned: { id: string; name: string; capacity: number }[] = []

      for (const room of rooms) {
        if (room.buildingId && buildingMap.has(room.buildingId)) {
          buildingMap.get(room.buildingId)!.rooms.push({ id: room.id, name: room.name, capacity: room.capacity })
        } else {
          unassigned.push({ id: room.id, name: room.name, capacity: room.capacity })
        }
      }

      for (const b of buildingMap.values()) {
        result.push(b)
      }

      if (unassigned.length > 0) {
        result.push({ id: 'no-building', name: 'Non assignées', rooms: unassigned })
      }

      return result
    }

    // Fallback: grouper par type de salle
    const roomTypeLabels: Record<string, string> = {
      classroom: 'Salles de cours',
      lab: 'Laboratoires',
      amphitheater: 'Amphithéâtres',
      conference: 'Salles de conférence',
      gym: 'Équipements sportifs',
      library: 'Bibliothèques',
      office: 'Bureaux',
    }

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
  }, [rooms, buildings])

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
      .channel('rooms-buildings-changes')
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
              fetchRooms()
              break
            case 'DELETE':
              setRooms(prev => prev.filter(room => room.id !== payload.old.id))
              break
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buildings',
          filter: `center_id=eq.${user.establishmentId}`,
        },
        () => {
          fetchRooms() // Refresh both buildings and rooms
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.establishmentId, fetchRooms])

  return {
    rooms,
    buildings,
    isLoading,
    error,
    createRoom,
    updateRoom,
    deleteRoom,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    renameEquipment,
    deleteEquipment,
    updateEquipmentCategory,
    getRoomById,
    filterRooms,
    refreshRooms,
    clearError,
    // Valeurs calculées
    roomsByType,
    roomsByBuilding,
    totalCapacity,
    buildingsWithRooms,
  }
}
