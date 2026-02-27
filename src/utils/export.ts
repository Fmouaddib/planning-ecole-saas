import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO, startOfWeek, addDays, isSameDay, getHours, getMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CalendarEvent } from '@/types'
import { MATIERES, DIPLOMES, NIVEAUX } from '@/utils/constants'

// ==================== HELPERS ====================

function getLabelFor(value: string | undefined, list: { value: string; label: string }[]): string {
  if (!value) return '-'
  return list.find(item => item.value === value)?.label || value
}

function formatDate(dateValue: string | Date): string {
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue
  return format(d, 'dd/MM/yyyy', { locale: fr })
}

function formatTime(dateValue: string | Date): string {
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue
  return format(d, 'HH:mm')
}

function toDate(d: string | Date): Date {
  return typeof d === 'string' ? parseISO(d) : d
}

const typeLabels: Record<string, string> = {
  course: 'Cours',
  exam: 'Examen',
  meeting: 'Réunion',
  event: 'Événement',
  maintenance: 'Maintenance',
}

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  completed: 'Terminé',
}

// Couleurs saturées (texte, badges, bordures)
const TYPE_COLORS: Record<string, { hex: string; rgb: [number, number, number] }> = {
  course:      { hex: '#2563eb', rgb: [37, 99, 235] },
  exam:        { hex: '#dc2626', rgb: [220, 38, 38] },
  meeting:     { hex: '#059669', rgb: [5, 150, 105] },
  event:       { hex: '#7c3aed', rgb: [124, 58, 237] },
  maintenance: { hex: '#6b7280', rgb: [107, 114, 128] },
}

// Couleurs pastels (fond de cellule grille — lisible avec texte foncé)
const TYPE_PASTELS: Record<string, { hex: string; rgb: [number, number, number]; text: string }> = {
  course:      { hex: '#dbeafe', rgb: [219, 234, 254], text: '#1e3a8a' },
  exam:        { hex: '#fee2e2', rgb: [254, 226, 226], text: '#991b1b' },
  meeting:     { hex: '#d1fae5', rgb: [209, 250, 229], text: '#064e3b' },
  event:       { hex: '#ede9fe', rgb: [237, 233, 254], text: '#4c1d95' },
  maintenance: { hex: '#f3f4f6', rgb: [243, 244, 246], text: '#1f2937' },
}

const HEADER_COLOR: [number, number, number] = [30, 58, 95]  // bleu marine pro
const HEADER_HEX = '#1e3a5f'
function exportTimestamp(): string {
  return format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })
}

// ==================== LIST DATA ====================

function eventToRow(event: CalendarEvent) {
  return {
    'Titre': event.title,
    'Salle': event.roomName || '-',
    'Date': formatDate(event.start),
    'Début': formatTime(event.start),
    'Fin': formatTime(event.end),
    'Type': typeLabels[event.type || ''] || event.type || '-',
    'Matière': getLabelFor(event.matiere, MATIERES),
    'Diplôme': getLabelFor(event.diplome, DIPLOMES),
    'Niveau': getLabelFor(event.niveau, NIVEAUX),
    'Statut': statusLabels[event.status || ''] || event.status || '-',
  }
}

const COLUMNS = ['Titre', 'Salle', 'Date', 'Début', 'Fin', 'Type', 'Matière', 'Diplôme', 'Niveau', 'Statut']

// ==================== CALENDAR GRID DATA ====================

interface CalendarGridCell {
  text: string
  type: string | null
}

interface CalendarGrid {
  headers: string[]
  rows: { hour: string; cells: CalendarGridCell[] }[]
  weekLabel: string
}

function buildCalendarGrid(events: CalendarEvent[], weekStart: Date): CalendarGrid {
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 })
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i))

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
  const headers = ['Horaire', ...days.map((d, i) => `${dayNames[i]} ${format(d, 'dd/MM')}`)]
  const weekLabel = `Semaine du ${format(monday, 'dd/MM/yyyy')} au ${format(addDays(monday, 4), 'dd/MM/yyyy')}`

  const rows: CalendarGrid['rows'] = []
  for (let h = 8; h <= 19; h++) {
    const hour = `${String(h).padStart(2, '0')}:00`
    const cells: CalendarGridCell[] = days.map(day => {
      const matching = events.filter(ev => {
        const start = toDate(ev.start)
        const end = toDate(ev.end)
        if (!isSameDay(start, day) && !isSameDay(end, day)) {
          if (start > day || end < day) return false
        }
        const startH = isSameDay(start, day) ? getHours(start) + getMinutes(start) / 60 : 0
        const endH = isSameDay(end, day) ? getHours(end) + getMinutes(end) / 60 : 24
        return startH < h + 1 && endH > h
      })
      if (matching.length === 0) return { text: '', type: null }
      const ev = matching[0]
      const text = `${ev.title}\n${ev.roomName || ''}\n${formatTime(ev.start)}-${formatTime(ev.end)}`
      return { text, type: (ev.type as string) || null }
    })
    rows.push({ hour, cells })
  }
  return { headers, rows, weekLabel }
}

// Légende HTML pour Word
function buildWordLegend(): string {
  return `<table style="margin-top:16px;border:none;font-family:Arial;">
    <tr>
      ${Object.entries(typeLabels).map(([key, label]) => {
        const pastel = TYPE_PASTELS[key]
        const color = TYPE_COLORS[key]
        return `<td style="padding:3px 12px 3px 0;border:none;font-size:10px;">
          <span style="display:inline-block;width:12px;height:12px;background:${pastel?.hex || color?.hex || '#ccc'};border:1px solid ${color?.hex || '#999'};border-radius:2px;vertical-align:middle;margin-right:4px;"></span>
          ${label}
        </td>`
      }).join('')}
    </tr>
  </table>`
}

// ==================== LIST EXPORTS ====================

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

function argbFromHex(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase()
}

export async function exportToExcel(events: CalendarEvent[], filename = 'planning') {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Planning')

  // En-tête
  const headerRow = ws.addRow(COLUMNS)
  headerRow.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 24

  // Données
  const rows = events.map(eventToRow)
  rows.forEach((row, idx) => {
    const dataRow = ws.addRow(COLUMNS.map(col => row[col as keyof typeof row]))
    const typeKey = Object.entries(typeLabels).find(([, v]) => v === row['Type'])?.[0]

    dataRow.eachCell((cell, colNum) => {
      cell.font = BODY_FONT
      cell.border = THIN_BORDER
      cell.alignment = { vertical: 'middle', wrapText: true }

      // Zebra
      if (idx % 2 === 1) cell.fill = ZEBRA_FILL

      // Colonne Type : fond pastel
      if (colNum === COLUMNS.indexOf('Type') + 1 && typeKey && TYPE_PASTELS[typeKey]) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbFromHex(TYPE_PASTELS[typeKey].hex) } }
        cell.font = { ...BODY_FONT, bold: true, color: { argb: argbFromHex(TYPE_PASTELS[typeKey].text) } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      // Colonne Titre : gras
      if (colNum === 1) cell.font = { ...BODY_FONT, bold: true }
    })
  })

  // Largeurs colonnes
  ws.columns = COLUMNS.map(col => ({ width: col === 'Titre' ? 28 : col === 'Matière' || col === 'Diplôme' ? 18 : 14 }))

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}

export function exportToCSV(events: CalendarEvent[], filename = 'planning') {
  const rows = events.map(eventToRow)
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS })
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' })
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  saveAs(blob, `${filename}.csv`)
}

export function exportToPDF(events: CalendarEvent[], filename = 'planning') {
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()

  // En-tête : barre bleu marine
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 18, 'F')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('Planning', 14, 12)
  doc.setFontSize(8)
  doc.text(`${events.length} événement${events.length > 1 ? 's' : ''}`, pageW - 14, 12, { align: 'right' })

  // Sous-titre
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.text(`Exporté le ${exportTimestamp()}`, 14, 25)

  const rows = events.map(e => {
    const row = eventToRow(e)
    return COLUMNS.map(col => row[col as keyof typeof row])
  })

  // Index de la colonne Type pour la colorier
  const typeColIdx = COLUMNS.indexOf('Type')

  autoTable(doc, {
    head: [COLUMNS],
    body: rows,
    startY: 30,
    styles: { fontSize: 7, cellPadding: 2.5, lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
    },
    didParseCell: (data) => {
      // Colorier la colonne Type avec un fond pastel
      if (data.section === 'body' && data.column.index === typeColIdx) {
        const typeKey = Object.entries(typeLabels).find(([, v]) => v === data.cell.raw)?.[0]
        if (typeKey && TYPE_PASTELS[typeKey]) {
          data.cell.styles.fillColor = TYPE_PASTELS[typeKey].rgb
          data.cell.styles.textColor = TYPE_PASTELS[typeKey].text as unknown as number
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawPage: (data) => {
      // Pied de page
      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      doc.text(`Planning — ${exportTimestamp()}`, 14, pageH - 6)
      const pageNum = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
      doc.text(`Page ${data.pageNumber}/${pageNum}`, pageW - 14, pageH - 6, { align: 'right' })
    },
  })

  doc.save(`${filename}.pdf`)
}

export function exportToWord(events: CalendarEvent[], filename = 'planning') {
  const rows = events.map(eventToRow)

  const tableRows = rows.map((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
    const typeKey = Object.entries(typeLabels).find(([, v]) => v === row['Type'])?.[0]
    return `<tr>${COLUMNS.map(col => {
      const val = row[col as keyof typeof row]
      // Badge coloré pour la colonne Type
      if (col === 'Type' && typeKey && TYPE_PASTELS[typeKey]) {
        return `<td style="border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;background:${TYPE_PASTELS[typeKey].hex};color:${TYPE_PASTELS[typeKey].text};font-weight:bold;text-align:center;">${val}</td>`
      }
      return `<td style="border:1px solid #e2e8f0;padding:6px 8px;font-size:11px;background:${bg};color:#334155;">${val}</td>`
    }).join('')}</tr>`
  }).join('')

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Planning</title></head>
    <body style="font-family:Arial,sans-serif;color:#334155;margin:0;padding:0;">
      <div style="background:${HEADER_HEX};padding:14px 20px;margin-bottom:16px;">
        <span style="font-size:18px;font-weight:bold;color:white;">Planning</span>
        <span style="float:right;font-size:11px;color:#94a3b8;">${events.length} événement${events.length > 1 ? 's' : ''}</span>
      </div>
      <p style="font-size:10px;color:#94a3b8;margin:0 0 12px 0;">Exporté le ${exportTimestamp()}</p>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
        <thead>
          <tr>${COLUMNS.map(col => `<th style="border:1px solid #e2e8f0;padding:8px 8px;background:${HEADER_HEX};color:white;font-size:11px;text-align:left;">${col}</th>`).join('')}</tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="font-size:9px;color:#94a3b8;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px;">Planning — ${exportTimestamp()}</p>
    </body>
    </html>
  `

  const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' })
  saveAs(blob, `${filename}.doc`)
}

// ==================== CALENDAR GRID EXPORTS ====================

export async function exportToExcelCalendar(events: CalendarEvent[], weekStart: Date, filename = 'planning-calendrier') {
  const grid = buildCalendarGrid(events, weekStart)
  const colCount = grid.headers.length

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Calendrier')

  // Titre
  const titleRow = ws.addRow(['Planning — Vue Calendrier'])
  ws.mergeCells(1, 1, 1, colCount)
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' }, name: 'Arial' }
  titleRow.height = 26

  // Sous-titre semaine
  const subRow = ws.addRow([grid.weekLabel])
  ws.mergeCells(2, 1, 2, colCount)
  subRow.getCell(1).font = { size: 10, color: { argb: 'FF64748B' }, name: 'Arial' }

  // Ligne vide
  ws.addRow([])

  // En-tête grille
  const headerRow = ws.addRow(grid.headers)
  headerRow.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 22

  // Lignes horaires
  grid.rows.forEach((row, rIdx) => {
    const values = [row.hour, ...row.cells.map(c => c.text.replace(/\n/g, ' — '))]
    const dataRow = ws.addRow(values)
    dataRow.height = 36

    dataRow.eachCell((cell, colNum) => {
      cell.border = THIN_BORDER
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.font = BODY_FONT

      // Colonne horaire
      if (colNum === 1) {
        cell.font = { ...BODY_FONT, bold: true, color: { argb: 'FF1E3A5F' } }
        cell.fill = rIdx % 2 === 0
          ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
          : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        return
      }

      // Cellules événement avec fond pastel
      const gridCell = row.cells[colNum - 2]
      if (gridCell && gridCell.type && TYPE_PASTELS[gridCell.type]) {
        const pastel = TYPE_PASTELS[gridCell.type]
        const accent = TYPE_COLORS[gridCell.type]
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbFromHex(pastel.hex) } }
        cell.font = { ...BODY_FONT, bold: true, size: 9, color: { argb: argbFromHex(pastel.text) } }
        // Bordure gauche accentuée
        cell.border = {
          ...THIN_BORDER,
          left: { style: 'medium', color: { argb: argbFromHex(accent.hex) } },
        }
      }
    })
  })

  // Largeurs colonnes
  ws.columns = grid.headers.map((_, i) => ({ width: i === 0 ? 10 : 26 }))

  // Légende
  ws.addRow([])
  const legendRow = ws.addRow(['Légende :', ...Object.values(typeLabels)])
  const typeKeys = Object.keys(typeLabels)
  legendRow.getCell(1).font = { ...BODY_FONT, bold: true, size: 9 }
  typeKeys.forEach((key, i) => {
    const cell = legendRow.getCell(i + 2)
    cell.font = { ...BODY_FONT, bold: true, size: 9, color: { argb: argbFromHex(TYPE_PASTELS[key].text) } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbFromHex(TYPE_PASTELS[key].hex) } }
    cell.border = THIN_BORDER
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}

export function exportToCSVCalendar(events: CalendarEvent[], weekStart: Date, filename = 'planning-calendrier') {
  const grid = buildCalendarGrid(events, weekStart)
  const lines: string[] = []

  lines.push(`"Planning — Vue Calendrier"`)
  lines.push(`"${grid.weekLabel}"`)
  lines.push('')
  lines.push(grid.headers.map(h => `"${h}"`).join(';'))
  grid.rows.forEach(row => {
    const cells = [row.hour, ...row.cells.map(c => c.text.replace(/\n/g, ' — '))]
    lines.push(cells.map(c => `"${c}"`).join(';'))
  })

  const csv = lines.join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  saveAs(blob, `${filename}.csv`)
}

export function exportToPDFCalendar(events: CalendarEvent[], weekStart: Date, filename = 'planning-calendrier') {
  const grid = buildCalendarGrid(events, weekStart)
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()

  // En-tête : barre bleu marine
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 18, 'F')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('Planning — Vue Calendrier', 14, 12)

  // Sous-titres
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.text(grid.weekLabel, 14, 25)
  doc.setFontSize(7)
  doc.text(`Exporté le ${exportTimestamp()}`, pageW - 14, 25, { align: 'right' })

  const body = grid.rows.map(row =>
    [row.hour, ...row.cells.map(c => c.text)]
  )

  // Map cellule → style pastel
  const cellStyles: Record<string, { fillColor: [number, number, number]; textColor: string }> = {}
  grid.rows.forEach((row, rIdx) => {
    row.cells.forEach((cell, cIdx) => {
      if (cell.type && TYPE_PASTELS[cell.type]) {
        cellStyles[`${rIdx}-${cIdx + 1}`] = {
          fillColor: TYPE_PASTELS[cell.type].rgb,
          textColor: TYPE_PASTELS[cell.type].text,
        }
      }
    })
  })

  autoTable(doc, {
    head: [grid.headers],
    body,
    startY: 30,
    styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const key = `${data.row.index}-${data.column.index}`
        if (cellStyles[key]) {
          data.cell.styles.fillColor = cellStyles[key].fillColor
          data.cell.styles.textColor = cellStyles[key].textColor as unknown as number
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      doc.text(`Planning — ${exportTimestamp()}`, 14, pageH - 6)
      const pageNum = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
      doc.text(`Page ${data.pageNumber}/${pageNum}`, pageW - 14, pageH - 6, { align: 'right' })
    },
  })

  // Légende en bas du tableau
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 200
  const legendY = finalY + 8
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  doc.text('Légende :', 14, legendY)
  let legendX = 34
  Object.entries(typeLabels).forEach(([key, label]) => {
    const pastel = TYPE_PASTELS[key]
    if (!pastel) return
    doc.setFillColor(...pastel.rgb)
    doc.roundedRect(legendX, legendY - 3, 4, 4, 0.5, 0.5, 'F')
    doc.setTextColor(80, 80, 80)
    doc.text(label, legendX + 6, legendY)
    legendX += doc.getTextWidth(label) + 12
  })

  doc.save(`${filename}.pdf`)
}

export function exportToWordCalendar(events: CalendarEvent[], weekStart: Date, filename = 'planning-calendrier') {
  const grid = buildCalendarGrid(events, weekStart)

  const headerCells = grid.headers.map(h =>
    `<th style="border:1px solid #cbd5e1;padding:7px 6px;background:${HEADER_HEX};color:white;font-size:10px;text-align:center;">${h}</th>`
  ).join('')

  const bodyRows = grid.rows.map((row, rIdx) => {
    const hourBg = rIdx % 2 === 0 ? '#f8fafc' : '#f1f5f9'
    const hourCell = `<td style="border:1px solid #cbd5e1;padding:5px 6px;font-size:10px;font-weight:bold;background:${hourBg};text-align:center;color:${HEADER_HEX};">${row.hour}</td>`
    const dayCells = row.cells.map(cell => {
      if (!cell.text) {
        const bg = rIdx % 2 === 0 ? '#ffffff' : '#fafbfc'
        return `<td style="border:1px solid #e2e8f0;padding:5px 6px;background:${bg};"></td>`
      }
      const pastel = cell.type && TYPE_PASTELS[cell.type] ? TYPE_PASTELS[cell.type] : null
      const accent = cell.type && TYPE_COLORS[cell.type] ? TYPE_COLORS[cell.type] : null
      const bg = pastel ? pastel.hex : '#ffffff'
      const color = pastel ? pastel.text : '#334155'
      const borderLeft = accent ? `border-left:3px solid ${accent.hex};` : ''
      const content = cell.text.replace(/\n/g, '<br/>')
      return `<td style="border:1px solid #e2e8f0;${borderLeft}padding:5px 6px;font-size:9px;background:${bg};color:${color};vertical-align:top;line-height:1.4;">${content}</td>`
    }).join('')
    return `<tr>${hourCell}${dayCells}</tr>`
  }).join('')

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Planning Calendrier</title></head>
    <body style="font-family:Arial,sans-serif;color:#334155;margin:0;padding:0;">
      <div style="background:${HEADER_HEX};padding:14px 20px;margin-bottom:4px;">
        <span style="font-size:18px;font-weight:bold;color:white;">Planning — Vue Calendrier</span>
      </div>
      <p style="font-size:11px;color:#64748b;margin:8px 0 4px 0;font-weight:bold;">${grid.weekLabel}</p>
      <p style="font-size:9px;color:#94a3b8;margin:0 0 10px 0;">Exporté le ${exportTimestamp()}</p>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      ${buildWordLegend()}
      <p style="font-size:8px;color:#94a3b8;margin-top:14px;border-top:1px solid #e2e8f0;padding-top:6px;">Planning — ${exportTimestamp()}</p>
    </body>
    </html>
  `

  const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' })
  saveAs(blob, `${filename}.doc`)
}
