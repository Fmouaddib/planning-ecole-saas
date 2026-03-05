/**
 * Colonne gauche du chat — Liste des channels groupés
 */
import { useState } from 'react'
import { Search, MessageSquarePlus, ChevronDown, ChevronRight, Users, BookOpen, MessageCircle } from 'lucide-react'
import type { ChatChannel } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ChannelListProps {
  dmChannels: ChatChannel[]
  classChannels: ChatChannel[]
  subjectChannels: ChatChannel[]
  activeChannelId: string | null
  onSelect: (id: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onNewDM: () => void
  onlineUserIds?: Set<string>
}

interface ChannelGroupProps {
  label: string
  icon: React.ElementType
  channels: ChatChannel[]
  activeChannelId: string | null
  onSelect: (id: string) => void
  onlineUserIds?: Set<string>
  defaultOpen?: boolean
}

function ChannelGroup({ label, icon: Icon, channels, activeChannelId, onSelect, onlineUserIds, defaultOpen = true }: ChannelGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const totalUnread = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0)

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        <div className="flex items-center gap-1.5">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Icon size={12} />
          <span>{label}</span>
        </div>
        {totalUnread > 0 && (
          <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {totalUnread}
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-0.5">
          {channels.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-400 italic">Aucun</p>
          ) : (
            channels.map(ch => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                isActive={ch.id === activeChannelId}
                onSelect={onSelect}
                onlineUserIds={onlineUserIds}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ChannelItem({ channel, isActive, onSelect, onlineUserIds }: {
  channel: ChatChannel
  isActive: boolean
  onSelect: (id: string) => void
  onlineUserIds?: Set<string>
}) {
  const hasUnread = (channel.unreadCount || 0) > 0

  return (
    <button
      onClick={() => onSelect(channel.id)}
      className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors text-left ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-400'
          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      {/* Icon / avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        {channel.type === 'dm' ? (
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300">
            {(channel.name || '?')[0].toUpperCase()}
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            channel.type === 'class'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
          }`}>
            {channel.type === 'class' ? <Users size={14} /> : <BookOpen size={14} />}
          </div>
        )}
        {/* Online dot for DMs */}
        {channel.type === 'dm' && onlineUserIds && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900 ${
            true /* simplified for now */ ? 'bg-emerald-500' : 'bg-neutral-300'
          }`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
            {channel.type !== 'dm' && <span className="text-neutral-400 mr-0.5">#</span>}
            {channel.name || 'Sans nom'}
          </span>
          {channel.lastMessage && (
            <span className="text-[10px] text-neutral-400 flex-shrink-0 ml-1">
              {formatDistanceToNow(new Date(channel.lastMessage.createdAt), { addSuffix: false, locale: fr })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-neutral-400 truncate">
            {channel.lastMessage
              ? channel.lastMessage.isSystem
                ? channel.lastMessage.content
                : `${channel.lastMessage.sender?.firstName || ''}: ${channel.lastMessage.content || ''}`
              : 'Pas encore de message'}
          </p>
          {hasUnread && (
            <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0 ml-1">
              {channel.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function ChannelList({
  dmChannels, classChannels, subjectChannels,
  activeChannelId, onSelect, searchQuery, onSearchChange, onNewDM, onlineUserIds,
}: ChannelListProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-primary-600" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Messages</h2>
          </div>
          <button
            onClick={onNewDM}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-primary-600 transition-colors"
            title="Nouveau message"
          >
            <MessageSquarePlus size={16} />
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Channel groups */}
      <div className="flex-1 overflow-y-auto p-1.5">
        <ChannelGroup
          label="Messages directs"
          icon={MessageCircle}
          channels={dmChannels}
          activeChannelId={activeChannelId}
          onSelect={onSelect}
          onlineUserIds={onlineUserIds}
        />
        <ChannelGroup
          label="Classes"
          icon={Users}
          channels={classChannels}
          activeChannelId={activeChannelId}
          onSelect={onSelect}
        />
        <ChannelGroup
          label="Matières"
          icon={BookOpen}
          channels={subjectChannels}
          activeChannelId={activeChannelId}
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}
