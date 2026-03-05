/**
 * Hook membres Chat — liste, présence en ligne, indicateur de frappe
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformChatMember } from '@/utils/transforms'
import type { ChatMember } from '@/types'

// Demo members
const DEMO_MEMBERS: ChatMember[] = [
  { id: 'm1', channelId: 'demo-class-1', userId: 'me', role: 'admin', lastReadAt: '', isMuted: false, joinedAt: '', user: { id: 'me', firstName: 'Vous', lastName: '', email: 'moi@test.com', role: 'admin' } },
  { id: 'm2', channelId: 'demo-class-1', userId: 'u1', role: 'member', lastReadAt: '', isMuted: false, joinedAt: '', user: { id: 'u1', firstName: 'Alice', lastName: 'Martin', email: 'alice@test.com', role: 'student' } },
  { id: 'm3', channelId: 'demo-class-1', userId: 'u2', role: 'member', lastReadAt: '', isMuted: false, joinedAt: '', user: { id: 'u2', firstName: 'Prof', lastName: 'Martin', email: 'prof@test.com', role: 'teacher' } },
  { id: 'm4', channelId: 'demo-class-1', userId: 'u3', role: 'member', lastReadAt: '', isMuted: false, joinedAt: '', user: { id: 'u3', firstName: 'Jean', lastName: 'Dupuis', email: 'jean@test.com', role: 'student' } },
  { id: 'm5', channelId: 'demo-class-1', userId: 'u4', role: 'member', lastReadAt: '', isMuted: false, joinedAt: '', user: { id: 'u4', firstName: 'Marie', lastName: 'Leroy', email: 'marie@test.com', role: 'student' } },
]

export function useChatMembers(channelId: string | null) {
  const { user } = useAuthContext()
  const [members, setMembers] = useState<ChatMember[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!channelId) { setMembers([]); return }
    if (isDemoMode) { setMembers(DEMO_MEMBERS); return }
    if (!user) return
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('chat_members')
        .select('*, profiles:user_id(id, full_name, email, role, avatar_url)')
        .eq('channel_id', channelId)
        .order('joined_at')
      setMembers((data || []).map(transformChatMember))
    } catch (err) {
      console.error('Fetch members error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [channelId, user])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // Presence: online status + typing
  useEffect(() => {
    if (isDemoMode || !channelId || !user) {
      if (isDemoMode) setOnlineUserIds(new Set(['u1', 'u2', 'me']))
      return
    }

    const channel = supabase.channel(`presence:${channelId}`)
    presenceChannelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onIds = new Set<string>()
        const typIds = new Set<string>()
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            onIds.add(p.user_id)
            if (p.is_typing) typIds.add(p.user_id)
          })
        })
        setOnlineUserIds(onIds)
        setTypingUserIds(typIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            is_typing: false,
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
      presenceChannelRef.current = null
    }
  }, [channelId, user])

  // Set typing
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (isDemoMode || !user || !presenceChannelRef.current) return
    try {
      await presenceChannelRef.current.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        is_typing: isTyping,
      })
    } catch {
      // Ignore presence errors
    }
  }, [user])

  return {
    members, onlineUserIds, typingUserIds,
    isLoading, setTyping, fetchMembers,
  }
}
