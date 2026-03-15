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
    subjectMap?: Map<string, string>
    roomMap?: Map<string, string>
    teacherEmailMap?: Map<string, string>
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
        case 'sessions':
          await importSession(row, context)
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
  const fullName = `${data.first_name.trim()} ${data.last_name.trim()}`

  // Use Edge Function for proper auth.users + profiles creation
  const { data: result, error: fnError } = await supabase.functions.invoke('create-user-for-center', {
    body: {
      email: data.email.trim(),
      full_name: fullName,
      role: 'student',
      center_id: context.centerId,
      password: null,
      send_invitation: true,
    },
  })

  if (fnError) {
    const errMsg = extractEdgeFunctionError(fnError)
    throw new Error(errMsg || `Erreur création étudiant: ${fullName}`)
  }
  if (!result?.success) {
    throw new Error(result?.error || `Échec création: ${fullName}`)
  }

  // Assign to class if specified
  if (data.class_name?.trim() && context.classMap) {
    const classId = context.classMap.get(data.class_name.trim().toLowerCase())
    if (classId && result.user?.id) {
      await supabase.from('profiles').update({ class_id: classId }).eq('id', result.user.id)
    }
  }
}

async function importTeacher(row: ValidatedRow, context: { centerId: string; subjectMap?: Map<string, string> }) {
  const { data } = row
  const fullName = `${data.first_name.trim()} ${data.last_name.trim()}`

  // Use Edge Function for proper auth.users + profiles creation
  const { data: result, error: fnError } = await supabase.functions.invoke('create-user-for-center', {
    body: {
      email: data.email.trim(),
      full_name: fullName,
      role: 'teacher',
      center_id: context.centerId,
      password: null,
      send_invitation: true,
    },
  })

  if (fnError) {
    const errMsg = extractEdgeFunctionError(fnError)
    throw new Error(errMsg || `Erreur création professeur: ${fullName}`)
  }
  if (!result?.success) {
    throw new Error(result?.error || `Échec création: ${fullName}`)
  }

  // Link subjects if specified
  if (data.subjects?.trim() && context.subjectMap && result.user?.id) {
    const subjectNames = data.subjects.split(',').map(s => s.trim()).filter(Boolean)
    const teacherId = result.user.id

    for (const subjectName of subjectNames) {
      const subjectId = context.subjectMap.get(subjectName.toLowerCase())
      if (subjectId) {
        // Insert teacher_subjects link (ignore duplicates)
        await supabase.from('teacher_subjects').upsert(
          { teacher_id: teacherId, subject_id: subjectId },
          { onConflict: 'teacher_id,subject_id' }
        )
      }
    }
  }
}

async function importSubject(row: ValidatedRow, context: { centerId: string; programMap?: Map<string, string> }) {
  const { data } = row
  const programId = data.program?.trim() && context.programMap
    ? context.programMap.get(data.program.trim().toLowerCase())
    : undefined

  const { error } = await supabase.from('subjects').insert({
    name: data.name.trim(),
    code: data.code?.trim() || null,
    description: data.description?.trim() || null,
    category: data.category?.trim() || null,
    program_id: programId || null,
    center_id: context.centerId,
  })
  if (error) throw new Error(`Erreur matière: ${error.message}`)
}

async function importClass(row: ValidatedRow, context: { centerId: string; diplomaMap?: Map<string, string>; programMap?: Map<string, string> }) {
  const { data } = row
  const diplomaId = data.diploma?.trim() && context.diplomaMap
    ? context.diplomaMap.get(data.diploma.trim().toLowerCase())
    : undefined

  if (!diplomaId) throw new Error(`Diplôme "${data.diploma}" non trouvé`)

  const programId = data.program?.trim() && context.programMap
    ? context.programMap.get(data.program.trim().toLowerCase())
    : undefined

  const { data: createdClass, error } = await supabase.from('classes').insert({
    name: data.name.trim(),
    diploma_id: diplomaId,
    program_id: programId || null,
    academic_year: data.academic_year?.trim() || null,
    start_date: data.start_date?.trim() || null,
    end_date: data.end_date?.trim() || null,
    center_id: context.centerId,
  }).select('id').single()
  if (error) throw new Error(`Erreur classe: ${error.message}`)

  // Auto-associate subjects from program if program is specified
  if (programId && createdClass?.id) {
    const { data: programSubjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('program_id', programId)
      .eq('center_id', context.centerId)

    if (programSubjects && programSubjects.length > 0) {
      const links = programSubjects.map(s => ({
        class_id: createdClass.id,
        subject_id: s.id,
      }))
      await supabase.from('class_subjects').insert(links)
    }
  }
}

async function importSession(row: ValidatedRow, context: {
  centerId: string
  roomMap?: Map<string, string>
  teacherEmailMap?: Map<string, string>
  classMap?: Map<string, string>
  subjectMap?: Map<string, string>
}) {
  const { data } = row

  const date = data.date.trim()
  const startTime = data.start_time.trim()
  const endTime = data.end_time.trim()

  // Build ISO datetime strings (local timezone)
  const startDateTime = `${date}T${startTime}:00`
  const endDateTime = `${date}T${endTime}:00`

  // Resolve optional references
  const roomId = data.room?.trim() && context.roomMap
    ? context.roomMap.get(data.room.trim().toLowerCase()) || null
    : null

  const trainerId = data.teacher?.trim() && context.teacherEmailMap
    ? context.teacherEmailMap.get(data.teacher.trim().toLowerCase()) || null
    : null

  const classId = data.class_name?.trim() && context.classMap
    ? context.classMap.get(data.class_name.trim().toLowerCase()) || null
    : null

  const subjectId = data.subjects?.trim() && context.subjectMap
    ? context.subjectMap.get(data.subjects.trim().toLowerCase()) || null
    : null

  // Determine session type
  const typeInput = data.type?.trim().toLowerCase()
  // Accept French aliases
  const sessionTypeMap: Record<string, string> = {
    'présentiel': 'in_person', 'presentiel': 'in_person', 'in_person': 'in_person',
    'en ligne': 'online', 'online': 'online', 'distanciel': 'online',
    'hybride': 'hybrid', 'hybrid': 'hybrid',
  }
  const sessionType = (typeInput && sessionTypeMap[typeInput]) || 'in_person'

  const { error } = await supabase.from('training_sessions').insert({
    title: data.title.trim(),
    description: data.description?.trim() || null,
    start_time: startDateTime,
    end_time: endDateTime,
    room_id: roomId,
    trainer_id: trainerId,
    class_id: classId,
    subject_id: subjectId,
    center_id: context.centerId,
    session_type: sessionType as 'in_person' | 'online' | 'hybrid',
    status: 'scheduled',
  })

  if (error) throw new Error(`Erreur séance "${data.title}": ${error.message}`)
}

function extractEdgeFunctionError(fnError: any): string {
  try {
    if (typeof fnError === 'object' && 'context' in fnError) {
      const resp = fnError.context
      if (resp && typeof resp.json === 'function') {
        // Can't await here synchronously, fallback to message
      }
    }
    if (fnError?.message) {
      try {
        const parsed = JSON.parse(fnError.message)
        return parsed?.error || fnError.message
      } catch {
        return fnError.message
      }
    }
  } catch { /* fallback */ }
  return ''
}
