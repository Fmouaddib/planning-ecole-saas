/**
 * Print-friendly PDF templates using jsPDF + jspdf-autotable
 * - Attendance sheet (feuille d'appel)
 * - Class list (liste de classe)
 * - Week schedule (emploi du temps)
 *
 * Style matches export-bulletin.ts (navy header, alternating rows, same fonts).
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, startOfWeek, addDays, isSameDay, getHours, getMinutes, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CalendarEvent } from '@/types'

// ==================== SHARED CONSTANTS ====================

const HEADER_COLOR: [number, number, number] = [30, 58, 95]

function exportTimestamp(): string {
  return format(new Date(), "dd/MM/yyyy 'a' HH:mm", { locale: fr })
}

function toDate(d: string | Date): Date {
  return typeof d === 'string' ? parseISO(d) : d
}

function formatTime(dateValue: string | Date): string {
  const d = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue
  return format(d, 'HH:mm')
}

function drawPageFooter(doc: jsPDF, label: string) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'italic')
  doc.text(`${label} -- ${exportTimestamp()}`, 14, pageH - 8)
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}/${totalPages}`, pageW - 14, pageH - 8, { align: 'right' })
}

// ==================== 1. ATTENDANCE SHEET ====================

export interface AttendanceSheetData {
  centerName: string
  className: string
  subjectName?: string
  teacherName?: string
  date: Date
  students: { firstName: string; lastName: string }[]
}

/**
 * Generate and open an attendance sheet PDF (feuille d'appel).
 * A4 portrait. Students sorted alphabetically by last name.
 */
export function printAttendanceSheet(data: AttendanceSheetData): void {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()

  // Sort students alphabetically by last name
  const sorted = [...data.students].sort((a, b) =>
    a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr'),
  )

  // -- Header bar --
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text("Feuille d'appel", pageW / 2, 12, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(data.centerName, pageW / 2, 20, { align: 'center' })

  // -- Info block --
  let y = 38
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(11)

  doc.setFont('helvetica', 'bold')
  doc.text('Classe :', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.className, 38, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Date :', 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(format(data.date, 'EEEE d MMMM yyyy', { locale: fr }), 135, y)

  if (data.subjectName) {
    y += 7
    doc.setFont('helvetica', 'bold')
    doc.text('Matiere :', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.text(data.subjectName, 42, y)
  }

  if (data.teacherName) {
    doc.setFont('helvetica', 'bold')
    doc.text('Professeur :', 120, y)
    doc.setFont('helvetica', 'normal')
    doc.text(data.teacherName, 152, y)
  }

  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageW - 14, y)
  y += 4

  // -- Table --
  const tableBody = sorted.map((s, idx) => [
    String(idx + 1),
    s.lastName.toUpperCase(),
    s.firstName,
    '',  // P
    '',  // A
    '',  // R
    '',  // E
    '',  // Signature
    '',  // Observations
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nom', 'Prenom', 'P', 'A', 'R', 'E', 'Signature', 'Observations']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_COLOR,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [33, 33, 33],
      minCellHeight: 10,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 35, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 10 },
      4: { halign: 'center', cellWidth: 10 },
      5: { halign: 'center', cellWidth: 10 },
      6: { halign: 'center', cellWidth: 10 },
      7: { halign: 'center', cellWidth: 35 },
      8: { halign: 'left' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => drawPageFooter(doc, "Feuille d'appel"),
  })

  // -- Footer summary --
  const finalY = (doc as any).lastAutoTable?.finalY || y + 50
  let footerY = finalY + 10

  doc.setTextColor(30, 58, 95)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total eleves : ${sorted.length}`, 14, footerY)

  if (data.teacherName) {
    doc.text(`Enseignant : ${data.teacherName}`, 100, footerY)
  }

  footerY += 6
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('P = Present, A = Absent, R = Retard, E = Excuse', 14, footerY)

  // Open in new tab for print
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

// ==================== 2. CLASS LIST ====================

export interface ClassListData {
  centerName: string
  className: string
  academicYear: string
  students: {
    firstName: string
    lastName: string
    email: string
    enrollmentDate?: string
  }[]
}

/**
 * Generate and open a class list PDF (liste de classe).
 * A4 portrait. Students sorted alphabetically by last name.
 */
export function printClassList(data: ClassListData): void {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()

  const sorted = [...data.students].sort((a, b) =>
    a.lastName.localeCompare(b.lastName, 'fr') || a.firstName.localeCompare(b.firstName, 'fr'),
  )

  // -- Header bar --
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Liste de classe', pageW / 2, 12, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(data.centerName, pageW / 2, 20, { align: 'center' })

  // -- Info block --
  let y = 38
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(11)

  doc.setFont('helvetica', 'bold')
  doc.text('Classe :', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.className, 38, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Annee :', 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.academicYear, 140, y)

  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageW - 14, y)
  y += 4

  // -- Table --
  const tableBody = sorted.map((s, idx) => [
    String(idx + 1),
    s.lastName.toUpperCase(),
    s.firstName,
    s.email || '-',
    s.enrollmentDate || '-',
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nom', 'Prenom', 'Email', 'Date inscription']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: HEADER_COLOR,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [33, 33, 33],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 40, fontStyle: 'bold' },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'left', cellWidth: 60 },
      4: { halign: 'center', cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => drawPageFooter(doc, 'Liste de classe'),
  })

  // -- Footer --
  const finalY = (doc as any).lastAutoTable?.finalY || y + 50
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total : ${sorted.length} eleve${sorted.length > 1 ? 's' : ''}`, 14, finalY + 10)

  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

// ==================== 3. WEEK SCHEDULE ====================

export interface WeekScheduleData {
  title: string            // class name or teacher name
  centerName: string
  weekStart: Date
  events: CalendarEvent[]
  workingDays?: number[]   // 0=Sun..6=Sat, default [1,2,3,4,5]
  startHour?: number       // default 8
  endHour?: number         // default 19
}

/**
 * Generate and open a weekly schedule PDF (emploi du temps semaine).
 * A4 landscape. Grid: days as columns, hours as rows.
 */
export function printWeekSchedule(data: WeekScheduleData): void {
  const doc = new jsPDF('landscape', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()

  const workingDays = data.workingDays ?? [1, 2, 3, 4, 5]
  const startHour = data.startHour ?? 8
  const endHour = data.endHour ?? 19
  const monday = startOfWeek(data.weekStart, { weekStartsOn: 1 })

  const dayNames: Record<number, string> = {
    0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi',
    4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi',
  }

  // Build day columns
  const days = workingDays.map(wd => {
    const offset = wd === 0 ? 6 : wd - 1
    const date = addDays(monday, offset)
    return { dayOfWeek: wd, date, label: `${dayNames[wd]} ${format(date, 'dd/MM')}` }
  })

  const weekLabel = `Semaine du ${format(monday, 'dd/MM/yyyy')} au ${format(addDays(monday, 4), 'dd/MM/yyyy')}`

  // -- Header bar --
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 22, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Emploi du temps — ${data.title}`, 14, 10)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(data.centerName, pageW - 14, 10, { align: 'right' })
  doc.text(weekLabel, pageW - 14, 16, { align: 'right' })

  // -- Build grid data --
  const headers = ['Horaire', ...days.map(d => d.label)]
  const rows: string[][] = []

  for (let h = startHour; h <= endHour; h++) {
    const hour = `${String(h).padStart(2, '0')}:00`
    const cells = days.map(day => {
      const matching = data.events.filter(ev => {
        const evStart = toDate(ev.start)
        const evEnd = toDate(ev.end)
        if (!isSameDay(evStart, day.date) && !isSameDay(evEnd, day.date)) {
          if (evStart > day.date || evEnd < day.date) return false
        }
        const sH = isSameDay(evStart, day.date) ? getHours(evStart) + getMinutes(evStart) / 60 : 0
        const eH = isSameDay(evEnd, day.date) ? getHours(evEnd) + getMinutes(evEnd) / 60 : 24
        return sH < h + 1 && eH > h
      })
      if (matching.length === 0) return ''
      const ev = matching[0]
      const parts = [ev.matiere || ev.title]
      if (ev.roomName) parts.push(ev.roomName)
      if (ev.teacher) parts.push(ev.teacher)
      parts.push(`${formatTime(ev.start)}-${formatTime(ev.end)}`)
      return parts.join('\n')
    })
    rows.push([hour, ...cells])
  }

  // -- Table --
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 26,
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      overflow: 'linebreak',
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: HEADER_COLOR,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] },
    },
    alternateRowStyles: { fillColor: [253, 253, 254] },
    didParseCell: (cellData) => {
      // Highlight cells with content
      if (cellData.section === 'body' && cellData.column.index > 0 && cellData.cell.raw) {
        const text = String(cellData.cell.raw)
        if (text.trim().length > 0) {
          cellData.cell.styles.fillColor = [219, 234, 254]  // light blue
          cellData.cell.styles.textColor = [30, 58, 138]    // dark blue text
          cellData.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawPage: () => drawPageFooter(doc, 'Emploi du temps'),
  })

  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
