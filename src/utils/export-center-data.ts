/**
 * Export RGPD : exporte toutes les donnees d'un centre dans un fichier Excel multi-onglets.
 * Droit a la portabilite des donnees (Article 20 RGPD).
 */
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { supabase, isDemoMode } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TableConfig {
  table: string
  sheetName: string
  filterColumn: string
  headers: Record<string, string> // column -> french label
  select?: string
}

const TABLE_CONFIGS: TableConfig[] = [
  {
    table: 'profiles',
    sheetName: 'Utilisateurs',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      first_name: 'Prenom',
      last_name: 'Nom',
      email: 'Email',
      role: 'Role',
      phone: 'Telephone',
      linkedin: 'LinkedIn',
      class_id: 'Classe ID',
      created_at: 'Date creation',
      updated_at: 'Date modification',
    },
  },
  {
    table: 'training_sessions',
    sheetName: 'Seances',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      title: 'Titre',
      description: 'Description',
      date: 'Date',
      start_time: 'Heure debut',
      end_time: 'Heure fin',
      session_type: 'Type',
      session_status: 'Statut',
      room_id: 'Salle ID',
      teacher_id: 'Professeur ID',
      class_id: 'Classe ID',
      subject_id: 'Matiere ID',
      max_participants: 'Max participants',
      visio_provider: 'Visio provider',
      visio_join_url: 'Lien visio',
      created_at: 'Date creation',
    },
  },
  {
    table: 'rooms',
    sheetName: 'Salles',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      name: 'Nom',
      capacity: 'Capacite',
      room_type: 'Type',
      floor: 'Etage',
      building_id: 'Batiment ID',
      equipment: 'Equipements',
      color: 'Couleur',
      created_at: 'Date creation',
    },
  },
  {
    table: 'buildings',
    sheetName: 'Batiments',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      name: 'Nom',
      address: 'Adresse',
      created_at: 'Date creation',
    },
  },
  {
    table: 'diplomas',
    sheetName: 'Diplomes',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      title: 'Titre',
      code: 'Code',
      level: 'Niveau',
      duration_years: 'Duree (annees)',
      description: 'Description',
      created_at: 'Date creation',
    },
  },
  {
    table: 'programs',
    sheetName: 'Programmes',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      name: 'Nom',
      code: 'Code',
      diploma_id: 'Diplome ID',
      description: 'Description',
      created_at: 'Date creation',
    },
  },
  {
    table: 'classes',
    sheetName: 'Classes',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      name: 'Nom',
      diploma_id: 'Diplome ID',
      program_id: 'Programme ID',
      academic_year: 'Annee academique',
      schedule_profile: 'Profil planning',
      start_date: 'Date debut',
      end_date: 'Date fin',
      created_at: 'Date creation',
    },
  },
  {
    table: 'subjects',
    sheetName: 'Matieres',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      name: 'Nom',
      code: 'Code',
      program_id: 'Programme ID',
      category: 'Categorie',
      description: 'Description',
      hours_total: 'Heures totales',
      created_at: 'Date creation',
    },
  },
  {
    table: 'class_subjects',
    sheetName: 'Classes-Matieres',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      class_id: 'Classe ID',
      subject_id: 'Matiere ID',
      coefficient: 'Coefficient',
    },
  },
  {
    table: 'teacher_subjects',
    sheetName: 'Professeurs-Matieres',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      teacher_id: 'Professeur ID',
      subject_id: 'Matiere ID',
    },
  },
  {
    table: 'student_subjects',
    sheetName: 'Etudiants-Matieres',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      student_id: 'Etudiant ID',
      subject_id: 'Matiere ID',
      class_id: 'Classe ID',
      enrollment_type: 'Type inscription',
      status: 'Statut',
      dispensation_reason: 'Motif dispensation',
    },
  },
  {
    table: 'evaluations',
    sheetName: 'Evaluations',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      title: 'Titre',
      class_id: 'Classe ID',
      subject_id: 'Matiere ID',
      teacher_id: 'Professeur ID',
      type: 'Type',
      date: 'Date',
      coefficient: 'Coefficient',
      max_grade: 'Note max',
      is_published: 'Publie',
      created_at: 'Date creation',
    },
  },
  {
    table: 'grades',
    sheetName: 'Notes',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      evaluation_id: 'Evaluation ID',
      student_id: 'Etudiant ID',
      grade: 'Note',
      is_absent: 'Absent',
      comment: 'Commentaire',
      created_at: 'Date creation',
    },
  },
  {
    table: 'session_attendance',
    sheetName: 'Presences',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      session_id: 'Seance ID',
      student_id: 'Etudiant ID',
      status: 'Statut',
      late_minutes: 'Minutes retard',
      excuse_reason: 'Motif excuse',
      marked_by: 'Marque par',
      created_at: 'Date creation',
    },
  },
  {
    table: 'student_contacts',
    sheetName: 'Contacts etudiants',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      student_id: 'Etudiant ID',
      first_name: 'Prenom',
      last_name: 'Nom',
      email: 'Email',
      phone: 'Telephone',
      relation: 'Relation',
      receive_bulletins: 'Recoit bulletins',
      receive_absences: 'Recoit absences',
      created_at: 'Date creation',
    },
  },
  {
    table: 'bulletins',
    sheetName: 'Bulletins',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      student_id: 'Etudiant ID',
      class_id: 'Classe ID',
      period: 'Periode',
      average: 'Moyenne',
      is_sent: 'Envoye',
      sent_at: 'Date envoi',
      generated_at: 'Date generation',
      created_at: 'Date creation',
    },
  },
  {
    table: 'email_logs',
    sheetName: 'Logs emails',
    filterColumn: 'center_id',
    headers: {
      id: 'ID',
      template_type: 'Type template',
      recipient_email: 'Email destinataire',
      subject: 'Objet',
      status: 'Statut',
      error_message: 'Erreur',
      created_at: 'Date creation',
    },
  },
]

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  row.height = 24
}

function autoFitColumns(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let maxLen = 10
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = String(cell.value ?? '').length
      if (len > maxLen) maxLen = len
    })
    col.width = Math.min(maxLen + 4, 50)
  })
}

async function fetchTableData(table: string, filterColumn: string, centerId: string): Promise<Record<string, unknown>[]> {
  const pageSize = 1000
  let allData: Record<string, unknown>[] = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(filterColumn, centerId)
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(`${table}: ${error.message}`)
    }

    if (data && data.length > 0) {
      allData = allData.concat(data as Record<string, unknown>[])
      from += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  return allData
}

export async function exportCenterData(centerId: string, centerName: string): Promise<void> {
  if (isDemoMode) {
    toast.error('Export impossible en mode demo')
    return
  }

  const toastId = toast.loading('Export RGPD en cours...')

  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Planning Ecole SaaS'
    workbook.created = new Date()

    let sheetsCreated = 0
    const errors: string[] = []

    for (const config of TABLE_CONFIGS) {
      try {
        const data = await fetchTableData(config.table, config.filterColumn, centerId)

        const ws = workbook.addWorksheet(config.sheetName)

        // Header row with French labels
        const headerKeys = Object.keys(config.headers)
        const headerLabels = Object.values(config.headers)
        const headerRow = ws.addRow(headerLabels)
        applyHeaderStyle(headerRow)

        // Data rows
        for (const row of data) {
          const values = headerKeys.map(key => {
            const val = row[key]
            // Serialize objects/arrays to JSON string
            if (val !== null && typeof val === 'object') {
              return JSON.stringify(val)
            }
            return val ?? ''
          })
          ws.addRow(values)
        }

        autoFitColumns(ws)
        sheetsCreated++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${config.sheetName}: ${msg}`)
        // Continue with other tables
      }
    }

    if (sheetsCreated === 0) {
      toast.error('Aucune donnee exportee. Verifiez vos permissions.', { id: toastId })
      return
    }

    // Info sheet at the end
    const infoWs = workbook.addWorksheet('Informations')
    infoWs.addRow(['Export RGPD - Droit a la portabilite des donnees'])
    infoWs.getRow(1).font = { bold: true, size: 14 }
    infoWs.addRow([])
    infoWs.addRow(['Centre', centerName])
    infoWs.addRow(['ID Centre', centerId])
    infoWs.addRow(['Date export', new Date().toLocaleString('fr-FR')])
    infoWs.addRow(['Tables exportees', `${sheetsCreated} / ${TABLE_CONFIGS.length}`])
    infoWs.addRow([])

    if (errors.length > 0) {
      infoWs.addRow(['Tables non exportees (erreurs) :'])
      infoWs.getRow(infoWs.rowCount).font = { bold: true, color: { argb: 'FFCC0000' } }
      for (const e of errors) {
        infoWs.addRow([e])
      }
    }

    infoWs.getColumn(1).width = 30
    infoWs.getColumn(2).width = 50

    // Generate file
    const safeName = centerName
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30)
    const dateStr = new Date().toISOString().slice(0, 10)
    const fileName = `export_centre_${safeName}_${dateStr}.xlsx`

    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer]), fileName)

    const msg = errors.length > 0
      ? `Export termine (${sheetsCreated} tables). ${errors.length} table(s) ignoree(s).`
      : `Export termine : ${sheetsCreated} tables exportees.`

    toast.success(msg, { id: toastId, duration: 5000 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    toast.error(`Erreur lors de l'export : ${msg}`, { id: toastId })
  }
}
