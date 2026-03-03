/**
 * Hook pour les notifications in-app avec Supabase Realtime
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformInAppNotification } from '@/utils/transforms'
import type { InAppNotification } from '@/types'

export function useNotifications() {
  const { user } = useAuthContext()
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications]
  )

  // Fetch initial
  const fetchNotifications = useCallback(async () => {
    if (isDemoMode || !user?.id) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching notifications:', error)
      } else if (data) {
        setNotifications(data.map(transformInAppNotification))
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Fetch au montage
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    } else {
      setIsLoading(false)
    }
  }, [user?.id, fetchNotifications])

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !user?.id) return

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = transformInAppNotification(payload.new)
          setNotifications(prev => [notif, ...prev].slice(0, 50))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = transformInAppNotification(payload.new)
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('id', id)
  }, [])

  // Marquer toutes comme lues
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }, [user?.id])

  // Supprimer une notification
  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await supabase
      .from('in_app_notifications')
      .delete()
      .eq('id', id)
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
