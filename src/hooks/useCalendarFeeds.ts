/**
 * Hook pour gérer les flux iCal publics par matière (calendar_feeds)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getErrorMessage } from '@/utils'
import toast from 'react-hot-toast'

export interface CalendarFeed {
  id: string
  centerId: string
  subjectId: string
  token: string
  label: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: string
  lastAccessedAt: string | null
  accessCount: number
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

function transformFeed(raw: Record<string, unknown>): CalendarFeed {
  return {
    id: raw.id as string,
    centerId: raw.center_id as string,
    subjectId: raw.subject_id as string,
    token: raw.token as string,
    label: raw.label as string | null,
    isActive: raw.is_active as boolean,
    createdBy: raw.created_by as string | null,
    createdAt: raw.created_at as string,
    lastAccessedAt: raw.last_accessed_at as string | null,
    accessCount: raw.access_count as number,
  }
}

export function getFeedUrl(token: string): string {
  return `${SUPABASE_URL}/functions/v1/ical-feed?token=${token}`
}

export function useCalendarFeeds() {
  const [feeds, setFeeds] = useState<CalendarFeed[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const fetchFeeds = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('calendar_feeds')
        .select('*')
        .eq('center_id', user.establishmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeeds((data || []).map(transformFeed))
    } catch (err) {
      console.error('Erreur chargement calendar_feeds:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  useEffect(() => {
    if (user?.establishmentId) fetchFeeds()
    else setIsLoading(false)
  }, [user?.establishmentId, fetchFeeds])

  const getFeedForSubject = useCallback(
    (subjectId: string) => feeds.find(f => f.subjectId === subjectId) || null,
    [feeds],
  )

  const getOrCreateFeed = useCallback(async (subjectId: string, label?: string): Promise<CalendarFeed> => {
    if (!user?.establishmentId) throw new Error('Non connecté')

    // Check existing
    const existing = feeds.find(f => f.subjectId === subjectId)
    if (existing) return existing

    const { data, error } = await supabase
      .from('calendar_feeds')
      .insert({
        center_id: user.establishmentId,
        subject_id: subjectId,
        label: label || null,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) {
      // Unique constraint → already exists, refetch
      if (error.code === '23505') {
        const { data: existing2 } = await supabase
          .from('calendar_feeds')
          .select('*')
          .eq('center_id', user.establishmentId)
          .eq('subject_id', subjectId)
          .single()
        if (existing2) {
          const feed = transformFeed(existing2)
          setFeeds(prev => prev.some(f => f.id === feed.id) ? prev : [...prev, feed])
          return feed
        }
      }
      throw new Error(getErrorMessage(error))
    }

    const feed = transformFeed(data)
    setFeeds(prev => [...prev, feed])
    return feed
  }, [user?.establishmentId, user?.id, feeds])

  const regenerateToken = useCallback(async (feedId: string): Promise<CalendarFeed> => {
    const { data, error } = await supabase
      .from('calendar_feeds')
      .update({ token: crypto.randomUUID() })
      .eq('id', feedId)
      .select('*')
      .single()

    if (error) throw new Error(getErrorMessage(error))

    const feed = transformFeed(data)
    setFeeds(prev => prev.map(f => f.id === feedId ? feed : f))
    toast.success('Lien régénéré — l\'ancien est invalide')
    return feed
  }, [])

  const toggleFeedActive = useCallback(async (feedId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase
      .from('calendar_feeds')
      .update({ is_active: isActive })
      .eq('id', feedId)

    if (error) throw new Error(getErrorMessage(error))

    setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, isActive } : f))
    toast.success(isActive ? 'Flux réactivé' : 'Flux désactivé')
  }, [])

  const deleteFeed = useCallback(async (feedId: string): Promise<void> => {
    const { error } = await supabase
      .from('calendar_feeds')
      .delete()
      .eq('id', feedId)

    if (error) throw new Error(getErrorMessage(error))

    setFeeds(prev => prev.filter(f => f.id !== feedId))
    toast.success('Flux supprimé')
  }, [])

  const shareFeedByEmail = useCallback(async (
    feedUrl: string,
    subjectName: string,
    emails: string[],
    centerName?: string,
  ): Promise<void> => {
    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#334155;">
        <div style="background:#1e3a5f;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;font-size:18px;">Abonnement calendrier — ${subjectName}</h2>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
          <p>${centerName ? `<strong>${centerName}</strong> vous` : 'Vous'} partage un lien d'abonnement calendrier pour la matière <strong>${subjectName}</strong>.</p>
          <p>Ce calendrier se met à jour automatiquement avec les séances planifiées.</p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin:16px 0;word-break:break-all;">
            <a href="${feedUrl}" style="color:#2563eb;font-size:14px;">${feedUrl}</a>
          </div>

          <h3 style="font-size:15px;margin:20px 0 8px;">Comment s'abonner ?</h3>
          <ul style="padding-left:20px;line-height:1.8;">
            <li><strong>Google Calendar</strong> : Autres agendas (+) > À partir de l'URL > coller le lien</li>
            <li><strong>Apple Calendar</strong> : Fichier > Nouvel abonnement > coller le lien</li>
            <li><strong>Outlook</strong> : Ajouter un calendrier > S'abonner à partir du web > coller le lien</li>
          </ul>

          <p style="font-size:12px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
            Ce lien est personnel. Ne le partagez qu'avec les personnes concernées.
          </p>
        </div>
      </div>
    `

    const recipients = emails.map(email => ({ email: email.trim() }))

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipients,
        subject: `Abonnement calendrier — ${subjectName}`,
        htmlContent,
        tags: ['calendar-feed-share'],
      },
    })

    if (error) throw new Error(getErrorMessage(error))
    toast.success(`Lien envoyé à ${emails.length} destinataire${emails.length > 1 ? 's' : ''}`)
  }, [])

  return {
    feeds,
    isLoading,
    getFeedUrl,
    getFeedForSubject,
    getOrCreateFeed,
    regenerateToken,
    toggleFeedActive,
    deleteFeed,
    shareFeedByEmail,
    refreshFeeds: fetchFeeds,
  }
}
