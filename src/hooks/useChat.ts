/**
 * Hook principal Chat — channels, unread, DM creation, mark-as-read
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformChatChannel, parseFullName } from '@/utils/transforms'
import type { ChatChannel } from '@/types'

// ── Demo data ──────────────────────────────────────────────────
const now = new Date().toISOString()
const DEMO_CHANNELS: ChatChannel[] = [
  { id: 'demo-dm-1', centerId: 'demo', type: 'dm', name: 'Alice Martin', classId: null, subjectId: null, avatarUrl: null, isArchived: false, createdAt: now, updatedAt: now, unreadCount: 2, lastMessage: { id: 'dm1', channelId: 'demo-dm-1', senderId: 'u1', content: 'Bonjour, avez-vous les notes ?', isSystem: false, isEdited: false, parentId: null, createdAt: now, updatedAt: now, deletedAt: null, sender: { id: 'u1', firstName: 'Alice', lastName: 'Martin' } } },
  { id: 'demo-dm-2', centerId: 'demo', type: 'dm', name: 'Bob Dupont', classId: null, subjectId: null, avatarUrl: null, isArchived: false, createdAt: now, updatedAt: now, unreadCount: 0, lastMessage: { id: 'dm2', channelId: 'demo-dm-2', senderId: 'me', content: 'Merci !', isSystem: false, isEdited: false, parentId: null, createdAt: now, updatedAt: now, deletedAt: null } },
  { id: 'demo-class-1', centerId: 'demo', type: 'class', name: 'BTS SIO 2A', classId: 'c1', subjectId: null, avatarUrl: null, isArchived: false, createdAt: now, updatedAt: now, unreadCount: 5, lastMessage: { id: 'cl1', channelId: 'demo-class-1', senderId: 'u2', content: 'Rappel : examen vendredi !', isSystem: false, isEdited: false, parentId: null, createdAt: now, updatedAt: now, deletedAt: null, sender: { id: 'u2', firstName: 'Prof', lastName: 'Martin' } } },
  { id: 'demo-class-2', centerId: 'demo', type: 'class', name: 'L3 Informatique', classId: 'c2', subjectId: null, avatarUrl: null, isArchived: false, createdAt: now, updatedAt: now, unreadCount: 0 },
  { id: 'demo-subject-1', centerId: 'demo', type: 'subject', name: 'Mathématiques', classId: null, subjectId: 's1', avatarUrl: null, isArchived: false, createdAt: now, updatedAt: now, unreadCount: 1, lastMessage: { id: 'su1', channelId: 'demo-subject-1', senderId: 'u3', content: 'Le TD est reporté à lundi', isSystem: false, isEdited: false, parentId: null, createdAt: now, updatedAt: now, deletedAt: null, sender: { id: 'u3', firstName: 'Jean', lastName: 'Dupuis' } } },
  { id: 'demo-subject-2', centerId: 'demo', type: 'subject', name: 'Anglais', classId: null, subjectId: 's2', avatarUrl: null, isArchived: false, createdAt: now, updatedAt: now, unreadCount: 0 },
]

export function useChat() {
  const { user } = useAuthContext()
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchChannels = useCallback(async () => {
    if (isDemoMode || !user) {
      setChannels(DEMO_CHANNELS)
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      // 1. Get membership + last_read_at
      const { data: memberData } = await supabase
        .from('chat_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)

      if (!memberData?.length) { setChannels([]); setIsLoading(false); return }

      const channelIds = memberData.map(m => m.channel_id)
      const lastReadMap = Object.fromEntries(memberData.map(m => [m.channel_id, m.last_read_at]))

      // 2. Get channels
      const { data: channelData } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (!channelData) { setChannels([]); setIsLoading(false); return }

      // 3. Enrich each channel
      const enriched = await Promise.all(channelData.map(async (ch) => {
        // Last message
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
          .eq('channel_id', ch.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Unread count
        const lastRead = lastReadMap[ch.id]
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .is('deleted_at', null)
          .gt('created_at', lastRead || '1970-01-01')

        // DM: get other member's name
        let displayName = ch.name
        if (ch.type === 'dm') {
          const { data: otherMember } = await supabase
            .from('chat_members')
            .select('user_id, profiles:user_id(full_name)')
            .eq('channel_id', ch.id)
            .neq('user_id', user.id)
            .limit(1)
            .maybeSingle()
          if (otherMember?.profiles) {
            const p = otherMember.profiles as any
            const n = parseFullName(p.full_name)
            displayName = `${n.firstName} ${n.lastName}`.trim()
          }
        }

        return {
          ...ch,
          name: displayName,
          last_message: lastMsg,
          unread_count: count || 0,
        }
      }))

      setChannels(enriched.map(transformChatChannel))
    } catch (err) {
      console.error('Chat fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Create DM
  const createDM = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (isDemoMode || !user) return null
    try {
      // Check if DM already exists between these 2 users
      const { data: myMemberships, error: myErr } = await supabase
        .from('chat_members')
        .select('channel_id')
        .eq('user_id', user.id)

      if (myErr) console.error('createDM: fetch my memberships error:', myErr)

      if (myMemberships?.length) {
        const myChannelIds = myMemberships.map(m => m.channel_id)
        const { data: otherMemberships, error: otherErr } = await supabase
          .from('chat_members')
          .select('channel_id')
          .eq('user_id', otherUserId)
          .in('channel_id', myChannelIds)

        if (otherErr) console.error('createDM: fetch other memberships error:', otherErr)

        if (otherMemberships?.length) {
          const sharedIds = otherMemberships.map(m => m.channel_id)
          const { data: existingDM } = await supabase
            .from('chat_channels')
            .select('id')
            .in('id', sharedIds)
            .eq('type', 'dm')
            .limit(1)
            .maybeSingle()

          if (existingDM) {
            setActiveChannelId(existingDM.id)
            return existingDM.id
          }
        }
      }

      // Generate UUID client-side to avoid SELECT-after-INSERT RLS timing issue
      // (SELECT policy requires chat_member, but members aren't added yet)
      const channelId = crypto.randomUUID()

      const { error: insertErr } = await supabase
        .from('chat_channels')
        .insert({ id: channelId, center_id: user.establishmentId, type: 'dm' })

      if (insertErr) {
        console.error('createDM: insert channel error:', insertErr)
        return null
      }

      // Add both users as members
      const { error: membersErr } = await supabase.from('chat_members').insert([
        { channel_id: channelId, user_id: user.id },
        { channel_id: channelId, user_id: otherUserId },
      ])

      if (membersErr) {
        console.error('createDM: insert members error:', membersErr)
        // Cleanup orphaned channel
        await supabase.from('chat_channels').delete().eq('id', channelId)
        return null
      }

      setActiveChannelId(channelId)
      await fetchChannels()
      return channelId
    } catch (err) {
      console.error('Create DM error:', err)
      return null
    }
  }, [user, fetchChannels])

  // Mark as read
  const markAsRead = useCallback(async (channelId: string) => {
    if (isDemoMode || !user) return
    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', user.id)

    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, unreadCount: 0 } : ch
    ))
  }, [user])

  // Derived state
  const activeChannel = useMemo(() =>
    channels.find(ch => ch.id === activeChannelId) || null
  , [channels, activeChannelId])

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels
    const q = searchQuery.toLowerCase()
    return channels.filter(ch => ch.name?.toLowerCase().includes(q))
  }, [channels, searchQuery])

  const dmChannels = useMemo(() => filteredChannels.filter(ch => ch.type === 'dm'), [filteredChannels])
  const classChannels = useMemo(() => filteredChannels.filter(ch => ch.type === 'class'), [filteredChannels])
  const subjectChannels = useMemo(() => filteredChannels.filter(ch => ch.type === 'subject'), [filteredChannels])

  const totalUnread = useMemo(() =>
    channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0)
  , [channels])

  // Realtime
  useEffect(() => {
    if (isDemoMode || !user) return
    const channel = supabase
      .channel('chat_list_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchChannels())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members', filter: `user_id=eq.${user.id}` }, () => fetchChannels())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchChannels])

  // Initial fetch
  useEffect(() => { fetchChannels() }, [fetchChannels])

  return {
    channels, dmChannels, classChannels, subjectChannels,
    activeChannel, activeChannelId, setActiveChannelId,
    isLoading, totalUnread,
    searchQuery, setSearchQuery,
    createDM, markAsRead, fetchChannels,
  }
}

// Lightweight hook for sidebar unread badge (avoids loading full chat)
export function useChatUnread(): number {
  const { user } = useAuthContext()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (isDemoMode || !user) return
    let cancelled = false

    const fetchUnread = async () => {
      const { data: members } = await supabase
        .from('chat_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)

      if (cancelled || !members?.length) return

      let total = 0
      for (const m of members) {
        const { count: c } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', m.channel_id)
          .is('deleted_at', null)
          .gt('created_at', m.last_read_at || '1970-01-01')
        total += c || 0
      }
      if (!cancelled) setCount(total)
    }

    fetchUnread()

    const channel = supabase
      .channel('chat_unread_badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => fetchUnread())
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user])

  return count
}
