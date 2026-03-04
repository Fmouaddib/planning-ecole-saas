/**
 * PDF Bulletin generation using jsPDF + jspdf-autotable
 * Matches the visual style of export.ts (navy header, alternating rows)
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { StudentBulletin } from '@/types'

const HEADER_COLOR: [number, number, number] = [30, 58, 95]

interface BulletinOptions {
  centerName: string
  periodLabel: string
  periodStart: string
  periodEnd: string
}

/** Render a single bulletin on the current page of a jsPDF doc */
function renderBulletinOnPage(doc: jsPDF, bulletin: StudentBulletin, options: BulletinOptions) {
  const pageW = doc.internal.pageSize.getWidth()

  // ── Header bar ──
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Bulletin de notes', pageW / 2, 12, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(options.centerName, pageW / 2, 20, { align: 'center' })

  // ── Student info block ──
  let y = 38
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Élève :', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(bulletin.studentName, 38, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Classe :', 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(bulletin.className, 145, y)

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Période :', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(options.periodLabel, 42, y)

  const startFmt = formatDate(options.periodStart)
  const endFmt = formatDate(options.periodEnd)
  doc.text(`du ${startFmt} au ${endFmt}`, 120, y)

  y += 4
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageW - 14, y)
  y += 6

  // ── Grades table ──
  const tableBody = bulletin.subjects.map(s => [
    s.subjectName,
    s.average != null ? s.average.toFixed(2) : '-',
    s.coefficient.toString(),
    s.evaluationCount.toString(),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Matière', 'Moyenne / 20', 'Coefficient', 'Nb évaluations']],
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
      fontSize: 10,
      textColor: [33, 33, 33],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 70 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Color code the average
      if (data.section === 'body' && data.column.index === 1) {
        const val = parseFloat(data.cell.raw as string)
        if (!isNaN(val)) {
          if (val >= 14) data.cell.styles.textColor = [5, 150, 105]      // green
          else if (val >= 10) data.cell.styles.textColor = [37, 99, 235]  // blue
          else data.cell.styles.textColor = [220, 38, 38]                 // red
        }
      }
    },
  })

  // ── Footer summary ──
  const finalY = (doc as any).lastAutoTable?.finalY || y + 50
  let footerY = finalY + 12

  // Moyenne générale box
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, footerY - 4, pageW - 28, 20, 3, 3, 'F')
  doc.setDrawColor(...HEADER_COLOR)
  doc.roundedRect(14, footerY - 4, pageW - 28, 20, 3, 3, 'S')

  doc.setTextColor(30, 58, 95)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Moyenne générale :', 20, footerY + 6)

  const avgText = bulletin.generalAverage != null ? `${bulletin.generalAverage.toFixed(2)} / 20` : 'N/A'
  doc.setFontSize(16)
  if (bulletin.generalAverage != null) {
    if (bulletin.generalAverage >= 14) doc.setTextColor(5, 150, 105)
    else if (bulletin.generalAverage >= 10) doc.setTextColor(37, 99, 235)
    else doc.setTextColor(220, 38, 38)
  }
  doc.text(avgText, 90, footerY + 7)

  if (bulletin.classRank) {
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Classement : ${bulletin.classRank}`, 150, footerY + 7)
  }

  footerY += 28

  // Generation date
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, footerY)
}

export function generateBulletinPDF(bulletin: StudentBulletin, options: BulletinOptions): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  renderBulletinOnPage(doc, bulletin, options)
  return doc
}

/** Generate a single PDF with one page per student bulletin */
export function generateBulkBulletinPDF(bulletins: StudentBulletin[], options: BulletinOptions): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  bulletins.forEach((b, i) => {
    if (i > 0) doc.addPage()
    renderBulletinOnPage(doc, b, options)
  })
  return doc
}

/** Generate an Excel workbook with one sheet per student bulletin */
export async function generateBulkBulletinExcel(bulletins: StudentBulletin[], options: BulletinOptions): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = options.centerName
  wb.created = new Date()

  for (const b of bulletins) {
    // Sheet name max 31 chars
    const sheetName = b.studentName.substring(0, 31).replace(/[\\/*?[\]:]/g, '')
    const ws = wb.addWorksheet(sheetName)

    // Header
    ws.mergeCells('A1:D1')
    const titleCell = ws.getCell('A1')
    titleCell.value = `Bulletin de notes - ${options.periodLabel}`
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    titleCell.alignment = { horizontal: 'center' }

    ws.mergeCells('A2:D2')
    const infoCell = ws.getCell('A2')
    infoCell.value = `${b.studentName} - ${b.className} | du ${formatDate(options.periodStart)} au ${formatDate(options.periodEnd)}`
    infoCell.font = { italic: true, size: 10 }
    infoCell.alignment = { horizontal: 'center' }

    // Table headers
    const headerRow = ws.addRow(['Matière', 'Moyenne / 20', 'Coefficient', 'Nb évaluations'])
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
    })

    // Data rows
    for (const s of b.subjects) {
      const row = ws.addRow([
        s.subjectName,
        s.average != null ? s.average : '-',
        s.coefficient,
        s.evaluationCount,
      ])
      row.getCell(2).numFmt = '0.00'
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        }
      })
      // Color code average
      if (s.average != null) {
        const avgCell = row.getCell(2)
        if (s.average >= 14) avgCell.font = { bold: true, color: { argb: 'FF059669' } }
        else if (s.average >= 10) avgCell.font = { bold: true, color: { argb: 'FF2563EB' } }
        else avgCell.font = { bold: true, color: { argb: 'FFDC2626' } }
      }
    }

    // General average row
    ws.addRow([])
    const avgRow = ws.addRow(['Moyenne générale', b.generalAverage != null ? b.generalAverage : 'N/A', '', b.classRank ? `Rang: ${b.classRank}` : ''])
    avgRow.font = { bold: true, size: 12 }
    if (b.generalAverage != null) {
      const c = avgRow.getCell(2)
      c.numFmt = '0.00'
      if (b.generalAverage >= 14) c.font = { bold: true, size: 12, color: { argb: 'FF059669' } }
      else if (b.generalAverage >= 10) c.font = { bold: true, size: 12, color: { argb: 'FF2563EB' } }
      else c.font = { bold: true, size: 12, color: { argb: 'FFDC2626' } }
    }

    // Column widths
    ws.getColumn(1).width = 30
    ws.getColumn(2).width = 15
    ws.getColumn(3).width = 15
    ws.getColumn(4).width = 18
  }

  // Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bulletins_${options.periodLabel.replace(/\s+/g, '_')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

/** Generate an attendance certificate PDF for a student */
export function generateAttendanceCertificatePDF(data: {
  studentName: string
  className: string
  centerName: string
  periodLabel: string
  totalSessions: number
  present: number
  absent: number
  late: number
  excused: number
  attendanceRate: number
}): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text("Certificat d'assiduité", pageW / 2, 12, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(data.centerName, pageW / 2, 20, { align: 'center' })

  // Student info
  let y = 42
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Élève :', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.studentName, 38, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Classe :', 120, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.className, 145, y)

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Période :', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(data.periodLabel, 42, y)

  y += 8
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageW - 14, y)
  y += 10

  // Attendance rate highlight
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, y - 4, pageW - 28, 30, 3, 3, 'F')
  doc.setDrawColor(...HEADER_COLOR)
  doc.roundedRect(14, y - 4, pageW - 28, 30, 3, 3, 'S')

  doc.setTextColor(30, 58, 95)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text("Taux d'assiduité :", 20, y + 10)

  doc.setFontSize(24)
  if (data.attendanceRate >= 90) doc.setTextColor(5, 150, 105)
  else if (data.attendanceRate >= 75) doc.setTextColor(234, 179, 8)
  else doc.setTextColor(220, 38, 38)
  doc.text(`${data.attendanceRate}%`, 100, y + 12)

  y += 38

  // Stats table
  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Total séances', data.totalSessions.toString()],
      ['Présences', data.present.toString()],
      ['Absences', data.absent.toString()],
      ['Retards', data.late.toString()],
      ['Excusées', data.excused.toString()],
    ],
    theme: 'grid',
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center' },
    bodyStyles: { fontSize: 11, textColor: [33, 33, 33] },
    columnStyles: { 0: { halign: 'left', cellWidth: 80 }, 1: { halign: 'center', cellWidth: 40 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 30, right: 30 },
  })

  // Footer
  const finalY2 = (doc as any).lastAutoTable?.finalY || y + 80
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, finalY2 + 15)

  return doc
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: fr })
  } catch {
    return dateStr
  }
}
