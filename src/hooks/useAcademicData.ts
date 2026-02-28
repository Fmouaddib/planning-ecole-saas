/**
 * Hook pour charger les données académiques (diplômes, classes, matières)
 * et fournir des helpers de cascade pour les formulaires + CRUD complet
 *
 * Schéma DB réel :
 * - diplomas: id, center_id, title, description, program_id, template_url, is_active, duration_years, created_at, updated_at
 * - classes: id, center_id, name, diploma_id, academic_year, start_date, end_date, is_active, created_at, updated_at
 * - subjects: id, center_id, name, code, description, category, is_active, created_at, updated_at
 * - class_subjects: id, class_id, subject_id, trainer_id, hours_planned
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Diploma, Class, Subject, User } from '@/types'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { transformUser } from '@/utils/transforms'
import toast from 'react-hot-toast'

interface ClassSubjectLink {
  class_id: string
  subject_id: string
}

export function useAcademicData() {
  const [diplomas, setDiplomas] = useState<Diploma[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [classSubjects, setClassSubjects] = useState<ClassSubjectLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const fetchAll = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const [diplomasRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
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
          .select('*')
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

      if (diplomasRes.error) throw diplomasRes.error
      if (classesRes.error) throw classesRes.error
      if (subjectsRes.error) throw subjectsRes.error
      if (teachersRes.error) throw teachersRes.error

      const transformedDiplomas: Diploma[] = (diplomasRes.data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description || '',
        durationYears: d.duration_years || 0,
        programId: d.program_id || undefined,
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
          .select('class_id, subject_id')
          .in('class_id', classIds)

        if (!csError && csData) {
          setClassSubjects(csData)
        }
      } else {
        setClassSubjects([])
      }
    } catch (error) {
      console.error('Erreur chargement données académiques:', error)
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
    return newDiploma
  }, [user?.establishmentId])

  const updateDiploma = useCallback(async (id: string, data: { title?: string; description?: string; durationYears?: number }) => {
    const payload: any = {}
    if (data.title !== undefined) payload.title = data.title
    if (data.description !== undefined) payload.description = data.description || null
    if (data.durationYears !== undefined) payload.duration_years = data.durationYears || 1
    const { data: row, error } = await supabase.from('diplomas').update(payload).eq('id', id).select('*').single()
    if (error) { toast.error('Erreur modification diplôme: ' + error.message); throw error }
    const updated: Diploma = {
      id: row.id, title: row.title, description: row.description || '',
      durationYears: row.duration_years || 0, isActive: row.is_active ?? true,
      centerId: row.center_id, createdAt: row.created_at,
    }
    setDiplomas(prev => prev.map(d => d.id === id ? updated : d))
    toast.success('Diplôme modifié')
    return updated
  }, [])

  const deleteDiploma = useCallback(async (id: string) => {
    const { error } = await supabase.from('diplomas').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression diplôme: ' + error.message); throw error }
    setDiplomas(prev => prev.filter(d => d.id !== id))
    toast.success('Diplôme supprimé')
  }, [])

  // ==================== CRUD Classes ====================

  const createClass = useCallback(async (data: { name: string; diplomaId: string; academicYear?: string; startDate?: string; endDate?: string }) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const { data: row, error } = await supabase
      .from('classes')
      .insert({
        name: data.name,
        diploma_id: data.diplomaId,
        academic_year: data.academicYear || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        center_id: user.establishmentId,
      })
      .select('*, diploma:diplomas(id, title)')
      .single()
    if (error) { toast.error('Erreur création classe: ' + error.message); throw error }
    const newClass: Class = {
      id: row.id, name: row.name, diplomaId: row.diploma_id,
      centerId: row.center_id, academicYear: row.academic_year || '',
      startDate: row.start_date || undefined, endDate: row.end_date || undefined,
      isActive: row.is_active ?? true, createdAt: row.created_at,
      diploma: row.diploma || undefined,
    }
    setClasses(prev => [...prev, newClass].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Classe créée')
    return newClass
  }, [user?.establishmentId])

  const updateClass = useCallback(async (id: string, data: { name?: string; diplomaId?: string; academicYear?: string; startDate?: string; endDate?: string }) => {
    const payload: any = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.diplomaId !== undefined) payload.diploma_id = data.diplomaId
    if (data.academicYear !== undefined) payload.academic_year = data.academicYear || null
    if (data.startDate !== undefined) payload.start_date = data.startDate || null
    if (data.endDate !== undefined) payload.end_date = data.endDate || null
    const { data: row, error } = await supabase.from('classes').update(payload).eq('id', id)
      .select('*, diploma:diplomas(id, title)').single()
    if (error) { toast.error('Erreur modification classe: ' + error.message); throw error }
    const updated: Class = {
      id: row.id, name: row.name, diplomaId: row.diploma_id,
      centerId: row.center_id, academicYear: row.academic_year || '',
      startDate: row.start_date || undefined, endDate: row.end_date || undefined,
      isActive: row.is_active ?? true, createdAt: row.created_at,
      diploma: row.diploma || undefined,
    }
    setClasses(prev => prev.map(c => c.id === id ? updated : c))
    toast.success('Classe modifiée')
    return updated
  }, [])

  const deleteClass = useCallback(async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression classe: ' + error.message); throw error }
    setClasses(prev => prev.filter(c => c.id !== id))
    setClassSubjects(prev => prev.filter(cs => cs.class_id !== id))
    toast.success('Classe supprimée')
  }, [])

  // ==================== CRUD Subjects ====================

  const createSubject = useCallback(async (data: { name: string; code?: string; description?: string; category?: string }) => {
    if (!user?.establishmentId) throw new Error('Pas de centre rattaché')
    const { data: row, error } = await supabase
      .from('subjects')
      .insert({
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        category: data.category || null,
        center_id: user.establishmentId,
      })
      .select('*')
      .single()
    if (error) { toast.error('Erreur création matière: ' + error.message); throw error }
    const newSubject: Subject = {
      id: row.id, name: row.name, code: row.code || '', description: row.description ?? undefined,
      category: row.category ?? undefined, isActive: row.is_active ?? true,
      centerId: row.center_id, createdAt: row.created_at,
    }
    setSubjects(prev => [...prev, newSubject].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success('Matière créée')
    return newSubject
  }, [user?.establishmentId])

  const updateSubject = useCallback(async (id: string, data: { name?: string; code?: string; description?: string; category?: string }) => {
    const payload: any = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.code !== undefined) payload.code = data.code || null
    if (data.description !== undefined) payload.description = data.description || null
    if (data.category !== undefined) payload.category = data.category || null
    const { data: row, error } = await supabase.from('subjects').update(payload).eq('id', id).select('*').single()
    if (error) { toast.error('Erreur modification matière: ' + error.message); throw error }
    const updated: Subject = {
      id: row.id, name: row.name, code: row.code || '', description: row.description ?? undefined,
      category: row.category ?? undefined, isActive: row.is_active ?? true,
      centerId: row.center_id, createdAt: row.created_at,
    }
    setSubjects(prev => prev.map(s => s.id === id ? updated : s))
    toast.success('Matière modifiée')
    return updated
  }, [])

  const deleteSubject = useCallback(async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression matière: ' + error.message); throw error }
    setSubjects(prev => prev.filter(s => s.id !== id))
    setClassSubjects(prev => prev.filter(cs => cs.subject_id !== id))
    toast.success('Matière supprimée')
  }, [])

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
      return newTeacher
    }

    // Si la fonction RPC n'existe pas, on tombe en fallback signUp
    if (rpcError && rpcError.message.includes('could not find')) {
      console.warn('RPC create_teacher_profile non disponible, fallback signUp')
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const tempClient = createSupabaseClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      )

      const tempPassword = crypto.randomUUID() + 'Aa1!'
      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
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
      return newTeacher
    }

    // Autre erreur RPC
    toast.error('Erreur création professeur: ' + (rpcError?.message || 'Erreur inconnue'))
    throw rpcError || new Error('Erreur inconnue')
  }, [user?.establishmentId])

  const updateTeacher = useCallback(async (id: string, data: { firstName?: string; lastName?: string; role?: 'teacher' | 'staff' }) => {
    const current = teachers.find(t => t.id === id)
    const fn = data.firstName ?? current?.firstName ?? ''
    const ln = data.lastName ?? current?.lastName ?? ''
    const payload: Record<string, any> = {}
    payload.full_name = `${fn} ${ln}`.trim()
    if (data.role !== undefined) payload.role = data.role

    const { data: row, error } = await supabase.from('profiles').update(payload).eq('id', id).select('*').single()
    if (error) { toast.error('Erreur modification professeur: ' + error.message); throw error }
    const updated = transformUser(row)
    setTeachers(prev => prev.map(t => t.id === id ? updated : t))
    toast.success('Professeur modifié')
    return updated
  }, [teachers])

  const deleteTeacher = useCallback(async (id: string) => {
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    if (error) { toast.error('Erreur suppression professeur: ' + error.message); throw error }
    setTeachers(prev => prev.filter(t => t.id !== id))
    toast.success('Professeur retiré')
  }, [])

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
  }, [classSubjects, linkSubjectToClass, unlinkSubjectFromClass])

  const getSubjectIdsForClass = useCallback(
    (classId: string): string[] => {
      return classSubjects.filter(cs => cs.class_id === classId).map(cs => cs.subject_id)
    },
    [classSubjects],
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

  return {
    diplomas,
    classes,
    subjects,
    teachers,
    classSubjects,
    isLoading,
    // Cascade helpers
    getClassesByDiploma,
    getSubjectsByClass,
    diplomaOptions,
    classOptionsByDiploma,
    subjectOptionsByClass,
    getDiplomaIdByClass,
    allSubjectOptions,
    allDiplomaOptions,
    allClassOptions,
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
    // Refresh
    refreshAll: fetchAll,
  }
}
