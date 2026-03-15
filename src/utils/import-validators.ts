/**
 * Validation schemas and header mapping for imports
 */

export type ImportType = 'students' | 'teachers' | 'subjects' | 'classes' | 'sessions'

export interface ValidatedRow {
  rowIndex: number
  data: Record<string, string>
  status: 'valid' | 'error' | 'warning'
  errors: string[]
  warnings: string[]
}

export interface ValidationResult {
  type: ImportType
  rows: ValidatedRow[]
  validCount: number
  errorCount: number
  warningCount: number
}

// FR → EN header mapping
const HEADER_ALIASES: Record<string, string> = {
  // Students
  'prenom': 'first_name', 'prénom': 'first_name', 'firstname': 'first_name',
  'nom': 'last_name', 'nom de famille': 'last_name', 'lastname': 'last_name',
  'email': 'email', 'e-mail': 'email', 'courriel': 'email',
  'classe': 'class_name', 'class': 'class_name',
  // Teachers
  'matiere': 'subjects', 'matière': 'subjects', 'matieres': 'subjects', 'matières': 'subjects',
  'subject': 'subjects',
  // Subjects
  'nom de la matiere': 'name', 'nom matiere': 'name', 'nom matière': 'name',
  'code': 'code', 'code matiere': 'code',
  'programme': 'program', 'categorie': 'category', 'catégorie': 'category',
  'description': 'description',
  // Classes
  'nom de la classe': 'name', 'nom classe': 'name',
  'diplome': 'diploma', 'diplôme': 'diploma',
  'programme classe': 'program', // classes can also specify program
  'annee': 'academic_year', 'année': 'academic_year', 'annee academique': 'academic_year',
  'année académique': 'academic_year',
  'date debut': 'start_date', 'date début': 'start_date',
  'date fin': 'end_date',
  // Sessions
  'titre': 'title', 'intitulé': 'title', 'intitule': 'title',
  'date': 'date', 'jour': 'date',
  'heure debut': 'start_time', 'heure début': 'start_time', 'début': 'start_time', 'debut': 'start_time',
  'heure fin': 'end_time', 'fin': 'end_time',
  'salle': 'room', 'room': 'room',
  'professeur': 'teacher', 'enseignant': 'teacher', 'formateur': 'teacher', 'teacher': 'teacher',
  'type': 'type', 'type de séance': 'type', 'type de seance': 'type',
}

function normalizeHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const h of headers) {
    const lower = h.toLowerCase().trim()
    const mapped = HEADER_ALIASES[lower]
    mapping[h] = mapped || lower.replace(/\s+/g, '_')
  }
  return mapping
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateImport(
  type: ImportType,
  rows: Record<string, string>[],
  headers: string[],
  context?: {
    classNames?: string[]
    diplomaNames?: string[]
    programNames?: string[]
    subjectNames?: string[]
    roomNames?: string[]
    teacherEmails?: string[]
    sessionTypeValues?: string[]
  }
): ValidationResult {
  const headerMap = normalizeHeaders(headers)
  const validatedRows: ValidatedRow[] = []

  // Build lowercase sets for case-insensitive comparison
  const classNamesLower = new Set((context?.classNames || []).map(n => n.toLowerCase()))
  const diplomaNamesLower = new Set((context?.diplomaNames || []).map(n => n.toLowerCase()))
  const programNamesLower = new Set((context?.programNames || []).map(n => n.toLowerCase()))
  const subjectNamesLower = new Set((context?.subjectNames || []).map(n => n.toLowerCase()))
  const roomNamesLower = new Set((context?.roomNames || []).map(n => n.toLowerCase()))
  const teacherEmailsLower = new Set((context?.teacherEmails || []).map(n => n.toLowerCase()))

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    // Remap keys using header mapping
    const data: Record<string, string> = {}
    for (const [originalKey, value] of Object.entries(raw)) {
      const mappedKey = headerMap[originalKey] || originalKey
      data[mappedKey] = value
    }

    const errors: string[] = []
    const warnings: string[] = []

    switch (type) {
      case 'students':
        if (!data.first_name?.trim()) errors.push('Prénom manquant')
        if (!data.last_name?.trim()) errors.push('Nom manquant')
        if (!data.email?.trim()) errors.push('Email manquant')
        else if (!isValidEmail(data.email)) errors.push('Email invalide')
        if (data.class_name?.trim() && classNamesLower.size > 0 && !classNamesLower.has(data.class_name.trim().toLowerCase())) {
          warnings.push(`Classe "${data.class_name}" non trouvée — l'étudiant sera importé sans classe`)
        }
        break

      case 'teachers':
        if (!data.first_name?.trim()) errors.push('Prénom manquant')
        if (!data.last_name?.trim()) errors.push('Nom manquant')
        if (!data.email?.trim()) errors.push('Email manquant')
        else if (!isValidEmail(data.email)) errors.push('Email invalide')
        // Validate subject names if provided
        if (data.subjects?.trim() && subjectNamesLower.size > 0) {
          const subjectList = data.subjects.split(',').map(s => s.trim()).filter(Boolean)
          const unknownSubjects = subjectList.filter(s => !subjectNamesLower.has(s.toLowerCase()))
          if (unknownSubjects.length > 0) {
            warnings.push(`Matière(s) non trouvée(s): ${unknownSubjects.join(', ')} — seront ignorées`)
          }
        }
        break

      case 'subjects':
        if (!data.name?.trim()) errors.push('Nom de matière manquant')
        if (data.program?.trim() && programNamesLower.size > 0 && !programNamesLower.has(data.program.trim().toLowerCase())) {
          warnings.push(`Programme "${data.program}" non trouvé`)
        }
        break

      case 'classes':
        if (!data.name?.trim()) errors.push('Nom de classe manquant')
        if (!data.diploma?.trim()) errors.push('Diplôme manquant')
        else if (diplomaNamesLower.size > 0 && !diplomaNamesLower.has(data.diploma.trim().toLowerCase())) {
          errors.push(`Diplôme "${data.diploma}" non trouvé — veuillez le créer d'abord`)
        }
        if (data.program?.trim() && programNamesLower.size > 0 && !programNamesLower.has(data.program.trim().toLowerCase())) {
          warnings.push(`Programme "${data.program}" non trouvé`)
        }
        break

      case 'sessions':
        if (!data.title?.trim()) errors.push('Titre manquant')
        if (!data.date?.trim()) errors.push('Date manquante')
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date.trim())) errors.push('Date invalide (format attendu: AAAA-MM-JJ)')
        if (!data.start_time?.trim()) errors.push('Heure de début manquante')
        else if (!/^\d{2}:\d{2}$/.test(data.start_time.trim())) errors.push('Heure de début invalide (format attendu: HH:MM)')
        if (!data.end_time?.trim()) errors.push('Heure de fin manquante')
        else if (!/^\d{2}:\d{2}$/.test(data.end_time.trim())) errors.push('Heure de fin invalide (format attendu: HH:MM)')
        // Check start < end
        if (data.start_time?.trim() && data.end_time?.trim() && data.start_time.trim() >= data.end_time.trim()) {
          errors.push('L\'heure de fin doit être après l\'heure de début')
        }
        // Validate room name
        if (data.room?.trim() && roomNamesLower.size > 0 && !roomNamesLower.has(data.room.trim().toLowerCase())) {
          warnings.push(`Salle "${data.room}" non trouvée — la séance sera créée sans salle`)
        }
        // Validate teacher email
        if (data.teacher?.trim() && teacherEmailsLower.size > 0 && !teacherEmailsLower.has(data.teacher.trim().toLowerCase())) {
          warnings.push(`Professeur "${data.teacher}" non trouvé — la séance sera créée sans professeur`)
        }
        // Validate class name
        if (data.class_name?.trim() && classNamesLower.size > 0 && !classNamesLower.has(data.class_name.trim().toLowerCase())) {
          warnings.push(`Classe "${data.class_name}" non trouvée`)
        }
        // Validate subject name
        if (data.subjects?.trim() && subjectNamesLower.size > 0 && !subjectNamesLower.has(data.subjects.trim().toLowerCase())) {
          warnings.push(`Matière "${data.subjects}" non trouvée`)
        }
        // Validate session type
        if (data.type?.trim()) {
          const validTypes = ['in_person', 'online', 'hybrid', 'présentiel', 'presentiel', 'en ligne', 'distanciel', 'hybride']
          if (!validTypes.includes(data.type.trim().toLowerCase())) {
            warnings.push(`Type "${data.type}" non reconnu — "Présentiel" sera utilisé par défaut`)
          }
        }
        break
    }

    validatedRows.push({
      rowIndex: i + 1,
      data,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
      errors,
      warnings,
    })
  }

  return {
    type,
    rows: validatedRows,
    validCount: validatedRows.filter(r => r.status === 'valid' || r.status === 'warning').length,
    errorCount: validatedRows.filter(r => r.status === 'error').length,
    warningCount: validatedRows.filter(r => r.status === 'warning').length,
  }
}
