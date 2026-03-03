/**
 * Hook pour envoyer des notifications email via l'Edge Function send-email + Brevo
 * Récupère les templates depuis email_templates, remplace les variables, envoie, et log dans email_logs
 */

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { EMAIL_POLICY_DEFAULTS } from '@/hooks/useCenterSettings'

type EmailType = 'session_created' | 'session_updated' | 'session_cancelled'

/** Map EmailType → clé settings */
const EMAIL_TYPE_TO_SETTING: Record<EmailType, keyof typeof EMAIL_POLICY_DEFAULTS> = {
  session_created: 'email_session_created',
  session_updated: 'email_session_updated',
  session_cancelled: 'email_session_cancelled',
}

/** Fetch la politique email du centre depuis training_centers.settings */
async function getCenterEmailPolicy(centerId: string): Promise<typeof EMAIL_POLICY_DEFAULTS> {
  try {
    const { data } = await supabase
      .from('training_centers')
      .select('settings')
      .eq('id', centerId)
      .single()

    const settings = (data?.settings || {}) as Record<string, unknown>
    return { ...EMAIL_POLICY_DEFAULTS, ...settings }
  } catch {
    return { ...EMAIL_POLICY_DEFAULTS }
  }
}

interface Recipient {
  email: string
  name?: string
  userId?: string
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  in_person: 'Présentiel',
  online: 'En ligne',
  hybrid: 'Hybride',
}

/**
 * Remplace les variables {{...}} dans un template HTML
 * Gère aussi les blocs conditionnels {{#if var}}...{{/if}}
 */
function renderTemplate(
  template: string,
  session: Booking,
  roomName?: string
): string {
  const date = format(new Date(session.startTime), 'EEEE d MMMM yyyy', { locale: fr })
  const start = format(new Date(session.startTime), 'HH:mm')
  const end = format(new Date(session.endTime), 'HH:mm')

  let html = template
    .replace(/\{\{session_title\}\}/g, session.title)
    .replace(/\{\{session_date\}\}/g, date)
    .replace(/\{\{start_time\}\}/g, start)
    .replace(/\{\{end_time\}\}/g, end)
    .replace(/\{\{session_type\}\}/g, SESSION_TYPE_LABELS[session.sessionType || 'in_person'] || 'Présentiel')
    .replace(/\{\{room_name\}\}/g, roomName || '')
    .replace(/\{\{meeting_url\}\}/g, session.meetingUrl || '')

  // Blocs conditionnels
  html = html.replace(
    /\{\{#if meeting_url\}\}([\s\S]*?)\{\{\/if\}\}/g,
    session.meetingUrl ? '$1' : ''
  )
  html = html.replace(
    /\{\{#if room_name\}\}([\s\S]*?)\{\{\/if\}\}/g,
    roomName ? '$1' : ''
  )

  return html
}

/**
 * Récupère les destinataires d'une séance :
 * - Le formateur (trainer) via son profil
 * - Les participants inscrits (session_participants)
 */
async function getSessionRecipients(session: Booking): Promise<Recipient[]> {
  const recipients: Recipient[] = []

  // 1. Formateur
  if (session.userId) {
    const { data: trainer } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', session.userId)
      .single()

    if (trainer?.email) {
      recipients.push({ email: trainer.email, name: trainer.full_name || undefined, userId: trainer.id })
    }
  }

  // 2. Participants inscrits
  const { data: participants } = await supabase
    .from('session_participants')
    .select('participant_email, participant_name, participant_id')
    .eq('session_id', session.id)

  if (participants) {
    for (const p of participants) {
      if (p.participant_email && !recipients.some(r => r.email === p.participant_email)) {
        recipients.push({ email: p.participant_email, name: p.participant_name || undefined, userId: p.participant_id || undefined })
      }
    }
  }

  // 3. Étudiants de la classe (si classe liée)
  if (session.classId) {
    const { data: students } = await supabase
      .from('class_students')
      .select('student:profiles!class_students_student_id_fkey(id, email, full_name)')
      .eq('class_id', session.classId)

    if (students) {
      for (const s of students) {
        const student = s.student as unknown as { id: string; email: string; full_name: string } | null
        if (student?.email && !recipients.some(r => r.email === student.email)) {
          recipients.push({ email: student.email, name: student.full_name || undefined, userId: student.id })
        }
      }
    }
  }

  return recipients
}

const NOTIF_TITLES: Record<EmailType, string> = {
  session_created: 'Nouvelle séance',
  session_updated: 'Séance modifiée',
  session_cancelled: 'Séance annulée',
}

function buildNotifMessage(type: EmailType, session: Booking, roomName?: string): string {
  const date = format(new Date(session.startTime), 'EEEE d MMMM', { locale: fr })
  const start = format(new Date(session.startTime), 'HH:mm')
  const end = format(new Date(session.endTime), 'HH:mm')
  const room = roomName ? ` en ${roomName}` : ''

  switch (type) {
    case 'session_created':
      return `${session.title} — ${date} de ${start} à ${end}${room}`
    case 'session_updated':
      return `${session.title} a été modifiée — ${date} de ${start} à ${end}${room}`
    case 'session_cancelled':
      return `${session.title} du ${date} (${start}-${end}) a été annulée`
  }
}

export function useEmailNotifications() {
  /**
   * Envoie une notification email pour une séance
   * Ne bloque pas le flux principal — les erreurs sont loggées silencieusement
   */
  const notifySession = useCallback(async (
    type: EmailType,
    session: Booking,
    roomName?: string
  ) => {
    try {
      // 0. Vérifier la politique email du centre
      const centerId = session.establishmentId || session.schoolId

      // Récupérer tous les destinataires (pour in-app + email)
      const allRecipients = await getSessionRecipients(session)

      // --- IN-APP NOTIFICATIONS (toujours, indépendant de la politique email) ---
      if (centerId && allRecipients.length > 0) {
        const notifRows = allRecipients
          .filter(r => r.userId)
          .map(r => ({
            user_id: r.userId!,
            center_id: centerId,
            title: NOTIF_TITLES[type],
            message: buildNotifMessage(type, session, roomName),
            type: type as string,
            link: '/planning',
            session_id: session.id,
          }))

        if (notifRows.length > 0) {
          supabase.from('in_app_notifications').insert(notifRows).then(({ error }) => {
            if (error) console.error('In-app notification insert error:', error)
          })
        }
      }

      // --- EMAIL NOTIFICATIONS (soumis à la politique) ---
      const policy = centerId ? await getCenterEmailPolicy(centerId) : null

      if (policy) {
        const settingKey = EMAIL_TYPE_TO_SETTING[type]
        if (!policy[settingKey]) {
          console.info(`[EmailPolicy] "${type}" disabled for center ${centerId} — skipping email`)
          return
        }
      }

      // 1. Récupérer le template
      const { data: template } = await supabase
        .from('email_templates')
        .select('subject, body_html')
        .eq('name', type)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!template) {
        console.warn(`Email template "${type}" not found or inactive`)
        return
      }

      // 2. Filtrer les destinataires email selon la politique
      let recipients = [...allRecipients]
      if (recipients.length === 0) {
        console.info(`No recipients for session ${session.id} — skipping email`)
        return
      }

      if (policy) {
        if (!policy.email_notify_trainers && session.userId) {
          const { data: trainer } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', session.userId)
            .single()
          if (trainer?.email) {
            recipients = recipients.filter(r => r.email !== trainer.email)
          }
        }

        if (!policy.email_notify_students) {
          if (session.userId && policy.email_notify_trainers) {
            const { data: trainer } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', session.userId)
              .single()
            recipients = trainer?.email
              ? recipients.filter(r => r.email === trainer.email)
              : []
          } else {
            recipients = []
          }
        }

        if (recipients.length === 0) {
          console.info(`[EmailPolicy] No recipients after policy filter for session ${session.id} — skipping email`)
          return
        }
      }

      // 3. Construire le contenu
      const htmlContent = renderTemplate(template.body_html, session, roomName)
      const subject = template.subject.replace(/\{\{session_title\}\}/g, session.title)

      // 4. Appeler l'Edge Function
      const { error } = await supabase.functions.invoke('send-email', {
        body: { to: recipients, subject, htmlContent, tags: [type] },
      })

      // 5. Logger dans email_logs (avec rendu HTML pour preview)
      const logs = recipients.map(r => ({
        session_id: session.id,
        participant_email: r.email,
        email_type: type,
        status: error ? 'failed' : 'sent',
        error_message: error?.message || null,
        rendered_subject: subject,
        rendered_html: htmlContent,
      }))

      await supabase.from('email_logs').insert(logs)

      if (error) {
        console.error(`Email notification "${type}" failed:`, error)
      }
    } catch (err) {
      console.error('Email notification error:', err)
    }
  }, [])

  return { notifySession }
}
