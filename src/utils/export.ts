import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CalendarEvent } from '@/types'
import { MATIERES, DIPLOMES, NIVEAUX } from '@/utils/constants'

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

function eventToRow(event: CalendarEvent) {
  return {
    'Titre': event.title,
    'Salle': event.roomName || '-',
    'Date': formatDate(event.start),
    'Heure début': formatTime(event.start),
    'Heure fin': formatTime(event.end),
    'Type': typeLabels[event.type || ''] || event.type || '-',
    'Matière': getLabelFor(event.matiere, MATIERES),
    'Diplôme': getLabelFor(event.diplome, DIPLOMES),
    'Niveau': getLabelFor(event.niveau, NIVEAUX),
    'Statut': statusLabels[event.status || ''] || event.status || '-',
  }
}

const COLUMNS = ['Titre', 'Salle', 'Date', 'Heure début', 'Heure fin', 'Type', 'Matière', 'Diplôme', 'Niveau', 'Statut']

export function exportToExcel(events: CalendarEvent[], filename = 'planning') {
  const rows = events.map(eventToRow)
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS })
  // Auto-size columns
  ws['!cols'] = COLUMNS.map(col => ({ wch: Math.max(col.length, 15) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Planning')
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
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
  doc.setFontSize(16)
  doc.text('Planning', 14, 15)
  doc.setFontSize(10)
  doc.text(`Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 22)

  const rows = events.map(e => {
    const row = eventToRow(e)
    return COLUMNS.map(col => row[col as keyof typeof row])
  })

  autoTable(doc, {
    head: [COLUMNS],
    body: rows,
    startY: 28,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })

  doc.save(`${filename}.pdf`)
}

export function exportToWord(events: CalendarEvent[], filename = 'planning') {
  const rows = events.map(eventToRow)

  const tableRows = rows.map(row =>
    `<tr>${COLUMNS.map(col => `<td style="border:1px solid #ddd;padding:6px 8px;font-size:12px;">${row[col as keyof typeof row]}</td>`).join('')}</tr>`
  ).join('')

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Planning</title></head>
    <body>
      <h1 style="font-family:Arial;color:#1e3a5f;">Planning</h1>
      <p style="font-family:Arial;color:#666;font-size:12px;">Exporté le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
      <table style="border-collapse:collapse;width:100%;font-family:Arial;">
        <thead>
          <tr>${COLUMNS.map(col => `<th style="border:1px solid #ddd;padding:8px;background:#3b82f6;color:white;font-size:12px;">${col}</th>`).join('')}</tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `

  const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' })
  saveAs(blob, `${filename}.doc`)
}
