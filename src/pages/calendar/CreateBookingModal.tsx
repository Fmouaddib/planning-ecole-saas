import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Modal, ModalFooter, Button, Input, Select, Textarea } from '@/components/ui'
import { AlertTriangle, FileText, Video } from 'lucide-react'
import type { BookingType, Class } from '@/types'
import { isClassDay, getExamPeriod } from '@/utils/scheduleUtils'
import { localToISO } from '@/utils/helpers'

interface VirtualRoomOption {
  value: string
  label: string
  url: string
}

interface CoursOption {
  value: string  // "classId::subjectId"
  label: string
  classId: string
  subjectId: string
}

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
    sessionType?: 'in_person' | 'online' | 'hybrid'
    meetingUrl?: string
  }) => void
  prefilledDate: Date | null
  prefilledHour: number | null
  rooms: { value: string; label: string }[]
  virtualRooms?: VirtualRoomOption[]
  diplomaOptions?: { value: string; label: string }[]
  classOptionsByDiploma?: (diplomaId: string) => { value: string; label: string }[]
  subjectOptionsByClass?: (classId: string) => { value: string; label: string }[]
  getClassById?: (classId: string) => Class | undefined
  isVisioAutoCreate?: boolean
  visioProviderName?: string
  openingTime?: string
  closingTime?: string
  isOnlineSchool?: boolean
  roomOptional?: boolean
  isMergedMode?: boolean
  coursOptions?: CoursOption[]
  customTypeOptions?: { value: string; label: string }[]
}

const DEFAULT_TYPE_OPTIONS = [
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
  virtualRooms = [],
  diplomaOptions = [],
  classOptionsByDiploma,
  subjectOptionsByClass,
  getClassById,
  isVisioAutoCreate,
  visioProviderName,
  openingTime = '08:00',
  closingTime = '20:00',
  isOnlineSchool = false,
  roomOptional = false,
  isMergedMode = false,
  coursOptions = [],
  customTypeOptions,
}: CreateBookingModalProps) {
  const dateStr = prefilledDate ? format(prefilledDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const openH = parseInt(openingTime.split(':')[0], 10)
  const closeH = parseInt(closingTime.split(':')[0], 10)
  const startH = prefilledHour != null ? prefilledHour : openH
  const endH = Math.min(startH + 1, closeH)

  const [title, setTitle] = useState('')
  const [roomId, setRoomId] = useState('')
  const [type, setType] = useState<BookingType>('course')
  const [date, setDate] = useState(dateStr)
  const [startTime, setStartTime] = useState(`${String(startH).padStart(2, '0')}:00`)
  const [endTime, setEndTime] = useState(`${String(endH).padStart(2, '0')}:00`)
  const [description, setDescription] = useState('')
  const [sessionType, setSessionType] = useState<'in_person' | 'online' | 'hybrid'>(isOnlineSchool ? 'online' : 'in_person')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [virtualRoomId, setVirtualRoomId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const typeOptions = customTypeOptions && customTypeOptions.length > 0 ? customTypeOptions : DEFAULT_TYPE_OPTIONS

  // Cascade académique
  const [diplomaId, setDiplomaId] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [selectedCoursId, setSelectedCoursId] = useState('')

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

  const handleCoursChange = (coursValue: string) => {
    setSelectedCoursId(coursValue)
    if (!coursValue) {
      setClassId('')
      setSubjectId('')
      return
    }
    const cours = coursOptions.find(c => c.value === coursValue)
    if (cours) {
      setClassId(cours.classId)
      setSubjectId(cours.subjectId)
      if (!title.trim()) {
        setTitle(cours.label)
      }
    }
  }

  const isOnlineOrHybrid = sessionType === 'online' || sessionType === 'hybrid'
  const hasVirtualRooms = virtualRooms.length > 0 && isOnlineOrHybrid
  const isUrlFromRoom = hasVirtualRooms && virtualRoomId !== ''

  const handleVirtualRoomChange = (roomId: string) => {
    setVirtualRoomId(roomId)
    if (roomId) {
      const room = virtualRooms.find(r => r.value === roomId)
      if (room) setMeetingUrl(room.url)
    } else {
      setMeetingUrl('')
    }
  }

  const handleSessionTypeChange = (newType: 'in_person' | 'online' | 'hybrid') => {
    setSessionType(newType)
    if (newType === 'in_person') {
      setVirtualRoomId('')
      setMeetingUrl('')
    }
  }

  // Auto-ajuster l'heure de fin quand le début change (+1h, max closing)
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart)
    const [h, m] = newStart.split(':').map(Number)
    const endH = Math.min(h + 1, closeH)
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
    if (!isOnlineSchool && !roomOptional && !roomId) errs.roomId = 'La salle est requise'
    if (!date) errs.date = 'La date est requise'
    if (startTime >= endTime) errs.endTime = 'L\'heure de fin doit être après le début'
    if (startTime < openingTime) errs.startTime = `Début minimum : ${openingTime}`
    if (endTime > closingTime) errs.endTime = `Fin maximum : ${closingTime}`
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const startDateTime = localToISO(date, startTime)
    const endDateTime = localToISO(date, endTime)
    onSubmit({
      title: title.trim(),
      roomId,
      type,
      startDateTime,
      endDateTime,
      description: description.trim(),
      subjectId: subjectId || undefined,
      classId: classId || undefined,
      sessionType,
      meetingUrl: meetingUrl.trim() || undefined,
    })
    // Reset
    setTitle('')
    setRoomId('')
    setType('course')
    setDescription('')
    setSessionType('in_person')
    setMeetingUrl('')
    setVirtualRoomId('')
    setDiplomaId('')
    setClassId('')
    setSubjectId('')
    setSelectedCoursId('')
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
        {/* Cascade académique ou sélecteur Cours (mode fusionné) */}
        {isMergedMode && coursOptions.length > 0 ? (
          <Select
            label="Cours"
            options={[{ value: '', label: 'Sélectionner un cours...' }, ...coursOptions]}
            value={selectedCoursId}
            onChange={e => handleCoursChange(e.target.value)}
          />
        ) : hasDiplomaData && (
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

        <div className={`grid ${isOnlineSchool ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          {!isOnlineSchool && (
            <Select
              label="Salle"
              options={[{ value: '', label: 'Sélectionner...' }, ...rooms]}
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              error={errors.roomId}
            />
          )}
          <Select
            label="Type"
            options={typeOptions}
            value={type}
            onChange={e => setType(e.target.value as BookingType)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Mode"
            options={[
              { value: 'in_person', label: 'Présentiel' },
              { value: 'online', label: 'En ligne' },
              { value: 'hybrid', label: 'Hybride' },
            ]}
            value={sessionType}
            onChange={e => handleSessionTypeChange(e.target.value as 'in_person' | 'online' | 'hybrid')}
          />
          {hasVirtualRooms && (
            <Select
              label="Lien favori"
              options={[
                { value: '', label: 'Saisie libre' },
                ...virtualRooms.map(r => ({ value: r.value, label: r.label })),
              ]}
              value={virtualRoomId}
              onChange={e => handleVirtualRoomChange(e.target.value)}
            />
          )}
        </div>
        {isOnlineOrHybrid && (
          <div className="relative">
            <Input
              label="Lien visio (Zoom/Teams/Meet)"
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
              placeholder="https://teams.microsoft.com/..."
              readOnly={isUrlFromRoom}
              className={isUrlFromRoom ? 'bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed' : ''}
            />
            <Video size={16} className={`absolute right-3 top-9 ${isUrlFromRoom ? 'text-primary-400' : 'text-neutral-400'}`} />
          </div>
        )}
        {isOnlineOrHybrid && isVisioAutoCreate && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs bg-blue-50 dark:bg-blue-900/20">
            <Video size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-blue-600 dark:text-blue-400">
              {meetingUrl ? (
                <>Le lien saisi sera utilisé. La création automatique {visioProviderName || 'visio'} est désactivée pour cette séance.</>
              ) : (
                <>Un lien <strong>{visioProviderName || 'visio'}</strong> unique sera créé automatiquement pour cette séance.</>
              )}
            </div>
          </div>
        )}

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
            min={openingTime}
            max={closingTime}
            error={errors.startTime}
          />
          <Input
            label="Fin"
            type="time"
            value={endTime}
            onChange={e => handleEndTimeChange(e.target.value)}
            min={startTime}
            max={closingTime}
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
