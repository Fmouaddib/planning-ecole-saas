/**
 * Hook pour la gestion des salles virtuelles et sessions en ligne
 * Pattern identique à useRooms.ts
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { VirtualRoom, CreateVirtualRoomData, UpdateVirtualRoomData, VirtualRoomPlatform } from '@/types'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useBookings } from './useBookings'
import { getErrorMessage } from '@/utils'
import toast from 'react-hot-toast'

function transformVirtualRoom(row: any): VirtualRoom {
  return {
    id: row.id,
    centerId: row.center_id,
    name: row.name,
    platform: row.platform || 'other',
    meetingUrl: row.meeting_url,
    isDefault: row.is_default ?? false,
    isActive: row.is_active ?? true,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function detectPlatform(url: string): VirtualRoomPlatform {
  if (!url) return 'other'
  const lower = url.toLowerCase()
  if (lower.includes('teams.microsoft') || lower.includes('teams.live')) return 'teams'
  if (lower.includes('zoom.us') || lower.includes('zoom.com')) return 'zoom'
  return 'other'
}

export function useVisio() {
  const [virtualRooms, setVirtualRooms] = useState<VirtualRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { bookings } = useBookings()

  const clearError = useCallback(() => setError(null), [])

  const handleError = useCallback((err: unknown) => {
    const message = getErrorMessage(err)
    setError(message)
    console.error('Visio Error:', err)
    return message
  }, [])

  // ==================== FETCH ====================

  const fetchVirtualRooms = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('virtual_rooms')
        .select('*')
        .eq('center_id', user.establishmentId)
        .eq('is_active', true)
        .order('name')

      if (fetchError) throw fetchError

      setVirtualRooms((data || []).map(transformVirtualRoom))
    } catch (err) {
      handleError(err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId, handleError])

  const refreshVirtualRooms = useCallback(async () => {
    await fetchVirtualRooms()
  }, [fetchVirtualRooms])

  // ==================== CRUD ====================

  const createVirtualRoom = useCallback(async (data: CreateVirtualRoomData): Promise<VirtualRoom> => {
    if (!user?.establishmentId) throw new Error('Utilisateur non connecté')

    try {
      setError(null)

      const roomData = {
        name: data.name,
        platform: data.platform,
        meeting_url: data.meetingUrl,
        is_default: data.isDefault ?? false,
        center_id: user.establishmentId,
        created_by: user.id,
      }

      const { data: newRoom, error: createError } = await supabase
        .from('virtual_rooms')
        .insert(roomData)
        .select('*')
        .single()

      if (createError) throw createError

      const transformed = transformVirtualRoom(newRoom)
      setVirtualRooms(prev => [...prev, transformed])
      toast.success(`Salle virtuelle "${transformed.name}" créée`)

      return transformed
    } catch (err) {
      const message = handleError(err)
      toast.error(message)
      throw err
    }
  }, [user?.establishmentId, user?.id, handleError])

  const updateVirtualRoom = useCallback(async (data: UpdateVirtualRoomData): Promise<VirtualRoom> => {
    try {
      setError(null)

      const updateData: Record<string, any> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.platform !== undefined) updateData.platform = data.platform
      if (data.meetingUrl !== undefined) updateData.meeting_url = data.meetingUrl
      if (data.isDefault !== undefined) updateData.is_default = data.isDefault

      const { data: updatedRoom, error: updateError } = await supabase
        .from('virtual_rooms')
        .update(updateData)
        .eq('id', data.id)
        .select('*')
        .single()

      if (updateError) throw updateError

      const transformed = transformVirtualRoom(updatedRoom)
      setVirtualRooms(prev => prev.map(r => r.id === data.id ? transformed : r))
      toast.success(`Salle virtuelle "${transformed.name}" mise à jour`)

      return transformed
    } catch (err) {
      const message = handleError(err)
      toast.error(message)
      throw err
    }
  }, [handleError])

  const deleteVirtualRoom = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)

      // Soft delete
      const { error: deleteError } = await supabase
        .from('virtual_rooms')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError

      setVirtualRooms(prev => prev.filter(r => r.id !== id))
      toast.success('Salle virtuelle supprimée')
    } catch (err) {
      const message = handleError(err)
      toast.error(message)
      throw err
    }
  }, [handleError])

  // ==================== SESSIONS EN LIGNE (dérivés bookings) ====================

  const onlineSessions = useMemo(() => {
    return bookings.filter(b =>
      (b.sessionType === 'online' || b.sessionType === 'hybrid') && b.meetingUrl
    )
  }, [bookings])

  const now = useMemo(() => new Date().toISOString(), [])

  const upcomingSessions = useMemo(() => {
    return onlineSessions
      .filter(b => b.startTime > now && b.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [onlineSessions, now])

  const pastSessions = useMemo(() => {
    return onlineSessions
      .filter(b => b.endTime <= now)
      .sort((a, b) => b.startTime.localeCompare(a.startTime))
  }, [onlineSessions, now])

  const inProgressSessions = useMemo(() => {
    return onlineSessions.filter(b =>
      b.startTime <= now && b.endTime > now && b.status !== 'cancelled'
    )
  }, [onlineSessions, now])

  // ==================== STATS ====================

  const stats = useMemo(() => {
    const byPlatform: Record<VirtualRoomPlatform, number> = { teams: 0, zoom: 0, other: 0 }

    for (const session of onlineSessions) {
      const p = detectPlatform(session.meetingUrl || '')
      byPlatform[p]++
    }

    return {
      totalSessions: onlineSessions.length,
      byPlatform,
      upcoming: upcomingSessions.length,
      inProgress: inProgressSessions.length,
    }
  }, [onlineSessions, upcomingSessions, inProgressSessions])

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (user?.establishmentId) {
      fetchVirtualRooms()
    } else {
      setIsLoading(false)
    }
  }, [user?.establishmentId, fetchVirtualRooms])

  // Realtime
  useEffect(() => {
    if (isDemoMode || !user?.establishmentId) return

    const channel = supabase
      .channel('virtual-rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'virtual_rooms',
          filter: `center_id=eq.${user.establishmentId}`,
        },
        () => { fetchVirtualRooms() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.establishmentId, fetchVirtualRooms])

  return {
    virtualRooms,
    isLoading,
    error,
    clearError,
    createVirtualRoom,
    updateVirtualRoom,
    deleteVirtualRoom,
    refreshVirtualRooms,
    // Sessions dérivées
    onlineSessions,
    upcomingSessions,
    pastSessions,
    inProgressSessions,
    // Stats
    stats,
  }
}
