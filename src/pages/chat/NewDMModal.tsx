/**
 * Modal "Nouveau message" — sélection d'un utilisateur pour créer un DM
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, MessageCircle, Loader2, X } from 'lucide-react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { parseFullName } from '@/utils/transforms'
import { isTeacherRole } from '@/utils/helpers'

interface NewDMModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (userId: string) => Promise<void> | void
}

interface UserEntry {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

const DEMO_USERS: UserEntry[] = [
  { id: 'u1', firstName: 'Alice', lastName: 'Martin', email: 'alice@test.com', role: 'student' },
  { id: 'u2', firstName: 'Prof', lastName: 'Martin', email: 'prof@test.com', role: 'teacher' },
  { id: 'u3', firstName: 'Jean', lastName: 'Dupuis', email: 'jean@test.com', role: 'student' },
  { id: 'u4', firstName: 'Marie', lastName: 'Leroy', email: 'marie@test.com', role: 'student' },
  { id: 'u5', firstName: 'Admin', lastName: 'Centre', email: 'admin@test.com', role: 'admin' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', coordinator: 'Coord.', teacher: 'Prof', trainer: 'Formateur',
  student: 'Étudiant', staff: 'Staff',
}

export function NewDMModal({ isOpen, onClose, onSelect }: NewDMModalProps) {
  const { user } = useAuthContext()
  const [users, setUsers] = useState<UserEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    if (isDemoMode || !user) {
      setUsers(DEMO_USERS)
      return
    }
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('center_id', user.establishmentId)
        .eq('is_active', true)
        .neq('id', user.id)
        .order('full_name')

      setUsers((data || []).map(p => {
        const { firstName, lastName } = parseFullName(p.full_name)
        return { id: p.id, firstName, lastName, email: p.email, role: p.role }
      }))
    } catch (err) {
      console.error('Fetch users error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen) { fetchUsers(); setSearch(''); setSelectingId(null) }
  }, [isOpen, fetchUsers])

  const filteredUsers = useMemo(() => {
    let list = users
    // Profs : peuvent contacter étudiants, admin, staff — PAS les collègues profs
    if (isTeacherRole(user?.role)) {
      list = list.filter(u => !isTeacherRole(u.role))
    }
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }, [users, search, user?.role])

  const handleSelect = async (userId: string) => {
    if (selectingId) return // prevent double-click
    setSelectingId(userId)
    try {
      await onSelect(userId)
    } catch (err) {
      console.error('DM select error:', err)
      setSelectingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={selectingId ? undefined : onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-primary-600" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Nouveau message</h3>
          </div>
          <button onClick={onClose} disabled={!!selectingId} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 disabled:opacity-30">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              autoFocus
              disabled={!!selectingId}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-neutral-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-sm text-neutral-400 py-10">Aucun utilisateur trouvé</p>
          ) : (
            <div className="space-y-0.5">
              {filteredUsers.map(u => {
                const isSelecting = selectingId === u.id
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelect(u.id)}
                    disabled={!!selectingId}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelecting
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : selectingId
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300">
                      {isSelecting
                        ? <Loader2 size={14} className="animate-spin text-primary-600" />
                        : u.firstName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">{u.email}</p>
                    </div>
                    {isSelecting ? (
                      <span className="text-[10px] font-medium text-primary-600">Ouverture...</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
