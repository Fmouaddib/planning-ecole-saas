/**
 * Parse CSV and XLSX files into raw data
 */
import ExcelJS from 'exceljs'

export interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
  fileName: string
  rowCount: number
}

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file)
  throw new Error(`Format non supporté: .${ext}. Utilisez .csv ou .xlsx`)
}

async function parseCSV(file: File): Promise<ParseResult> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('Le fichier CSV est vide ou ne contient qu\'un en-tête')

  // Detect separator (`;` or `,`)
  const firstLine = lines[0]
  const sep = firstLine.includes(';') ? ';' : ','

  const headers = firstLine.split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''))
  const rows = lines.slice(1).map(line => {
    const values = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })

  return { headers, rows, fileName: file.name, rowCount: rows.length }
}

async function parseXLSX(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new Error('Le fichier Excel ne contient aucune feuille')

  const headers: string[] = []
  const rows: Record<string, string>[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => {
        headers.push(String(cell.value || '').trim())
      })
    } else {
      const rowData: Record<string, string> = {}
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1]
        if (header) rowData[header] = String(cell.value || '').trim()
      })
      // Fill missing headers with empty strings
      headers.forEach(h => { if (!(h in rowData)) rowData[h] = '' })
      rows.push(rowData)
    }
  })

  if (headers.length === 0) throw new Error('Aucun en-tête trouvé dans le fichier Excel')

  return { headers, rows, fileName: file.name, rowCount: rows.length }
}
