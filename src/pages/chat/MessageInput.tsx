/**
 * Barre de saisie de message — texte, emoji, pièces jointes, mentions
 */
import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import { Send, Paperclip, Smile, X } from 'lucide-react'
import { CHAT_REACTIONS, CHAT_MAX_FILE_SIZE, CHAT_ALLOWED_MIME_TYPES } from '@/utils/constants'
import type { ChatMember } from '@/types'

interface MessageInputProps {
  onSend: (content: string, files?: File[]) => void
  onTyping: (isTyping: boolean) => void
  members: ChatMember[]
  disabled?: boolean
}

export function MessageInput({ onSend, onTyping, members, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [text])

  // Typing indicator
  const handleTyping = useCallback(() => {
    onTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 3000)
  }, [onTyping])

  // Handle input change
  const handleChange = useCallback((value: string) => {
    setText(value)
    handleTyping()

    // Check for @mention
    const lastAt = value.lastIndexOf('@')
    if (lastAt >= 0) {
      const afterAt = value.slice(lastAt + 1)
      if (!afterAt.includes(' ') || afterAt.split(' ').length <= 2) {
        setShowMentions(true)
        setMentionFilter(afterAt.toLowerCase())
        return
      }
    }
    setShowMentions(false)
  }, [handleTyping])

  // Filtered mention candidates
  const mentionCandidates = members.filter(m => {
    if (!m.user) return false
    const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase()
    return fullName.includes(mentionFilter)
  }).slice(0, 6)

  // Insert mention
  const insertMention = useCallback((member: ChatMember) => {
    if (!member.user) return
    const name = `${member.user.firstName} ${member.user.lastName}`
    const lastAt = text.lastIndexOf('@')
    const newText = text.slice(0, lastAt) + `@${name} `
    setText(newText)
    setShowMentions(false)
    textareaRef.current?.focus()
  }, [text])

  // Send
  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return
    onSend(trimmed, files.length > 0 ? files : undefined)
    setText('')
    setFiles([])
    onTyping(false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [text, files, onSend, onTyping])

  // Keyboard
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setShowMentions(false)
      setShowEmoji(false)
    }
  }, [handleSend])

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const valid = selected.filter(f =>
      f.size <= CHAT_MAX_FILE_SIZE && CHAT_ALLOWED_MIME_TYPES.includes(f.type)
    )
    setFiles(prev => [...prev, ...valid])
    e.target.value = ''
  }, [])

  const removeFile = useCallback((idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }, [])

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs">
              <Paperclip size={12} className="text-neutral-400" />
              <span className="truncate max-w-[120px] text-neutral-600 dark:text-neutral-300">{f.name}</span>
              <button onClick={() => removeFile(i)} className="text-neutral-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention suggestions */}
      {showMentions && mentionCandidates.length > 0 && (
        <div className="mb-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {mentionCandidates.map(m => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left"
            >
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-bold text-primary-700">
                {m.user?.firstName?.[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {m.user?.firstName} {m.user?.lastName}
                </p>
                <p className="text-[10px] text-neutral-400">{m.user?.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0"
          title="Joindre un fichier"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={CHAT_ALLOWED_MIME_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message… (@ pour mentionner)"
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
          />
        </div>

        {/* Emoji picker */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setShowEmoji(!showEmoji); setShowMentions(false) }}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Emoji"
          >
            <Smile size={18} />
          </button>
          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-2 flex gap-1">
              {CHAT_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { setText(prev => prev + emoji); setShowEmoji(false); textareaRef.current?.focus() }}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && files.length === 0)}
          className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          title="Envoyer"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
