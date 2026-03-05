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
  merge_class_subject?: boolean  // Mode e-learning : fusion classes/matières en "Cours"
  // Politique email
  email_session_created?: boolean
  email_session_updated?: boolean
  email_session_cancelled?: boolean
  email_reminders?: boolean
  email_weekly_recap?: boolean
  email_notify_trainers?: boolean
  email_notify_students?: boolean
  // Intégration Odoo
  odoo_url?: string
  odoo_db?: string
  odoo_user?: string
  odoo_api_key?: string
  odoo_sync_enabled?: boolean
  odoo_sync_interval?: number   // minutes (60 par défaut)
  odoo_last_sync?: string       // ISO timestamp
  // Visio unifiée (Zoom / Teams / Google Meet)
  visio_provider?: 'zoom' | 'teams' | 'meet'
  visio_auto_create?: boolean
  // Zoom credentials
  zoom_account_id?: string
  zoom_client_id?: string
  zoom_client_secret?: string
  zoom_user_email?: string
  // Teams credentials
  teams_tenant_id?: string
  teams_client_id?: string
  teams_client_secret?: string
  teams_user_id?: string
  // Google Meet credentials
  meet_client_email?: string
  meet_private_key?: string
  meet_user_email?: string
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
