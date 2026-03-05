/**
 * Colonne droite du chat — infos du canal, membres, fichiers
 */
import { Users, BookOpen, MessageCircle, MessageSquare } from 'lucide-react'
import type { ChatChannel, ChatMember } from '@/types'

interface InfoPanelProps {
  channel: ChatChannel
  members: ChatMember[]
  onlineUserIds: Set<string>
  onClose?: () => void
  onStartDM?: (userId: string) => void
  currentUserId?: string
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'admin':
    case 'coordinator':
      return { label: 'Admin', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
    case 'teacher':
    case 'trainer':
      return { label: 'Prof', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' }
    case 'student':
      return { label: 'Étudiant', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' }
    default:
      return { label: role, className: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600' }
  }
}

export function InfoPanel({ channel, members, onlineUserIds, onStartDM, currentUserId }: InfoPanelProps) {
  const onlineCount = members.filter(m => onlineUserIds.has(m.userId)).length

  // Sort: online first, then by role (admin > teacher > student)
  const sortedMembers = [...members].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.userId) ? 0 : 1
    const bOnline = onlineUserIds.has(b.userId) ? 0 : 1
    if (aOnline !== bOnline) return aOnline - bOnline
    const roleOrder: Record<string, number> = { admin: 0, coordinator: 0, teacher: 1, trainer: 1, student: 2, staff: 3 }
    return (roleOrder[a.user?.role || ''] ?? 9) - (roleOrder[b.user?.role || ''] ?? 9)
  })

  const ChannelIcon = channel.type === 'dm' ? MessageCircle : channel.type === 'class' ? Users : BookOpen

  return (
    <div className="h-full flex flex-col">
      {/* Channel info header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            channel.type === 'dm'
              ? 'bg-neutral-200 dark:bg-neutral-700'
              : channel.type === 'class'
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-purple-100 dark:bg-purple-900/30'
          }`}>
            <ChannelIcon size={20} className={
              channel.type === 'dm'
                ? 'text-neutral-600 dark:text-neutral-300'
                : channel.type === 'class'
                  ? 'text-blue-600'
                  : 'text-purple-600'
            } />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {channel.type !== 'dm' && '#'}{channel.name || 'Sans nom'}
            </h3>
            <p className="text-[11px] text-neutral-400">
              {channel.type === 'dm' ? 'Message direct' : channel.type === 'class' ? 'Canal de classe' : 'Canal de matière'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{members.length} membre{members.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{onlineCount} en ligne</span>
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Membres ({members.length})
          </h4>
          <div className="space-y-1">
            {sortedMembers.map(member => {
              const isOnline = onlineUserIds.has(member.userId)
              const badge = getRoleBadge(member.user?.role || '')

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {/* Avatar with status dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                      {(member.user?.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-neutral-900 ${
                      isOnline ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'
                    }`} />
                  </div>

                  {/* Name & role */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${
                      isOnline
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {member.user?.firstName} {member.user?.lastName}
                    </p>
                  </div>

                  {/* Role badge */}
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>

                  {/* DM button (not on self, not in DM channels) */}
                  {onStartDM && channel.type !== 'dm' && member.userId !== currentUserId && (
                    <button
                      onClick={() => onStartDM(member.userId)}
                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-primary-500 transition-colors"
                      title="Envoyer un message"
                    >
                      <MessageSquare size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
