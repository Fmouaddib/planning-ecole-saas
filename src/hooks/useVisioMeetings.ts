/**
 * Hook unifié pour la gestion des réunions visio (Zoom / Teams / Google Meet)
 * Remplace useZoom.ts — appelle l'Edge Function visio-meetings
 */

import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface VisioMeetingResult {
  meeting_id: string
  join_url: string
  password: string
}

export function useVisioMeetings() {
  const [isTesting, setIsTesting] = useState(false)

  const testConnection = useCallback(async (provider?: string): Promise<{ success: boolean; message: string }> => {
    setIsTesting(true)
    try {
      const { data, error } = await supabase.functions.invoke('visio-meetings', {
        body: { action: 'test', provider },
      })
      if (error) return { success: false, message: error.message }
      if (data?.success) return { success: true, message: data.message }
      return { success: false, message: data?.error || 'Erreur inconnue' }
    } catch (e) {
      return { success: false, message: (e as Error).message }
    } finally {
      setIsTesting(false)
    }
  }, [])

  const createMeeting = useCallback(async (params: {
    topic: string
    startTime: string
    duration: number
    timezone?: string
  }): Promise<VisioMeetingResult> => {
    const { data, error } = await supabase.functions.invoke('visio-meetings', {
      body: {
        action: 'create',
        topic: params.topic,
        start_time: params.startTime,
        duration: params.duration,
        timezone: params.timezone || 'Europe/Paris',
      },
    })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.error || 'Visio create failed')
    return {
      meeting_id: data.meeting_id,
      join_url: data.join_url,
      password: data.password,
    }
  }, [])

  const updateMeeting = useCallback(async (meetingId: string, params: {
    topic?: string
    startTime?: string
    duration?: number
    timezone?: string
    provider?: string
  }): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('visio-meetings', {
      body: {
        action: 'update',
        meeting_id: meetingId,
        provider: params.provider,
        topic: params.topic,
        start_time: params.startTime,
        duration: params.duration,
        timezone: params.timezone,
      },
    })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.error || 'Visio update failed')
  }, [])

  const deleteMeeting = useCallback(async (meetingId: string, provider?: string): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('visio-meetings', {
      body: { action: 'delete', meeting_id: meetingId, provider },
    })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.error || 'Visio delete failed')
  }, [])

  return { testConnection, isTesting, createMeeting, updateMeeting, deleteMeeting }
}
