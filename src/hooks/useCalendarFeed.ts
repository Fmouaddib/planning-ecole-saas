import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

interface CalendarToken {
  id: string
  token: string
  scope: string
  label: string | null
  is_active: boolean
  created_at: string
  last_accessed_at: string | null
}

const FEED_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ical-feed`

export function useCalendarFeed() {
  const { user } = useAuthContext()
  const [tokens, setTokens] = useState<CalendarToken[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTokens = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('calendar_tokens')
      .select('id, token, scope, label, is_active, created_at, last_accessed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) setTokens(data)
    setIsLoading(false)
  }, [user?.id])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  const createToken = useCallback(async (scope: string, label?: string): Promise<string | null> => {
    if (!user?.id || !user?.establishmentId) return null

    const { data, error } = await supabase
      .from('calendar_tokens')
      .insert({
        user_id: user.id,
        center_id: user.establishmentId,
        scope,
        label: label || null,
      })
      .select('token')
      .single()

    if (error) {
      console.error('[CalendarFeed] createToken error:', error)
      return null
    }

    await fetchTokens()
    return data.token
  }, [user?.id, user?.establishmentId, fetchTokens])

  const revokeToken = useCallback(async (id: string) => {
    await supabase
      .from('calendar_tokens')
      .update({ is_active: false })
      .eq('id', id)

    await fetchTokens()
  }, [fetchTokens])

  const deleteToken = useCallback(async (id: string) => {
    await supabase
      .from('calendar_tokens')
      .delete()
      .eq('id', id)

    await fetchTokens()
  }, [fetchTokens])

  const getFeedUrl = useCallback((token: string) => {
    return `${FEED_BASE_URL}?token=${token}`
  }, [])

  const getGoogleCalendarUrl = useCallback((token: string) => {
    const feedUrl = getFeedUrl(token)
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace('https://', 'webcal://'))}`
  }, [getFeedUrl])

  const getWebcalUrl = useCallback((token: string) => {
    const feedUrl = getFeedUrl(token)
    return feedUrl.replace('https://', 'webcal://')
  }, [getFeedUrl])

  // Get or create user's personal feed token
  const getOrCreatePersonalToken = useCallback(async (): Promise<string | null> => {
    const existing = tokens.find(t => t.scope === 'user' && t.is_active)
    if (existing) return existing.token
    return createToken('user', 'Mon planning')
  }, [tokens, createToken])

  // Create subject feed token (admin)
  const createSubjectToken = useCallback(async (subjectId: string, subjectName: string): Promise<string | null> => {
    return createToken(`subject:${subjectId}`, subjectName)
  }, [createToken])

  // Create class feed token (admin)
  const createClassToken = useCallback(async (classId: string, className: string): Promise<string | null> => {
    return createToken(`class:${classId}`, className)
  }, [createToken])

  return {
    tokens,
    isLoading,
    fetchTokens,
    createToken,
    revokeToken,
    deleteToken,
    getFeedUrl,
    getGoogleCalendarUrl,
    getWebcalUrl,
    getOrCreatePersonalToken,
    createSubjectToken,
    createClassToken,
  }
}
