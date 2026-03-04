/**
 * Hook for bulletin generation, sending, and absence reporting
 */
import { useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { useEmailNotifications } from './useEmailNotifications'
import { transformBulletin } from '@/utils/transforms'
import type { Bulletin, StudentBulletin, StudentContact } from '@/types'
import toast from 'react-hot-toast'

const DEMO_BULLETINS: Bulletin[] = [
  {
    id: 'demo-bul-1', centerId: 'demo-center', studentId: 'demo-student-1',
    classId: 'demo-class-1', generatedBy: 'demo-admin',
    periodLabel: 'Semestre 1 2025-2026', periodStart: '2025-09-01', periodEnd: '2026-01-31',
    bulletinData: {
      studentId: 'demo-student-1', studentName: 'Alice Martin',
      classId: 'demo-class-1', className: 'BTS SIO 1',
      subjects: [
        { subjectId: 's1', subjectName: 'Mathematiques', coefficient: 3, average: 14.5, evaluationCount: 4 },
        { subjectId: 's2', subjectName: 'Informatique', coefficient: 4, average: 16.0, evaluationCount: 3 },
      ],
      generalAverage: 15.36, classRank: 2,
    },
    generalAverage: 15.36, classRank: 2, sentTo: [],
    createdAt: new Date().toISOString(),
  },
]

export function useBulletins() {
  const { user } = useAuthContext()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { notifyCollaboration } = useEmailNotifications()

  const fetchBulletins = useCallback(async (opts?: { studentId?: string }) => {
    if (isDemoMode) { setBulletins(DEMO_BULLETINS); return }
    const centerId = user?.establishmentId
    if (!centerId) return
    setIsLoading(true)
    try {
      let query = supabase
        .from('bulletins')
        .select('*')
        .eq('center_id', centerId)
        .order('created_at', { ascending: false })
      if (opts?.studentId) {
        query = query.eq('student_id', opts.studentId)
      }
      const { data, error } = await query
      if (error) throw error
      setBulletins((data || []).map(transformBulletin))
    } catch (err) {
      console.error('Error fetching bulletins:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  const generateBulletin = useCallback(async (
    studentId: string,
    classId: string,
    periodLabel: string,
    periodStart: string,
    periodEnd: string,
    bulletinData: StudentBulletin,
  ): Promise<Bulletin | null> => {
    if (isDemoMode) { toast.success('Bulletin généré (mode démo)'); return null }
    const centerId = user?.establishmentId
    if (!centerId || !user?.id) return null
    setIsLoading(true)
    try {
      const { data: result, error } = await supabase
        .from('bulletins')
        .insert({
          center_id: centerId,
          student_id: studentId,
          class_id: classId,
          generated_by: user.id,
          period_label: periodLabel,
          period_start: periodStart,
          period_end: periodEnd,
          bulletin_data: bulletinData,
          general_average: bulletinData.generalAverage,
          class_rank: bulletinData.classRank ?? null,
        })
        .select('*')
        .single()
      if (error) throw error

      const bulletin = transformBulletin(result)
      setBulletins(prev => [bulletin, ...prev])

      // Notification in-app pour l'étudiant
      await supabase.from('in_app_notifications').insert({
        user_id: studentId,
        center_id: centerId,
        title: 'Bulletin disponible',
        message: `Votre bulletin "${periodLabel}" est disponible`,
        type: 'bulletin_generated',
        link: '/grades',
      })

      return bulletin
    } catch (err) {
      console.error('Error generating bulletin:', err)
      toast.error('Erreur lors de la génération du bulletin')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.establishmentId])

  const generateClassBulletins = useCallback(async (
    classId: string,
    periodLabel: string,
    periodStart: string,
    periodEnd: string,
    studentsData: { studentId: string; bulletin: StudentBulletin }[],
  ): Promise<Bulletin[]> => {
    if (isDemoMode) { toast.success(`${studentsData.length} bulletins générés (mode démo)`); return [] }
    const centerId = user?.establishmentId
    if (!centerId || !user?.id) return []
    setIsLoading(true)
    try {
      const rows = studentsData.map(s => ({
        center_id: centerId,
        student_id: s.studentId,
        class_id: classId,
        generated_by: user.id,
        period_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        bulletin_data: s.bulletin,
        general_average: s.bulletin.generalAverage,
        class_rank: s.bulletin.classRank ?? null,
      }))

      const { data: results, error } = await supabase
        .from('bulletins')
        .insert(rows)
        .select('*')
      if (error) throw error

      const newBulletins = (results || []).map(transformBulletin)
      setBulletins(prev => [...newBulletins, ...prev])

      // Notifications in-app pour chaque étudiant
      const notifs = studentsData.map(s => ({
        user_id: s.studentId,
        center_id: centerId,
        title: 'Bulletin disponible',
        message: `Votre bulletin "${periodLabel}" est disponible`,
        type: 'bulletin_generated' as const,
        link: '/grades',
      }))
      await supabase.from('in_app_notifications').insert(notifs)

      toast.success(`${newBulletins.length} bulletins générés`)
      return newBulletins
    } catch (err) {
      console.error('Error generating class bulletins:', err)
      toast.error('Erreur lors de la génération des bulletins')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.establishmentId])

  const sendBulletin = useCallback(async (
    bulletinId: string,
    recipients: { email: string; name: string; type: 'student' | 'contact' }[],
    bulletinInfo: { studentName: string; periodLabel: string; generalAverage: number | null; classRank?: number | null },
  ) => {
    if (isDemoMode) { toast.success('Bulletin envoyé (mode démo)'); return }
    const centerId = user?.establishmentId
    if (!centerId || recipients.length === 0) return
    try {
      const appUrl = window.location.origin

      for (const r of recipients) {
        await notifyCollaboration('bulletin_sent', [{ email: r.email, name: r.name }], {
          recipient_name: r.name,
          student_name: bulletinInfo.studentName,
          period_label: bulletinInfo.periodLabel,
          general_average: bulletinInfo.generalAverage != null ? bulletinInfo.generalAverage.toFixed(2) : 'N/A',
          class_rank: bulletinInfo.classRank ? `${bulletinInfo.classRank}` : '',
          app_url: appUrl,
        }, centerId)
      }

      // Update bulletin with sent info
      await supabase
        .from('bulletins')
        .update({ sent_at: new Date().toISOString(), sent_to: recipients })
        .eq('id', bulletinId)

      setBulletins(prev => prev.map(b => b.id === bulletinId ? {
        ...b, sentAt: new Date().toISOString(), sentTo: recipients,
      } : b))

      toast.success(`Bulletin envoyé à ${recipients.length} destinataire(s)`)
    } catch (err) {
      console.error('Error sending bulletin:', err)
      toast.error('Erreur lors de l\'envoi du bulletin')
    }
  }, [user?.establishmentId, notifyCollaboration])

  const sendAbsenceReport = useCallback(async (
    absentRecords: { studentId: string; studentName: string }[],
    sessionInfo: { title: string; date: string; time: string; notes?: string },
    contacts: StudentContact[],
  ) => {
    if (isDemoMode) { toast.success('Signalements envoyés (mode démo)'); return }
    const centerId = user?.establishmentId
    if (!centerId) return
    try {
      const appUrl = window.location.origin
      let sentCount = 0

      for (const absent of absentRecords) {
        const studentContacts = contacts
          .filter(c => c.studentId === absent.studentId && c.receiveAbsences)
        if (studentContacts.length === 0) continue

        const recipients = studentContacts.map(c => ({ email: c.email, name: `${c.firstName} ${c.lastName}` }))
        await notifyCollaboration('absence_report', recipients, {
          recipient_name: recipients.map(r => r.name).join(', '),
          student_name: absent.studentName,
          session_title: sessionInfo.title,
          session_date: sessionInfo.date,
          session_time: sessionInfo.time,
          notes: sessionInfo.notes || '',
          app_url: appUrl,
        }, centerId)
        sentCount += recipients.length

        // In-app notification for the student
        await supabase.from('in_app_notifications').insert({
          user_id: absent.studentId,
          center_id: centerId,
          title: 'Signalement d\'absence',
          message: `Absence signalée : ${sessionInfo.title} le ${sessionInfo.date}`,
          type: 'absence_report_sent',
          link: '/attendance',
        })
      }

      if (sentCount > 0) {
        toast.success(`${sentCount} signalement(s) envoyé(s)`)
      } else {
        toast('Aucun contact configuré pour recevoir les absences', { icon: 'ℹ️' })
      }
    } catch (err) {
      console.error('Error sending absence reports:', err)
      toast.error('Erreur lors de l\'envoi des signalements')
    }
  }, [user?.establishmentId, notifyCollaboration])

  return {
    bulletins,
    isLoading,
    fetchBulletins,
    generateBulletin,
    generateClassBulletins,
    sendBulletin,
    sendAbsenceReport,
  }
}
