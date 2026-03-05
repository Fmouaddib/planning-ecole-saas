/**
 * Page Collaboration Professeurs — V2 Workflow
 * Admin: Demandes de planning | Remplacements | Affectations | Messages | Indispos
 * Teacher: Demandes dispo | Remplacements | Affectations | Messages
 */
import { useState, useEffect, useMemo } from 'react'
import {
  UserCog, CalendarClock, CalendarX, UserCheck,
  MessageSquare, Plus, Check, X, Send, Clock,
  AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp,
  UserPlus, Award, AlertTriangle, RefreshCw, Mail,
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { FeatureGate } from '@/components/addons/FeatureGate'
import { Button, Card, CardContent, HelpBanner } from '@/components/ui'
import { useAvailabilityRequests } from '@/hooks/useAvailabilityRequests'
import { useReplacementRequests } from '@/hooks/useReplacementRequests'
import { useSessionAssignments } from '@/hooks/useSessionAssignments'
import { usePlanningMessages } from '@/hooks/usePlanningMessages'
import { useTeacherUnavailability, REASON_LABELS } from '@/hooks/useTeacherUnavailability'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useBookings } from '@/hooks/useBookings'
import { useUsers } from '@/hooks/useUsers'
import { isTeacherRole } from '@/utils/helpers'
import { navigateTo } from '@/utils/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type {
  AssignmentStatus, UnavailabilityStatus,
  AvailabilityRequestStatus, AvailabilityResponseType, ReplacementRequestStatus, ReplacementCandidateStatus,
  UnavailableSlot,
} from '@/types'

// ==================== STATUS CONFIG ====================

const AR_STATUS_CONFIG: Record<AvailabilityRequestStatus, { label: string; color: string }> = {
  open: { label: 'Ouverte', color: 'bg-amber-100 text-amber-800' },
  responded: { label: 'Repondue', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Fermee', color: 'bg-neutral-100 text-neutral-600' },
}

const RR_STATUS_CONFIG: Record<ReplacementRequestStatus, { label: string; color: string }> = {
  open: { label: 'En cours', color: 'bg-amber-100 text-amber-800' },
  fulfilled: { label: 'Pourvue', color: 'bg-green-100 text-green-800' },
  no_replacement: { label: 'Sans remplacement', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Annulee', color: 'bg-neutral-100 text-neutral-600' },
}

const RC_STATUS_CONFIG: Record<ReplacementCandidateStatus, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  accepted: { label: 'Accepte', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Refuse', color: 'bg-red-100 text-red-800', icon: XCircle },
  selected: { label: 'Selectionne', color: 'bg-primary-100 text-primary-800', icon: Award },
}

const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  accepted: { label: 'Acceptee', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Refusee', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Annulee', color: 'bg-neutral-100 text-neutral-600', icon: X },
}

const UNAVAIL_STATUS_CONFIG: Record<UnavailabilityStatus, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approuvee', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusee', color: 'bg-red-100 text-red-800' },
}

// ==================== TAB DEFINITIONS ====================

type AdminTab = 'demands' | 'replacements' | 'assignments' | 'messages' | 'unavailabilities'
type TeacherTab = 'demands' | 'replacements' | 'assignments' | 'messages'

const ADMIN_TABS: { key: AdminTab; label: string; icon: typeof CalendarClock }[] = [
  { key: 'demands', label: 'Demandes de planning', icon: CalendarClock },
  { key: 'replacements', label: 'Remplacements', icon: UserPlus },
  { key: 'assignments', label: 'Affectations', icon: UserCheck },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'unavailabilities', label: 'Indisponibilites', icon: CalendarX },
]

const TEACHER_TABS: { key: TeacherTab; label: string; icon: typeof CalendarClock }[] = [
  { key: 'demands', label: 'Demandes dispo', icon: CalendarClock },
  { key: 'replacements', label: 'Remplacements', icon: UserPlus },
  { key: 'assignments', label: 'Affectations', icon: UserCheck },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
]

// ==================== ADMIN DEMANDS TAB ====================

function AdminDemandsTab() {
  const { requests, isLoading, create, close, remind } = useAvailabilityRequests()
  const { subjects, classes, teacherSubjects } = useAcademicData()
  const { teachers } = useUsers()
  const [showForm, setShowForm] = useState(false)
  const [formSubject, setFormSubject] = useState('')
  const [formClass, setFormClass] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [remindEmail, setRemindEmail] = useState(true)
  const [remindingId, setRemindingId] = useState<string | null>(null)

  const teacherList = useMemo(() =>
    teachers.filter(t => t.role === 'teacher' || (t.role as string) === 'trainer').map(t => ({
      id: t.id, firstName: t.firstName, lastName: t.lastName, email: t.email,
    })),
    [teachers]
  )

  const handleCreate = async () => {
    if (!formSubject || !formClass || !formStart || !formEnd) return
    const subj = subjects.find(s => s.id === formSubject)
    const cls = classes.find(c => c.id === formClass)
    await create({
      subjectId: formSubject,
      classId: formClass,
      periodStart: formStart,
      periodEnd: formEnd,
      message: formMessage || undefined,
      teacherSubjects,
      teachers: teacherList,
      subjectName: subj?.name || '',
      className: cls?.name || '',
    })
    setShowForm(false)
    setFormSubject('')
    setFormClass('')
    setFormStart('')
    setFormEnd('')
    setFormMessage('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Demandes de planning</h3>
        <Button onClick={() => setShowForm(!showForm)} leftIcon={Plus} size="sm">
          Nouvelle demande
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Matiere</label>
                <select value={formSubject} onChange={e => setFormSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm">
                  <option value="">-- Choisir --</option>
                  {subjects.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Classe</label>
                <select value={formClass} onChange={e => setFormClass(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm">
                  <option value="">-- Choisir --</option>
                  {classes.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Debut periode</label>
                <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Fin periode</label>
                <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
              </div>
            </div>
            <textarea placeholder="Message pour les professeurs (optionnel)" value={formMessage} onChange={e => setFormMessage(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none" rows={2} />

            {/* Preview of teachers who will be contacted */}
            {formSubject && (() => {
              const ids = teacherSubjects.filter(ts => ts.subject_id === formSubject).map(ts => ts.teacher_id)
              const targeted = teacherList.filter(t => ids.includes(t.id))
              return targeted.length > 0 ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    {targeted.length} professeur{targeted.length > 1 ? 's' : ''} sera{targeted.length > 1 ? 'ont' : ''} contacte{targeted.length > 1 ? 's' : ''} :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {targeted.map(t => (
                      <span key={t.id} className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                        <UserCheck size={10} />
                        {t.firstName} {t.lastName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={12} className="inline mr-1" />
                  Aucun professeur rattache a cette matiere
                </p>
              )
            })()}

            <div className="flex gap-2">
              <Button onClick={handleCreate} size="sm">Envoyer</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary" size="sm">Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <CalendarClock size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune demande de planning</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const isExpanded = expandedId === r.id
            const responseCount = r.responses?.length || 0
            // Get the targeted teachers (those who teach this subject)
            const targetTeacherIds = r.subjectId
              ? teacherSubjects.filter(ts => ts.subject_id === r.subjectId).map(ts => ts.teacher_id)
              : []
            const targetTeachers = teacherList.filter(t => targetTeacherIds.includes(t.id))
            const respondedIds = new Set((r.responses || []).map(resp => resp.teacherId))
            const pendingTeachers = targetTeachers.filter(t => !respondedIds.has(t.id))

            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {r.subject?.name || 'Matiere'} — {r.class_?.name || 'Classe'}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${AR_STATUS_CONFIG[r.status].color}`}>
                          {AR_STATUS_CONFIG[r.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-500">
                        {format(new Date(r.periodStart + 'T00:00:00'), 'd MMM', { locale: fr })} — {format(new Date(r.periodEnd + 'T00:00:00'), 'd MMM yyyy', { locale: fr })}
                      </p>
                      {r.message && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 italic">"{r.message}"</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs text-neutral-400">
                          Reponses : {responseCount}/{targetTeachers.length}
                        </p>
                        {targetTeachers.length > 0 && (
                          <p className="text-xs text-neutral-400">
                            Contactes : {targetTeachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'open' && (
                        <Button onClick={() => close(r.id)} variant="secondary" size="sm">Fermer</Button>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : r.id)} className="p-1 text-neutral-400 hover:text-neutral-600">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                      {/* Teachers who responded */}
                      {(r.responses || []).map(resp => (
                        <div key={resp.id} className="flex items-start gap-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            resp.responseType === 'fully_available' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {resp.responseType === 'fully_available' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {resp.teacher ? `${resp.teacher.firstName} ${resp.teacher.lastName}` : 'Professeur'}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {resp.responseType === 'fully_available'
                                ? 'Entierement disponible'
                                : `${resp.unavailableSlots.length} indisponibilite(s)`
                              }
                            </p>
                            {resp.notes && <p className="text-xs text-neutral-400 mt-0.5">{resp.notes}</p>}
                            {resp.responseType === 'has_unavailabilities' && resp.unavailableSlots.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {resp.unavailableSlots.map((slot, i) => (
                                  <div key={i} className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                                    {format(new Date(slot.date + 'T00:00:00'), 'EEE d MMM', { locale: fr })} {slot.startTime}-{slot.endTime}
                                    {slot.reason && ` — ${slot.reason}`}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Teachers who haven't responded yet */}
                      {pendingTeachers.length > 0 && (
                        <>
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs font-medium text-neutral-400">
                              En attente de reponse ({pendingTeachers.length})
                            </p>
                            {r.status === 'open' && (
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={remindEmail}
                                    onChange={e => setRemindEmail(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <Mail size={12} className="text-neutral-400" />
                                  <span className="text-[11px] text-neutral-500">Envoyer aussi par email</span>
                                </label>
                                <button
                                  onClick={async () => {
                                    setRemindingId(r.id)
                                    await remind({
                                      request: r,
                                      teacherIds: pendingTeachers.map(t => t.id),
                                      teachers: teacherList,
                                      sendEmail: remindEmail,
                                    })
                                    setRemindingId(null)
                                  }}
                                  disabled={remindingId === r.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={12} className={remindingId === r.id ? 'animate-spin' : ''} />
                                  Relancer {pendingTeachers.length > 1 ? 'tous' : ''}
                                </button>
                              </div>
                            )}
                          </div>
                          {pendingTeachers.map(t => (
                            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 opacity-60">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-400">
                                <Clock size={16} />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                  {t.firstName} {t.lastName}
                                </p>
                                <p className="text-xs text-neutral-400">Pas encore repondu</p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {targetTeachers.length === 0 && (
                        <p className="text-sm text-neutral-400 text-center">
                          Aucun professeur rattache a cette matiere
                        </p>
                      )}

                      {/* Reminder history */}
                      {r.reminders && r.reminders.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <p className="text-xs font-medium text-neutral-400 mb-1.5">
                            Historique des relances ({r.reminders.length})
                          </p>
                          <div className="space-y-1.5">
                            {r.reminders.map((rem, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs bg-amber-50/50 dark:bg-amber-900/10 rounded-lg px-2.5 py-1.5">
                                <RefreshCw size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-neutral-600 dark:text-neutral-400">
                                    {format(new Date(rem.sentAt), "d MMM yyyy 'a' HH:mm", { locale: fr })}
                                  </span>
                                  <span className="text-neutral-400 mx-1">—</span>
                                  <span className="text-neutral-700 dark:text-neutral-300">
                                    {rem.teacherNames.join(', ')}
                                  </span>
                                  {rem.withEmail && (
                                    <span className="inline-flex items-center gap-0.5 ml-1.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                                      <Mail size={9} /> email
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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

// ==================== ADMIN REPLACEMENTS TAB ====================

function AdminReplacementsTab() {
  const { replacements, isLoading, create, selectTeacher, markNoReplacement } = useReplacementRequests()
  const { bookings } = useBookings()
  const { teacherSubjects } = useAcademicData()
  const { teachers } = useUsers()
  const [showForm, setShowForm] = useState(false)
  const [formSessionId, setFormSessionId] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const teacherList = useMemo(() =>
    teachers.filter(t => t.role === 'teacher' || (t.role as string) === 'trainer').map(t => ({
      id: t.id, firstName: t.firstName, lastName: t.lastName, email: t.email,
    })),
    [teachers]
  )

  // Sessions with a trainer (for the select)
  const sessionsWithTrainer = useMemo(() =>
    bookings.filter(b => b.userId && b.status !== 'cancelled').map(b => ({
      id: b.id,
      title: b.title,
      date: b.startTime,
      trainerId: b.userId,
      subjectId: b.subjectId || '',
      trainerName: b.user ? `${b.user.firstName} ${b.user.lastName}` : '',
    })),
    [bookings]
  )

  const handleCreate = async () => {
    if (!formSessionId) return
    const session = sessionsWithTrainer.find(s => s.id === formSessionId)
    if (!session) return
    await create({
      sessionId: session.id,
      originalTeacherId: session.trainerId,
      subjectId: session.subjectId,
      message: formMessage || undefined,
      sessionTitle: session.title,
      sessionDate: session.date,
      teacherSubjects,
      teachers: teacherList,
    })
    setShowForm(false)
    setFormSessionId('')
    setFormMessage('')
  }

  // Sessions needing reschedule
  const needsReschedule = useMemo(() =>
    bookings.filter(b => b.needsReschedule),
    [bookings]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Demandes de remplacement</h3>
        <Button onClick={() => setShowForm(!showForm)} leftIcon={Plus} size="sm">
          Nouveau remplacement
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Seance</label>
              <select value={formSessionId} onChange={e => setFormSessionId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm">
                <option value="">-- Choisir une seance --</option>
                {sessionsWithTrainer.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {format(new Date(s.date), 'd MMM HH:mm', { locale: fr })} ({s.trainerName})
                  </option>
                ))}
              </select>
            </div>
            <textarea placeholder="Message pour les professeurs (optionnel)" value={formMessage} onChange={e => setFormMessage(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none" rows={2} />
            <div className="flex gap-2">
              <Button onClick={handleCreate} size="sm">Envoyer</Button>
              <Button onClick={() => setShowForm(false)} variant="secondary" size="sm">Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : replacements.length === 0 && needsReschedule.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <UserPlus size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune demande de remplacement</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {replacements.map(rr => (
              <Card key={rr.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {rr.session?.title || 'Seance'}
                      </p>
                      {rr.session && (
                        <p className="text-sm text-neutral-500">
                          {format(new Date(rr.session.startTime), 'EEEE d MMMM HH:mm', { locale: fr })} - {format(new Date(rr.session.endTime), 'HH:mm')}
                          {rr.session.room && ` — ${rr.session.room.name}`}
                        </p>
                      )}
                      <p className="text-sm text-neutral-500 mt-0.5">
                        Prof absent : {rr.originalTeacher ? `${rr.originalTeacher.firstName} ${rr.originalTeacher.lastName}` : '—'}
                      </p>
                      {rr.message && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 italic">"{rr.message}"</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${RR_STATUS_CONFIG[rr.status].color}`}>
                      {RR_STATUS_CONFIG[rr.status].label}
                    </span>
                  </div>

                  {/* Candidates */}
                  {rr.candidates && rr.candidates.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <p className="text-xs font-medium text-neutral-500 mb-2">Candidats :</p>
                      <div className="space-y-2">
                        {rr.candidates.map(c => {
                          const cfg = RC_STATUS_CONFIG[c.status]
                          const CIcon = cfg.icon
                          return (
                            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                              <div className="flex items-center gap-2">
                                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                                  <CIcon size={12} /> {cfg.label}
                                </span>
                                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                  {c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : 'Professeur'}
                                </span>
                                {c.responseMessage && (
                                  <span className="text-xs text-neutral-400 italic">"{c.responseMessage}"</span>
                                )}
                              </div>
                              {rr.status === 'open' && c.status === 'accepted' && (
                                <Button onClick={() => selectTeacher(rr.id, c.teacherId)} size="sm" leftIcon={Check}>
                                  Selectionner
                                </Button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {rr.status === 'open' && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <Button onClick={() => markNoReplacement(rr.id)} variant="secondary" size="sm" leftIcon={AlertTriangle}>
                        Pas de remplacement possible
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Needs reschedule section */}
          {needsReschedule.length > 0 && (
            <div>
              <h4 className="text-base font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} />
                Seances a replanifier ({needsReschedule.length})
              </h4>
              <div className="space-y-2">
                {needsReschedule.map(b => (
                  <Card key={b.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{b.title}</p>
                        <p className="text-sm text-neutral-500">
                          {format(new Date(b.startTime), 'EEEE d MMMM HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">A replanifier</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ==================== TEACHER DEMANDS TAB ====================

function TeacherDemandsTab() {
  const { requests, isLoading, respond } = useAvailabilityRequests()
  const { user } = useAuthContext()
  const { teacherSubjects } = useAcademicData()

  // Get subject IDs for this teacher
  const mySubjectIds = useMemo(() =>
    teacherSubjects.filter(ts => ts.teacher_id === user?.id).map(ts => ts.subject_id),
    [teacherSubjects, user?.id]
  )

  // Filter requests for my subjects
  const myRequests = useMemo(() =>
    requests.filter(r => r.subjectId && mySubjectIds.includes(r.subjectId) && r.status !== 'closed'),
    [requests, mySubjectIds]
  )

  // Track which requests have my response
  const myResponses = useMemo(() => {
    const map = new Map<string, { responded: boolean; type?: AvailabilityResponseType }>()
    for (const r of requests) {
      const myResp = r.responses?.find(resp => resp.teacherId === user?.id)
      map.set(r.id, { responded: !!myResp, type: myResp?.responseType })
    }
    return map
  }, [requests, user?.id])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Demandes de disponibilites</h3>

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : myRequests.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <CalendarClock size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune demande en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myRequests.map(r => {
            const resp = myResponses.get(r.id)
            return (
              <TeacherDemandCard
                key={r.id}
                request={r}
                hasResponded={resp?.responded || false}
                responseType={resp?.type}
                onRespond={(type, slots, notes) => respond(r.id, { responseType: type, unavailableSlots: slots, notes })}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function TeacherDemandCard({ request, hasResponded, responseType, onRespond }: {
  request: typeof ADMIN_TABS extends any ? any : never
  hasResponded: boolean
  responseType?: AvailabilityResponseType
  onRespond: (type: AvailabilityResponseType, slots?: UnavailableSlot[], notes?: string) => void
}) {
  const [showUnavailForm, setShowUnavailForm] = useState(false)
  const [slots, setSlots] = useState<UnavailableSlot[]>([])
  const [notes, setNotes] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStart, setNewStart] = useState('08:00')
  const [newEnd, setNewEnd] = useState('12:00')
  const [newReason, setNewReason] = useState('')

  const addSlot = () => {
    if (!newDate || !newStart || !newEnd) return
    setSlots(prev => [...prev, { date: newDate, startTime: newStart, endTime: newEnd, reason: newReason || undefined }])
    setNewDate('')
    setNewReason('')
  }

  const removeSlot = (idx: number) => {
    setSlots(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {request.subject?.name || 'Matiere'} — {request.class_?.name || 'Classe'}
            </p>
            <p className="text-sm text-neutral-500">
              {format(new Date(request.periodStart + 'T00:00:00'), 'd MMM', { locale: fr })} — {format(new Date(request.periodEnd + 'T00:00:00'), 'd MMM yyyy', { locale: fr })}
            </p>
            {request.message && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 italic">"{request.message}"</p>}
          </div>
          {hasResponded && (
            <span className={`text-xs px-2 py-1 rounded-full ${responseType === 'fully_available' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              {responseType === 'fully_available' ? 'Disponible' : 'Repondu'}
            </span>
          )}
        </div>

        {!hasResponded && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Button onClick={() => onRespond('fully_available')} size="sm" leftIcon={CheckCircle}>
                Totalement disponible
              </Button>
              <Button onClick={() => setShowUnavailForm(!showUnavailForm)} variant="secondary" size="sm" leftIcon={AlertCircle}>
                Indiquer mes indisponibilites
              </Button>
            </div>

            {showUnavailForm && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg space-y-3">
                {/* Existing slots */}
                {slots.length > 0 && (
                  <div className="space-y-1">
                    {slots.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                        <span className="text-orange-700 dark:text-orange-300">
                          {format(new Date(s.date + 'T00:00:00'), 'EEE d MMM', { locale: fr })} {s.startTime}-{s.endTime}
                          {s.reason && ` — ${s.reason}`}
                        </span>
                        <button onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-600 ml-auto">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add slot form */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    min={request.periodStart} max={request.periodEnd}
                    className="px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
                  <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)}
                    className="px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
                  <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                    className="px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
                  <input type="text" placeholder="Motif" value={newReason} onChange={e => setNewReason(e.target.value)}
                    className="px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm" />
                  <Button onClick={addSlot} size="sm" leftIcon={Plus}>Ajouter</Button>
                </div>

                <textarea placeholder="Notes complementaires (optionnel)" value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none" rows={2} />
                <Button onClick={() => onRespond('has_unavailabilities', slots, notes || undefined)} size="sm">
                  Envoyer ma reponse
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== TEACHER REPLACEMENTS TAB ====================

function TeacherReplacementsTab() {
  const { isLoading, acceptCandidate, rejectCandidate, getReplacementsForTeacher } = useReplacementRequests()
  const { user } = useAuthContext()
  const [responseText, setResponseText] = useState<Record<string, string>>({})

  const myReplacements = useMemo(() =>
    user ? getReplacementsForTeacher(user.id) : [],
    [user, getReplacementsForTeacher]
  )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Demandes de remplacement</h3>

      {isLoading ? (
        <div className="py-12 text-center text-neutral-500">Chargement...</div>
      ) : myReplacements.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          <UserPlus size={40} className="mx-auto mb-3 text-neutral-300" />
          <p>Aucune demande de remplacement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myReplacements.map(rr => {
            const myCandidate = rr.candidates?.find(c => c.teacherId === user?.id)
            if (!myCandidate) return null
            const cfg = RC_STATUS_CONFIG[myCandidate.status]
            const CIcon = cfg.icon

            return (
              <Card key={rr.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {rr.session?.title || 'Seance'}
                      </p>
                      {rr.session && (
                        <p className="text-sm text-neutral-500">
                          {format(new Date(rr.session.startTime), 'EEEE d MMMM HH:mm', { locale: fr })} - {format(new Date(rr.session.endTime), 'HH:mm')}
                          {rr.session.room && ` — ${rr.session.room.name}`}
                        </p>
                      )}
                      <p className="text-sm text-neutral-500 mt-0.5">
                        Prof absent : {rr.originalTeacher ? `${rr.originalTeacher.firstName} ${rr.originalTeacher.lastName}` : '—'}
                      </p>
                      {rr.message && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 italic">"{rr.message}"</p>}
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.color}`}>
                      <CIcon size={12} /> {cfg.label}
                    </span>
                  </div>

                  {myCandidate.status === 'pending' && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        placeholder="Message (optionnel)"
                        value={responseText[myCandidate.id] || ''}
                        onChange={e => setResponseText(prev => ({ ...prev, [myCandidate.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => acceptCandidate(myCandidate.id, responseText[myCandidate.id])} size="sm" leftIcon={Check}>
                          Accepter
                        </Button>
                        <Button onClick={() => rejectCandidate(myCandidate.id, responseText[myCandidate.id])} variant="secondary" size="sm" leftIcon={X}>
                          Refuser
                        </Button>
                      </div>
                    </div>
                  )}

                  {myCandidate.status === 'selected' && (
                    <div className="mt-3 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm text-primary-700 dark:text-primary-300 flex items-center gap-2">
                      <Award size={16} /> Vous avez ete selectionne(e) pour ce remplacement
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

// ==================== TEACHER ASSIGNMENTS TAB (kept from V1) ====================

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

// ==================== ADMIN ASSIGNMENTS TAB (kept from V1) ====================

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

// ==================== ADMIN UNAVAILABILITIES TAB (kept from V1) ====================

function AdminUnavailabilitiesTab() {
  const { unavailabilities, isLoading, getAll, approve, reject } = useTeacherUnavailability()

  useEffect(() => { getAll() }, [getAll])

  const pending = useMemo(() => unavailabilities.filter(u => u.status === 'pending'), [unavailabilities])
  const others = useMemo(() => unavailabilities.filter(u => u.status !== 'pending'), [unavailabilities])

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" />
            A traiter ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map(u => (
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

      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Historique</h3>
        {isLoading ? (
          <div className="py-8 text-center text-neutral-500">Chargement...</div>
        ) : others.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">
            <CalendarX size={40} className="mx-auto mb-3 text-neutral-300" />
            <p>Aucune indisponibilite</p>
          </div>
        ) : (
          <div className="space-y-2">
            {others.map(u => (
              <Card key={u.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                      {u.teacher ? `${u.teacher.firstName} ${u.teacher.lastName}` : 'Professeur'}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {format(new Date(u.startDate + 'T00:00:00'), 'd MMM', { locale: fr })} - {format(new Date(u.endDate + 'T00:00:00'), 'd MMM yyyy', { locale: fr })}
                      {' — '}{REASON_LABELS[u.reason]}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${UNAVAIL_STATUS_CONFIG[u.status].color}`}>
                    {UNAVAIL_STATUS_CONFIG[u.status].label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== MESSAGES TAB (shared, kept from V1) ====================

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
    await send({ recipientId, subject: newSubject || undefined, content: newMessage.trim() })
    setNewMessage('')
    setNewSubject('')
    setShowCompose(false)
  }

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
        <Button onClick={() => setShowCompose(!showCompose)} leftIcon={Plus} size="sm">Nouveau</Button>
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

// ==================== MAIN PAGE ====================

export default function TeacherCollabPage() {
  const { user } = useAuthContext()
  const isTeacher = isTeacherRole(user?.role)
  const [adminTab, setAdminTab] = useState<AdminTab>('demands')
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('demands')

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
              ? 'Repondez aux demandes de disponibilites et de remplacement.'
              : 'Gerez les demandes de planning, remplacements et communiquez avec les professeurs.'
            }
          </p>
        </div>

        <HelpBanner storageKey={isTeacher ? 'teacher-collab' : 'admin-collab'}>
          {isTeacher
            ? <>Répondez aux demandes de disponibilité de l'administration, proposez-vous comme remplaçant et suivez vos affectations. Utilisez la messagerie pour communiquer avec l'équipe pédagogique.
              <span className="flex gap-2 mt-2">
                <button onClick={() => navigateTo('/chat')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Messages →</button>
                <button onClick={() => navigateTo('/planning')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Mon planning →</button>
              </span></>
            : <>Coordonnez les plannings de vos professeurs : envoyez des demandes de disponibilité, gérez les remplacements et affectations. Les professeurs reçoivent une notification et peuvent répondre depuis leur espace.
              <span className="flex gap-2 mt-2">
                <button onClick={() => navigateTo('/chat')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Messages →</button>
                <button onClick={() => navigateTo('/settings')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Paramètres →</button>
              </span></>}
        </HelpBanner>

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
            {teacherTab === 'demands' && <TeacherDemandsTab />}
            {teacherTab === 'replacements' && <TeacherReplacementsTab />}
            {teacherTab === 'assignments' && <TeacherAssignmentsTab />}
            {teacherTab === 'messages' && <MessagesTab />}
          </>
        ) : (
          <>
            {adminTab === 'demands' && <AdminDemandsTab />}
            {adminTab === 'replacements' && <AdminReplacementsTab />}
            {adminTab === 'assignments' && <AdminAssignmentsTab />}
            {adminTab === 'messages' && <MessagesTab />}
            {adminTab === 'unavailabilities' && <AdminUnavailabilitiesTab />}
          </>
        )}
      </div>
    </FeatureGate>
  )
}
