/**
 * Hook pour lire/écrire les settings JSONB du centre courant (training_centers.settings)
 * Utilisé par SettingsPage (admin) et MyClassPage (student, lecture seule)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export interface CenterSettings {
  hide_classmates?: boolean
  hide_subjects?: boolean
  // Politique email
  email_session_created?: boolean
  email_session_updated?: boolean
  email_session_cancelled?: boolean
  email_reminders?: boolean
  email_weekly_recap?: boolean
  email_notify_trainers?: boolean
  email_notify_students?: boolean
}

export const EMAIL_POLICY_DEFAULTS: Required<Pick<CenterSettings,
  | 'email_session_created'
  | 'email_session_updated'
  | 'email_session_cancelled'
  | 'email_reminders'
  | 'email_weekly_recap'
  | 'email_notify_trainers'
  | 'email_notify_students'
>> = {
  email_session_created: true,
  email_session_updated: true,
  email_session_cancelled: true,
  email_reminders: true,
  email_weekly_recap: true,
  email_notify_trainers: true,
  email_notify_students: true,
}

export function useCenterSettings() {
  const { user } = useAuthContext()
  const [settings, setSettings] = useState<CenterSettings>({})
  const [isLoading, setIsLoading] = useState(true)

  const centerId = user?.establishmentId

  const fetchSettings = useCallback(async () => {
    if (!centerId || isDemoMode) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('training_centers')
        .select('settings')
        .eq('id', centerId)
        .single()

      if (error) {
        console.error('[CenterSettings] fetch error:', error.message)
      } else {
        setSettings((data?.settings as CenterSettings) || {})
      }
    } catch (err) {
      console.error('[CenterSettings] unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (patch: Partial<CenterSettings>) => {
    if (!centerId || isDemoMode) return

    const merged = { ...settings, ...patch }
    setSettings(merged)

    const { error } = await supabase
      .from('training_centers')
      .update({ settings: merged })
      .eq('id', centerId)

    if (error) {
      console.error('[CenterSettings] update error:', error.message)
      // Rollback
      setSettings(settings)
    }
  }, [centerId, settings])

  return { settings, isLoading, updateSettings, refresh: fetchSettings }
}
