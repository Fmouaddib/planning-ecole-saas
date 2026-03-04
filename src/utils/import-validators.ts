/**
 * Validation schemas and header mapping for imports
 */

export type ImportType = 'students' | 'teachers' | 'subjects' | 'classes'

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
  'matiere': 'subject', 'matière': 'subject', 'matieres': 'subjects', 'matières': 'subjects',
  // Subjects
  'nom de la matiere': 'name', 'nom matiere': 'name', 'nom matière': 'name',
  'code': 'code', 'code matiere': 'code',
  'programme': 'program', 'categorie': 'category', 'catégorie': 'category',
  'description': 'description',
  // Classes
  'nom de la classe': 'name', 'nom classe': 'name',
  'diplome': 'diploma', 'diplôme': 'diploma',
  'annee': 'academic_year', 'année': 'academic_year', 'annee academique': 'academic_year',
  'date debut': 'start_date', 'date début': 'start_date',
  'date fin': 'end_date',
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
  context?: { classNames?: string[]; diplomaNames?: string[]; programNames?: string[] }
): ValidationResult {
  const headerMap = normalizeHeaders(headers)
  const validatedRows: ValidatedRow[] = []

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
        if (data.class_name && context?.classNames && !context.classNames.includes(data.class_name)) {
          warnings.push(`Classe "${data.class_name}" non trouvée`)
        }
        break

      case 'teachers':
        if (!data.first_name?.trim()) errors.push('Prénom manquant')
        if (!data.last_name?.trim()) errors.push('Nom manquant')
        if (!data.email?.trim()) errors.push('Email manquant')
        else if (!isValidEmail(data.email)) errors.push('Email invalide')
        break

      case 'subjects':
        if (!data.name?.trim()) errors.push('Nom de matière manquant')
        if (data.program && context?.programNames && !context.programNames.includes(data.program)) {
          warnings.push(`Programme "${data.program}" non trouvé`)
        }
        break

      case 'classes':
        if (!data.name?.trim()) errors.push('Nom de classe manquant')
        if (!data.diploma?.trim()) errors.push('Diplôme manquant')
        else if (context?.diplomaNames && !context.diplomaNames.includes(data.diploma)) {
          warnings.push(`Diplôme "${data.diploma}" non trouvé`)
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
