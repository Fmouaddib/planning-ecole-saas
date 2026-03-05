/**
 * Hook messages Chat — pagination, realtime, send/edit/delete, reactions
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformChatMessage } from '@/utils/transforms'
import { CHAT_MAX_FILE_SIZE } from '@/utils/constants'
import type { ChatMessage } from '@/types'

const PAGE_SIZE = 50

// ── Demo messages ──────────────────────────────────────────────
const now = new Date().toISOString()
const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  'demo-dm-1': [
    { id: 'd1', channelId: 'demo-dm-1', senderId: 'u1', content: 'Bonjour ! Comment allez-vous ?', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-05T09:00:00Z', updatedAt: now, deletedAt: null, sender: { id: 'u1', firstName: 'Alice', lastName: 'Martin' }, reactions: [{ id: 'r1', messageId: 'd1', userId: 'me', emoji: '👍', createdAt: now }] },
    { id: 'd2', channelId: 'demo-dm-1', senderId: 'me', content: 'Très bien merci ! Et vous ?', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-05T09:01:00Z', updatedAt: now, deletedAt: null },
    { id: 'd3', channelId: 'demo-dm-1', senderId: 'u1', content: 'Avez-vous les notes du dernier examen ?', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-05T09:05:00Z', updatedAt: now, deletedAt: null, sender: { id: 'u1', firstName: 'Alice', lastName: 'Martin' } },
  ],
  'demo-class-1': [
    { id: 'c1', channelId: 'demo-class-1', senderId: null, content: 'Canal créé pour BTS SIO 2A', isSystem: true, isEdited: false, parentId: null, createdAt: '2026-03-01T08:00:00Z', updatedAt: now, deletedAt: null },
    { id: 'c2', channelId: 'demo-class-1', senderId: 'u2', content: 'Bienvenue à tous dans ce canal de classe !', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-01T09:00:00Z', updatedAt: now, deletedAt: null, sender: { id: 'u2', firstName: 'Prof', lastName: 'Martin' } },
    { id: 'c3', channelId: 'demo-class-1', senderId: 'u3', content: 'Merci ! Est-ce que le cours de demain est maintenu ?', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-04T14:00:00Z', updatedAt: now, deletedAt: null, sender: { id: 'u3', firstName: 'Jean', lastName: 'Dupuis' } },
    { id: 'c4', channelId: 'demo-class-1', senderId: 'u2', content: 'Oui, rendez-vous en salle B204 à 9h.', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-04T14:30:00Z', updatedAt: now, deletedAt: null, sender: { id: 'u2', firstName: 'Prof', lastName: 'Martin' }, reactions: [{ id: 'r2', messageId: 'c4', userId: 'u3', emoji: '✅', createdAt: now }, { id: 'r3', messageId: 'c4', userId: 'u1', emoji: '✅', createdAt: now }] },
    { id: 'c5', channelId: 'demo-class-1', senderId: 'u2', content: '**Rappel** : examen vendredi prochain. Révisez bien les chapitres 5 à 8.', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-05T10:00:00Z', updatedAt: now, deletedAt: null, sender: { id: 'u2', firstName: 'Prof', lastName: 'Martin' } },
  ],
  'demo-subject-1': [
    { id: 's1', channelId: 'demo-subject-1', senderId: null, content: 'Canal créé pour Mathématiques', isSystem: true, isEdited: false, parentId: null, createdAt: '2026-03-01T08:00:00Z', updatedAt: now, deletedAt: null },
    { id: 's2', channelId: 'demo-subject-1', senderId: 'u3', content: 'Le TD est reporté à lundi prochain.', isSystem: false, isEdited: false, parentId: null, createdAt: '2026-03-05T11:00:00Z', updatedAt: now, deletedAt: null, sender: { id: 'u3', firstName: 'Jean', lastName: 'Dupuis' } },
  ],
}

export function useChatMessages(channelId: string | null) {
  const { user } = useAuthContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const channelRef = useRef(channelId)

  // Reset on channel change
  useEffect(() => {
    channelRef.current = channelId
    setMessages([])
    setHasMore(true)
  }, [channelId])

  const fetchMessages = useCallback(async (before?: string) => {
    if (!channelId) return
    if (isDemoMode) {
      setMessages(DEMO_MESSAGES[channelId] || [])
      setHasMore(false)
      setIsLoading(false)
      return
    }
    if (!user) return
    setIsLoading(true)
    try {
      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url),
          chat_attachments(*),
          chat_reactions(*, profiles:user_id(id, full_name))
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error: fetchErr } = await query
      if (fetchErr) { console.error('fetchMessages error:', fetchErr); return }
      if (!data || channelRef.current !== channelId) return

      const transformed = data.map(transformChatMessage).reverse()
      if (before) {
        setMessages(prev => [...transformed, ...prev])
      } else {
        setMessages(transformed)
      }
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      console.error('Fetch messages error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [channelId, user])

  // Initial fetch
  useEffect(() => {
    if (channelId) fetchMessages()
  }, [channelId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load more (infinite scroll up)
  const loadMore = useCallback(() => {
    if (messages.length > 0 && hasMore && !isLoading) {
      fetchMessages(messages[0].createdAt)
    }
  }, [messages, hasMore, isLoading, fetchMessages])

  // Send message
  const sendMessage = useCallback(async (content: string, attachmentFiles?: File[]) => {
    if (!channelId || !user || isDemoMode) return
    try {
      // Generate message ID client-side so we can use it even if SELECT policy has issues
      const messageId = crypto.randomUUID()
      const { error: insertErr } = await supabase
        .from('chat_messages')
        .insert({ id: messageId, channel_id: channelId, sender_id: user.id, content })

      if (insertErr) {
        console.error('sendMessage: insert error:', insertErr)
        return
      }

      // Optimistic local update (realtime will also add it, dedup by ID)
      const optimisticMsg = transformChatMessage({
        id: messageId,
        channel_id: channelId,
        sender_id: user.id,
        content,
        is_system: false,
        is_edited: false,
        parent_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        sender: { id: user.id, full_name: user.firstName + ' ' + user.lastName, avatar_url: null },
        chat_attachments: [],
        chat_reactions: [],
      })
      setMessages(prev => {
        if (prev.find(m => m.id === messageId)) return prev
        return [...prev, optimisticMsg]
      })

      // Upload attachments
      if (attachmentFiles?.length) {
        for (const file of attachmentFiles) {
          if (file.size > CHAT_MAX_FILE_SIZE) continue
          const path = `${user.establishmentId}/${channelId}/${messageId}/${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(path, file)
          if (!uploadError) {
            await supabase.from('chat_attachments').insert({
              message_id: messageId,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              storage_path: path,
            })
          }
        }
      }

      // Parse @mentions
      const mentionRegex = /@([A-Za-zÀ-ÿ]+ [A-Za-zÀ-ÿ]+)/g
      const mentionMatches = [...content.matchAll(mentionRegex)]
      if (mentionMatches.length) {
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id, profiles:user_id(id, full_name)')
          .eq('channel_id', channelId)

        if (members) {
          const mentionInserts: { message_id: string; user_id: string }[] = []
          for (const match of mentionMatches) {
            const mentionName = match[1].toLowerCase()
            const found = members.find((m: any) => {
              const fullName = (m.profiles?.full_name || '').toLowerCase()
              return fullName === mentionName
            })
            if (found) {
              mentionInserts.push({ message_id: messageId, user_id: found.user_id })
            }
          }
          if (mentionInserts.length) {
            await supabase.from('chat_mentions').insert(mentionInserts)
          }
        }
      }

      // Bump channel updated_at (may fail for non-admin roles, that's OK)
      await supabase
        .from('chat_channels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', channelId)
    } catch (err) {
      console.error('Send message error:', err)
    }
  }, [channelId, user])

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user || isDemoMode) return
    const { error } = await supabase
      .from('chat_messages')
      .update({ content: newContent, is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id)
    if (error) {
      console.error('editMessage error:', error)
      return
    }
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
    ))
  }, [user])

  // Delete message (soft)
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user || isDemoMode) return
    const { error } = await supabase
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
    if (error) {
      console.error('deleteMessage error:', error)
      return
    }
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [user])

  // Toggle reaction
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user || isDemoMode) return
    const msg = messages.find(m => m.id === messageId)
    const existing = msg?.reactions?.find(r => r.userId === user.id && r.emoji === emoji)

    if (existing) {
      await supabase.from('chat_reactions').delete().eq('id', existing.id)
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, reactions: (m.reactions || []).filter(r => r.id !== existing.id) }
          : m
      ))
    } else {
      const { data } = await supabase
        .from('chat_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select()
        .single()
      if (data) {
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? { ...m, reactions: [...(m.reactions || []), { id: data.id, messageId, userId: user.id, emoji, createdAt: data.created_at }] }
            : m
        ))
      }
    }
  }, [user, messages])

  // Realtime: new messages
  useEffect(() => {
    if (isDemoMode || !channelId || !user) return
    const channel = supabase
      .channel(`chat_msg:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        // Don't re-add if we already have it (sent by us)
        if (channelRef.current !== channelId) return
        const exists = messages.find(m => m.id === payload.new.id)
        if (exists) return
        // Fetch full message with joins
        const { data } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles!sender_id(id, full_name, avatar_url), chat_attachments(*), chat_reactions(*, profiles:user_id(id, full_name))')
          .eq('id', payload.new.id)
          .single()
        if (data && channelRef.current === channelId) {
          setMessages(prev => {
            if (prev.find(m => m.id === data.id)) return prev
            return [...prev, transformChatMessage(data)]
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        if (payload.new.deleted_at) {
          setMessages(prev => prev.filter(m => m.id !== payload.new.id))
        } else {
          // Refetch updated message
          const { data } = await supabase
            .from('chat_messages')
            .select('*, sender:profiles!sender_id(id, full_name, avatar_url), chat_attachments(*), chat_reactions(*, profiles:user_id(id, full_name))')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages(prev => prev.map(m => m.id === data.id ? transformChatMessage(data) : m))
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelId, user]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages, isLoading, hasMore,
    loadMore, sendMessage, editMessage, deleteMessage, toggleReaction,
  }
}
