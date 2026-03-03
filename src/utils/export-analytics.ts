import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ==================== TYPES ====================

export interface AnalyticsExportData {
  kpis: {
    totalSessions: number
    totalSessionsTrend: string
    occupancyRate: number
    occupancySub: string
    studentCount: number
    studentSub: string
    activeTeacherCount: number
    activeTeacherSub: string
    diplomaCount: number
    diplomaSub: string
    classCount: number
    classSub: string
    subjectCount: number
    subjectSub: string
    onlineCount: number
    onlineSub: string
  }
  weekBarData: { label: string; value: number }[]
  statusData: { label: string; value: number }[]
  heatmapData: number[][]
  dayLabels: string[]
  slotLabels: string[]
  teacherData: { label: string; value: number }[]
  modalityData: { label: string; value: number }[]
  roomData: { label: string; value: number }[]
  // Academic
  subjectsByProgramData: { label: string; value: number }[]
  hoursByDiplomaData: { label: string; value: number }[]
  classesByProfileData: { label: string; value: number }[]
  teacherCoverageData: { label: string; value: number }[]
  // Enrollment
  enrollmentTypeData: { label: string; value: number }[]
  enrollmentStatusData: { label: string; value: number }[]
  studentsByClassData: { label: string; value: number }[]
  dispensationsBySubjectData: { label: string; value: number }[]
}

// ==================== SHARED STYLES ====================

const HEADER_COLOR: [number, number, number] = [30, 58, 95]
const ACCENT_COLOR: [number, number, number] = [59, 130, 246]

function exportTimestamp(): string {
  return format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })
}

function todayLabel(): string {
  return format(new Date(), 'dd/MM/yyyy', { locale: fr })
}

// Excel shared styles
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  left: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  right: { style: 'thin', color: { argb: 'FFD0D5DD' } },
}

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial',
}

const BODY_FONT: Partial<ExcelJS.Font> = {
  size: 10, name: 'Arial', color: { argb: 'FF334155' },
}

const ZEBRA_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' },
}

const SECTION_FILL: ExcelJS.FillPattern = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' },
}

const SECTION_FONT: Partial<ExcelJS.Font> = {
  bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial',
}

// ==================== PDF HELPERS ====================

function createPDFHelpers(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth()
  let cursorY = 0

  function ensureSpace(needed: number) {
    const pageH = doc.internal.pageSize.getHeight()
    if (cursorY + needed > pageH - 20) {
      doc.addPage()
      cursorY = 14
    }
  }

  function sectionTitle(title: string) {
    ensureSpace(20)
    cursorY += 4
    doc.setFontSize(10)
    doc.setTextColor(...ACCENT_COLOR)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, cursorY)
    cursorY += 2
    doc.setDrawColor(...ACCENT_COLOR)
    doc.setLineWidth(0.3)
    doc.line(14, cursorY, pageW - 14, cursorY)
    cursorY += 4
    doc.setFont('helvetica', 'normal')
  }

  function getCursorY() { return cursorY }
  function setCursorY(y: number) { cursorY = y }
  function advanceCursor(delta: number) { cursorY += delta }

  return { ensureSpace, sectionTitle, getCursorY, setCursorY, advanceCursor, pageW }
}

function getFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

/** Render a simple 2-column table (label + value) */
function renderLabelValueTable(doc: jsPDF, h: ReturnType<typeof createPDFHelpers>, title: string, data: { label: string; value: number }[], labelHeader: string, valueHeader: string) {
  if (data.length === 0) return
  h.sectionTitle(title)
  autoTable(doc, {
    head: [[labelHeader, valueHeader]],
    body: data.map(d => [d.label, String(d.value)]),
    startY: h.getCursorY(),
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'center' } },
    theme: 'grid',
  })
  h.setCursorY(getFinalY(doc) + 6)
}

/** Render a donut-style table (label + value + %) */
function renderDonutTable(doc: jsPDF, h: ReturnType<typeof createPDFHelpers>, title: string, data: { label: string; value: number }[], labelHeader: string) {
  if (data.length === 0) return
  h.sectionTitle(title)
  const total = data.reduce((s, d) => s + d.value, 0)
  autoTable(doc, {
    head: [[labelHeader, 'Nombre', '%']],
    body: data.map(d => [
      d.label,
      String(d.value),
      total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%',
    ]),
    startY: h.getCursorY(),
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    theme: 'grid',
  })
  h.setCursorY(getFinalY(doc) + 6)
}

// ==================== PDF EXPORT ====================

export function exportAnalyticsToPDF(data: AnalyticsExportData, filename = 'statistiques') {
  const doc = new jsPDF({ orientation: 'landscape' })
  const h = createPDFHelpers(doc)

  // ==================== EN-TÊTE ====================
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, h.pageW, 18, 'F')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('Rapport Statistiques', 14, 12)
  doc.setFontSize(8)
  doc.text(todayLabel(), h.pageW - 14, 12, { align: 'right' })

  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.text(`Exporté le ${exportTimestamp()}`, 14, 25)
  h.setCursorY(30)

  // ==================== KPIs ====================
  h.sectionTitle('Indicateurs clés')
  autoTable(doc, {
    head: [['Total séances', 'Occupation', 'Étudiants', 'Ens. actifs', 'Diplômes', 'Classes', 'Matières', 'En ligne']],
    body: [[
      String(data.kpis.totalSessions),
      `${data.kpis.occupancyRate}%`,
      String(data.kpis.studentCount),
      String(data.kpis.activeTeacherCount),
      String(data.kpis.diplomaCount),
      String(data.kpis.classCount),
      String(data.kpis.subjectCount),
      String(data.kpis.onlineCount),
    ]],
    startY: h.getCursorY(),
    styles: { fontSize: 8, cellPadding: 3, halign: 'center', lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontStyle: 'bold', fontSize: 10 },
    theme: 'grid',
  })
  h.setCursorY(getFinalY(doc) + 6)

  // ==================== SÉANCES PAR JOUR ====================
  h.sectionTitle('Séances par jour (semaine courante)')
  autoTable(doc, {
    head: [data.weekBarData.map(d => d.label)],
    body: [data.weekBarData.map(d => String(d.value))],
    startY: h.getCursorY(),
    styles: { fontSize: 9, cellPadding: 3, halign: 'center', lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontStyle: 'bold', fontSize: 11 },
    theme: 'grid',
  })
  h.setCursorY(getFinalY(doc) + 6)

  // ==================== RÉPARTITION PAR STATUT ====================
  renderDonutTable(doc, h, 'Répartition par statut', data.statusData, 'Statut')

  // ==================== HEATMAP ====================
  h.sectionTitle('Occupation des salles (semaine courante)')
  const heatHead = ['', ...data.slotLabels]
  const heatBody = data.heatmapData.map((row, ri) => [
    data.dayLabels[ri],
    ...row.map(v => `${Math.round(v * 100)}%`),
  ])
  autoTable(doc, {
    head: [heatHead],
    body: heatBody,
    startY: h.getCursorY(),
    styles: { fontSize: 7, cellPadding: 2, halign: 'center', lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index > 0) {
        const ri = cellData.row.index
        const ci = cellData.column.index - 1
        const val = data.heatmapData[ri]?.[ci] ?? 0
        if (val > 0) {
          const intensity = Math.round(val * 200)
          const r = Math.max(248 - intensity, 30)
          const g = Math.max(250 - Math.round(intensity * 0.6), 58)
          const b = Math.min(252, 95 + Math.round(intensity * 0.8))
          cellData.cell.styles.fillColor = [r, g, b] as [number, number, number]
          if (val > 0.6) cellData.cell.styles.textColor = [255, 255, 255]
        }
      }
    },
    theme: 'grid',
  })
  h.setCursorY(getFinalY(doc) + 6)

  // ==================== CHARGE ENSEIGNANTE ====================
  renderLabelValueTable(doc, h, 'Charge enseignante (top 8)', data.teacherData, 'Enseignant', 'Séances')

  // ==================== SÉANCES PAR MODALITÉ ====================
  renderDonutTable(doc, h, 'Séances par modalité', data.modalityData, 'Modalité')

  // ==================== UTILISATION DES SALLES ====================
  renderLabelValueTable(doc, h, 'Utilisation des salles (top 10)', data.roomData, 'Salle', 'Séances')

  // ==================== RÉFÉRENTIEL ACADÉMIQUE ====================
  renderLabelValueTable(doc, h, 'Matières par programme', data.subjectsByProgramData, 'Programme', 'Matières')
  renderLabelValueTable(doc, h, 'Volume horaire par diplôme', data.hoursByDiplomaData, 'Diplôme', 'Heures')
  renderDonutTable(doc, h, 'Classes par profil', data.classesByProfileData, 'Profil')
  renderDonutTable(doc, h, 'Couverture enseignants', data.teacherCoverageData, 'Couverture')

  // ==================== INSCRIPTIONS ÉTUDIANTS ====================
  renderDonutTable(doc, h, 'Type d\'inscriptions', data.enrollmentTypeData, 'Type')
  renderDonutTable(doc, h, 'Statut des inscriptions', data.enrollmentStatusData, 'Statut')
  renderLabelValueTable(doc, h, 'Étudiants par classe (top 10)', data.studentsByClassData, 'Classe', 'Étudiants')
  renderLabelValueTable(doc, h, 'Dispensations par matière (top 10)', data.dispensationsBySubjectData, 'Matière', 'Dispensations')

  // ==================== FOOTER ====================
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(`Statistiques — ${exportTimestamp()}`, 14, pageH - 6)
    doc.text(`Page ${i}/${pageCount}`, h.pageW - 14, pageH - 6, { align: 'right' })
  }

  doc.save(`${filename}.pdf`)
}

// ==================== EXCEL EXPORT ====================

export async function exportAnalyticsToExcel(data: AnalyticsExportData, filename = 'statistiques') {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Statistiques')

  let rowNum = 1

  // --- Helpers ---
  function addSectionTitle(title: string, colSpan: number) {
    const row = ws.addRow([title])
    ws.mergeCells(rowNum, 1, rowNum, colSpan)
    row.getCell(1).fill = SECTION_FILL
    row.getCell(1).font = SECTION_FONT
    row.getCell(1).alignment = { vertical: 'middle' }
    row.height = 26
    rowNum++
  }

  function addTableHeader(headers: string[]) {
    const row = ws.addRow(headers)
    row.eachCell(cell => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = THIN_BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    row.height = 22
    rowNum++
  }

  function addTableRow(values: (string | number)[], isZebra: boolean) {
    const row = ws.addRow(values)
    row.eachCell(cell => {
      cell.font = BODY_FONT
      cell.border = THIN_BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (isZebra) cell.fill = ZEBRA_FILL
    })
    rowNum++
  }

  function addBlankRow() {
    ws.addRow([])
    rowNum++
  }

  /** Render a label-value section */
  function addLabelValueSection(title: string, items: { label: string; value: number }[], labelHeader: string, valueHeader: string) {
    if (items.length === 0) return
    addSectionTitle(title, 2)
    addTableHeader([labelHeader, valueHeader])
    items.forEach((d, i) => addTableRow([d.label, d.value], i % 2 === 1))
    addBlankRow()
  }

  /** Render a donut-style section (label + value + %) */
  function addDonutSection(title: string, items: { label: string; value: number }[], labelHeader: string) {
    if (items.length === 0) return
    const total = items.reduce((s, d) => s + d.value, 0)
    addSectionTitle(title, 3)
    addTableHeader([labelHeader, 'Nombre', '%'])
    items.forEach((d, i) => {
      addTableRow([
        d.label,
        d.value,
        total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%',
      ], i % 2 === 1)
    })
    addBlankRow()
  }

  // ==================== TITRE ====================
  const titleRow = ws.addRow(['Rapport Statistiques — ' + todayLabel()])
  ws.mergeCells(1, 1, 1, 8)
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' }, name: 'Arial' }
  titleRow.height = 32
  rowNum++

  const subRow = ws.addRow([`Exporté le ${exportTimestamp()}`])
  ws.mergeCells(2, 1, 2, 8)
  subRow.getCell(1).font = { size: 10, color: { argb: 'FF64748B' }, name: 'Arial' }
  rowNum++

  addBlankRow()

  // ==================== KPIs ====================
  addSectionTitle('Indicateurs clés', 8)
  addTableHeader(['Total séances', 'Occupation', 'Étudiants', 'Ens. actifs', 'Diplômes', 'Classes', 'Matières', 'En ligne'])
  addTableRow([
    data.kpis.totalSessions,
    `${data.kpis.occupancyRate}%`,
    data.kpis.studentCount,
    data.kpis.activeTeacherCount,
    data.kpis.diplomaCount,
    data.kpis.classCount,
    data.kpis.subjectCount,
    data.kpis.onlineCount,
  ], false)
  const kpiRow = ws.getRow(rowNum - 1)
  kpiRow.eachCell(cell => {
    cell.font = { ...BODY_FONT, bold: true, size: 14 }
  })

  addBlankRow()

  // ==================== SÉANCES PAR JOUR ====================
  addSectionTitle('Séances par jour (semaine courante)', 5)
  addTableHeader(data.weekBarData.map(d => d.label))
  addTableRow(data.weekBarData.map(d => d.value), false)

  addBlankRow()

  // ==================== RÉPARTITION PAR STATUT ====================
  addDonutSection('Répartition par statut', data.statusData, 'Statut')

  // ==================== HEATMAP ====================
  addSectionTitle('Occupation des salles (semaine courante)', data.slotLabels.length + 1)
  addTableHeader(['', ...data.slotLabels])
  data.heatmapData.forEach((row, ri) => {
    const dataRow = ws.addRow([data.dayLabels[ri], ...row.map(v => `${Math.round(v * 100)}%`)])
    dataRow.getCell(1).font = { ...BODY_FONT, bold: true }
    dataRow.getCell(1).fill = ZEBRA_FILL
    dataRow.getCell(1).border = THIN_BORDER
    dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
    row.forEach((val, ci) => {
      const cell = dataRow.getCell(ci + 2)
      cell.font = BODY_FONT
      cell.border = THIN_BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      if (val > 0) {
        const intensity = Math.round(val * 200)
        const r = Math.max(248 - intensity, 30).toString(16).padStart(2, '0')
        const g = Math.max(250 - Math.round(intensity * 0.6), 58).toString(16).padStart(2, '0')
        const b = Math.min(252, 95 + Math.round(intensity * 0.8)).toString(16).padStart(2, '0')
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${r}${g}${b}`.toUpperCase() } }
        if (val > 0.6) cell.font = { ...BODY_FONT, color: { argb: 'FFFFFFFF' } }
      }
    })
    rowNum++
  })

  addBlankRow()

  // ==================== CHARGE ENSEIGNANTE ====================
  addLabelValueSection('Charge enseignante (top 8)', data.teacherData, 'Enseignant', 'Séances')

  // ==================== SÉANCES PAR MODALITÉ ====================
  addDonutSection('Séances par modalité', data.modalityData, 'Modalité')

  // ==================== UTILISATION SALLES ====================
  addLabelValueSection('Utilisation des salles (top 10)', data.roomData, 'Salle', 'Séances')

  // ==================== RÉFÉRENTIEL ACADÉMIQUE ====================
  addLabelValueSection('Matières par programme', data.subjectsByProgramData, 'Programme', 'Matières')
  addLabelValueSection('Volume horaire par diplôme', data.hoursByDiplomaData, 'Diplôme', 'Heures')
  addDonutSection('Classes par profil', data.classesByProfileData, 'Profil')
  addDonutSection('Couverture enseignants', data.teacherCoverageData, 'Couverture')

  // ==================== INSCRIPTIONS ÉTUDIANTS ====================
  addDonutSection('Type d\'inscriptions', data.enrollmentTypeData, 'Type')
  addDonutSection('Statut des inscriptions', data.enrollmentStatusData, 'Statut')
  addLabelValueSection('Étudiants par classe (top 10)', data.studentsByClassData, 'Classe', 'Étudiants')
  addLabelValueSection('Dispensations par matière (top 10)', data.dispensationsBySubjectData, 'Matière', 'Dispensations')

  // ==================== LARGEURS COLONNES ====================
  ws.columns = Array.from({ length: 12 }, (_, i) => ({ width: i === 0 ? 20 : 14 }))

  // ==================== SAVE ====================
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}
