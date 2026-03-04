/**
 * Download template XLSX files for import
 */
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { ImportType } from './import-validators'

const TEMPLATES: Record<ImportType, { headers: string[]; example: string[]; notes: string }> = {
  students: {
    headers: ['Prénom', 'Nom', 'Email', 'Classe'],
    example: ['Marie', 'Dupont', 'marie.dupont@ecole.fr', 'BTS SIO 1A'],
    notes: 'La colonne Classe est optionnelle. Si renseignée, l\'étudiant sera rattaché à la classe correspondante.',
  },
  teachers: {
    headers: ['Prénom', 'Nom', 'Email', 'Matières'],
    example: ['Jean', 'Martin', 'jean.martin@ecole.fr', 'Mathématiques, Physique'],
    notes: 'La colonne Matières est optionnelle. Séparez les matières par des virgules.',
  },
  subjects: {
    headers: ['Nom', 'Code', 'Programme', 'Catégorie', 'Description'],
    example: ['Mathématiques', 'MATH', 'Développement Web', 'Scientifique', 'Cours de maths appliquées'],
    notes: 'Seul le nom est obligatoire. Le programme doit correspondre à un programme existant.',
  },
  classes: {
    headers: ['Nom', 'Diplôme', 'Année académique', 'Date début', 'Date fin'],
    example: ['BTS SIO 1A', 'BTS SIO', '2025-2026', '2025-09-01', '2026-06-30'],
    notes: 'Le nom et le diplôme sont obligatoires. Le diplôme doit correspondre à un diplôme existant.',
  },
}

const TYPE_LABELS: Record<ImportType, string> = {
  students: 'Étudiants',
  teachers: 'Professeurs',
  subjects: 'Matières',
  classes: 'Classes',
}

export async function downloadTemplate(type: ImportType) {
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

  // Notes sheet
  const notesWs = workbook.addWorksheet('Instructions')
  notesWs.addRow(['Instructions d\'import'])
  notesWs.addRow([])
  notesWs.addRow([template.notes])
  notesWs.addRow([])
  notesWs.addRow(['Formats acceptés: .csv (séparateur ; ou ,) et .xlsx'])
  notesWs.addRow(['La première ligne doit contenir les en-têtes.'])
  notesWs.getColumn(1).width = 80

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `template_${type}.xlsx`)
}
