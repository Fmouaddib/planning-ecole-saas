import { useState, useMemo, useCallback } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { filterBySearch } from '@/utils/helpers'
import { Button, Input, Select, Modal, ModalFooter, Badge, EmptyState, MultiSelect } from '@/components/ui'
import { Plus, Search, Pencil, Trash2, UserCheck, Send, Linkedin, Mail, Phone, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
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
  updateTeacher,
  deleteTeacher,
  setTeacherSubjectLinks,
}: {
  teachers: User[]
  subjects: Subject[]
  subjectOptions: { value: string; label: string }[]
  getSubjectIdsForTeacher: (teacherId: string) => string[]
  createTeacher: (data: { firstName: string; lastName: string; email: string; role: 'teacher' | 'staff' }) => Promise<User>
  updateTeacher: (id: string, data: { firstName?: string; lastName?: string; email?: string; role?: 'teacher' | 'staff' }) => Promise<User>
  deleteTeacher: (id: string) => Promise<void>
  setTeacherSubjectLinks: (teacherId: string, subjectIds: string[]) => Promise<void>
}) {
  const { user } = useAuthContext()
  const [search, setSearch] = useState('')
  const [accessFilter, setAccessFilter] = useState<'' | 'active' | 'inactive'>('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState<TeacherForm>(emptyTeacherForm)
  const [submitting, setSubmitting] = useState(false)

  // View detail state
  const [viewTarget, setViewTarget] = useState<User | null>(null)

  // Invite state
  const [inviteTarget, setInviteTarget] = useState<User | null>(null)
  const [inviteSubject, setInviteSubject] = useState('')
  const [inviteBody, setInviteBody] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [centerName, setCenterName] = useState('')

  const filtered = useMemo(() => {
    let result = teachers
    if (search) result = filterBySearch(result, search, ['firstName', 'lastName', 'email'])
    if (accessFilter === 'active') result = result.filter(t => t.role === 'teacher')
    if (accessFilter === 'inactive') result = result.filter(t => t.role !== 'teacher')
    return result
  }, [teachers, search, accessFilter])

  const { paginatedData, page, totalPages, totalItems, nextPage, prevPage, canNext, canPrev } = usePagination(filtered)

  const openCreate = () => { setForm(emptyTeacherForm); setSelected(null); setModalMode('create') }
  const openEdit = (t: User) => {
    setSelected(t)
    setForm({
      firstName: t.firstName, lastName: t.lastName,
      email: t.email,
      hasAccess: t.role === 'teacher',
      subjectIds: getSubjectIdsForTeacher(t.id),
    })
    setModalMode('edit')
  }
  const openDelete = (t: User) => { setSelected(t); setModalMode('delete') }
  const closeModal = () => { setModalMode(null); setSelected(null) }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (modalMode === 'create') {
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
        await updateTeacher(selected.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.hasAccess ? 'teacher' : 'staff',
        })
        await setTeacherSubjectLinks(selected.id, form.subjectIds)
      }
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

  const toggleAccess = async (t: User) => {
    try {
      await updateTeacher(t.id, {
        role: t.role === 'teacher' ? 'staff' : 'teacher',
      })
    } catch { /* toast in hook */ }
  }

  // -- Invitation --
  const openInvite = useCallback(async (t: User) => {
    // Fetch center name
    let cName = centerName
    if (!cName && user?.establishmentId) {
      const { data } = await supabase
        .from('training_centers')
        .select('name')
        .eq('id', user.establishmentId)
        .single()
      cName = data?.name || 'Notre centre'
      setCenterName(cName)
    }

    const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'L\'administration'
    const teacherName = `${t.firstName} ${t.lastName}`.trim()
    const appUrl = window.location.origin

    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{teacher_name\}\}/g, teacherName)
        .replace(/\{\{teacher_email\}\}/g, t.email)
        .replace(/\{\{center_name\}\}/g, cName)
        .replace(/\{\{sender_name\}\}/g, senderName)
        .replace(/\{\{app_url\}\}/g, appUrl)

    setInviteSubject(replacePlaceholders(DEFAULT_INVITE_SUBJECT))
    setInviteBody(replacePlaceholders(DEFAULT_INVITE_BODY))
    setInviteTarget(t)
  }, [centerName, user])

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
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="hidden lg:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Matieres</th>
                    <th className="hidden md:table-cell text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">Acces professeur</th>
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
                        <button
                          onClick={() => toggleAccess(t)}
                          className="focus:outline-none"
                          title={t.role === 'teacher' ? 'Desactiver l\'acces professeur' : 'Activer l\'acces professeur'}
                        >
                          {t.role === 'teacher' ? (
                            <Badge variant="success" size="sm">Actif</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">Desactive</Badge>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openInvite(t)} title="Envoyer une invitation">
                            <Send size={14} className="text-primary-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(t)}><Trash2 size={14} className="text-error-600" /></Button>
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Prenom" placeholder="Ex: Jean" value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            <Input label="Nom" placeholder="Ex: Dupont" value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
          </div>
          <Input label="Email" type="email" placeholder="jean.dupont@ecole.fr" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required />

          {/* Toggle acces professeur */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Acces professeur</p>
              <p className="text-xs text-neutral-500">Permet au professeur de se connecter et consulter son planning</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, hasAccess: !f.hasAccess }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                form.hasAccess ? 'bg-primary-600' : 'bg-neutral-300'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                form.hasAccess ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {subjectOptions.length > 0 && (
            <MultiSelect
              label="Matieres enseignees"
              placeholder="Selectionner les matieres..."
              options={subjectOptions}
              value={form.subjectIds}
              onChange={ids => setForm(f => ({ ...f, subjectIds: ids }))}
            />
          )}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={closeModal}>Annuler</Button>
          <Button onClick={handleSubmit} isLoading={submitting}
            disabled={!form.firstName.trim() || !form.lastName.trim() || (modalMode === 'create' && !form.email.trim())}>
            {modalMode === 'create' ? 'Creer' : 'Enregistrer'}
          </Button>
        </ModalFooter>
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

          <button
            type="button"
            onClick={() => {
              if (!inviteTarget) return
              const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'L\'administration'
              const teacherName = `${inviteTarget.firstName} ${inviteTarget.lastName}`.trim()
              const appUrl = window.location.origin
              const cName = centerName || 'Notre centre'
              const replacePlaceholders = (text: string) =>
                text
                  .replace(/\{\{teacher_name\}\}/g, teacherName)
                  .replace(/\{\{teacher_email\}\}/g, inviteTarget.email)
                  .replace(/\{\{center_name\}\}/g, cName)
                  .replace(/\{\{sender_name\}\}/g, senderName)
                  .replace(/\{\{app_url\}\}/g, appUrl)
              setInviteSubject(replacePlaceholders(DEFAULT_INVITE_SUBJECT))
              setInviteBody(replacePlaceholders(DEFAULT_INVITE_BODY))
            }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Reinitialiser le message par defaut
          </button>
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
