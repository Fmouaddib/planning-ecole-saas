import { useState, useMemo, useCallback } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState, MultiSelect } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, UserCheck, Send, Linkedin, Mail, Phone, ExternalLink, UserPlus, Settings2, Save, ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react'
import { exportTeachers } from '@/utils/export-academic'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useCenterSettings } from '@/hooks/useCenterSettings'
import type { Subject, User } from '@/types'
import toast from 'react-hot-toast'

interface TeacherForm {
  firstName: string
  lastName: string
  email: string
  hasAccess: boolean
  subjectIds: string[]
}

const emptyTeacherForm: TeacherForm = { firstName: '', lastName: '', email: '', hasAccess: true, subjectIds: [] }

const DEFAULT_INVITE_SUBJECT = 'Invitation à rejoindre {{center_name}}'
const DEFAULT_INVITE_BODY = `Bonjour {{teacher_name}},

Vous avez été ajouté(e) en tant que professeur sur la plateforme de {{center_name}}.

Un compte a été créé pour vous avec l'adresse email : {{teacher_email}}

Pour accéder à votre espace, rendez-vous sur le lien ci-dessous et créez votre mot de passe :
{{app_url}}

Vous pourrez y consulter votre planning, vos affectations et communiquer avec l'équipe pédagogique.

Cordialement,
{{sender_name}}
{{center_name}}`

export function TeachersTab({
  teachers,
  subjects,
  subjectOptions,
  getSubjectIdsForTeacher,
  createTeacher,
  checkTeacherEmail,
  linkExistingTeacher,
  updateTeacher,
  deleteTeacher,
  setTeacherSubjectLinks,
  isLinkedTeacher: isLinkedTeacherFn,
  getLinkedTeacherActive,
  toggleLinkedTeacherAccess,
}: {
  teachers: User[]
  subjects: Subject[]
  subjectOptions: { value: string; label: string }[]
  getSubjectIdsForTeacher: (teacherId: string) => string[]
  createTeacher: (data: { firstName: string; lastName: string; email: string; role: 'teacher' | 'staff' }) => Promise<User>
  checkTeacherEmail: (email: string) => Promise<{ exists: boolean; alreadyInCenter?: boolean; profileId?: string; fullName?: string; email?: string; role?: string }>
  linkExistingTeacher: (profileId: string) => Promise<User>
  updateTeacher: (id: string, data: { firstName?: string; lastName?: string; email?: string; role?: 'teacher' | 'staff' }) => Promise<User>
  deleteTeacher: (id: string) => Promise<void>
  setTeacherSubjectLinks: (teacherId: string, subjectIds: string[]) => Promise<void>
  isLinkedTeacher: (teacherId: string) => boolean
  getLinkedTeacherActive: (teacherId: string) => boolean
  toggleLinkedTeacherAccess: (teacherId: string) => Promise<void>
}) {
  const { user } = useAuthContext()
  const { settings, updateSettings } = useCenterSettings()
  const [search, setSearch] = useState('')
  const [accessFilter, setAccessFilter] = useState<'' | 'active' | 'inactive'>('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState<TeacherForm>(emptyTeacherForm)
  const [submitting, setSubmitting] = useState(false)
  const [existingUser, setExistingUser] = useState<{ profileId: string; fullName: string; email: string; role: string } | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)

  // View detail state
  const [viewTarget, setViewTarget] = useState<User | null>(null)

  // Invite state
  const [inviteTarget, setInviteTarget] = useState<User | null>(null)
  const [inviteSubject, setInviteSubject] = useState('')
  const [inviteBody, setInviteBody] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [centerName, setCenterName] = useState('')
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  type SortKey = 'name' | 'email' | 'subjects' | 'access'
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { if (sortDir === 'asc') setSortDir('desc'); else { setSortKey(null); setSortDir('asc') } }
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let result = teachers
    if (search) result = filterBySearch(result, search, ['firstName', 'lastName', 'email'])
    if (accessFilter === 'active') result = result.filter(t => {
      if (isLinkedTeacherFn(t.id)) return getLinkedTeacherActive(t.id)
      return t.role === 'teacher'
    })
    if (accessFilter === 'inactive') result = result.filter(t => {
      if (isLinkedTeacherFn(t.id)) return !getLinkedTeacherActive(t.id)
      return t.role !== 'teacher'
    })
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        switch (sortKey) {
          case 'name': return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr', { sensitivity: 'base' }) * dir
          case 'email': return a.email.localeCompare(b.email, 'fr', { sensitivity: 'base' }) * dir
          case 'subjects': return (getSubjectIdsForTeacher(a.id).length - getSubjectIdsForTeacher(b.id).length) * dir
          case 'access': {
            const aActive = isLinkedTeacherFn(a.id) ? getLinkedTeacherActive(a.id) : a.role === 'teacher'
            const bActive = isLinkedTeacherFn(b.id) ? getLinkedTeacherActive(b.id) : b.role === 'teacher'
            return ((aActive ? 1 : 0) - (bActive ? 1 : 0)) * dir
          }
          default: return 0
        }
      })
    }
    return result
  }, [teachers, search, accessFilter, sortKey, sortDir, getSubjectIdsForTeacher])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptyTeacherForm); setSelected(null); setModalMode('create') }
  const openEdit = (t: User) => {
    setSelected(t)
    const linked = isLinkedTeacherFn(t.id)
    setForm({
      firstName: t.firstName, lastName: t.lastName,
      email: t.email,
      hasAccess: linked ? getLinkedTeacherActive(t.id) : t.role === 'teacher',
      subjectIds: getSubjectIdsForTeacher(t.id),
    })
    setModalMode('edit')
  }
  const openDelete = (t: User) => { setSelected(t); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null); setExistingUser(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        // Check if email already exists (autre centre)
        if (!existingUser && form.email.trim()) {
          setCheckingEmail(true)
          const check = await checkTeacherEmail(form.email.trim())
          setCheckingEmail(false)
          if (check.exists) {
            if (check.alreadyInCenter) {
              toast.error('Ce professeur est déjà dans votre centre')
              return
            }
            // Show confirmation — don't create yet
            setExistingUser({
              profileId: check.profileId!,
              fullName: check.fullName || '',
              email: check.email || form.email,
              role: check.role || 'teacher',
            })
            return
          }
        }

        const created = await createTeacher({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.hasAccess ? 'teacher' : 'staff',
        })
        if (form.subjectIds.length > 0) {
          await setTeacherSubjectLinks(created.id, form.subjectIds)
        }
      } else if (modalMode === 'edit' && selected) {
        const linked = isLinkedTeacherFn(selected.id)
        const isProtected = isProtectedTeacher(selected)

        if (linked) {
          // Toggle accès via center_teachers.is_active si changé
          const currentActive = getLinkedTeacherActive(selected.id)
          if (form.hasAccess !== currentActive) {
            await toggleLinkedTeacherAccess(selected.id)
          }
        } else if (!isProtected) {
          // Profil local modifiable : on peut tout modifier
          await updateTeacher(selected.id, {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            role: form.hasAccess ? 'teacher' : 'staff',
          })
        }
        // Matières : toujours modifiable (lien local)
        await setTeacherSubjectLinks(selected.id, form.subjectIds)
      }
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleConfirmLink = async () => {
    if (!existingUser) return
    setSubmitting(true)
    try {
      const linked = await linkExistingTeacher(existingUser.profileId)
      if (form.subjectIds.length > 0) {
        await setTeacherSubjectLinks(linked.id, form.subjectIds)
      }
      setExistingUser(null)
      closeModal()
    } catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try { await deleteTeacher(selected.id); closeModal() }
    catch { /* toast in hook */ } finally { setSubmitting(false) }
  }

  const getTeacherSubjectNames = (teacherId: string) => {
    const ids = getSubjectIdsForTeacher(teacherId)
    return subjects.filter(s => ids.includes(s.id)).map(s => s.name)
  }

  // Un professeur est "protégé" (profil non modifiable) s'il vient d'un autre centre OU si son rôle n'est pas teacher/staff
  const isProtectedTeacher = useCallback((t: User) => {
    const isLinked = isLinkedTeacherFn(t.id)
    const isPrivilegedRole = !!t.role && !['teacher', 'staff'].includes(t.role)
    return isLinked || isPrivilegedRole
  }, [isLinkedTeacherFn])

  const toggleAccess = async (t: User) => {
    // Pour les professeurs liés (center_teachers) : toggle is_active
    if (isLinkedTeacherFn(t.id)) {
      try {
        await toggleLinkedTeacherAccess(t.id)
      } catch { /* toast in hook */ }
      return
    }
    // Pour les profils privilégiés locaux (super_admin local) : pas de toggle
    if (t.role && !['teacher', 'staff'].includes(t.role)) {
      toast.error('Impossible de modifier le rôle de ce compte')
      return
    }
    // Pour les profils locaux teacher/staff : toggle role
    try {
      await updateTeacher(t.id, {
        role: t.role === 'teacher' ? 'staff' : 'teacher',
      })
    } catch { /* toast in hook */ }
  }

  // -- Invitation --
  const getResolvedCenterName = useCallback(async () => {
    if (centerName) return centerName
    if (!user?.establishmentId) return 'Notre centre'
    const { data } = await supabase
      .from('training_centers')
      .select('name')
      .eq('id', user.establishmentId)
      .single()
    const cName = data?.name || 'Notre centre'
    setCenterName(cName)
    return cName
  }, [centerName, user?.establishmentId])

  const replacePlaceholders = useCallback((text: string, teacherName: string, teacherEmail: string, cName: string) => {
    const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'L\'administration'
    return text
      .replace(/\{\{teacher_name\}\}/g, teacherName)
      .replace(/\{\{teacher_email\}\}/g, teacherEmail)
      .replace(/\{\{center_name\}\}/g, cName)
      .replace(/\{\{sender_name\}\}/g, senderName)
      .replace(/\{\{app_url\}\}/g, window.location.origin)
  }, [user])

  const openInvite = useCallback(async (t: User) => {
    const cName = await getResolvedCenterName()
    const teacherName = `${t.firstName} ${t.lastName}`.trim()

    // Use custom template from settings if available, else default
    const subjectTpl = settings.invite_teacher_subject || DEFAULT_INVITE_SUBJECT
    const bodyTpl = settings.invite_teacher_body || DEFAULT_INVITE_BODY

    setInviteSubject(replacePlaceholders(subjectTpl, teacherName, t.email, cName))
    setInviteBody(replacePlaceholders(bodyTpl, teacherName, t.email, cName))
    setEditingTemplate(false)
    setInviteTarget(t)
  }, [settings, getResolvedCenterName, replacePlaceholders])

  const sendInvite = async () => {
    if (!inviteTarget) return
    setInviteSending(true)
    try {
      // Convert body text to simple HTML
      const htmlContent = `<div style="font-family:sans-serif;font-size:14px;color:#333;line-height:1.6">${inviteBody.replace(/\n/g, '<br>')}</div>`

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [{ email: inviteTarget.email, name: `${inviteTarget.firstName} ${inviteTarget.lastName}` }],
          subject: inviteSubject,
          htmlContent,
          tags: ['teacher_invitation'],
        },
      })

      if (error) throw error

      // Log
      await supabase.from('email_logs').insert({
        center_id: user?.establishmentId || null,
        participant_email: inviteTarget.email,
        email_type: 'teacher_invitation',
        status: 'sent',
        rendered_subject: inviteSubject,
        rendered_html: htmlContent,
      })

      toast.success(`Invitation envoyée à ${inviteTarget.firstName} ${inviteTarget.lastName}`)
      setInviteTarget(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi'
      toast.error(msg)
    } finally {
      setInviteSending(false)
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Rechercher par nom ou email..." leftIcon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'active', label: 'Acces actif' },
              { value: 'inactive', label: 'Acces desactive' },
            ]}
            value={accessFilter}
            onChange={e => setAccessFilter(e.target.value as '' | 'active' | 'inactive')}
          />
        </div>
        {teachers.length > 0 && (
          <Button variant="secondary" leftIcon={Download} onClick={() => exportTeachers(teachers, subjects, getSubjectIdsForTeacher)}>
            Exporter
          </Button>
        )}
        <Button leftIcon={Plus} onClick={openCreate}>Ajouter un professeur</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Aucun professeur"
          description={search || accessFilter ? 'Aucun professeur ne correspond a vos criteres.' : 'Commencez par ajouter votre premier professeur.'}
          action={!search && !accessFilter ? { label: 'Ajouter un professeur', onClick: openCreate, icon: Plus } : undefined}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    {([
                      { key: 'name' as SortKey, label: 'Nom', className: '' },
                      { key: 'email' as SortKey, label: 'Email', className: '' },
                      { key: 'subjects' as SortKey, label: 'Matières', className: 'hidden lg:table-cell' },
                      { key: 'access' as SortKey, label: 'Accès professeur', className: 'hidden md:table-cell' },
                    ]).map(col => (
                      <th key={col.key} className={`${col.className} text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors`} onClick={() => toggleSort(col.key)}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (sortDir === 'asc' ? <ArrowUp size={12} className="text-primary-500" /> : <ArrowDown size={12} className="text-primary-500" />) : <ArrowUpDown size={12} className="opacity-30" />}
                        </span>
                      </th>
                    ))}
                    <th className="text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {paginatedData.map(t => {
                    const subjectNames = getTeacherSubjectNames(t.id)
                    return (
                    <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setViewTarget(t)} className="font-medium text-neutral-900 dark:text-neutral-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left">
                            {t.firstName} {t.lastName}
                          </button>
                          {t.linkedin && (
                            <a href={t.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="text-blue-500 hover:text-blue-700 shrink-0">
                              <Linkedin size={14} />
                            </a>
                          )}
                        </div>
                        {t.phone && <span className="block text-xs text-neutral-400 mt-0.5">{t.phone}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{t.email}</td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        {subjectNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subjectNames.slice(0, 3).map(name => (
                              <Badge key={name} variant="neutral" size="sm">{name}</Badge>
                            ))}
                            {subjectNames.length > 3 && (
                              <Badge variant="neutral" size="sm">+{subjectNames.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        {isLinkedTeacherFn(t.id) ? (
                          <button
                            onClick={() => toggleAccess(t)}
                            className="focus:outline-none"
                            title={getLinkedTeacherActive(t.id) ? 'Désactiver l\'accès professeur' : 'Activer l\'accès professeur'}
                          >
                            <div className="flex items-center gap-1.5">
                              {getLinkedTeacherActive(t.id) ? (
                                <Badge variant="success" size="sm">Actif</Badge>
                              ) : (
                                <Badge variant="neutral" size="sm">Désactivé</Badge>
                              )}
                              {t.role && !['teacher', 'staff'].includes(t.role) && (
                                <Badge variant="info" size="sm">
                                  {t.role === 'super_admin' ? 'SA' : t.role === 'admin' ? 'Admin' : t.role}
                                </Badge>
                              )}
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleAccess(t)}
                            className="focus:outline-none"
                            title={t.role === 'teacher' ? 'Désactiver l\'accès professeur' : 'Activer l\'accès professeur'}
                          >
                            {t.role === 'teacher' ? (
                              <Badge variant="success" size="sm">Actif</Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">Désactivé</Badge>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openInvite(t)} title="Envoyer une invitation">
                            <Send size={14} className="text-primary-500" />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Modifier" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" aria-label="Supprimer" onClick={() => openDelete(t)}><Trash2 size={14} className="text-error-600" /></Button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">Page {page} sur {totalPages} ({totalItems} resultat{totalItems > 1 ? 's' : ''})</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!canPrev} onClick={prevPage}>Precedent</Button>
                <Button variant="secondary" size="sm" disabled={!canNext} onClick={nextPage}>Suivant</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalMode === 'create' || modalMode === 'edit'} onClose={closeModal}
        title={modalMode === 'create' ? 'Ajouter un professeur' : 'Modifier le professeur'} size="md">

        {/* Confirmation step: existing user found */}
        {existingUser ? (
          <>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-950/30 rounded-lg border border-primary-200 dark:border-primary-800">
                <UserPlus size={20} className="text-primary-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary-900 dark:text-primary-200">
                    Un compte existe déjà avec cet email
                  </p>
                  <p className="text-sm text-primary-700 dark:text-primary-400 mt-1">
                    Voulez-vous ajouter cette personne comme professeur dans votre centre ?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-lg">
                  {existingUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{existingUser.fullName}</p>
                  <p className="text-sm text-neutral-500">{existingUser.email}</p>
                </div>
              </div>

              {subjectOptions.length > 0 && (
                <MultiSelect
                  label="Matières enseignées"
                  placeholder="Sélectionner les matières..."
                  options={subjectOptions}
                  value={form.subjectIds}
                  onChange={ids => setForm(f => ({ ...f, subjectIds: ids }))}
                />
              )}
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setExistingUser(null)}>Retour</Button>
              <Button leftIcon={UserPlus} onClick={handleConfirmLink} isLoading={submitting}>
                Confirmer l'ajout
              </Button>
            </ModalFooter>
          </>
        ) : (() => {
          const isProtected = modalMode === 'edit' && selected && isProtectedTeacher(selected)
          const isLinked = modalMode === 'edit' && selected && isLinkedTeacherFn(selected.id)
          const protectedReason = isProtected && selected
            ? isLinked
              ? 'Ce professeur est rattaché depuis un autre centre.'
              : `Ce professeur a un rôle privilégié (${selected.role}).`
            : ''
          return (
          <>
            <div className="space-y-4">
              {isProtected && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <UserPlus size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {protectedReason} Vous pouvez modifier ses matières enseignées{isLinked ? ' et son accès professeur' : ''} mais pas ses informations personnelles.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Prénom" placeholder="Ex: Jean" value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required
                  disabled={!!isProtected} />
                <Input label="Nom" placeholder="Ex: Dupont" value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required
                  disabled={!!isProtected} />
              </div>
              <Input label="Email" type="email" placeholder="jean.dupont@ecole.fr" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required disabled={!!isProtected} />

              {/* Toggle acces professeur */}
              {(() => {
                // Blocked only for local privileged roles (super_admin in own center, not linked)
                const toggleBlocked = isProtected && !isLinked
                return (
                <div className={`flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 ${toggleBlocked ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Accès professeur</p>
                    <p className="text-xs text-neutral-500">
                      {toggleBlocked ? 'Non modifiable pour ce profil' : isLinked ? 'Active/désactive l\'accès de ce professeur dans votre centre' : 'Permet au professeur de se connecter et consulter son planning'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!!toggleBlocked}
                    onClick={() => !toggleBlocked && setForm(f => ({ ...f, hasAccess: !f.hasAccess }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      toggleBlocked ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      form.hasAccess ? 'bg-primary-600' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      form.hasAccess ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                )
              })()}

              {subjectOptions.length > 0 && (
                <MultiSelect
                  label="Matières enseignées"
                  placeholder="Sélectionner les matières..."
                  options={subjectOptions}
                  value={form.subjectIds}
                  onChange={ids => setForm(f => ({ ...f, subjectIds: ids }))}
                />
              )}
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={closeModal}>Annuler</Button>
              <Button onClick={handleSubmit} isLoading={submitting || checkingEmail}
                disabled={!form.firstName.trim() || !form.lastName.trim() || (modalMode === 'create' && !form.email.trim())}>
                {modalMode === 'create' ? 'Créer' : 'Enregistrer'}
              </Button>
            </ModalFooter>
          </>
          )
        })()}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modalMode === 'delete'} onClose={closeModal} title="Retirer le professeur" size="sm">
        <p className="text-neutral-600">
          Etes-vous sur de vouloir retirer <strong>{selected?.firstName} {selected?.lastName}</strong> ?
          Son compte sera desactive mais ses donnees seront conservees.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete} isLoading={submitting}>Retirer</Button>
        </ModalFooter>
      </Modal>

      {/* Invite Modal */}
      <Modal isOpen={!!inviteTarget} onClose={() => setInviteTarget(null)}
        title={`Inviter ${inviteTarget?.firstName || ''} ${inviteTarget?.lastName || ''}`} size="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <Send size={18} className="text-blue-600 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">Invitation par email</p>
              <p className="text-blue-700 dark:text-blue-400">
                Un email sera envoye a <strong>{inviteTarget?.email}</strong>. Vous pouvez personnaliser le message ci-dessous avant l'envoi.
              </p>
            </div>
          </div>

          <Input
            label="Objet de l'email"
            value={inviteSubject}
            onChange={e => setInviteSubject(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Message
            </label>
            <textarea
              className="w-full min-h-[280px] px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
              value={inviteBody}
              onChange={e => setInviteBody(e.target.value)}
            />
          </div>

          {/* Template editing toggle */}
          {editingTemplate ? (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 size={14} className="text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Modifier le modèle d'invitation</span>
                </div>
                <button type="button" onClick={() => setEditingTemplate(false)} className="text-xs text-neutral-500 hover:underline">Fermer</button>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Variables disponibles : <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{'{{teacher_name}}'}</code>{' '}
                <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{'{{teacher_email}}'}</code>{' '}
                <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{'{{center_name}}'}</code>{' '}
                <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{'{{sender_name}}'}</code>{' '}
                <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{'{{app_url}}'}</code>
              </p>
              <Input
                label="Objet du modèle"
                value={templateSubject}
                onChange={e => setTemplateSubject(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Corps du modèle</label>
                <textarea
                  className="w-full min-h-[200px] px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y font-mono"
                  value={templateBody}
                  onChange={e => setTemplateBody(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" leftIcon={Save} isLoading={savingTemplate} onClick={async () => {
                  setSavingTemplate(true)
                  try {
                    await updateSettings({
                      invite_teacher_subject: templateSubject,
                      invite_teacher_body: templateBody,
                    })
                    toast.success('Modèle sauvegardé')
                    // Re-render the current invite with new template
                    if (inviteTarget) {
                      const cName = centerName || 'Notre centre'
                      const teacherName = `${inviteTarget.firstName} ${inviteTarget.lastName}`.trim()
                      setInviteSubject(replacePlaceholders(templateSubject, teacherName, inviteTarget.email, cName))
                      setInviteBody(replacePlaceholders(templateBody, teacherName, inviteTarget.email, cName))
                    }
                    setEditingTemplate(false)
                  } catch {
                    toast.error('Erreur lors de la sauvegarde')
                  } finally {
                    setSavingTemplate(false)
                  }
                }}>
                  Sauvegarder le modèle
                </Button>
                <button type="button" onClick={() => {
                  setTemplateSubject(DEFAULT_INVITE_SUBJECT)
                  setTemplateBody(DEFAULT_INVITE_BODY)
                }} className="text-xs text-neutral-500 hover:underline">
                  Réinitialiser par défaut
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setTemplateSubject(settings.invite_teacher_subject || DEFAULT_INVITE_SUBJECT)
                  setTemplateBody(settings.invite_teacher_body || DEFAULT_INVITE_BODY)
                  setEditingTemplate(true)
                }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Settings2 size={12} />
                Modifier le modèle
              </button>
              <span className="text-neutral-300 dark:text-neutral-600">|</span>
              <button
                type="button"
                onClick={() => {
                  if (!inviteTarget) return
                  const cName = centerName || 'Notre centre'
                  const teacherName = `${inviteTarget.firstName} ${inviteTarget.lastName}`.trim()
                  setInviteSubject(replacePlaceholders(DEFAULT_INVITE_SUBJECT, teacherName, inviteTarget.email, cName))
                  setInviteBody(replacePlaceholders(DEFAULT_INVITE_BODY, teacherName, inviteTarget.email, cName))
                }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Réinitialiser le message par défaut
              </button>
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setInviteTarget(null)}>Annuler</Button>
          <Button leftIcon={Send} onClick={sendInvite} isLoading={inviteSending}
            disabled={!inviteSubject.trim() || !inviteBody.trim()}>
            Envoyer l'invitation
          </Button>
        </ModalFooter>
      </Modal>

      {/* View Detail Modal */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)}
        title={`${viewTarget?.firstName || ''} ${viewTarget?.lastName || ''}`} size="md">
        {viewTarget && (() => {
          const subjectNames = getTeacherSubjectNames(viewTarget.id)
          return (
            <div className="space-y-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xl">
                  {viewTarget.firstName?.[0]}{viewTarget.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {viewTarget.firstName} {viewTarget.lastName}
                  </h3>
                  <Badge variant={viewTarget.role === 'teacher' ? 'success' : 'neutral'} size="sm">
                    {viewTarget.role === 'teacher' ? 'Accès actif' : 'Accès désactivé'}
                  </Badge>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-neutral-400 shrink-0" />
                  <a href={`mailto:${viewTarget.email}`} className="text-primary-600 dark:text-primary-400 hover:underline">{viewTarget.email}</a>
                </div>
                {viewTarget.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="text-neutral-400 shrink-0" />
                    <a href={`tel:${viewTarget.phone}`} className="text-neutral-700 dark:text-neutral-300 hover:underline">{viewTarget.phone}</a>
                  </div>
                )}
                {viewTarget.linkedin && (
                  <div className="flex items-center gap-3 text-sm">
                    <Linkedin size={16} className="text-blue-500 shrink-0" />
                    <a href={viewTarget.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      Profil LinkedIn <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {/* Subjects */}
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Matières enseignées</h4>
                {subjectNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {subjectNames.map(name => (
                      <Badge key={name} variant="info" size="sm">{name}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 italic">Aucune matière assignée</p>
                )}
              </div>
            </div>
          )
        })()}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setViewTarget(null)}>Fermer</Button>
          <Button variant="ghost" leftIcon={Send} onClick={() => { setViewTarget(null); openInvite(viewTarget!) }}>Inviter</Button>
          <Button leftIcon={Pencil} onClick={() => { setViewTarget(null); openEdit(viewTarget!) }}>Modifier</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
