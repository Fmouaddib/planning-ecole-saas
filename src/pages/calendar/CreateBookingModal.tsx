import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Modal, ModalFooter, Button, Input, Select, Textarea } from '@/components/ui'
import { AlertTriangle, FileText } from 'lucide-react'
import type { BookingType, Class } from '@/types'
import { isClassDay, getExamPeriod } from '@/utils/scheduleUtils'

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    roomId: string
    type: BookingType
    startDateTime: string
    endDateTime: string
    description: string
    subjectId?: string
    classId?: string
  }) => void
  prefilledDate: Date | null
  prefilledHour: number | null
  rooms: { value: string; label: string }[]
  diplomaOptions?: { value: string; label: string }[]
  classOptionsByDiploma?: (diplomaId: string) => { value: string; label: string }[]
  subjectOptionsByClass?: (classId: string) => { value: string; label: string }[]
  getClassById?: (classId: string) => Class | undefined
}

const typeOptions = [
  { value: 'course', label: 'Cours' },
  { value: 'exam', label: 'Examen' },
  { value: 'meeting', label: 'Réunion' },
  { value: 'event', label: 'Événement' },
  { value: 'maintenance', label: 'Maintenance' },
]

export function CreateBookingModal({
  isOpen,
  onClose,
  onSubmit,
  prefilledDate,
  prefilledHour,
  rooms,
  diplomaOptions = [],
  classOptionsByDiploma,
  subjectOptionsByClass,
  getClassById,
}: CreateBookingModalProps) {
  const dateStr = prefilledDate ? format(prefilledDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const startH = prefilledHour != null ? prefilledHour : 8
  const endH = Math.min(startH + 1, 20)

  const [title, setTitle] = useState('')
  const [roomId, setRoomId] = useState('')
  const [type, setType] = useState<BookingType>('course')
  const [date, setDate] = useState(dateStr)
  const [startTime, setStartTime] = useState(`${String(startH).padStart(2, '0')}:00`)
  const [endTime, setEndTime] = useState(`${String(endH).padStart(2, '0')}:00`)
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cascade académique
  const [diplomaId, setDiplomaId] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')

  const classOptions = useMemo(
    () => (diplomaId && classOptionsByDiploma ? classOptionsByDiploma(diplomaId) : []),
    [diplomaId, classOptionsByDiploma],
  )

  const subjectOptions = useMemo(
    () => (classId && subjectOptionsByClass ? subjectOptionsByClass(classId) : []),
    [classId, subjectOptionsByClass],
  )

  const hasDiplomaData = diplomaOptions.length > 0

  // Avertissement planning classe
  const scheduleWarning = useMemo(() => {
    if (!classId || !date || !getClassById) return null
    const cls = getClassById(classId)
    if (!cls) return null
    const result = isClassDay(cls, date)
    if (result.isPresent) return null
    const className = classOptions.find(c => c.value === classId)?.label || cls.name
    return { className, reason: result.reason || '' }
  }, [classId, date, getClassById, classOptions])

  // Info période d'examen
  const examPeriodInfo = useMemo(() => {
    if (!classId || !date || !getClassById) return null
    const cls = getClassById(classId)
    if (!cls) return null
    const period = getExamPeriod(cls, date)
    if (!period) return null
    const className = classOptions.find(c => c.value === classId)?.label || cls.name
    return { className, periodName: period.name }
  }, [classId, date, getClassById, classOptions])

  const handleDiplomaChange = (newDiplomaId: string) => {
    setDiplomaId(newDiplomaId)
    setClassId('')
    setSubjectId('')
  }

  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId)
    setSubjectId('')
  }

  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId)
    // Auto-remplir le titre si vide
    if (!title.trim()) {
      const subjectLabel = subjectOptions.find(s => s.value === newSubjectId)?.label
      const classLabel = classOptions.find(c => c.value === classId)?.label
      if (subjectLabel && classLabel) {
        setTitle(`${subjectLabel} - ${classLabel}`)
      } else if (subjectLabel) {
        setTitle(subjectLabel)
      }
    }
  }

  // Auto-ajuster l'heure de fin quand le début change (+1h, max 20:00)
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart)
    const [h, m] = newStart.split(':').map(Number)
    const endH = Math.min(h + 1, 20)
    const newEnd = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    // Ajuster la fin seulement si elle serait avant le nouveau début
    if (newEnd > endTime || newStart >= endTime) {
      setEndTime(newEnd)
    }
  }

  // Empêcher l'heure de fin d'être avant le début
  const handleEndTimeChange = (newEnd: string) => {
    if (newEnd <= startTime) return
    setEndTime(newEnd)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Le titre est requis'
    if (!roomId) errs.roomId = 'La salle est requise'
    if (!date) errs.date = 'La date est requise'
    if (startTime >= endTime) errs.endTime = 'L\'heure de fin doit être après le début'
    if (startTime < '08:00') errs.startTime = 'Début minimum : 08:00'
    if (endTime > '20:00') errs.endTime = 'Fin maximum : 20:00'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const startDateTime = `${date}T${startTime}:00`
    const endDateTime = `${date}T${endTime}:00`
    onSubmit({
      title: title.trim(),
      roomId,
      type,
      startDateTime,
      endDateTime,
      description: description.trim(),
      subjectId: subjectId || undefined,
      classId: classId || undefined,
    })
    // Reset
    setTitle('')
    setRoomId('')
    setType('course')
    setDescription('')
    setDiplomaId('')
    setClassId('')
    setSubjectId('')
    setErrors({})
    onClose()
  }

  const displayDate = prefilledDate
    ? format(prefilledDate, 'EEEE d MMMM yyyy', { locale: fr })
    : ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle séance" size="md">
      {displayDate && (
        <p className="text-sm text-primary-600 font-medium mb-4 capitalize">{displayDate}</p>
      )}

      <div className="space-y-4">
        {/* Cascade académique */}
        {hasDiplomaData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Diplôme"
              options={[{ value: '', label: 'Sélectionner...' }, ...diplomaOptions]}
              value={diplomaId}
              onChange={e => handleDiplomaChange(e.target.value)}
            />
            <Select
              label="Classe"
              options={[{ value: '', label: diplomaId ? 'Sélectionner...' : 'Choisir un diplôme' }, ...classOptions]}
              value={classId}
              onChange={e => handleClassChange(e.target.value)}
              disabled={!diplomaId}
            />
            <Select
              label="Matière"
              options={[{ value: '', label: classId ? 'Sélectionner...' : 'Choisir une classe' }, ...subjectOptions]}
              value={subjectId}
              onChange={e => handleSubjectChange(e.target.value)}
              disabled={!classId}
            />
          </div>
        )}

        <Input
          label="Titre"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Cours de Mathématiques"
          error={errors.title}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Salle"
            options={[{ value: '', label: 'Sélectionner...' }, ...rooms]}
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            error={errors.roomId}
          />
          <Select
            label="Type"
            options={typeOptions}
            value={type}
            onChange={e => setType(e.target.value as BookingType)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            error={errors.date}
          />
          <Input
            label="Début"
            type="time"
            value={startTime}
            onChange={e => handleStartTimeChange(e.target.value)}
            min="08:00"
            max="19:00"
            error={errors.startTime}
          />
          <Input
            label="Fin"
            type="time"
            value={endTime}
            onChange={e => handleEndTimeChange(e.target.value)}
            min={startTime}
            max="20:00"
            error={errors.endTime}
          />
        </div>

        {/* Avertissement hors planning classe */}
        {scheduleWarning && (
          <div className="flex items-start gap-2 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg px-3 py-2.5">
            <AlertTriangle size={16} className="text-warning-600 shrink-0 mt-0.5" />
            <p className="text-sm text-warning-700 dark:text-warning-400">
              La classe <strong>{scheduleWarning.className}</strong> n'a pas cours ce jour. {scheduleWarning.reason}
            </p>
          </div>
        )}

        {/* Info période d'examen */}
        {examPeriodInfo && (
          <div className="flex items-start gap-2 bg-info-50 dark:bg-info-950/30 border border-info-200 dark:border-info-800 rounded-lg px-3 py-2.5">
            <FileText size={16} className="text-info-600 shrink-0 mt-0.5" />
            <p className="text-sm text-info-700 dark:text-info-400">
              Période d'examen <strong>{examPeriodInfo.periodName}</strong> pour la classe {examPeriodInfo.className}
            </p>
          </div>
        )}

        <Textarea
          label="Description (optionnel)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Notes, détails..."
          rows={3}
        />
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Créer la séance
        </Button>
      </ModalFooter>
    </Modal>
  )
}
