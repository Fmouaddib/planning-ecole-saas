/**
 * Hook pour planning_messages — messagerie admin↔professeur avec realtime
 */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformPlanningMessage } from '@/utils/transforms'
import toast from 'react-hot-toast'
import type { PlanningMessage } from '@/types'

// ==================== DEMO DATA ====================
const DEMO_MESSAGES: PlanningMessage[] = [
  {
    id: 'demo-msg-1', centerId: 'demo-center', senderId: 'demo-admin', recipientId: 'demo-teacher-1',
    subject: 'Planning semaine 11', content: 'Bonjour Marie, pouvez-vous confirmer vos dispos pour la semaine 11 ?',
    isRead: true,
    sender: { id: 'demo-admin', firstName: 'Admin', lastName: 'Centre', email: 'admin@demo.com' },
    recipient: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont', email: 'marie@demo.com' },
    createdAt: '2026-03-03T10:00:00Z',
  },
  {
    id: 'demo-msg-2', centerId: 'demo-center', senderId: 'demo-teacher-1', recipientId: 'demo-admin',
    subject: 'Planning semaine 11', content: 'Bonjour, oui je suis disponible lundi et mardi. Merci !',
    isRead: false, parentId: 'demo-msg-1',
    sender: { id: 'demo-teacher-1', firstName: 'Marie', lastName: 'Dupont', email: 'marie@demo.com' },
    recipient: { id: 'demo-admin', firstName: 'Admin', lastName: 'Centre', email: 'admin@demo.com' },
    createdAt: '2026-03-03T14:30:00Z',
  },
  {
    id: 'demo-msg-3', centerId: 'demo-center', senderId: 'demo-admin', recipientId: 'demo-teacher-2',
    subject: 'Changement salle', content: 'Jean, la salle B203 n\'est plus disponible jeudi. On bascule en A102.',
    isRead: false,
    sender: { id: 'demo-admin', firstName: 'Admin', lastName: 'Centre', email: 'admin@demo.com' },
    recipient: { id: 'demo-teacher-2', firstName: 'Jean', lastName: 'Martin', email: 'jean@demo.com' },
    createdAt: '2026-03-04T09:00:00Z',
  },
]

const SELECT_QUERY = `
  *,
  sender:profiles!planning_messages_sender_id_fkey(id, full_name, email),
  recipient:profiles!planning_messages_recipient_id_fkey(id, full_name, email)
`

interface SendMessageData {
  recipientId: string
  subject?: string
  content: string
  sessionId?: string
  parentId?: string
}

export function usePlanningMessages() {
  const { user } = useAuthContext()
  const [messages, setMessages] = useState<PlanningMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (isDemoMode) {
      setMessages(DEMO_MESSAGES)
      return
    }
    if (!user) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('planning_messages')
        .select(SELECT_QUERY)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setMessages((data || []).map(transformPlanningMessage))
    } catch (err: any) {
      console.error('Error fetching messages:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const getConversation = useCallback((otherUserId: string, sessionId?: string) => {
    return messages.filter(m => {
      const isConversation = (m.senderId === otherUserId || m.recipientId === otherUserId)
      if (sessionId) return isConversation && m.sessionId === sessionId
      return isConversation
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [messages])

  // Group messages by conversation partner
  const conversations = useMemo(() => {
    if (!user) return []
    const byPartner = new Map<string, { partner: PlanningMessage['sender']; lastMessage: PlanningMessage; unread: number }>()

    for (const msg of messages) {
      const partnerId = msg.senderId === user.id ? msg.recipientId : msg.senderId
      const partner = msg.senderId === user.id ? msg.recipient : msg.sender

      const existing = byPartner.get(partnerId)
      if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
        byPartner.set(partnerId, {
          partner,
          lastMessage: msg,
          unread: (existing?.unread || 0) + (!msg.isRead && msg.recipientId === user.id ? 1 : 0),
        })
      } else if (!msg.isRead && msg.recipientId === user.id) {
        existing.unread++
      }
    }

    return Array.from(byPartner.entries())
      .map(([partnerId, data]) => ({ partnerId, ...data }))
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())
  }, [messages, user])

  const unreadCount = useMemo(() => {
    if (!user) return 0
    return messages.filter(m => m.recipientId === user.id && !m.isRead).length
  }, [messages, user])

  const send = useCallback(async (data: SendMessageData) => {
    if (isDemoMode || !user) return
    try {
      const { error } = await supabase.from('planning_messages').insert({
        center_id: user.establishmentId,
        sender_id: user.id,
        recipient_id: data.recipientId,
        session_id: data.sessionId || null,
        subject: data.subject || null,
        content: data.content,
        parent_id: data.parentId || null,
      })
      if (error) throw error

      // Notify recipient
      supabase.from('in_app_notifications').insert({
        user_id: data.recipientId,
        center_id: user.establishmentId,
        title: 'Nouveau message',
        message: data.subject ? `${user.firstName} ${user.lastName} — ${data.subject}` : `Message de ${user.firstName} ${user.lastName}`,
        type: 'planning_message',
        link: '/teacher-collab',
      }).then(() => {})

      await fetchMessages()
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi')
    }
  }, [user, fetchMessages])

  const markAsRead = useCallback(async (id: string) => {
    if (isDemoMode) return
    try {
      await supabase.from('planning_messages').update({ is_read: true }).eq('id', id)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m))
    } catch { /* silent */ }
  }, [])

  const markConversationAsRead = useCallback(async (otherUserId: string) => {
    if (isDemoMode || !user) return
    const unreadIds = messages
      .filter(m => m.senderId === otherUserId && m.recipientId === user.id && !m.isRead)
      .map(m => m.id)

    if (unreadIds.length === 0) return
    try {
      await supabase.from('planning_messages').update({ is_read: true }).in('id', unreadIds)
      setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, isRead: true } : m))
    } catch { /* silent */ }
  }, [messages, user])

  // Realtime subscription
  useEffect(() => {
    if (isDemoMode || !user) return

    const channel = supabase
      .channel('planning_messages_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'planning_messages',
      }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, fetchMessages])

  return {
    messages, conversations, unreadCount, isLoading,
    fetchMessages, getConversation,
    send, markAsRead, markConversationAsRead,
  }
}
