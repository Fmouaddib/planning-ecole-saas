/**
 * Page Collaboration Professeurs
 * Admin: Vue dispos, Affectations, Modifications, Messages
 * Teacher: Disponibilites, Affectations, Modifications, Messages, Indisponibilites
 */
import { useState, useEffect, useMemo } from 'react'
import {
  UserCog, CalendarClock, CalendarX, UserCheck, RefreshCw,
  MessageSquare, Plus, Check, X, Send, Clock,
  AlertCircle, CheckCircle, XCircle,
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { FeatureGate } from '@/components/addons/FeatureGate'
import { Button, Card, CardContent } from '@/components/ui'
import { useTeacherAvailability } from '@/hooks/useTeacherAvailability'
import { useTeacherUnavailability, REASON_LABELS } from '@/hooks/useTeacherUnavailability'
import { useSessionAssignments } from '@/hooks/useSessionAssignments'
import { useSessionChangeRequests, CHANGE_TYPE_LABELS } from '@/hooks/useSessionChangeRequests'
import { usePlanningMessages } from '@/hooks/usePlanningMessages'
import { useUsers } from '@/hooks/useUsers'
import { isTeacherRole } from '@/utils/helpers'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { UnavailabilityReason, AssignmentStatus, AvailabilityStatus, UnavailabilityStatus, ChangeRequestStatus } from '@/types'

// ==================== STATUS BADGES ====================

const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  accepted: { label: 'Acceptee', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Refusee', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Annulee', color: 'bg-neutral-100 text-neutral-600', icon: X },
}

const AVAIL_STATUS_CONFIG: Record<AvailabilityStatus, { label: string; color: string }> = {
  submitted: { label: 'Soumise', color: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmee', color: 'bg-green-100 text-green-800' },
}

const UNAVAIL_STATUS_CONFIG: Record<UnavailabilityStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approuvee', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusee', color: 'bg-red-100 text-red-800' },
}

const CR_STATUS_CONFIG: Record<ChangeRequestStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Acceptee', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusee', color: 'bg-red-100 text-red-800' },
}

// ==================== TEACHER TABS ====================

type TeacherTab = 'availabilities' | 'assignments' | 'changes' | 'messages' | 'unavailabilities'
type AdminTab = 'view-avails' | 'assignments' | 'changes' | 'messages'

const TEACHER_TABS: { key: TeacherTab; label: string; icon: typeof CalendarClock }[] = [
  { key: 'availabilities', label: 'Disponibilites', icon: CalendarClock },
  { key: 'assignments', label: 'Affectations', icon: UserCheck },
  { key: 'changes', label: 'Modifications', icon: RefreshCw },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'unavailabilities', label: 'Indisponibilites', icon: CalendarX },
]

const ADMIN_TABS: { key: AdminTab; label: string; icon: typeof CalendarClock }[] = [
  { key: 'view-avails', label: 'Vue Dispos', icon: CalendarClock },
  { key: 'assignments', label: 'Affectations', icon: UserCheck },
  { key: 'changes', label: 'Modifications', icon: RefreshCw },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
]

// ==================== TEACHER AVAILABILITY TAB ====================

function TeacherAvailabilityTab() {
  const { availabilities, isLoading, getForTeacher, create, remove } = useTeacherAvailability()
  const { user } = useAuthContext()
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState('')
  const [formStart, setFormStart] = useState('08:00')
  const [formEnd, setFormEnd] = useState('12:00')
  const [formRecurrence, setFormRecurrence] = useState<'none' | 'weekly'>('none')
  const [formNotes, setFormNotes] = useState('')

  useEffect(() => {
    if (user) getForTeacher(user.id)
  }, [user, getForTeacher])

  const handleSubmit = async () => {
    if (!formDate || !formStart || !formEnd) return
    await create({ date: formDate, startTime: formStart, endTime: formEnd, recurrence: formRecurrence, notes: formNotes || undefined })
    setShowForm(false)
    setFormDate('')
    setFormNotes('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mes disponibilites</h3>
        <Button onClick={() => setShowForm(!showForm)} leftIcon={Plus} size="sm">
          Ajouter
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Debut</label>
                <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Fin</label>
                <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Recurrence</label>
                <select value={formRecurrence} onChange={e => setFormRecurrence(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm">
                  <option value="none">Ponctuel</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </div>
            </div>
            <input type="text" placeholder="Notes (optionnel)" value={formNotes} onChange={e => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} size="sm">Enregistrer</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary" size="sm">Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : availabilities.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <CalendarClock size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune disponibilite declaree</p>
        </div>
      ) : (
        <div className="space-y-2">
          {availabilities.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {format(new Date(a.date + 'T00:00:00'), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-neutral-500">{a.startTime} - {a.endTime}
                    {a.recurrence === 'weekly' && <span className="ml-2 text-primary-600">(Hebdo)</span>}
                  </p>
                  {a.notes && <p className="text-xs text-neutral-400 mt-1">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${AVAIL_STATUS_CONFIG[a.status].color}`}>
                    {AVAIL_STATUS_CONFIG[a.status].label}
                  </span>
                  <button onClick={() => remove(a.id)} className="p-1 text-neutral-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== TEACHER ASSIGNMENTS TAB ====================

function TeacherAssignmentsTab() {
  const { assignments, isLoading, getForTeacher, accept, reject } = useSessionAssignments()
  const [responseText, setResponseText] = useState<Record<string, string>>({})

  useEffect(() => { getForTeacher() }, [getForTeacher])

  const pendingFirst = useMemo(() =>
    [...assignments].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)),
    [assignments]
  )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mes affectations</h3>

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : pendingFirst.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <UserCheck size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune affectation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingFirst.map(a => {
            const cfg = ASSIGNMENT_STATUS_CONFIG[a.status]
            const Icon = cfg.icon
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{a.session?.title || 'Seance'}</p>
                      {a.session && (
                        <p className="text-sm text-neutral-500">
                          {format(new Date(a.session.startTime), 'EEEE d MMMM HH:mm', { locale: fr })} - {format(new Date(a.session.endTime), 'HH:mm')}
                          {a.session.room && ` — ${a.session.room.name}`}
                        </p>
                      )}
                      {a.message && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 italic">"{a.message}"</p>}
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.color}`}>
                      <Icon size={12} /> {cfg.label}
                    </span>
                  </div>

                  {a.status === 'pending' && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        placeholder="Reponse (optionnel)"
                        value={responseText[a.id] || ''}
                        onChange={e => setResponseText(prev => ({ ...prev, [a.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => accept(a.id, responseText[a.id])} size="sm" leftIcon={Check}>Accepter</Button>
                        <Button onClick={() => reject(a.id, responseText[a.id])} variant="secondary" size="sm" leftIcon={X}>Refuser</Button>
                      </div>
                    </div>
                  )}

                  {a.teacherResponse && a.status !== 'pending' && (
                    <p className="text-sm text-neutral-500 mt-2">Reponse : {a.teacherResponse}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================== TEACHER CHANGE REQUESTS TAB ====================

function TeacherChangeRequestsTab() {
  const { changeRequests, isLoading, getForTeacher, accept, reject } = useSessionChangeRequests()
  const [responseText, setResponseText] = useState<Record<string, string>>({})

  useEffect(() => { getForTeacher() }, [getForTeacher])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Modifications de seances</h3>

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : changeRequests.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <RefreshCw size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune demande de modification</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changeRequests.map(cr => {
            const cfg = CR_STATUS_CONFIG[cr.status]
            return (
              <Card key={cr.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{cr.session?.title || 'Seance'}</p>
                      <p className="text-sm text-neutral-500">{CHANGE_TYPE_LABELS[cr.changeType]}</p>
                      {cr.message && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 italic">"{cr.message}"</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>

                  {/* Diff old/new */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <p className="font-medium text-red-700 dark:text-red-400 mb-1">Avant</p>
                      {Object.entries(cr.oldValues).map(([k, v]) => (
                        <p key={k} className="text-red-600 dark:text-red-300">{k}: {String(v)}</p>
                      ))}
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <p className="font-medium text-green-700 dark:text-green-400 mb-1">Apres</p>
                      {Object.entries(cr.newValues).map(([k, v]) => (
                        <p key={k} className="text-green-600 dark:text-green-300">{k}: {String(v)}</p>
                      ))}
                    </div>
                  </div>

                  {cr.status === 'pending' && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        placeholder="Reponse (optionnel)"
                        value={responseText[cr.id] || ''}
                        onChange={e => setResponseText(prev => ({ ...prev, [cr.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => accept(cr.id, responseText[cr.id])} size="sm" leftIcon={Check}>Accepter</Button>
                        <Button onClick={() => reject(cr.id, responseText[cr.id])} variant="secondary" size="sm" leftIcon={X}>Refuser</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================== TEACHER UNAVAILABILITY TAB ====================

function TeacherUnavailabilityTab() {
  const { unavailabilities, isLoading, getAll, create } = useTeacherUnavailability()
  const { user } = useAuthContext()
  const [showForm, setShowForm] = useState(false)
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formReason, setFormReason] = useState<UnavailabilityReason>('other')
  const [formDesc, setFormDesc] = useState('')

  useEffect(() => {
    if (user) getAll(user.id)
  }, [user, getAll])

  const handleSubmit = async () => {
    if (!formStartDate || !formEndDate) return
    await create({ startDate: formStartDate, endDate: formEndDate, reason: formReason, description: formDesc || undefined })
    setShowForm(false)
    setFormStartDate('')
    setFormEndDate('')
    setFormDesc('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mes indisponibilites</h3>
        <Button onClick={() => setShowForm(!showForm)} leftIcon={Plus} size="sm">
          Declarer
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Date debut</label>
                <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Date fin</label>
                <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Motif</label>
                <select value={formReason} onChange={e => setFormReason(e.target.value as UnavailabilityReason)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm">
                  {Object.entries(REASON_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea placeholder="Description (optionnel)" value={formDesc} onChange={e => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none" rows={2} />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} size="sm">Envoyer</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary" size="sm">Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : unavailabilities.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <CalendarX size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune indisponibilite declaree</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unavailabilities.map(u => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {format(new Date(u.startDate + 'T00:00:00'), 'd MMM', { locale: fr })} - {format(new Date(u.endDate + 'T00:00:00'), 'd MMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm text-neutral-500">{REASON_LABELS[u.reason]}</p>
                  {u.description && <p className="text-xs text-neutral-400 mt-1">{u.description}</p>}
                  {u.adminResponse && <p className="text-xs text-primary-600 mt-1">Reponse admin : {u.adminResponse}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${UNAVAIL_STATUS_CONFIG[u.status].color}`}>
                  {UNAVAIL_STATUS_CONFIG[u.status].label}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== MESSAGES TAB (shared) ====================

function MessagesTab() {
  const { conversations, unreadCount, fetchMessages, getConversation, send, markConversationAsRead } = usePlanningMessages()
  const { user } = useAuthContext()
  const { teachers } = useUsers()
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeRecipient, setComposeRecipient] = useState('')

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const selectedConversation = selectedPartnerId ? getConversation(selectedPartnerId) : []

  useEffect(() => {
    if (selectedPartnerId) markConversationAsRead(selectedPartnerId)
  }, [selectedPartnerId, markConversationAsRead])

  const handleSend = async () => {
    const recipientId = selectedPartnerId || composeRecipient
    if (!recipientId || !newMessage.trim()) return
    await send({
      recipientId,
      subject: newSubject || undefined,
      content: newMessage.trim(),
    })
    setNewMessage('')
    setNewSubject('')
    setShowCompose(false)
  }

  // Available recipients (teachers for admin, admins for teacher)
  const recipientOptions = useMemo(() => {
    if (!user) return []
    if (isTeacherRole(user.role)) {
      return teachers.filter(t => t.role === 'admin' || (t.role as string) === 'coordinator').map(t => ({
        id: t.id, label: `${t.firstName} ${t.lastName}`,
      }))
    }
    return teachers.filter(t => t.role === 'teacher' || (t.role as string) === 'trainer').map(t => ({
      id: t.id, label: `${t.firstName} ${t.lastName}`,
    }))
  }, [user, teachers])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Messages {unreadCount > 0 && <span className="text-sm font-normal text-primary-600">({unreadCount} non lu{unreadCount > 1 ? 's' : ''})</span>}
        </h3>
        <Button onClick={() => setShowCompose(!showCompose)} leftIcon={Plus} size="sm">
          Nouveau
        </Button>
      </div>

      {showCompose && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <select value={composeRecipient} onChange={e => setComposeRecipient(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm">
              <option value="">-- Destinataire --</option>
              {recipientOptions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <input type="text" placeholder="Objet" value={newSubject} onChange={e => setNewSubject(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
            <textarea placeholder="Message..." value={newMessage} onChange={e => setNewMessage(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none" rows={3} />
            <div className="flex gap-2">
              <Button onClick={handleSend} size="sm" leftIcon={Send}>Envoyer</Button>
              <Button onClick={() => setShowCompose(false)} variant="secondary" size="sm">Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversation list */}
        <div className="space-y-1">
          {conversations.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 text-sm">Aucune conversation</div>
          ) : conversations.map(conv => (
            <button
              key={conv.partnerId}
              onClick={() => { setSelectedPartnerId(conv.partnerId); setShowCompose(false) }}
              className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                selectedPartnerId === conv.partnerId
                  ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  {conv.partner?.firstName} {conv.partner?.lastName}
                </span>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center bg-primary-500 text-white text-[10px] rounded-full">{conv.unread}</span>
                )}
              </div>
              <p className="text-xs text-neutral-500 truncate mt-0.5">{conv.lastMessage.content}</p>
            </button>
          ))}
        </div>

        {/* Message thread */}
        <div className="md:col-span-2 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden flex flex-col" style={{ minHeight: 300 }}>
          {selectedPartnerId ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConversation.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      msg.senderId === user?.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    }`}>
                      {msg.subject && <p className="font-medium mb-1">{msg.subject}</p>}
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? 'text-primary-200' : 'text-neutral-400'}`}>
                        {format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-700 p-3 flex gap-2">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ecrire un message..."
                  className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm"
                />
                <Button onClick={handleSend} size="sm" leftIcon={Send}>Envoyer</Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
              <MessageSquare size={24} className="mr-2" /> Selectionnez une conversation
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== ADMIN VIEW AVAILABILITIES ====================

function AdminViewAvailsTab() {
  const { availabilities, isLoading, getForCenter, confirm } = useTeacherAvailability()
  const { unavailabilities, getAll: getUnavails, approve, reject } = useTeacherUnavailability()

  useEffect(() => { getForCenter(); getUnavails() }, [getForCenter, getUnavails])

  // Group by teacher
  const byTeacher = useMemo(() => {
    const map = new Map<string, typeof availabilities>()
    for (const a of availabilities) {
      const key = a.teacherId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries()).map(([id, avails]) => ({
      teacherId: id,
      teacherName: avails[0]?.teacher ? `${avails[0].teacher.firstName} ${avails[0].teacher.lastName}` : id,
      availabilities: avails,
    }))
  }, [availabilities])

  const pendingUnavails = useMemo(() => unavailabilities.filter(u => u.status === 'pending'), [unavailabilities])

  return (
    <div className="space-y-6">
      {/* Pending unavailabilities */}
      {pendingUnavails.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" />
            Indisponibilites a traiter ({pendingUnavails.length})
          </h3>
          <div className="space-y-2">
            {pendingUnavails.map(u => (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {u.teacher ? `${u.teacher.firstName} ${u.teacher.lastName}` : 'Professeur'}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {format(new Date(u.startDate + 'T00:00:00'), 'd MMM', { locale: fr })} - {format(new Date(u.endDate + 'T00:00:00'), 'd MMM yyyy', { locale: fr })}
                      {' — '}{REASON_LABELS[u.reason]}
                    </p>
                    {u.description && <p className="text-xs text-neutral-400 mt-1">{u.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => approve(u.id)} size="sm" leftIcon={Check}>Approuver</Button>
                    <Button onClick={() => reject(u.id)} variant="secondary" size="sm" leftIcon={X}>Refuser</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Availabilities by teacher */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Disponibilites des professeurs</h3>
        {isLoading ? (
          <div className="py-12 text-center text-neutral-500">Chargement...</div>
        ) : byTeacher.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            <CalendarClock size={40} className="mx-auto mb-3 text-neutral-300" />
            <p>Aucune disponibilite declaree</p>
          </div>
        ) : (
          <div className="space-y-4">
            {byTeacher.map(({ teacherId, teacherName, availabilities: avails }) => (
              <Card key={teacherId}>
                <CardContent className="p-4">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">{teacherName}</p>
                  <div className="space-y-1">
                    {avails.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {format(new Date(a.date + 'T00:00:00'), 'EEE d MMM', { locale: fr })} {a.startTime}-{a.endTime}
                          {a.recurrence === 'weekly' && <span className="ml-1 text-primary-500">(Hebdo)</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${AVAIL_STATUS_CONFIG[a.status].color}`}>
                            {AVAIL_STATUS_CONFIG[a.status].label}
                          </span>
                          {a.status === 'submitted' && (
                            <button onClick={() => confirm(a.id)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                              Confirmer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== ADMIN ASSIGNMENTS TAB ====================

function AdminAssignmentsTab() {
  const { assignments, isLoading, fetchAssignments, assign, cancel } = useSessionAssignments()
  const { teachers } = useUsers()
  const [showForm, setShowForm] = useState(false)
  const [formTeacherId, setFormTeacherId] = useState('')
  const [formSessionId, setFormSessionId] = useState('')
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  const teacherOptions = useMemo(() =>
    teachers.filter(t => t.role === 'teacher' || (t.role as string) === 'trainer').map(t => ({ id: t.id, label: `${t.firstName} ${t.lastName}` })),
    [teachers]
  )

  const handleAssign = async () => {
    if (!formTeacherId || !formSessionId) return
    await assign({ sessionId: formSessionId, teacherId: formTeacherId, message: formMessage || undefined })
    setShowForm(false)
    setFormTeacherId('')
    setFormSessionId('')
    setFormMessage('')
    fetchAssignments()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Toutes les affectations</h3>
        <Button onClick={() => setShowForm(!showForm)} leftIcon={Plus} size="sm">
          Nouvelle affectation
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Professeur</label>
                <select value={formTeacherId} onChange={e => setFormTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm">
                  <option value="">-- Choisir --</option>
                  {teacherOptions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">ID Seance</label>
                <input type="text" placeholder="ID de la seance" value={formSessionId} onChange={e => setFormSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
            </div>
            <textarea placeholder="Message pour le professeur (optionnel)" value={formMessage} onChange={e => setFormMessage(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none" rows={2} />
            <div className="flex gap-2">
              <Button onClick={handleAssign} size="sm">Affecter</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary" size="sm">Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : assignments.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <UserCheck size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune affectation</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => {
            const cfg = ASSIGNMENT_STATUS_CONFIG[a.status]
            const Icon = cfg.icon
            return (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : 'Professeur'}
                      {' → '}{a.session?.title || 'Seance'}
                    </p>
                    {a.session && (
                      <p className="text-sm text-neutral-500">
                        {format(new Date(a.session.startTime), 'd MMM HH:mm', { locale: fr })}
                        {a.session.room && ` — ${a.session.room.name}`}
                      </p>
                    )}
                    {a.teacherResponse && <p className="text-xs text-neutral-400 mt-1">Reponse : {a.teacherResponse}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.color}`}>
                      <Icon size={12} /> {cfg.label}
                    </span>
                    {a.status === 'pending' && (
                      <button onClick={() => cancel(a.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">
                        Annuler
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================== ADMIN CHANGE REQUESTS TAB ====================

function AdminChangeRequestsTab() {
  const { changeRequests, isLoading, fetchChangeRequests } = useSessionChangeRequests()

  useEffect(() => { fetchChangeRequests() }, [fetchChangeRequests])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Historique des modifications</h3>

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : changeRequests.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <RefreshCw size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune demande de modification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {changeRequests.map(cr => {
            const cfg = CR_STATUS_CONFIG[cr.status]
            return (
              <Card key={cr.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {cr.session?.title || 'Seance'} — {cr.teacher ? `${cr.teacher.firstName} ${cr.teacher.lastName}` : ''}
                    </p>
                    <p className="text-sm text-neutral-500">{CHANGE_TYPE_LABELS[cr.changeType]}</p>
                    {cr.teacherResponse && <p className="text-xs text-neutral-400 mt-1">Reponse : {cr.teacherResponse}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function TeacherCollabPage() {
  const { user } = useAuthContext()
  const isTeacher = isTeacherRole(user?.role)
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('availabilities')
  const [adminTab, setAdminTab] = useState<AdminTab>('view-avails')

  const tabs = isTeacher ? TEACHER_TABS : ADMIN_TABS
  const currentTab = isTeacher ? teacherTab : adminTab

  return (
    <FeatureGate feature="teacher">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <UserCog size={28} className="text-primary-600" />
            {isTeacher ? 'Collaboration' : 'Collaboration Professeurs'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {isTeacher
              ? 'Gerez vos disponibilites, affectations et communiquez avec l\'administration.'
              : 'Gerez les disponibilites, affectations et communiquez avec les professeurs.'
            }
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = currentTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => isTeacher ? setTeacherTab(tab.key as TeacherTab) : setAdminTab(tab.key as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-neutral-900 text-primary-600 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {isTeacher ? (
          <>
            {teacherTab === 'availabilities' && <TeacherAvailabilityTab />}
            {teacherTab === 'assignments' && <TeacherAssignmentsTab />}
            {teacherTab === 'changes' && <TeacherChangeRequestsTab />}
            {teacherTab === 'messages' && <MessagesTab />}
            {teacherTab === 'unavailabilities' && <TeacherUnavailabilityTab />}
          </>
        ) : (
          <>
            {adminTab === 'view-avails' && <AdminViewAvailsTab />}
            {adminTab === 'assignments' && <AdminAssignmentsTab />}
            {adminTab === 'changes' && <AdminChangeRequestsTab />}
            {adminTab === 'messages' && <MessagesTab />}
          </>
        )}
      </div>
    </FeatureGate>
  )
}
