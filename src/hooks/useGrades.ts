/**
 * Hook for evaluations and grades management
 */
import { useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformEvaluation, transformGrade } from '@/utils/transforms'
import type { Evaluation, Grade, EvaluationType, StudentBulletin } from '@/types'
import toast from 'react-hot-toast'

export function useGrades() {
  const { user } = useAuthContext()
  const [isLoading, setIsLoading] = useState(false)

  // ── Evaluations ──

  const getEvaluationsForClass = useCallback(async (classId: string): Promise<Evaluation[]> => {
    if (isDemoMode) return []
    const { data, error } = await supabase
      .from('evaluations')
      .select('*, subject:subjects!subject_id(id, name), class_:classes!class_id(id, name), teacher:profiles!teacher_id(id, full_name)')
      .eq('class_id', classId)
      .order('date', { ascending: false })
    if (error) { console.error('Error fetching evaluations:', error); return [] }
    return (data || []).map(transformEvaluation)
  }, [])

  const getEvaluationsForTeacher = useCallback(async (teacherId: string): Promise<Evaluation[]> => {
    if (isDemoMode) return []
    const { data, error } = await supabase
      .from('evaluations')
      .select('*, subject:subjects!subject_id(id, name), class_:classes!class_id(id, name), teacher:profiles!teacher_id(id, full_name)')
      .eq('teacher_id', teacherId)
      .order('date', { ascending: false })
    if (error) { console.error('Error fetching teacher evaluations:', error); return [] }
    return (data || []).map(transformEvaluation)
  }, [])

  const createEvaluation = useCallback(async (data: {
    subjectId: string; classId: string; title: string; description?: string;
    evaluationType: EvaluationType; date: string; coefficient: number; maxGrade: number;
  }): Promise<Evaluation | null> => {
    if (isDemoMode) { toast.success('Évaluation créée (mode démo)'); return null }
    setIsLoading(true)
    try {
      const centerId = user?.establishmentId
      if (!centerId) throw new Error('Centre non trouvé')
      const { data: result, error } = await supabase
        .from('evaluations')
        .insert({
          center_id: centerId,
          subject_id: data.subjectId,
          class_id: data.classId,
          teacher_id: user?.id,
          title: data.title,
          description: data.description || null,
          evaluation_type: data.evaluationType,
          date: data.date,
          coefficient: data.coefficient,
          max_grade: data.maxGrade,
        })
        .select('*, subject:subjects!subject_id(id, name), class_:classes!class_id(id, name), teacher:profiles!teacher_id(id, full_name)')
        .single()
      if (error) throw error
      toast.success('Évaluation créée')
      return transformEvaluation(result)
    } catch (err) {
      console.error('Error creating evaluation:', err)
      toast.error('Erreur lors de la création')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.establishmentId])

  const updateEvaluation = useCallback(async (id: string, data: Partial<{
    title: string; description: string; evaluationType: EvaluationType;
    date: string; coefficient: number; maxGrade: number; isPublished: boolean;
  }>): Promise<Evaluation | null> => {
    if (isDemoMode) { toast.success('Évaluation modifiée (mode démo)'); return null }
    setIsLoading(true)
    try {
      const updateData: Record<string, any> = {}
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.evaluationType !== undefined) updateData.evaluation_type = data.evaluationType
      if (data.date !== undefined) updateData.date = data.date
      if (data.coefficient !== undefined) updateData.coefficient = data.coefficient
      if (data.maxGrade !== undefined) updateData.max_grade = data.maxGrade
      if (data.isPublished !== undefined) updateData.is_published = data.isPublished
      const { data: result, error } = await supabase
        .from('evaluations')
        .update(updateData)
        .eq('id', id)
        .select('*, subject:subjects!subject_id(id, name), class_:classes!class_id(id, name), teacher:profiles!teacher_id(id, full_name)')
        .single()
      if (error) throw error
      toast.success('Évaluation modifiée')
      return transformEvaluation(result)
    } catch (err) {
      console.error('Error updating evaluation:', err)
      toast.error('Erreur lors de la modification')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteEvaluation = useCallback(async (id: string) => {
    if (isDemoMode) { toast.success('Évaluation supprimée (mode démo)'); return }
    try {
      const { error } = await supabase.from('evaluations').delete().eq('id', id)
      if (error) throw error
      toast.success('Évaluation supprimée')
    } catch (err) {
      console.error('Error deleting evaluation:', err)
      toast.error('Erreur lors de la suppression')
    }
  }, [])

  const publishEvaluation = useCallback(async (id: string, published: boolean) => {
    return updateEvaluation(id, { isPublished: published })
  }, [updateEvaluation])

  // ── Grades ──

  const getGradesForEvaluation = useCallback(async (evaluationId: string): Promise<Grade[]> => {
    if (isDemoMode) return []
    const { data, error } = await supabase
      .from('grades')
      .select('*, student:profiles!student_id(id, full_name)')
      .eq('evaluation_id', evaluationId)
      .order('student(full_name)')
    if (error) { console.error('Error fetching grades:', error); return [] }
    return (data || []).map(transformGrade)
  }, [])

  const getGradesForStudent = useCallback(async (studentId: string): Promise<Grade[]> => {
    if (isDemoMode) return []
    const { data, error } = await supabase
      .from('grades')
      .select('*, evaluation:evaluations!evaluation_id(*, subject:subjects!subject_id(id, name))')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    if (error) { console.error('Error fetching student grades:', error); return [] }
    return (data || []).map(transformGrade)
  }, [])

  const saveGrades = useCallback(async (evaluationId: string, grades: { studentId: string; grade: number | null; isAbsent: boolean; comment?: string }[]) => {
    if (isDemoMode) { toast.success('Notes enregistrées (mode démo)'); return }
    setIsLoading(true)
    try {
      const centerId = user?.establishmentId
      if (!centerId) throw new Error('Centre non trouvé')
      const rows = grades.map(g => ({
        evaluation_id: evaluationId,
        student_id: g.studentId,
        center_id: centerId,
        grade: g.grade,
        is_absent: g.isAbsent,
        comment: g.comment || null,
        graded_by: user?.id,
        graded_at: new Date().toISOString(),
      }))
      const { error } = await supabase
        .from('grades')
        .upsert(rows, { onConflict: 'evaluation_id,student_id' })
      if (error) throw error
      toast.success('Notes enregistrées')
    } catch (err) {
      console.error('Error saving grades:', err)
      toast.error('Erreur lors de l\'enregistrement des notes')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, user?.establishmentId])

  // ── Computation ──

  const computeSubjectAverage = useCallback((grades: Grade[], evaluations: Evaluation[]): number | null => {
    let totalWeighted = 0
    let totalCoeff = 0
    for (const g of grades) {
      if (g.grade == null || g.isAbsent) continue
      const eval_ = evaluations.find(e => e.id === g.evaluationId)
      if (!eval_) continue
      const normalized = (g.grade / eval_.maxGrade) * 20
      totalWeighted += normalized * eval_.coefficient
      totalCoeff += eval_.coefficient
    }
    return totalCoeff > 0 ? Math.round((totalWeighted / totalCoeff) * 100) / 100 : null
  }, [])

  const computeBulletin = useCallback(async (_studentId: string, _classId: string): Promise<StudentBulletin | null> => {
    // This would be more complex in production, simplified for now
    return null
  }, [])

  return {
    isLoading,
    getEvaluationsForClass,
    getEvaluationsForTeacher,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    publishEvaluation,
    getGradesForEvaluation,
    getGradesForStudent,
    saveGrades,
    computeSubjectAverage,
    computeBulletin,
  }
}
