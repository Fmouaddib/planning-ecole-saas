/**
 * Modal de saisie en lot de séances — Tableau inline direct
 * Chaque ligne = une séance, tout est éditable dans le tableau.
 * Titre = nom de la matière (automatique).
 * Cascade Diplôme → Classe en haut pour filtrer les matières.
 * Bouton récurrence pour remplir en lot, vérification conflits async.
 */

import { useState, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { Modal, ModalFooter, Button, Badge } from '@/components/ui'
import { Plus, X, AlertTriangle, Check, Calendar, Search, Copy, Trash2, Clock } from 'lucide-react'
import type { BookingType, BatchCreateSessionInput } from '@/types'
import { generateRecurrenceDates } from '@/utils/recurrence'
import type { RecurrenceConfig } from '@/utils/recurrence'

interface BatchCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateBatch: (sessions: BatchCreateSessionInput[]) => Promise<void>
  checkRoomConflict: (roomId: string, start: string, end: string) => Promise<boolean>
  checkTrainerConflict: (trainerId: string, start: string, end: string) => Promise<boolean>
  rooms: { value: string; label: string }[]
  teachers: { value: string; label: string }[]
  currentUserId: string
  diplomaOptions: { value: string; label: string }[]
  classOptionsByDiploma: (diplomaId: string) => { value: string; label: string }[]
  subjectOptionsByClass: (classId: string) => { value: string; label: string }[]
  getTeachersBySubject?: (subjectId: string) => { id: string; firstName: string; lastName: string }[]
}

type ConflictStatus = 'unchecked' | 'ok' | 'room_conflict' | 'trainer_conflict' | 'both_conflict' | 'checking'
type Frequency = 'daily' | 'weekly' | 'monthly'

interface RowData {
  id: string
  checked: boolean
  date: string
  startTime: string
  endTime: string
  subjectId: string
  roomId: string
  trainerId: string
  bookingType: BookingType
  classId: string
  conflict: ConflictStatus
}

const typeOptions = [
  { value: 'course', label: 'Cours' },
  { value: 'exam', label: 'Examen' },
  { value: 'meeting', label: 'Réunion' },
  { value: 'event', label: 'Événement' },
  { value: 'maintenance', label: 'Maintenance' },
]

const dayLabels = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']

const frequencyOptions = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
]

const cellInput = 'w-full border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-1 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none bg-white dark:bg-neutral-900 dark:text-neutral-100'
const cellSelect = `${cellInput} appearance-none cursor-pointer pr-5`

function BatchCreateModal({
  isOpen,
  onClose,
  onCreateBatch,
  checkRoomConflict,
  checkTrainerConflict,
  rooms,
  teachers,
  currentUserId,
  diplomaOptions,
  classOptionsByDiploma,
  subjectOptionsByClass,
}: BatchCreateModalProps) {
  const [rows, setRows] = useState<RowData[]>([])
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [ignoreConflicts, setIgnoreConflicts] = useState(false)

  // Global cascade filter (determines available subjects in table rows)
  const [diplomaId, setDiplomaId] = useState('')
  const [classId, setClassId] = useState('')

  const classOptions = useMemo(
    () => (diplomaId ? classOptionsByDiploma(diplomaId) : []),
    [diplomaId, classOptionsByDiploma],
  )
  const subjectOptions = useMemo(
    () => (classId ? subjectOptionsByClass(classId) : []),
    [classId, subjectOptionsByClass],
  )

  // Helper: resolve subject name from id
  const getSubjectName = useCallback(
    (subjectId: string) => subjectOptions.find(s => s.value === subjectId)?.label || '',
    [subjectOptions],
  )

  const hasDiplomaData = diplomaOptions.length > 0

  // Récurrence form
  const [recFrequency, setRecFrequency] = useState<Frequency>('weekly')
  const [recInterval, setRecInterval] = useState(1)
  const [recDays, setRecDays] = useState<number[]>([1])
  const [recStart, setRecStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [recEnd, setRecEnd] = useState('')
  const [recStartTime, setRecStartTime] = useState('09:00')
  const [recEndTime, setRecEndTime] = useState('10:00')
  const [recRoomId, setRecRoomId] = useState('')
  const [recTrainerId, setRecTrainerId] = useState(currentUserId)
  const [recType, setRecType] = useState<BookingType>('course')
  const [recSubjectId, setRecSubjectId] = useState('')

  // Compteur live
  const recCount = useMemo(() => {
    if (!recStart || !recEnd) return 0
    try {
      return generateRecurrenceDates({
        frequency: recFrequency,
        interval: recInterval,
        daysOfWeek: recDays,
        startDate: recStart,
        endDate: recEnd,
      }).length
    } catch { return 0 }
  }, [recFrequency, recInterval, recDays, recStart, recEnd])

  // === Row helpers ===

  const makeRow = useCallback((overrides: Partial<RowData> = {}): RowData => {
    const lastRow = rows[rows.length - 1]
    return {
      id: crypto.randomUUID(),
      checked: true,
      date: '',
      startTime: lastRow?.startTime || '09:00',
      endTime: lastRow?.endTime || '10:00',
      subjectId: lastRow?.subjectId || '',
      roomId: lastRow?.roomId || '',
      trainerId: lastRow?.trainerId || currentUserId,
      bookingType: lastRow?.bookingType || 'course',
      classId: classId,
      conflict: 'unchecked',
      ...overrides,
    }
  }, [rows, currentUserId, classId])

  const addRow = () => setRows(prev => [...prev, makeRow()])

  const duplicateRow = (id: string) => {
    const source = rows.find(r => r.id === id)
    if (!source) return
    const { id: _id, conflict: _c, ...rest } = source
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id)
      const newRow = makeRow({ ...rest, date: '', conflict: 'unchecked' })
      const copy = [...prev]
      copy.splice(idx + 1, 0, newRow)
      return copy
    })
  }

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))

  const updateRow = (id: string, field: keyof RowData, value: string | boolean) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value, conflict: 'unchecked' as ConflictStatus }
      // Auto-adjust end time when start changes
      if (field === 'startTime' && typeof value === 'string') {
        const [h, m] = value.split(':').map(Number)
        const newEndH = Math.min(h + 1, 20)
        const newEnd = `${String(newEndH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        if (newEnd > r.endTime || value >= r.endTime) {
          updated.endTime = newEnd
        }
      }
      return updated
    }))
  }

  const toggleRow = (id: string) => updateRow(id, 'checked', !rows.find(r => r.id === id)?.checked)

  const toggleAll = (checked: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, checked })))
  }

  // === Recurrence fill ===

  const fillFromRecurrence = () => {
    if (!recStart || !recEnd) return
    const config: RecurrenceConfig = {
      frequency: recFrequency,
      interval: recInterval,
      daysOfWeek: recDays,
      startDate: recStart,
      endDate: recEnd,
    }
    const dates = generateRecurrenceDates(config)
    if (dates.length === 0) return

    const newRows: RowData[] = dates.map(date => ({
      id: crypto.randomUUID(),
      checked: true,
      date,
      startTime: recStartTime,
      endTime: recEndTime,
      subjectId: recSubjectId,
      roomId: recRoomId,
      trainerId: recTrainerId,
      bookingType: recType,
      classId: classId,
      conflict: 'unchecked',
    }))

    setRows(prev => [...prev, ...newRows])
    setShowRecurrence(false)
  }

  // === Conflict check ===

  const checkConflicts = useCallback(async () => {
    const toCheck = rows.filter(r => r.date && r.roomId && r.trainerId && r.startTime && r.endTime)
    if (toCheck.length === 0) return

    setIsChecking(true)
    setRows(prev => prev.map(r => {
      if (r.date && r.roomId && r.trainerId && r.startTime && r.endTime) {
        return { ...r, conflict: 'checking' }
      }
      return r
    }))

    const batchSize = 10
    for (let i = 0; i < toCheck.length; i += batchSize) {
      const batch = toCheck.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(async (r) => {
          const startDT = `${r.date}T${r.startTime}:00`
          const endDT = `${r.date}T${r.endTime}:00`
          const [roomConflict, trainerConflict] = await Promise.all([
            checkRoomConflict(r.roomId, startDT, endDT),
            checkTrainerConflict(r.trainerId, startDT, endDT),
          ])
          let status: ConflictStatus = 'ok'
          if (roomConflict && trainerConflict) status = 'both_conflict'
          else if (roomConflict) status = 'room_conflict'
          else if (trainerConflict) status = 'trainer_conflict'
          return { id: r.id, status }
        }),
      )

      setRows(prev => prev.map(r => {
        const idx = batch.findIndex(b => b.id === r.id)
        if (idx === -1) return r
        const result = results[idx]
        if (!result || result.status === 'rejected') return { ...r, conflict: 'ok' }
        const val = result.value as { id: string; status: ConflictStatus }
        return { ...r, conflict: val.status, checked: val.status !== 'ok' ? false : r.checked }
      }))
    }
    setIsChecking(false)
  }, [rows, checkRoomConflict, checkTrainerConflict])

  // === Stats ===

  const isRowComplete = useCallback((r: RowData) => {
    return r.date && r.subjectId && r.roomId && r.trainerId && r.startTime < r.endTime
  }, [])

  const stats = useMemo(() => {
    const total = rows.length
    const conflicts = rows.filter(r => r.conflict !== 'ok' && r.conflict !== 'unchecked' && r.conflict !== 'checking').length
    const selected = rows.filter(r => r.checked).length
    const creatable = rows.filter(r => {
      if (!r.checked || !isRowComplete(r)) return false
      if (!ignoreConflicts && r.conflict !== 'ok' && r.conflict !== 'unchecked') return false
      return true
    }).length
    return { total, conflicts, selected, creatable }
  }, [rows, ignoreConflicts, isRowComplete])

  // === Hours per trainer ===

  const hoursByTrainer = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      if (!r.checked || !r.trainerId || !r.startTime || !r.endTime || r.startTime >= r.endTime) continue
      const [sh, sm] = r.startTime.split(':').map(Number)
      const [eh, em] = r.endTime.split(':').map(Number)
      const minutes = (eh * 60 + em) - (sh * 60 + sm)
      if (minutes <= 0) continue
      map.set(r.trainerId, (map.get(r.trainerId) || 0) + minutes)
    }
    return Array.from(map.entries()).map(([trainerId, totalMinutes]) => {
      const name = teachers.find(t => t.value === trainerId)?.label || 'Inconnu'
      const hours = Math.floor(totalMinutes / 60)
      const mins = totalMinutes % 60
      return { trainerId, name, hours, mins, totalMinutes }
    })
  }, [rows, teachers])

  const totalHoursAll = useMemo(() => {
    const total = hoursByTrainer.reduce((sum, t) => sum + t.totalMinutes, 0)
    return { hours: Math.floor(total / 60), mins: total % 60 }
  }, [hoursByTrainer])

  // === Create ===

  const handleCreate = async () => {
    const toCreate = rows.filter(r => {
      if (!r.checked || !isRowComplete(r)) return false
      if (!ignoreConflicts && r.conflict !== 'ok' && r.conflict !== 'unchecked') return false
      return true
    })
    if (toCreate.length === 0) return

    setIsCreating(true)
    try {
      const inputs: BatchCreateSessionInput[] = toCreate.map(r => ({
        title: getSubjectName(r.subjectId),
        startDateTime: `${r.date}T${r.startTime}:00`,
        endDateTime: `${r.date}T${r.endTime}:00`,
        roomId: r.roomId,
        trainerId: r.trainerId,
        bookingType: r.bookingType,
        subjectId: r.subjectId || undefined,
        classId: r.classId || undefined,
      }))
      await onCreateBatch(inputs)
      handleClose()
    } catch {
      // Error handled by hook toast
    } finally {
      setIsCreating(false)
    }
  }

  // === Close & reset ===

  const handleClose = () => {
    setRows([])
    setShowRecurrence(false)
    setIgnoreConflicts(false)
    setDiplomaId('')
    setClassId('')
    setRecStartTime('09:00')
    setRecEndTime('10:00')
    setRecRoomId('')
    setRecTrainerId(currentUserId)
    setRecType('course')
    setRecSubjectId('')
    setRecFrequency('weekly')
    setRecInterval(1)
    setRecDays([1])
    setRecStart(format(new Date(), 'yyyy-MM-dd'))
    setRecEnd('')
    onClose()
  }

  const conflictBadge = (status: ConflictStatus) => {
    switch (status) {
      case 'unchecked': return <span className="text-[10px] text-neutral-400">—</span>
      case 'ok': return <Badge variant="success" size="sm">OK</Badge>
      case 'room_conflict': return <Badge variant="error" size="sm">Salle</Badge>
      case 'trainer_conflict': return <Badge variant="warning" size="sm">Prof</Badge>
      case 'both_conflict': return <Badge variant="error" size="sm">Salle+Prof</Badge>
      case 'checking': return <span className="text-[10px] text-neutral-400 animate-pulse">...</span>
    }
  }

  const hasIncompleteRows = rows.some(r => !isRowComplete(r))

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Saisie en lot" size="xl">
      {/* Global cascade: Diplôme → Classe (filters subjects available in table) */}
      {hasDiplomaData && (
        <div className="flex items-end gap-3 mb-3 pb-3 border-b border-neutral-100">
          <div className="flex-1 max-w-[200px]">
            <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Diplôme</label>
            <select className={cellSelect} value={diplomaId}
              onChange={e => { setDiplomaId(e.target.value); setClassId(''); setRecSubjectId('') }}>
              <option value="">Sélectionner...</option>
              {diplomaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-[200px]">
            <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Classe</label>
            <select className={cellSelect} value={classId} disabled={!diplomaId}
              onChange={e => { setClassId(e.target.value); setRecSubjectId('') }}>
              <option value="">{diplomaId ? 'Sélectionner...' : '—'}</option>
              {classOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {classId && subjectOptions.length > 0 && (
            <span className="text-[11px] text-neutral-500 pb-1">
              {subjectOptions.length} matière{subjectOptions.length > 1 ? 's' : ''} disponible{subjectOptions.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button variant="secondary" size="sm" leftIcon={Plus} onClick={addRow}>
          Ligne
        </Button>
        <Button
          variant={showRecurrence ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={Calendar}
          onClick={() => setShowRecurrence(!showRecurrence)}
        >
          Remplir (récurrence)
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={Search}
          onClick={checkConflicts}
          disabled={isChecking || rows.length === 0}
        >
          {isChecking ? 'Vérification...' : 'Vérifier conflits'}
        </Button>

        <div className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
          {stats.total > 0 && (
            <>
              <span>{stats.total} ligne{stats.total > 1 ? 's' : ''}</span>
              {stats.conflicts > 0 && (
                <Badge variant="error" size="sm">{stats.conflicts} conflit{stats.conflicts > 1 ? 's' : ''}</Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recurrence panel */}
      {showRecurrence && (
        <div className="border border-primary-200 bg-primary-50/50 rounded-lg p-3 mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-primary-800">Remplir via récurrence</h4>
            <button onClick={() => setShowRecurrence(false)} className="text-neutral-400 hover:text-neutral-600">
              <X size={16} />
            </button>
          </div>

          {/* Template row */}
          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Matière</label>
              <select className={cellSelect} value={recSubjectId} disabled={subjectOptions.length === 0}
                onChange={e => setRecSubjectId(e.target.value)}>
                <option value="">{subjectOptions.length === 0 ? 'Choisir diplôme/classe' : '—'}</option>
                {subjectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Début</label>
              <input type="time" className={cellInput} value={recStartTime} onChange={e => setRecStartTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Fin</label>
              <input type="time" className={cellInput} value={recEndTime} onChange={e => setRecEndTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Salle</label>
              <select className={cellSelect} value={recRoomId} onChange={e => setRecRoomId(e.target.value)}>
                <option value="">—</option>
                {rooms.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Professeur</label>
              <select className={cellSelect} value={recTrainerId} onChange={e => setRecTrainerId(e.target.value)}>
                <option value="">—</option>
                {teachers.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Type on its own row */}
          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Type</label>
              <select className={cellSelect} value={recType} onChange={e => setRecType(e.target.value as BookingType)}>
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Récurrence config */}
          <div className="grid grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Fréquence</label>
              <select className={cellSelect} value={recFrequency} onChange={e => setRecFrequency(e.target.value as Frequency)}>
                {frequencyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Intervalle</label>
              <div className="flex items-center gap-1">
                <input type="number" min={1} max={12} value={recInterval}
                  onChange={e => setRecInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`${cellInput} w-14 text-center`}
                />
                <span className="text-[11px] text-neutral-500 whitespace-nowrap">
                  {recFrequency === 'daily' ? 'j.' : recFrequency === 'weekly' ? 'sem.' : 'mois'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Du</label>
              <input type="date" className={cellInput} value={recStart} onChange={e => setRecStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-0.5">Au</label>
              <input type="date" className={cellInput} value={recEnd} onChange={e => setRecEnd(e.target.value)} min={recStart} />
            </div>
          </div>

          {/* Jours de la semaine (weekly) */}
          {recFrequency === 'weekly' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-600 font-medium mr-1">Jours :</span>
              {dayLabels.map((label, i) => (
                <button key={i}
                  className={`w-8 h-8 rounded-full text-[11px] font-medium transition-colors ${
                    recDays.includes(i) ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                  }`}
                  onClick={() => setRecDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Action */}
          <div className="flex items-center justify-between">
            {recStart && recEnd ? (
              <span className="text-xs text-primary-700 font-medium">
                {recCount} séance{recCount > 1 ? 's' : ''} seront ajoutées
              </span>
            ) : (
              <span className="text-xs text-neutral-400">Renseigner les dates</span>
            )}
            <Button size="sm" onClick={fillFromRecurrence} disabled={recCount === 0 || !recRoomId || !recTrainerId}>
              Ajouter au tableau
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="text-center py-12 text-neutral-400">
          <Calendar size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune séance. Ajoutez des lignes ou utilisez la récurrence.</p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto border border-neutral-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 sticky top-0 z-10">
              <tr>
                <th className="px-1.5 py-2 w-8">
                  <input type="checkbox"
                    checked={rows.length > 0 && rows.every(r => r.checked)}
                    onChange={e => toggleAll(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                </th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold">Date</th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold">Début</th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold">Fin</th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold min-w-[130px]">Matière</th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold">Salle</th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold">Professeur</th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold">Type</th>
                <th className="px-1.5 py-2 text-left text-neutral-600 font-semibold w-20">Statut</th>
                <th className="px-1.5 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => {
                const rowInvalid = !r.date || !r.subjectId || !r.roomId || !r.trainerId || r.startTime >= r.endTime
                return (
                  <tr key={r.id}
                    className={`${!r.checked ? 'opacity-40' : ''} ${
                      r.conflict === 'room_conflict' || r.conflict === 'both_conflict' ? 'bg-error-50/40' :
                      r.conflict === 'trainer_conflict' ? 'bg-warning-50/40' : ''
                    } ${rowInvalid && r.checked ? 'bg-yellow-50/40' : ''} hover:bg-neutral-50/50`}
                  >
                    <td className="px-1.5 py-1">
                      <input type="checkbox" checked={r.checked}
                        onChange={() => toggleRow(r.id)} className="rounded border-neutral-300" />
                    </td>
                    <td className="px-1.5 py-1">
                      <input type="date" className={cellInput} style={{ width: '130px' }}
                        value={r.date} onChange={e => updateRow(r.id, 'date', e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1">
                      <input type="time" className={cellInput} style={{ width: '90px' }}
                        value={r.startTime} onChange={e => updateRow(r.id, 'startTime', e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1">
                      <input type="time" className={cellInput} style={{ width: '90px' }}
                        value={r.endTime} onChange={e => updateRow(r.id, 'endTime', e.target.value)} />
                    </td>
                    <td className="px-1.5 py-1">
                      <select className={cellSelect} value={r.subjectId}
                        onChange={e => updateRow(r.id, 'subjectId', e.target.value)}>
                        <option value="">{subjectOptions.length === 0 ? 'Choisir diplôme/classe' : '—'}</option>
                        {subjectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-1.5 py-1">
                      <select className={cellSelect} value={r.roomId}
                        onChange={e => updateRow(r.id, 'roomId', e.target.value)}>
                        <option value="">—</option>
                        {rooms.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-1.5 py-1">
                      <select className={cellSelect} value={r.trainerId}
                        onChange={e => updateRow(r.id, 'trainerId', e.target.value)}>
                        <option value="">—</option>
                        {teachers.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-1.5 py-1">
                      <select className={cellSelect} value={r.bookingType}
                        onChange={e => updateRow(r.id, 'bookingType', e.target.value)}>
                        {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-1.5 py-1 text-center">
                      {conflictBadge(r.conflict)}
                    </td>
                    <td className="px-1.5 py-1">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => duplicateRow(r.id)}
                          className="p-1 text-neutral-400 hover:text-primary-600 transition-colors" title="Dupliquer">
                          <Copy size={13} />
                        </button>
                        <button onClick={() => removeRow(r.id)}
                          className="p-1 text-neutral-400 hover:text-error-600 transition-colors" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ignore conflicts */}
      {stats.conflicts > 0 && (
        <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer mt-2">
          <input type="checkbox" checked={ignoreConflicts}
            onChange={e => setIgnoreConflicts(e.target.checked)} className="rounded border-neutral-300" />
          <AlertTriangle size={13} className="text-warning-500" />
          Ignorer les conflits et forcer la création
        </label>
      )}

      {hasIncompleteRows && rows.length > 0 && (
        <p className="text-[11px] text-warning-600 mt-1 flex items-center gap-1">
          <AlertTriangle size={12} />
          Certaines lignes sont incomplètes (date, matière, salle ou professeur manquant)
        </p>
      )}

      {/* Hours per trainer */}
      {hoursByTrainer.length > 0 && (
        <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap text-xs">
          <Clock size={14} className="text-neutral-500 shrink-0" />
          {hoursByTrainer.length === 1 ? (
            <span className="text-neutral-700">
              <span className="font-medium">{hoursByTrainer[0].name}</span>
              {' : '}
              <span className="font-semibold text-primary-700">
                {hoursByTrainer[0].hours}h{hoursByTrainer[0].mins > 0 ? `${String(hoursByTrainer[0].mins).padStart(2, '0')}` : ''}
              </span>
            </span>
          ) : (
            <>
              {hoursByTrainer.map(t => (
                <span key={t.trainerId} className="text-neutral-700">
                  <span className="font-medium">{t.name}</span>
                  {' : '}
                  <span className="font-semibold text-primary-700">
                    {t.hours}h{t.mins > 0 ? `${String(t.mins).padStart(2, '0')}` : ''}
                  </span>
                </span>
              ))}
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-700">
                Total : <span className="font-semibold text-primary-700">
                  {totalHoursAll.hours}h{totalHoursAll.mins > 0 ? `${String(totalHoursAll.mins).padStart(2, '0')}` : ''}
                </span>
              </span>
            </>
          )}
        </div>
      )}

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>Annuler</Button>
        <Button onClick={handleCreate}
          disabled={isCreating || stats.creatable === 0}
          leftIcon={Check}
        >
          {isCreating
            ? 'Création...'
            : `Créer ${stats.creatable} séance${stats.creatable > 1 ? 's' : ''}`}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default BatchCreateModal
