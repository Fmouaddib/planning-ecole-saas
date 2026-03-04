import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function usePushSubscription() {
  const { user } = useAuthContext()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default')

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY

  // Check current subscription state
  useEffect(() => {
    if (!isSupported || isDemoMode) {
      setIsLoading(false)
      return
    }
    setPermissionState(Notification.permission)

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => setIsSubscribed(false))
      .finally(() => setIsLoading(false))
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || isDemoMode) return false

    try {
      const permission = await Notification.requestPermission()
      setPermissionState(permission)
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
      })

      const json = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          center_id: user.establishmentId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth_key: json.keys?.auth ?? '',
          device_name: navigator.userAgent.slice(0, 120),
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw error
      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('[Push] subscribe error', err)
      return false
    }
  }, [isSupported, user])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || isDemoMode) return false

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        // Mark DB record inactive
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('endpoint', sub.endpoint)
      }
      setIsSubscribed(false)
      return true
    } catch (err) {
      console.error('[Push] unsubscribe error', err)
      return false
    }
  }, [isSupported])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permissionState,
    subscribe,
    unsubscribe,
  }
}
