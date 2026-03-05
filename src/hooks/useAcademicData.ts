/**
 * Hook pour charger les données académiques (programmes, diplômes, classes, matières)
 * et fournir des helpers de cascade pour les formulaires + CRUD complet
 *
 * Schéma DB réel :
 * - programs: id, center_id, name, code, description, duration_hours, max_participants, color, is_active, diploma_id (FK → diplomas), created_at, updated_at
 * - diplomas: id, center_id, title, description, template_url, is_active, duration_years, created_at, updated_at
 * - classes: id, center_id, name, diploma_id, academic_year, start_date, end_date, is_active, created_at, updated_at
 * - subjects: id, center_id, name, code, description, category, is_active, program_id (FK → programs), created_at, updated_at
 * - class_subjects: id, class_id, subject_id, trainer_id, hours_planned
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Program, Diploma, Class, Subject, User } from '@/types'
import { supabase, isDemoMode, isolatedClient } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { transformUser, transformProgram } from '@/utils/transforms'
import { AuditService } from '@/services/auditService'
import toast from 'react-hot-toast'

interface ClassSubjectLink {
  class_id: string
  subject_id: string
  trainer_id?: string
  hours_planned?: number
}

interface TeacherSubjectLink {
  teacher_id: string
  subject_id: string
}

interface ClassStudentLink {
  student_id: string
  class_id: string
}

export interface StudentSubjectLink {
  id: string
  student_id: string
  subject_id: string
  class_id: string | null
  center_id: string
  enrollment_type: 'class' | 'free'
  status: 'enrolled' | 'dispensed'
  dispensation_reason?: string
}

export interface CoursEntity {
  classId: string
  subjectId: string
  name: string
  diplomaId: string
  programId?: string
  diploma?: { id: string; title: string }
  program?: { id: string; name: string }
  academicYear: string
  scheduleType: string
  attendanceDays: number[]
  code: string
  description?: string
  hoursPlanned?: number
  createdAt: string
}

export function useAcademicData() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [diplomas, setDiplomas] = useState<Diploma[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubjectLink[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectLink[]>([])
  const [classStudents, setClassStudents] = useState<ClassStudentLink[]>([])
  const [studentSubjects, setStudentSubjects] = useState<StudentSubjectLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const fetchAll = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const [programsRes, diplomasRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
        supabase
          .from('programs')
          .select('*, diploma:diplomas(id, title)')
          .eq('center_id', user.establishmentId)
          .order('name'),
        supabase
          .from('diplomas')
          .select('*')
          .eq('center_id', user.establishmentId)
          .order('title'),
        supabase
          .from('classes')
          .select('*, diploma:diplomas(id, title)')
          .eq('center_id', user.establishmentId)
          .order('name'),
        supabase
          .from('subjects')
          .select('*, program:programs(id, name)')
          .eq('center_id', user.establishmentId)
          .order('name'),
        supabase
          .from('profiles')
          .select('*')
          .eq('center_id', user.establishmentId)
          .in('role', ['teacher', 'staff'])
          .eq('is_active', true)
          .order('full_name'),
      ])

      // Afficher les erreurs RLS/query individuellement
      if (programsRes.error) toast.error('Erreur programmes: ' + programsRes.error.message)
      if (diplomasRes.error) toast.error('Erreur diplômes: ' + diplomasRes.error.message)
      if (classesRes.error) toast.error('Erreur classes: ' + classesRes.error.message)
      if (subjectsRes.error) toast.error('Erreur matières: ' + subjectsRes.error.message)
      if (teachersRes.error) toast.error('Erreur professeurs: ' + teachersRes.error.message)

      setPrograms((programsRes.data || []).map(transformProgram))

      const transformedDiplomas: Diploma[] = (diplomasRes.data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description || '',
        durationYears: d.duration_years || 0,
        isActive: d.is_active ?? true,
        centerId: d.center_id,
        createdAt: d.created_at,
      }))

      const transformedClasses: Class[] = (classesRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        diplomaId: c.diploma_id,
        centerId: c.center_id,
        academicYear: c.academic_year || '',
        startDate: c.start_date || undefined,
        endDate: c.end_date || undefined,
        scheduleType: c.schedule_type || 'initial',
        attendanceDays: c.attendance_days || [1, 2, 3, 4, 5],
        alternanceConfig: c.alternance_config || undefined,
        scheduleExceptions: c.schedule_exceptions || undefined,
        examPeriods: c.exam_periods || undefined,
        isActive: c.is_active ?? true,
        createdAt: c.created_at,
        diploma: c.diploma || undefined,
      }))

      const transformedSubjects: Subject[] = (subjectsRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code || '',
        description: s.description ?? undefined,
        category: s.category ?? undefined,
        color: s.color ?? undefined,
        programId: s.program_id || undefined,
        program: s.program || undefined,
        isActive: s.is_active ?? true,
        centerId: s.center_id,
        createdAt: s.created_at,
      }))

      setDiplomas(transformedDiplomas)
      setClasses(transformedClasses)
      setSubjects(transformedSubjects)
      setTeachers((teachersRes.data || []).map(transformUser))

      // Charger les liens class_subjects si on a des classes
      const classIds = transformedClasses.map(c => c.id)
      if (classIds.length > 0) {
        const { data: csData, error: csError } = await supabase
          .from('class_subjects')
          .select('class_id, subject_id, trainer_id, hours_planned')
          .in('class_id', classIds)

        if (!csError && csData) {
          setClassSubjects(csData)
        }
      } else {
        setClassSubjects([])
      }

      // Charger les liens teacher_subjects si on a des professeurs
      const teacherIds = (teachersRes.data || []).map((t: any) => t.id)
      if (teacherIds.length > 0) {
        const { data: tsData, error: tsError } = await supabase
          .from('teacher_subjects')
          .select('teacher_id, subject_id')
          .in('teacher_id', teacherIds)

        if (!tsError && tsData) {
          setTeacherSubjects(tsData)
        }
      } else {
        setTeacherSubjects([])
      }

      // Charger les liens class_students (pour la vue étudiant)
      if (classIds.length > 0) {
        const { data: cstuData, error: cstuError } = await supabase
          .from('class_students')
          .select('student_id, class_id')
          .in('class_id', classIds)

        if (!cstuError && cstuData) {
          setClassStudents(cstuData)
        }
      } else {
        setClassStudents([])
      }

      // Charger student_subjects
      const { data: ssData } = await supabase
        .from('student_subjects')
        .select('id, student_id, subject_id, class_id, center_id, enrollment_type, status, dispensation_reason')
        .eq('center_id', user.establishmentId)
      if (ssData) setStudentSubjects(ssData as StudentSubjectLink[])
      else setStudentSubjects([])
    } catch (error: any) {
      toast.error('Erreur chargement référentiel: ' + (error?.message || 'Erreur inconnue'))
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  useEffect(() => {
    if (user?.establishmentId) {
      fetchAll()
    } else {
      setIsLoading(false)
    }
  }, [user?.establishmentId, fetchAll])

  // ==================== CRUD Programs ====================

  const createProgram = useCallback(async (data: { name: string; code?: string; description?: string; durationHours?: number; maxParticipants?: number; color?: string; diplomaId?: string }) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const { data: row, error } = await supabase
      .from('programs')
      .insert({
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        duration_hours: data.durationHours ?? 0,
        max_participants: data.maxParticipants ?? 20,
        color: data.color || '#3B82F6',
        diploma_id: data.diplomaId || null,
        center_id: user.establishmentId,
      })
      .select('*, diploma:diplomas(id, title)')
      .single()
    if (error) { toast.error('Erreur création programme: ' + error.message); throw error }
    const newProgram = transformProgram(row)
    setPrograms(prev => [...prev, newProgram].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Programme créé')
    if (user) AuditService.logCrud('created', 'program', newProgram.id, user.id, user.establishmentId, { name: newProgram.name })
    return newProgram
  }, [user?.establishmentId])

  const updateProgram = useCallback(async (id: string, data: { name?: string; code?: string; description?: string; durationHours?: number; maxParticipants?: number; color?: string; diplomaId?: string }) => {
    const payload: any = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.code !== undefined) payload.code = data.code || null
    if (data.description !== undefined) payload.description = data.description || null
    if (data.durationHours !== undefined) payload.duration_hours = data.durationHours
    if (data.maxParticipants !== undefined) payload.max_participants = data.maxParticipants
    if (data.color !== undefined) payload.color = data.color
    if (data.diplomaId !== undefined) payload.diploma_id = data.diplomaId || null
    const { data: row, error } = await supabase.from('programs').update(payload).eq('id', id).select('*, diploma:diplomas(id, title)').single()
    if (error) { toast.error('Erreur modification programme: ' + error.message); throw error }
    const updated = transformProgram(row)
    setPrograms(prev => prev.map(p => p.id === id ? updated : p))
    toast.success('Programme modifié')
    if (user) AuditService.logCrud('updated', 'program', id, user.id, user.establishmentId, { name: updated.name })
    return updated
  }, [user])

  const deleteProgram = useCallback(async (id: string) => {
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression programme: ' + error.message); throw error }
    setPrograms(prev => prev.filter(p => p.id !== id))
    // Nettoyer program_id des matières orphelines localement
    setSubjects(prev => prev.map(s => s.programId === id ? { ...s, programId: undefined, program: undefined } : s))
    toast.success('Programme supprimé')
    if (user) AuditService.logCrud('deleted', 'program', id, user.id, user.establishmentId)
  }, [user])

  // ==================== CRUD Diplomas ====================

  const createDiploma = useCallback(async (data: { title: string; description?: string; durationYears?: number }) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const { data: row, error } = await supabase
      .from('diplomas')
      .insert({
        title: data.title,
        description: data.description || null,
        duration_years: data.durationYears || 1,
        center_id: user.establishmentId,
      })
      .select('*')
      .single()
    if (error) { toast.error('Erreur création diplôme: ' + error.message); throw error }
    const newDiploma: Diploma = {
      id: row.id, title: row.title, description: row.description || '',
      durationYears: row.duration_years || 0, isActive: row.is_active ?? true,
      centerId: row.center_id, createdAt: row.created_at,
    }
    setDiplomas(prev => [...prev, newDiploma].sort((a, b) => a.title.localeCompare(b.title)))
    toast.success('Diplôme créé')
    if (user) AuditService.logCrud('created', 'diploma', newDiploma.id, user.id, user.establishmentId, { name: newDiploma.title })
    return newDiploma
  }, [user?.establishmentId])

  const updateDiploma = useCallback(async (id: string, data: { title?: string; description?: string; durationYears?: number }) => {
    const payload: any = {}
    if (data.title !== undefined) payload.title = data.title
    if (data.description !== undefined) payload.description = data.description || null
    if (data.durationYears !== undefined) payload.duration_years = data.durationYears || 1
    const { data: row, error } = await supabase.from('diplomas').update(payload).eq('id', id)
      .select('*').single()
    if (error) { toast.error('Erreur modification diplôme: ' + error.message); throw error }
    const updated: Diploma = {
      id: row.id, title: row.title, description: row.description || '',
      durationYears: row.duration_years || 0, isActive: row.is_active ?? true,
      centerId: row.center_id, createdAt: row.created_at,
    }
    setDiplomas(prev => prev.map(d => d.id === id ? updated : d))
    toast.success('Diplôme modifié')
    if (user) AuditService.logCrud('updated', 'diploma', id, user.id, user.establishmentId, { name: updated.title })
    return updated
  }, [user])

  const deleteDiploma = useCallback(async (id: string) => {
    const { error } = await supabase.from('diplomas').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression diplôme: ' + error.message); throw error }
    setDiplomas(prev => prev.filter(d => d.id !== id))
    // Nettoyer diploma_id des programmes orphelins localement
    setPrograms(prev => prev.map(p => p.diplomaId === id ? { ...p, diplomaId: undefined, diploma: undefined } : p))
    toast.success('Diplôme supprimé')
    if (user) AuditService.logCrud('deleted', 'diploma', id, user.id, user.establishmentId)
  }, [user])

  // ==================== CRUD Classes ====================

  const createClass = useCallback(async (data: { name: string; diplomaId: string; academicYear?: string; startDate?: string; endDate?: string; scheduleType?: string; attendanceDays?: number[]; alternanceConfig?: { schoolWeeks: number; companyWeeks: number; referenceDate: string }; scheduleExceptions?: { schoolDays: string[]; companyDays: string[] }; examPeriods?: { name: string; startDate: string; endDate: string }[] }) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const { data: row, error } = await supabase
      .from('classes')
      .insert({
        name: data.name,
        diploma_id: data.diplomaId,
        academic_year: data.academicYear || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        schedule_type: data.scheduleType || 'initial',
        attendance_days: data.attendanceDays || [1, 2, 3, 4, 5],
        alternance_config: data.alternanceConfig || null,
        schedule_exceptions: data.scheduleExceptions || null,
        exam_periods: data.examPeriods || null,
        center_id: user.establishmentId,
      })
      .select('*, diploma:diplomas(id, title)')
      .single()
    if (error) { toast.error('Erreur création classe: ' + error.message); throw error }
    const newClass: Class = {
      id: row.id, name: row.name, diplomaId: row.diploma_id,
      centerId: row.center_id, academicYear: row.academic_year || '',
      startDate: row.start_date || undefined, endDate: row.end_date || undefined,
      scheduleType: row.schedule_type || 'initial',
      attendanceDays: row.attendance_days || [1, 2, 3, 4, 5],
      alternanceConfig: row.alternance_config || undefined,
      scheduleExceptions: row.schedule_exceptions || undefined,
      examPeriods: row.exam_periods || undefined,
      isActive: row.is_active ?? true, createdAt: row.created_at,
      diploma: row.diploma || undefined,
    }
    setClasses(prev => [...prev, newClass].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Classe créée')
    if (user) AuditService.logCrud('created', 'class', newClass.id, user.id, user.establishmentId, { name: newClass.name })
    return newClass
  }, [user?.establishmentId])

  const updateClass = useCallback(async (id: string, data: { name?: string; diplomaId?: string; academicYear?: string; startDate?: string; endDate?: string; scheduleType?: string; attendanceDays?: number[]; alternanceConfig?: { schoolWeeks: number; companyWeeks: number; referenceDate: string } | null; scheduleExceptions?: { schoolDays: string[]; companyDays: string[] } | null; examPeriods?: { name: string; startDate: string; endDate: string }[] | null }) => {
    const payload: any = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.diplomaId !== undefined) payload.diploma_id = data.diplomaId
    if (data.academicYear !== undefined) payload.academic_year = data.academicYear || null
    if (data.startDate !== undefined) payload.start_date = data.startDate || null
    if (data.endDate !== undefined) payload.end_date = data.endDate || null
    if (data.scheduleType !== undefined) payload.schedule_type = data.scheduleType
    if (data.attendanceDays !== undefined) payload.attendance_days = data.attendanceDays
    if (data.alternanceConfig !== undefined) payload.alternance_config = data.alternanceConfig
    if (data.scheduleExceptions !== undefined) payload.schedule_exceptions = data.scheduleExceptions
    if (data.examPeriods !== undefined) payload.exam_periods = data.examPeriods
    const { data: row, error } = await supabase.from('classes').update(payload).eq('id', id)
      .select('*, diploma:diplomas(id, title)').single()
    if (error) { toast.error('Erreur modification classe: ' + error.message); throw error }
    const updated: Class = {
      id: row.id, name: row.name, diplomaId: row.diploma_id,
      centerId: row.center_id, academicYear: row.academic_year || '',
      startDate: row.start_date || undefined, endDate: row.end_date || undefined,
      scheduleType: row.schedule_type || 'initial',
      attendanceDays: row.attendance_days || [1, 2, 3, 4, 5],
      alternanceConfig: row.alternance_config || undefined,
      scheduleExceptions: row.schedule_exceptions || undefined,
      examPeriods: row.exam_periods || undefined,
      isActive: row.is_active ?? true, createdAt: row.created_at,
      diploma: row.diploma || undefined,
    }
    setClasses(prev => prev.map(c => c.id === id ? updated : c))
    toast.success('Classe modifiée')
    if (user) AuditService.logCrud('updated', 'class', id, user.id, user.establishmentId, { name: updated.name })
    return updated
  }, [user])

  const deleteClass = useCallback(async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression classe: ' + error.message); throw error }
    setClasses(prev => prev.filter(c => c.id !== id))
    setClassSubjects(prev => prev.filter(cs => cs.class_id !== id))
    toast.success('Classe supprimée')
    if (user) AuditService.logCrud('deleted', 'class', id, user.id, user.establishmentId)
  }, [user])

  // ==================== CRUD Subjects ====================

  const createSubject = useCallback(async (data: { name: string; code?: string; description?: string; category?: string; programId?: string; color?: string }) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const { data: row, error } = await supabase
      .from('subjects')
      .insert({
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        category: data.category || null,
        color: data.color || null,
        program_id: data.programId || null,
        center_id: user.establishmentId,
      })
      .select('*, program:programs(id, name)')
      .single()
    if (error) { toast.error('Erreur création matière: ' + error.message); throw error }
    const newSubject: Subject = {
      id: row.id, name: row.name, code: row.code || '', description: row.description ?? undefined,
      category: row.category ?? undefined, color: row.color ?? undefined,
      programId: row.program_id || undefined,
      program: row.program || undefined, isActive: row.is_active ?? true,
      centerId: row.center_id, createdAt: row.created_at,
    }
    setSubjects(prev => [...prev, newSubject].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Matière créée')
    if (user) AuditService.logCrud('created', 'subject', newSubject.id, user.id, user.establishmentId, { name: newSubject.name })
    return newSubject
  }, [user?.establishmentId])

  const updateSubject = useCallback(async (id: string, data: { name?: string; code?: string; description?: string; category?: string; programId?: string; color?: string }) => {
    const payload: any = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.code !== undefined) payload.code = data.code || null
    if (data.description !== undefined) payload.description = data.description || null
    if (data.category !== undefined) payload.category = data.category || null
    if (data.color !== undefined) payload.color = data.color || null
    if (data.programId !== undefined) payload.program_id = data.programId || null
    const { data: row, error } = await supabase.from('subjects').update(payload).eq('id', id)
      .select('*, program:programs(id, name)').single()
    if (error) { toast.error('Erreur modification matière: ' + error.message); throw error }
    const updated: Subject = {
      id: row.id, name: row.name, code: row.code || '', description: row.description ?? undefined,
      category: row.category ?? undefined, color: row.color ?? undefined,
      programId: row.program_id || undefined,
      program: row.program || undefined, isActive: row.is_active ?? true,
      centerId: row.center_id, createdAt: row.created_at,
    }
    setSubjects(prev => prev.map(s => s.id === id ? updated : s))
    toast.success('Matière modifiée')
    if (user) AuditService.logCrud('updated', 'subject', id, user.id, user.establishmentId, { name: updated.name })
    return updated
  }, [user])

  const deleteSubject = useCallback(async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression matière: ' + error.message); throw error }
    setSubjects(prev => prev.filter(s => s.id !== id))
    setClassSubjects(prev => prev.filter(cs => cs.subject_id !== id))
    setTeacherSubjects(prev => prev.filter(ts => ts.subject_id !== id))
    toast.success('Matière supprimée')
    if (user) AuditService.logCrud('deleted', 'subject', id, user.id, user.establishmentId)
  }, [user])

  // ==================== CRUD Teachers ====================
  // Approche RPC : appelle create_teacher_profile() (SECURITY DEFINER)
  // → insert direct dans auth.users (bypass GoTrue rate limit + email validation)
  // → le trigger handle_new_user crée le profil, puis UPDATE avec center_id/role
  // Fallback : signUp classique si la fonction RPC n'existe pas

  const createTeacher = useCallback(async (data: { firstName: string; lastName: string; email: string; role: 'teacher' | 'staff' }) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const fullName = `${data.firstName} ${data.lastName}`.trim()

    // Essayer l'approche RPC d'abord (pas de rate limit email)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_teacher_profile', {
      p_email: data.email,
      p_full_name: fullName,
      p_role: data.role,
    })

    if (!rpcError && rpcResult) {
      // RPC a fonctionné — transformer le résultat
      const row = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult
      const newTeacher = transformUser(row)
      setTeachers(prev => [...prev, newTeacher].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      ))
      toast.success(`Professeur ajouté — connexion via "Mot de passe oublié"`)
      if (user) AuditService.logCrud('created', 'teacher', newTeacher.id, user.id, user.establishmentId, { name: fullName, email: data.email })
      return newTeacher
    }

    // Si la fonction RPC n'existe pas, on tombe en fallback signUp
    if (rpcError && rpcError.message.includes('could not find')) {
      const tempPassword = crypto.randomUUID() + 'Aa1!'
      const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
        email: data.email,
        password: tempPassword,
        options: { data: { full_name: fullName, role: data.role } },
      })
      if (signUpError) { toast.error('Erreur : ' + signUpError.message); throw signUpError }
      if (!signUpData.user) { toast.error('Échec création du compte'); throw new Error('signUp failed') }

      await new Promise(r => setTimeout(r, 500))

      const { data: row, error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, role: data.role, center_id: user.establishmentId, is_active: true })
        .eq('id', signUpData.user.id)
        .select('*')
        .single()
      if (error) { toast.error('Erreur mise à jour profil: ' + error.message); throw error }

      const newTeacher = transformUser(row)
      setTeachers(prev => [...prev, newTeacher].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      ))
      toast.success(`Professeur ajouté — connexion via "Mot de passe oublié"`)
      if (user) AuditService.logCrud('created', 'teacher', newTeacher.id, user.id, user.establishmentId, { name: fullName, email: data.email })
      return newTeacher
    }

    // Autre erreur RPC
    toast.error('Erreur création professeur: ' + (rpcError?.message || 'Erreur inconnue'))
    throw rpcError || new Error('Erreur inconnue')
  }, [user?.establishmentId])

  const updateTeacher = useCallback(async (id: string, data: { firstName?: string; lastName?: string; email?: string; role?: 'teacher' | 'staff' }) => {
    const current = teachers.find(t => t.id === id)
    const fn = data.firstName ?? current?.firstName ?? ''
    const ln = data.lastName ?? current?.lastName ?? ''
    const payload: Record<string, any> = {}
    payload.full_name = `${fn} ${ln}`.trim()
    if (data.email !== undefined) payload.email = data.email
    if (data.role !== undefined) payload.role = data.role

    const { data: row, error } = await supabase.from('profiles').update(payload).eq('id', id).select('*').single()
    if (error) { toast.error('Erreur modification professeur: ' + error.message); throw error }
    const updated = transformUser(row)
    setTeachers(prev => prev.map(t => t.id === id ? updated : t))
    toast.success('Professeur modifié')
    if (user) AuditService.logCrud('updated', 'teacher', id, user.id, user.establishmentId, { name: payload.full_name })
    return updated
  }, [teachers, user])

  const deleteTeacher = useCallback(async (id: string) => {
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    if (error) { toast.error('Erreur suppression professeur: ' + error.message); throw error }
    setTeachers(prev => prev.filter(t => t.id !== id))
    setTeacherSubjects(prev => prev.filter(ts => ts.teacher_id !== id))
    toast.success('Professeur retiré')
    if (user) AuditService.logCrud('deleted', 'teacher', id, user.id, user.establishmentId)
  }, [user])

  // ==================== Liens class_subjects ====================

  const linkSubjectToClass = useCallback(async (classId: string, subjectId: string) => {
    const { error } = await supabase.from('class_subjects').insert({ class_id: classId, subject_id: subjectId })
    if (error) { toast.error('Erreur liaison matière: ' + error.message); throw error }
    setClassSubjects(prev => [...prev, { class_id: classId, subject_id: subjectId }])
  }, [])

  const unlinkSubjectFromClass = useCallback(async (classId: string, subjectId: string) => {
    const { error } = await supabase.from('class_subjects').delete()
      .eq('class_id', classId).eq('subject_id', subjectId)
    if (error) { toast.error('Erreur suppression liaison: ' + error.message); throw error }
    setClassSubjects(prev => prev.filter(cs => !(cs.class_id === classId && cs.subject_id === subjectId)))
  }, [])

  const setClassSubjectLinks = useCallback(async (classId: string, subjectIds: string[]) => {
    const currentIds = classSubjects.filter(cs => cs.class_id === classId).map(cs => cs.subject_id)
    const toAdd = subjectIds.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !subjectIds.includes(id))

    for (const sid of toAdd) {
      await linkSubjectToClass(classId, sid)
    }
    for (const sid of toRemove) {
      await unlinkSubjectFromClass(classId, sid)
    }

    // Sync student_subjects pour les étudiants de la classe
    if (user?.establishmentId && (toAdd.length > 0 || toRemove.length > 0)) {
      const studentIds = classStudents.filter(cs => cs.class_id === classId).map(cs => cs.student_id)
      if (studentIds.length > 0) {
        // Matières ajoutées → créer student_subjects pour chaque étudiant
        if (toAdd.length > 0) {
          const rows = studentIds.flatMap(sid =>
            toAdd.map(subId => ({
              student_id: sid,
              subject_id: subId,
              class_id: classId,
              center_id: user.establishmentId,
              enrollment_type: 'class' as const,
              status: 'enrolled' as const,
            }))
          )
          const { data: inserted, error } = await supabase
            .from('student_subjects')
            .insert(rows)
            .select('id, student_id, subject_id, class_id, center_id, enrollment_type, status, dispensation_reason')
          if (!error && inserted) setStudentSubjects(prev => [...prev, ...(inserted as StudentSubjectLink[])])
        }
        // Matières retirées → supprimer student_subjects (enrollment_type='class')
        for (const subId of toRemove) {
          const { error } = await supabase
            .from('student_subjects')
            .delete()
            .eq('class_id', classId)
            .eq('subject_id', subId)
            .eq('enrollment_type', 'class')
          if (!error) {
            setStudentSubjects(prev => prev.filter(ss =>
              !(ss.class_id === classId && ss.subject_id === subId && ss.enrollment_type === 'class')
            ))
          }
        }
      }
    }
  }, [classSubjects, classStudents, user?.establishmentId, linkSubjectToClass, unlinkSubjectFromClass])

  const getSubjectIdsForClass = useCallback(
    (classId: string): string[] => {
      return classSubjects.filter(cs => cs.class_id === classId).map(cs => cs.subject_id)
    },
    [classSubjects],
  )

  // ==================== Liens teacher_subjects ====================

  const linkSubjectToTeacher = useCallback(async (teacherId: string, subjectId: string) => {
    const { error } = await supabase.from('teacher_subjects').insert({ teacher_id: teacherId, subject_id: subjectId })
    if (error) { toast.error('Erreur liaison matière: ' + error.message); throw error }
    setTeacherSubjects(prev => [...prev, { teacher_id: teacherId, subject_id: subjectId }])
  }, [])

  const unlinkSubjectFromTeacher = useCallback(async (teacherId: string, subjectId: string) => {
    const { error } = await supabase.from('teacher_subjects').delete()
      .eq('teacher_id', teacherId).eq('subject_id', subjectId)
    if (error) { toast.error('Erreur suppression liaison: ' + error.message); throw error }
    setTeacherSubjects(prev => prev.filter(ts => !(ts.teacher_id === teacherId && ts.subject_id === subjectId)))
  }, [])

  const setTeacherSubjectLinks = useCallback(async (teacherId: string, subjectIds: string[]) => {
    const currentIds = teacherSubjects.filter(ts => ts.teacher_id === teacherId).map(ts => ts.subject_id)
    const toAdd = subjectIds.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !subjectIds.includes(id))

    for (const sid of toAdd) {
      await linkSubjectToTeacher(teacherId, sid)
    }
    for (const sid of toRemove) {
      await unlinkSubjectFromTeacher(teacherId, sid)
    }
  }, [teacherSubjects, linkSubjectToTeacher, unlinkSubjectFromTeacher])

  const getSubjectIdsForTeacher = useCallback(
    (teacherId: string): string[] => {
      return teacherSubjects.filter(ts => ts.teacher_id === teacherId).map(ts => ts.subject_id)
    },
    [teacherSubjects],
  )

  // ==================== Liens class_students ====================

  // Sync student_subjects quand un étudiant change de classe
  const syncStudentSubjectsForClassChange = useCallback(async (studentId: string, oldClassId: string | null, newClassId: string | null) => {
    if (!user?.establishmentId) return

    // 1. Supprimer inscriptions class-type de l'ancienne classe
    if (oldClassId) {
      const { error: delErr } = await supabase
        .from('student_subjects')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', oldClassId)
        .eq('enrollment_type', 'class')
      if (delErr) console.error('Erreur suppression student_subjects:', delErr.message)
      setStudentSubjects(prev => prev.filter(ss =>
        !(ss.student_id === studentId && ss.class_id === oldClassId && ss.enrollment_type === 'class')
      ))
    }

    // 2. Créer inscriptions pour la nouvelle classe
    if (newClassId) {
      const newSubjectIds = classSubjects.filter(cs => cs.class_id === newClassId).map(cs => cs.subject_id)
      if (newSubjectIds.length > 0) {
        const rows = newSubjectIds.map(sid => ({
          student_id: studentId,
          subject_id: sid,
          class_id: newClassId,
          center_id: user.establishmentId,
          enrollment_type: 'class' as const,
          status: 'enrolled' as const,
        }))
        const { data: inserted, error: insErr } = await supabase
          .from('student_subjects')
          .insert(rows)
          .select('id, student_id, subject_id, class_id, center_id, enrollment_type, status, dispensation_reason')
        if (insErr) console.error('Erreur création student_subjects:', insErr.message)
        if (inserted) setStudentSubjects(prev => [...prev, ...(inserted as StudentSubjectLink[])])
      }
    }
  }, [user?.establishmentId, classSubjects])

  const setStudentClass = useCallback(async (studentId: string, classId: string | null) => {
    // Ancienne classe pour la sync student_subjects
    const oldClassId = classStudents.find(cs => cs.student_id === studentId)?.class_id ?? null

    // Supprimer les affectations existantes
    const { error: delError } = await supabase
      .from('class_students')
      .delete()
      .eq('student_id', studentId)
    if (delError) { toast.error('Erreur suppression classe: ' + delError.message); throw delError }

    // Mettre à jour le state local
    setClassStudents(prev => prev.filter(cs => cs.student_id !== studentId))

    // Insérer la nouvelle affectation si classId est fourni
    if (classId) {
      const { error: insError } = await supabase
        .from('class_students')
        .insert({ student_id: studentId, class_id: classId })
      if (insError) { toast.error('Erreur affectation classe: ' + insError.message); throw insError }
      setClassStudents(prev => [...prev, { student_id: studentId, class_id: classId }])
    }

    // Sync student_subjects (class-type uniquement, free préservés)
    await syncStudentSubjectsForClassChange(studentId, oldClassId, classId)
  }, [classStudents, syncStudentSubjectsForClassChange])

  const getClassIdForStudent = useCallback(
    (studentId: string): string | null => {
      const link = classStudents.find(cs => cs.student_id === studentId)
      return link?.class_id ?? null
    },
    [classStudents],
  )

  // ==================== CRUD student_subjects ====================

  const toggleDispensation = useCallback(async (id: string, dispensed: boolean, reason?: string) => {
    const newStatus = dispensed ? 'dispensed' : 'enrolled'
    const payload: any = { status: newStatus, updated_at: new Date().toISOString() }
    if (dispensed && reason !== undefined) payload.dispensation_reason = reason
    if (!dispensed) payload.dispensation_reason = null

    const { error } = await supabase.from('student_subjects').update(payload).eq('id', id)
    if (error) { toast.error('Erreur dispensation: ' + error.message); throw error }
    setStudentSubjects(prev => prev.map(ss => ss.id === id ? { ...ss, status: newStatus as 'enrolled' | 'dispensed', dispensation_reason: dispensed ? (reason || ss.dispensation_reason) : undefined } : ss))
  }, [])

  const addFreeSubject = useCallback(async (studentId: string, subjectId: string) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const { data: row, error } = await supabase
      .from('student_subjects')
      .insert({
        student_id: studentId,
        subject_id: subjectId,
        class_id: null,
        center_id: user.establishmentId,
        enrollment_type: 'free',
        status: 'enrolled',
      })
      .select('id, student_id, subject_id, class_id, center_id, enrollment_type, status, dispensation_reason')
      .single()
    if (error) { toast.error('Erreur ajout matière libre: ' + error.message); throw error }
    setStudentSubjects(prev => [...prev, row as StudentSubjectLink])
    return row
  }, [user?.establishmentId])

  const removeFreeSubject = useCallback(async (studentId: string, subjectId: string) => {
    const { error } = await supabase
      .from('student_subjects')
      .delete()
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('enrollment_type', 'free')
      .is('class_id', null)
    if (error) { toast.error('Erreur suppression matière libre: ' + error.message); throw error }
    setStudentSubjects(prev => prev.filter(ss =>
      !(ss.student_id === studentId && ss.subject_id === subjectId && ss.enrollment_type === 'free' && ss.class_id === null)
    ))
  }, [])

  const getStudentSubjectsForStudent = useCallback(
    (studentId: string): StudentSubjectLink[] => {
      return studentSubjects.filter(ss => ss.student_id === studentId)
    },
    [studentSubjects],
  )

  const getStudentSubjectsForClass = useCallback(
    (classId: string): StudentSubjectLink[] => {
      return studentSubjects.filter(ss => ss.class_id === classId)
    },
    [studentSubjects],
  )

  // Helpers de cascade

  const getClassesByDiploma = useCallback(
    (diplomaId: string): Class[] => {
      return classes.filter(c => c.diplomaId === diplomaId)
    },
    [classes],
  )

  const getSubjectsByClass = useCallback(
    (classId: string): Subject[] => {
      const subjectIds = classSubjects
        .filter(cs => cs.class_id === classId)
        .map(cs => cs.subject_id)
      return subjects.filter(s => subjectIds.includes(s.id))
    },
    [classSubjects, subjects],
  )

  // Options pour <Select>

  const programOptions = useMemo(
    () => programs.map(p => ({ value: p.id, label: p.name })),
    [programs],
  )

  const diplomaOptions = useMemo(
    () => diplomas.map(d => ({ value: d.id, label: d.title })),
    [diplomas],
  )

  const classOptionsByDiploma = useCallback(
    (diplomaId: string) => {
      return getClassesByDiploma(diplomaId).map(c => ({ value: c.id, label: c.name }))
    },
    [getClassesByDiploma],
  )

  const subjectOptionsByClass = useCallback(
    (classId: string) => {
      return getSubjectsByClass(classId).map(s => ({ value: s.id, label: s.name }))
    },
    [getSubjectsByClass],
  )

  const getDiplomaIdByClass = useCallback(
    (classId: string): string | undefined => {
      return classes.find(c => c.id === classId)?.diplomaId
    },
    [classes],
  )

  const getClassById = useCallback(
    (classId: string): Class | undefined => {
      return classes.find(c => c.id === classId)
    },
    [classes],
  )

  // Options "flat" pour les filtres calendrier
  const allSubjectOptions = useMemo(
    () => subjects.map(s => ({ value: s.name, label: s.name })),
    [subjects],
  )

  const allDiplomaOptions = useMemo(
    () => diplomas.map(d => ({ value: d.title, label: d.title })),
    [diplomas],
  )

  const allClassOptions = useMemo(
    () => classes.map(c => ({ value: c.name, label: c.name })),
    [classes],
  )

  const getClassIdsForStudent = useCallback(
    (studentId: string): string[] => {
      return classStudents.filter(cs => cs.student_id === studentId).map(cs => cs.class_id)
    },
    [classStudents],
  )

  const getTeachersBySubject = useCallback((subjectId: string) => {
    const teacherIds = teacherSubjects.filter(ts => ts.subject_id === subjectId).map(ts => ts.teacher_id)
    return teachers.filter(t => teacherIds.includes(t.id))
  }, [teacherSubjects, teachers])

  // Programmes d'un diplôme
  const getProgramsByDiploma = useCallback(
    (diplomaId: string) => programs.filter(p => p.diplomaId === diplomaId),
    [programs],
  )

  // Matières d'un diplôme (via ses programmes) — pour ClassesTab
  const getSubjectsByDiploma = useCallback(
    (diplomaId: string) => {
      const pIds = programs.filter(p => p.diplomaId === diplomaId).map(p => p.id)
      return subjects.filter(s => s.programId && pIds.includes(s.programId))
    },
    [programs, subjects],
  )

  // Options Select
  const programOptionsByDiploma = useCallback(
    (diplomaId: string) => getProgramsByDiploma(diplomaId).map(p => ({ value: p.id, label: p.name })),
    [getProgramsByDiploma],
  )

  const subjectOptionsByProgram = useCallback(
    (programId: string) => subjects.filter(s => s.programId === programId).map(s => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` })),
    [subjects],
  )

  const subjectOptionsByDiploma = useCallback(
    (diplomaId: string) => getSubjectsByDiploma(diplomaId).map(s => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` })),
    [getSubjectsByDiploma],
  )

  const getClassSubjectsForClass = useCallback(
    (classId: string): ClassSubjectLink[] => {
      return classSubjects.filter(cs => cs.class_id === classId)
    },
    [classSubjects],
  )

  // ==================== Cours (fusion class+subject) ====================

  const coursList = useMemo((): CoursEntity[] => {
    return classes.map(cls => {
      const links = classSubjects.filter(cs => cs.class_id === cls.id)
      if (links.length !== 1) return null
      const subject = subjects.find(s => s.id === links[0].subject_id)
      if (!subject) return null
      return {
        classId: cls.id,
        subjectId: subject.id,
        name: cls.name,
        diplomaId: cls.diplomaId,
        programId: subject.programId,
        diploma: cls.diploma,
        program: subject.program,
        academicYear: cls.academicYear,
        scheduleType: cls.scheduleType || 'initial',
        attendanceDays: cls.attendanceDays || [1, 2, 3, 4, 5],
        code: subject.code || '',
        description: subject.description,
        hoursPlanned: links[0].hours_planned,
        createdAt: cls.createdAt,
      } as CoursEntity
    }).filter(Boolean) as CoursEntity[]
  }, [classes, classSubjects, subjects])

  const createCours = useCallback(async (data: {
    name: string
    diplomaId: string
    programId?: string
    academicYear?: string
    scheduleType?: string
    attendanceDays?: number[]
    code?: string
    description?: string
  }) => {
    // 1. Create class
    const newClass = await createClass({
      name: data.name,
      diplomaId: data.diplomaId,
      academicYear: data.academicYear,
      scheduleType: data.scheduleType,
      attendanceDays: data.attendanceDays,
    })
    // 2. Create subject
    const newSubject = await createSubject({
      name: data.name,
      code: data.code,
      description: data.description,
      programId: data.programId,
    })
    // 3. Link them
    await linkSubjectToClass(newClass.id, newSubject.id)
    return { classId: newClass.id, subjectId: newSubject.id }
  }, [createClass, createSubject, linkSubjectToClass])

  const updateCours = useCallback(async (classId: string, subjectId: string, data: {
    name?: string
    diplomaId?: string
    programId?: string
    academicYear?: string
    scheduleType?: string
    attendanceDays?: number[]
    code?: string
    description?: string
  }) => {
    // Sync name on both class and subject
    const classPayload: any = {}
    const subjectPayload: any = {}
    if (data.name !== undefined) { classPayload.name = data.name; subjectPayload.name = data.name }
    if (data.diplomaId !== undefined) classPayload.diplomaId = data.diplomaId
    if (data.academicYear !== undefined) classPayload.academicYear = data.academicYear
    if (data.scheduleType !== undefined) classPayload.scheduleType = data.scheduleType
    if (data.attendanceDays !== undefined) classPayload.attendanceDays = data.attendanceDays
    if (data.programId !== undefined) subjectPayload.programId = data.programId
    if (data.code !== undefined) subjectPayload.code = data.code
    if (data.description !== undefined) subjectPayload.description = data.description

    if (Object.keys(classPayload).length > 0) await updateClass(classId, classPayload)
    if (Object.keys(subjectPayload).length > 0) await updateSubject(subjectId, subjectPayload)
  }, [updateClass, updateSubject])

  const deleteCours = useCallback(async (classId: string, subjectId: string) => {
    await unlinkSubjectFromClass(classId, subjectId)
    await deleteClass(classId)
    await deleteSubject(subjectId)
  }, [unlinkSubjectFromClass, deleteClass, deleteSubject])

  return {
    programs,
    diplomas,
    classes,
    subjects,
    teachers,
    classSubjects,
    classStudents,
    teacherSubjects,
    isLoading,
    // Cascade helpers
    getClassesByDiploma,
    getSubjectsByClass,
    getProgramsByDiploma,
    getSubjectsByDiploma,
    programOptions,
    diplomaOptions,
    classOptionsByDiploma,
    subjectOptionsByClass,
    programOptionsByDiploma,
    subjectOptionsByProgram,
    subjectOptionsByDiploma,
    getDiplomaIdByClass,
    getClassById,
    allSubjectOptions,
    allDiplomaOptions,
    allClassOptions,
    getTeachersBySubject,
    // CRUD Programs
    createProgram,
    updateProgram,
    deleteProgram,
    // CRUD Diplomas
    createDiploma,
    updateDiploma,
    deleteDiploma,
    // CRUD Classes
    createClass,
    updateClass,
    deleteClass,
    // CRUD Subjects
    createSubject,
    updateSubject,
    deleteSubject,
    // CRUD Teachers
    createTeacher,
    updateTeacher,
    deleteTeacher,
    // Class-Subject links
    linkSubjectToClass,
    unlinkSubjectFromClass,
    setClassSubjectLinks,
    getSubjectIdsForClass,
    getClassSubjectsForClass,
    // Teacher-Subject links
    setTeacherSubjectLinks,
    getSubjectIdsForTeacher,
    // Class-Student links
    getClassIdsForStudent,
    getClassIdForStudent,
    setStudentClass,
    // Student-Subject links
    studentSubjects,
    toggleDispensation,
    addFreeSubject,
    removeFreeSubject,
    getStudentSubjectsForStudent,
    getStudentSubjectsForClass,
    // Cours (fusion class+subject)
    coursList,
    createCours,
    updateCours,
    deleteCours,
    // Refresh
    refreshAll: fetchAll,
  }
}
