/**
 * Download template XLSX files for import
 */
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { ImportType } from './import-validators'

const TEMPLATES: Record<ImportType, { headers: string[]; example: string[]; notes: string[] }> = {
  students: {
    headers: ['Prénom', 'Nom', 'Email', 'Classe'],
    example: ['Marie', 'Dupont', 'marie.dupont@ecole.fr', 'BTS SIO 1A'],
    notes: [
      'Colonnes obligatoires : Prénom, Nom, Email.',
      'La colonne Classe est optionnelle. Si renseignée, l\'étudiant sera rattaché à la classe correspondante (le nom doit correspondre exactement à une classe existante).',
      'Si l\'email existe déjà, la ligne sera ignorée.',
      'Un compte utilisateur sera créé automatiquement avec un mot de passe temporaire.',
    ],
  },
  teachers: {
    headers: ['Prénom', 'Nom', 'Email', 'Matières'],
    example: ['Jean', 'Martin', 'jean.martin@ecole.fr', 'Mathématiques, Physique'],
    notes: [
      'Colonnes obligatoires : Prénom, Nom, Email.',
      'La colonne Matières est optionnelle. Séparez les matières par des virgules.',
      'Les matières doivent correspondre exactement aux noms de matières existantes dans le référentiel.',
      'Les matières non trouvées seront ignorées (le professeur sera créé sans ces matières).',
      'Un compte utilisateur sera créé automatiquement avec un mot de passe temporaire.',
    ],
  },
  subjects: {
    headers: ['Nom', 'Code', 'Programme', 'Catégorie', 'Description'],
    example: ['Mathématiques', 'MATH', 'Développement Web', 'Scientifique', 'Cours de maths appliquées'],
    notes: [
      'Seul le nom est obligatoire.',
      'Le programme doit correspondre exactement au nom d\'un programme existant.',
      'Si le programme n\'est pas trouvé, la matière sera créée sans programme.',
    ],
  },
  classes: {
    headers: ['Nom', 'Diplôme', 'Programme', 'Année académique', 'Date début', 'Date fin'],
    example: ['BTS SIO 1A', 'BTS SIO', 'Développement Web', '2025-2026', '2025-09-01', '2026-06-30'],
    notes: [
      'Le nom et le diplôme sont obligatoires.',
      'Le diplôme doit correspondre exactement au titre d\'un diplôme existant (la casse est ignorée).',
      'Le programme est optionnel. S\'il est renseigné, les matières du programme seront auto-associées à la classe.',
      'Les dates doivent être au format AAAA-MM-JJ.',
    ],
  },
  sessions: {
    headers: ['Titre', 'Date', 'Heure début', 'Heure fin', 'Salle', 'Professeur', 'Classe', 'Matière', 'Type', 'Description'],
    example: ['Cours Maths', '2026-03-16', '09:00', '11:00', 'Salle A1', 'jean.martin@ecole.fr', 'BTS SIO 1A', 'Mathématiques', 'Présentiel', 'Chapitre 3 - Algèbre'],
    notes: [
      'Colonnes obligatoires : Titre, Date, Heure début, Heure fin.',
      'La date doit être au format AAAA-MM-JJ (ex: 2026-03-16).',
      'Les heures doivent être au format HH:MM (ex: 09:00, 14:30).',
      'Le professeur doit être identifié par son adresse email.',
      'La salle doit correspondre au nom exact d\'une salle existante.',
      'La classe et la matière doivent correspondre aux noms exacts du référentiel.',
      'Types possibles : Présentiel, En ligne, Hybride (par défaut: Présentiel).',
      'Si un professeur, une salle ou une matière n\'est pas trouvé, la séance sera créée sans.',
    ],
  },
}

const TYPE_LABELS: Record<ImportType, string> = {
  students: 'Étudiants',
  teachers: 'Professeurs',
  subjects: 'Matières',
  classes: 'Classes',
  sessions: 'Séances',
}

export interface TemplateReferenceData {
  rooms?: string[]
  teachers?: { name: string; email: string }[]
  classes?: string[]
  subjects?: string[]
}

export async function downloadTemplate(type: ImportType, referenceData?: TemplateReferenceData) {
  const template = TEMPLATES[type]
  const workbook = new ExcelJS.Workbook()

  const ws = workbook.addWorksheet(TYPE_LABELS[type])

  // Header row
  const headerRow = ws.addRow(template.headers)
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
    cell.alignment = { horizontal: 'center' }
  })

  // Example row
  ws.addRow(template.example)

  // Auto width
  ws.columns.forEach((col, i) => {
    col.width = Math.max(template.headers[i].length, template.example[i].length) + 4
  })

  // Data reference sheet for sessions
  if (type === 'sessions' && referenceData) {
    const dataWs = workbook.addWorksheet('Données')

    const dataHeaders = ['Salles', 'Professeurs (email)', 'Professeurs (nom)', 'Classes', 'Matières']
    const dataHeaderRow = dataWs.addRow(dataHeaders)
    dataHeaderRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
      cell.alignment = { horizontal: 'center' }
    })

    const maxRows = Math.max(
      referenceData.rooms?.length || 0,
      referenceData.teachers?.length || 0,
      referenceData.classes?.length || 0,
      referenceData.subjects?.length || 0,
    )

    for (let i = 0; i < maxRows; i++) {
      dataWs.addRow([
        referenceData.rooms?.[i] || '',
        referenceData.teachers?.[i]?.email || '',
        referenceData.teachers?.[i]?.name || '',
        referenceData.classes?.[i] || '',
        referenceData.subjects?.[i] || '',
      ])
    }

    // Auto width for data columns
    dataWs.columns.forEach((col, i) => {
      let maxLen = dataHeaders[i].length
      col.eachCell?.({ includeEmpty: false }, cell => {
        const len = String(cell.value || '').length
        if (len > maxLen) maxLen = len
      })
      col.width = maxLen + 4
    })
  }

  // Notes sheet
  const notesWs = workbook.addWorksheet('Instructions')
  notesWs.addRow(['Instructions d\'import'])
  notesWs.getRow(1).font = { bold: true, size: 14 }
  notesWs.addRow([])
  for (const note of template.notes) {
    notesWs.addRow([`• ${note}`])
  }
  notesWs.addRow([])
  notesWs.addRow(['Formats acceptés: .csv (séparateur ; ou ,) et .xlsx'])
  notesWs.addRow(['La première ligne doit contenir les en-têtes.'])
  if (type === 'sessions' && referenceData) {
    notesWs.addRow([])
    notesWs.addRow(['Consultez l\'onglet "Données" pour voir la liste des salles, professeurs, classes et matières disponibles.'])
  }
  notesWs.getColumn(1).width = 100

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `template_${type}.xlsx`)
}
