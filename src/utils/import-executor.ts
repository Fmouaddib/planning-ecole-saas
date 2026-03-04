/**
 * Execute validated imports
 */
import { supabase, isDemoMode } from '@/lib/supabase'
import type { ImportType, ValidatedRow } from './import-validators'
import toast from 'react-hot-toast'

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { rowIndex: number; message: string }[]
}

export async function executeImport(
  type: ImportType,
  rows: ValidatedRow[],
  context: {
    centerId: string
    userId: string
    classMap?: Map<string, string>
    programMap?: Map<string, string>
    diplomaMap?: Map<string, string>
  }
): Promise<ImportResult> {
  if (isDemoMode) {
    toast.error('Import impossible en mode démo')
    return { total: rows.length, success: 0, failed: rows.length, errors: [{ rowIndex: 0, message: 'Mode démo' }] }
  }

  const validRows = rows.filter(r => r.status !== 'error')
  const result: ImportResult = { total: validRows.length, success: 0, failed: 0, errors: [] }

  for (const row of validRows) {
    try {
      switch (type) {
        case 'students':
          await importStudent(row, context)
          break
        case 'teachers':
          await importTeacher(row, context)
          break
        case 'subjects':
          await importSubject(row, context)
          break
        case 'classes':
          await importClass(row, context)
          break
      }
      result.success++
    } catch (err) {
      result.failed++
      result.errors.push({
        rowIndex: row.rowIndex,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  return result
}

async function importStudent(row: ValidatedRow, context: { centerId: string; classMap?: Map<string, string> }) {
  const { data } = row
  // Create profile directly (simplified — in production would use RPC for auth.users)
  const { error } = await supabase.from('profiles').insert({
    email: data.email,
    full_name: `${data.first_name} ${data.last_name}`,
    role: 'student',
    center_id: context.centerId,
    is_active: true,
  })
  if (error) throw new Error(`Erreur profil: ${error.message}`)
}

async function importTeacher(row: ValidatedRow, context: { centerId: string }) {
  const { data } = row
  const { error } = await supabase.from('profiles').insert({
    email: data.email,
    full_name: `${data.first_name} ${data.last_name}`,
    role: 'teacher',
    center_id: context.centerId,
    is_active: true,
  })
  if (error) throw new Error(`Erreur profil: ${error.message}`)
}

async function importSubject(row: ValidatedRow, context: { centerId: string; programMap?: Map<string, string> }) {
  const { data } = row
  const programId = data.program && context.programMap ? context.programMap.get(data.program) : undefined
  const { error } = await supabase.from('subjects').insert({
    name: data.name,
    code: data.code || null,
    description: data.description || null,
    category: data.category || null,
    program_id: programId || null,
    center_id: context.centerId,
  })
  if (error) throw new Error(`Erreur matière: ${error.message}`)
}

async function importClass(row: ValidatedRow, context: { centerId: string; diplomaMap?: Map<string, string> }) {
  const { data } = row
  const diplomaId = data.diploma && context.diplomaMap ? context.diplomaMap.get(data.diploma) : undefined
  if (!diplomaId) throw new Error(`Diplôme "${data.diploma}" non trouvé`)
  const { error } = await supabase.from('classes').insert({
    name: data.name,
    diploma_id: diplomaId,
    academic_year: data.academic_year || null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    center_id: context.centerId,
  })
  if (error) throw new Error(`Erreur classe: ${error.message}`)
}
