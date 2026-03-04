/**
 * Class report export — PDF + Excel
 * Combines grade averages and attendance stats per student
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const HEADER_COLOR: [number, number, number] = [30, 58, 95]

export interface ClassReportStudent {
  name: string
  average: number | null
  rank: number | null
  attendanceRate: number | null
  present: number
  absent: number
  late: number
  excused: number
  totalSessions: number
}

export interface ClassReportData {
  className: string
  centerName: string
  periodLabel: string
  students: ClassReportStudent[]
  classAverage: number | null
  classAttendanceRate: number | null
}

export function exportClassReportToPDF(data: ClassReportData): jsPDF {
  const doc = new jsPDF('landscape', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFillColor(...HEADER_COLOR)
  doc.rect(0, 0, pageW, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Bilan de classe', pageW / 2, 11, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${data.className} — ${data.centerName} — ${data.periodLabel}`, pageW / 2, 19, { align: 'center' })

  // KPI summary
  let y = 34
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')

  const avgText = data.classAverage != null ? data.classAverage.toFixed(2) : 'N/A'
  const attText = data.classAttendanceRate != null ? `${data.classAttendanceRate}%` : 'N/A'
  doc.text(`Moyenne de classe : ${avgText} / 20`, 14, y)
  doc.text(`Taux d'assiduité moyen : ${attText}`, 140, y)
  doc.text(`Effectif : ${data.students.length} élèves`, 240, y)

  y += 6
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageW - 14, y)
  y += 4

  // Table
  const body = data.students.map(s => [
    s.name,
    s.average != null ? s.average.toFixed(2) : '-',
    s.rank != null ? `${s.rank}` : '-',
    s.attendanceRate != null ? `${s.attendanceRate}%` : '-',
    s.present.toString(),
    s.absent.toString(),
    s.late.toString(),
    s.excused.toString(),
    s.totalSessions.toString(),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Élève', 'Moyenne', 'Rang', 'Assiduité', 'Présent', 'Absent', 'Retard', 'Excusé', 'Total séances']],
    body,
    theme: 'grid',
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 9, textColor: [33, 33, 33] },
    columnStyles: {
      0: { halign: 'left', cellWidth: 55 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'center', cellWidth: 25 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 1) {
        const val = parseFloat(cellData.cell.raw as string)
        if (!isNaN(val)) {
          if (val >= 14) cellData.cell.styles.textColor = [5, 150, 105]
          else if (val >= 10) cellData.cell.styles.textColor = [37, 99, 235]
          else cellData.cell.styles.textColor = [220, 38, 38]
        }
      }
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const raw = (cellData.cell.raw as string).replace('%', '')
        const val = parseFloat(raw)
        if (!isNaN(val)) {
          if (val >= 90) cellData.cell.styles.textColor = [5, 150, 105]
          else if (val >= 75) cellData.cell.styles.textColor = [234, 179, 8]
          else cellData.cell.styles.textColor = [220, 38, 38]
        }
      }
    },
  })

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || y + 60
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, finalY + 10)

  return doc
}

export async function exportClassReportToExcel(data: ClassReportData): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = data.centerName
  wb.created = new Date()

  // Sheet 1 — Résumé
  const wsSummary = wb.addWorksheet('Résumé')
  wsSummary.mergeCells('A1:C1')
  const titleCell = wsSummary.getCell('A1')
  titleCell.value = `Bilan de classe — ${data.className}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
  titleCell.alignment = { horizontal: 'center' }

  wsSummary.addRow([`${data.centerName} — ${data.periodLabel}`])
  wsSummary.addRow([])
  wsSummary.addRow(['Moyenne de classe', data.classAverage != null ? data.classAverage : 'N/A'])
  wsSummary.addRow(['Taux d\'assiduité moyen', data.classAttendanceRate != null ? `${data.classAttendanceRate}%` : 'N/A'])
  wsSummary.addRow(['Effectif', data.students.length])
  wsSummary.getColumn(1).width = 30
  wsSummary.getColumn(2).width = 20

  // Sheet 2 — Détail
  const wsDetail = wb.addWorksheet('Détail')
  const headers = ['Élève', 'Moyenne', 'Rang', 'Assiduité %', 'Présent', 'Absent', 'Retard', 'Excusé', 'Total séances']
  const headerRow = wsDetail.addRow(headers)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    cell.alignment = { horizontal: 'center' }
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })

  for (const s of data.students) {
    const row = wsDetail.addRow([
      s.name,
      s.average != null ? s.average : '-',
      s.rank != null ? s.rank : '-',
      s.attendanceRate != null ? s.attendanceRate : '-',
      s.present,
      s.absent,
      s.late,
      s.excused,
      s.totalSessions,
    ])
    if (s.average != null) {
      const avgCell = row.getCell(2)
      avgCell.numFmt = '0.00'
      if (s.average >= 14) avgCell.font = { bold: true, color: { argb: 'FF059669' } }
      else if (s.average >= 10) avgCell.font = { bold: true, color: { argb: 'FF2563EB' } }
      else avgCell.font = { bold: true, color: { argb: 'FFDC2626' } }
    }
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    })
  }

  wsDetail.getColumn(1).width = 30
  for (let i = 2; i <= 9; i++) wsDetail.getColumn(i).width = 15

  // Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bilan_classe_${data.className.replace(/\s+/g, '_')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
