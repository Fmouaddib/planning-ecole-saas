/**
 * Colonne centrale du chat — header + messages + input
 */
import { useRef, useEffect } from 'react'
import { Users, BookOpen, MessageCircle, Info, Loader2, ArrowLeft } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import type { ChatChannel, ChatMessage, ChatMember } from '@/types'

interface MessageViewProps {
  channel: ChatChannel
  messages: ChatMessage[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSend: (content: string, files?: File[]) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onReact: (id: string, emoji: string) => void
  typingUserIds: Set<string>
  members: ChatMember[]
  onSetTyping: (isTyping: boolean) => void
  onToggleInfo: () => void
  currentUserId: string
  onBack?: () => void
}

export function MessageView({
  channel, messages, isLoading, hasMore, onLoadMore,
  onSend, onEdit, onDelete, onReact,
  typingUserIds, members, onSetTyping,
  onToggleInfo, currentUserId, onBack,
}: MessageViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Infinite scroll: load more when sentinel is visible
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !isLoading) onLoadMore() },
      { root: scrollContainerRef.current, threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  // Typing users display
  const typingNames = Array.from(typingUserIds)
    .filter(id => id !== currentUserId)
    .map(id => {
      const m = members.find(mb => mb.userId === id)
      return m?.user?.firstName || 'Quelqu\'un'
    })

  const channelIcon = channel.type === 'dm'
    ? MessageCircle
    : channel.type === 'class' ? Users : BookOpen

  const ChannelIcon = channelIcon

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden">
              <ArrowLeft size={18} />
            </button>
          )}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            channel.type === 'dm'
              ? 'bg-neutral-200 dark:bg-neutral-700'
              : channel.type === 'class'
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-purple-100 dark:bg-purple-900/30'
          }`}>
            <ChannelIcon size={16} className={
              channel.type === 'dm'
                ? 'text-neutral-600 dark:text-neutral-300'
                : channel.type === 'class'
                  ? 'text-blue-600'
                  : 'text-purple-600'
            } />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {channel.type !== 'dm' && '#'}{channel.name || 'Sans nom'}
            </h3>
            <p className="text-[11px] text-neutral-400">
              {members.length} membre{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onToggleInfo}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 transition-colors"
          title="Infos du canal"
        >
          <Info size={18} />
        </button>
      </div>

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* Load more sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            {isLoading && <Loader2 size={18} className="animate-spin text-neutral-400" />}
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400">
            <ChannelIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Aucun message pour l'instant</p>
            <p className="text-xs mt-1">Soyez le premier à écrire !</p>
          </div>
        )}

        <div className="py-2">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              currentUserId={currentUserId}
            />
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-4 py-1">
          <p className="text-xs text-neutral-400 italic">
            {typingNames.join(', ')} {typingNames.length === 1 ? 'écrit' : 'écrivent'}…
          </p>
        </div>
      )}

      {/* Input */}
      <MessageInput
        onSend={onSend}
        onTyping={onSetTyping}
        members={members}
      />
    </div>
  )
}
