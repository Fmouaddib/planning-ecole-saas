/**
 * Export academic referential data to XLSX files
 */
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Diploma, Program, Class, Subject, User } from '@/types'

function getDateSuffix(): string {
  return new Date().toISOString().slice(0, 10)
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
    cell.alignment = { horizontal: 'center' }
  })
}

function autoWidthColumns(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let maxLen = 10
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = String(cell.value || '').length
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(maxLen + 4, 60)
  })
}

async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), filename)
}

export async function exportDiplomas(diplomas: Diploma[], programs: Program[]) {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Diplomes')

  const headers = ['Nom', 'Code', 'Description', 'Nb Programmes']
  const headerRow = ws.addRow(headers)
  styleHeaderRow(headerRow)

  const getProgramCount = (diplomaId: string) =>
    programs.filter(p => p.diplomaId === diplomaId).length

  for (const d of diplomas) {
    ws.addRow([
      d.title,
      '', // diplomas don't have a code field
      d.description || '',
      getProgramCount(d.id),
    ])
  }

  autoWidthColumns(ws)
  await saveWorkbook(workbook, `export_diplomes_${getDateSuffix()}.xlsx`)
}

export async function exportPrograms(programs: Program[], subjects: Subject[]) {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Programmes')

  const headers = ['Nom', 'Code', 'Diplome', 'Duree (h)', 'Max participants', 'Nb Matieres']
  const headerRow = ws.addRow(headers)
  styleHeaderRow(headerRow)

  const getSubjectCount = (programId: string) =>
    subjects.filter(s => s.programId === programId).length

  for (const p of programs) {
    ws.addRow([
      p.name,
      p.code || '',
      p.diploma?.title || '',
      p.durationHours,
      p.maxParticipants,
      getSubjectCount(p.id),
    ])
  }

  autoWidthColumns(ws)
  await saveWorkbook(workbook, `export_programmes_${getDateSuffix()}.xlsx`)
}

export async function exportClasses(classes: Class[]) {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Classes')

  const headers = ['Nom', 'Diplome', 'Programme', 'Annee academique', 'Date debut', 'Date fin']
  const headerRow = ws.addRow(headers)
  styleHeaderRow(headerRow)

  for (const c of classes) {
    ws.addRow([
      c.name,
      c.diploma?.title || '',
      c.program?.name || '',
      c.academicYear || '',
      c.startDate || '',
      c.endDate || '',
    ])
  }

  autoWidthColumns(ws)
  await saveWorkbook(workbook, `export_classes_${getDateSuffix()}.xlsx`)
}

export async function exportSubjects(subjects: Subject[]) {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Matieres')

  const headers = ['Nom', 'Code', 'Programme', 'Categorie', 'Description']
  const headerRow = ws.addRow(headers)
  styleHeaderRow(headerRow)

  for (const s of subjects) {
    ws.addRow([
      s.name,
      s.code || '',
      s.program?.name || '',
      s.category || '',
      s.description || '',
    ])
  }

  autoWidthColumns(ws)
  await saveWorkbook(workbook, `export_matieres_${getDateSuffix()}.xlsx`)
}

export async function exportTeachers(
  teachers: User[],
  subjects: Subject[],
  getSubjectIdsForTeacher: (teacherId: string) => string[],
) {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Professeurs')

  const headers = ['Nom', 'Prenom', 'Email', 'Matieres']
  const headerRow = ws.addRow(headers)
  styleHeaderRow(headerRow)

  for (const t of teachers) {
    const subjectIds = getSubjectIdsForTeacher(t.id)
    const subjectNames = subjects
      .filter(s => subjectIds.includes(s.id))
      .map(s => s.name)
      .join(', ')

    ws.addRow([
      t.lastName,
      t.firstName,
      t.email,
      subjectNames,
    ])
  }

  autoWidthColumns(ws)
  await saveWorkbook(workbook, `export_professeurs_${getDateSuffix()}.xlsx`)
}
