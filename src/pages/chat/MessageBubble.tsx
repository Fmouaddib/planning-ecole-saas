/**
 * Bulle de message — avatar, contenu, réactions, menu contextuel
 */
import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Smile, Paperclip, FileText, Image } from 'lucide-react'
import { CHAT_REACTIONS } from '@/utils/constants'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { ChatMessage } from '@/types'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onReact: (id: string, emoji: string) => void
  currentUserId: string
}

function getInitials(firstName?: string, lastName?: string): string {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?'
}

function renderContent(content: string | null): React.ReactNode {
  if (!content) return null
  // Basic markdown: **bold**, *italic*, `code`, @mentions
  return content.split('\n').map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|@[A-Za-zÀ-ÿ]+ [A-Za-zÀ-ÿ]+)/).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={j}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={j}>{part.slice(1, -1)}</em>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={j} className="px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-xs font-mono">{part.slice(1, -1)}</code>
        if (part.startsWith('@'))
          return <span key={j} className="text-primary-600 dark:text-primary-400 font-medium">{part}</span>
        return part
      })}
    </span>
  ))
}

function isImageMime(mime: string | null): boolean {
  return !!mime?.startsWith('image/')
}

export function MessageBubble({ message, isOwn, onEdit, onDelete, onReact, currentUserId }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content || '')

  // System message
  if (message.isSystem) {
    return (
      <div className="flex justify-center py-2">
        <p className="text-xs text-neutral-400 italic bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
          {message.content}
        </p>
      </div>
    )
  }

  const sender = message.sender
  const initials = getInitials(sender?.firstName, sender?.lastName)
  const time = format(new Date(message.createdAt), 'HH:mm', { locale: fr })

  // Group reactions by emoji
  const reactionGroups: { emoji: string; count: number; hasOwn: boolean }[] = []
  if (message.reactions?.length) {
    const map = new Map<string, { count: number; hasOwn: boolean }>()
    message.reactions.forEach(r => {
      const existing = map.get(r.emoji)
      if (existing) {
        existing.count++
        if (r.userId === currentUserId) existing.hasOwn = true
      } else {
        map.set(r.emoji, { count: 1, hasOwn: r.userId === currentUserId })
      }
    })
    map.forEach((v, emoji) => reactionGroups.push({ emoji, ...v }))
  }

  return (
    <div className={`group flex gap-2.5 px-4 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${isOwn ? '' : ''}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300 flex-shrink-0 mt-0.5">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {sender ? `${sender.firstName} ${sender.lastName}` : 'Système'}
          </span>
          <span className="text-[10px] text-neutral-400">{time}</span>
          {message.isEdited && <span className="text-[10px] text-neutral-400 italic">(modifié)</span>}
        </div>

        {/* Text or edit mode */}
        {editing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={2}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (editText.trim()) { onEdit(message.id, editText.trim()); setEditing(false) }
                }
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <div className="flex gap-2 mt-1">
              <button onClick={() => setEditing(false)} className="text-xs text-neutral-400 hover:text-neutral-600">Annuler</button>
              <button onClick={() => { if (editText.trim()) { onEdit(message.id, editText.trim()); setEditing(false) } }} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Enregistrer</button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 break-words">
            {renderContent(message.content)}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {message.attachments.map(att => {
              const isImage = isImageMime(att.mimeType)
              const icon = isImage
                ? <Image size={14} className="text-blue-500" />
                : att.mimeType === 'application/pdf'
                  ? <FileText size={14} className="text-red-500" />
                  : <Paperclip size={14} className="text-neutral-400" />
              return (
                <div key={att.id}>
                  {/* Image preview */}
                  {isImage && att.url && (
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                      <img
                        src={att.url}
                        alt={att.fileName}
                        className="max-w-xs max-h-48 rounded-lg border border-neutral-200 dark:border-neutral-700 object-cover"
                      />
                    </a>
                  )}
                  {/* File link */}
                  <a
                    href={att.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.fileName}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 ${att.url ? 'hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer' : 'opacity-50'} transition-colors`}
                  >
                    {icon}
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate max-w-[200px]">{att.fileName}</span>
                    {att.fileSize && <span className="text-[10px] text-neutral-400">{(att.fileSize / 1024).toFixed(0)} Ko</span>}
                  </a>
                </div>
              )
            })}
          </div>
        )}

        {/* Reactions */}
        {reactionGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactionGroups.map(rg => (
              <button
                key={rg.emoji}
                onClick={() => onReact(message.id, rg.emoji)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  rg.hasOwn
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <span>{rg.emoji}</span>
                <span className="font-medium">{rg.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action menu (hover) */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 mt-0.5">
        {/* Quick react */}
        <div className="relative">
          <button
            onClick={() => { setShowReactions(!showReactions); setShowMenu(false) }}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400"
          >
            <Smile size={14} />
          </button>
          {showReactions && (
            <div className="absolute right-0 top-full mt-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-1 flex gap-0.5 z-10">
              {CHAT_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onReact(message.id, emoji); setShowReactions(false) }}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* More menu (edit/delete) */}
        {isOwn && (
          <div className="relative">
            <button
              onClick={() => { setShowMenu(!showMenu); setShowReactions(false) }}
              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                <button
                  onClick={() => { setEditing(true); setEditText(message.content || ''); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <Pencil size={12} /> Modifier
                </button>
                <button
                  onClick={() => { onDelete(message.id); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
