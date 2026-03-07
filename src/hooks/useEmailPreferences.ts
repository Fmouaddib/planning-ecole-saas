/**
 * Hook pour les préférences email individuelles de l'utilisateur.
 * Stockées dans profiles.email_preferences (JSONB).
 *
 * Logique : le centre active/désactive globalement, l'utilisateur peut
 * se désabonner des types activés. Si le centre désactive un type,
 * l'utilisateur ne peut pas le réactiver.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export interface EmailPreferences {
  email_session_created?: boolean
  email_session_updated?: boolean
  email_session_cancelled?: boolean
  email_reminders?: boolean
  email_recap_weekly?: boolean
  email_recap_monthly?: boolean
  email_recap_quarterly?: boolean
  email_recap_semester?: boolean
}

const ALL_KEYS: (keyof EmailPreferences)[] = [
  'email_session_created',
  'email_session_updated',
  'email_session_cancelled',
  'email_reminders',
  'email_recap_weekly',
  'email_recap_monthly',
  'email_recap_quarterly',
  'email_recap_semester',
]

export function useEmailPreferences() {
  const { user } = useAuthContext()
  const [preferences, setPreferences] = useState<EmailPreferences>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchPreferences = useCallback(async () => {
    if (!user?.id || isDemoMode) {
      setIsLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email_preferences')
        .eq('id', user.id)
        .single()
      if (error) {
        console.error('[EmailPreferences] fetch error:', error.message)
      } else {
        setPreferences((data?.email_preferences as EmailPreferences) || {})
      }
    } catch (err) {
      console.error('[EmailPreferences] unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const updatePreferences = useCallback(async (patch: Partial<EmailPreferences>) => {
    if (!user?.id || isDemoMode) return

    const merged = { ...preferences, ...patch }
    setPreferences(merged)

    const { error } = await supabase
      .from('profiles')
      .update({ email_preferences: merged })
      .eq('id', user.id)

    if (error) {
      console.error('[EmailPreferences] update error:', error.message)
      setPreferences(preferences) // rollback
    }
  }, [user?.id, preferences])

  return { preferences, isLoading, updatePreferences, ALL_KEYS }
}
