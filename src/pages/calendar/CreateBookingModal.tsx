import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Modal, ModalFooter, Button, Input, Select, Textarea } from '@/components/ui'
import type { BookingType } from '@/types'

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
  }) => void
  prefilledDate: Date | null
  prefilledHour: number | null
  rooms: { value: string; label: string }[]
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

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Le titre est requis'
    if (!roomId) errs.roomId = 'La salle est requise'
    if (!date) errs.date = 'La date est requise'
    if (startTime >= endTime) errs.endTime = 'L\'heure de fin doit être après le début'
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
    })
    // Reset
    setTitle('')
    setRoomId('')
    setType('course')
    setDescription('')
    setErrors({})
    onClose()
  }

  const displayDate = prefilledDate
    ? format(prefilledDate, 'EEEE d MMMM yyyy', { locale: fr })
    : ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle réservation" size="md">
      {displayDate && (
        <p className="text-sm text-primary-600 font-medium mb-4 capitalize">{displayDate}</p>
      )}

      <div className="space-y-4">
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
            onChange={e => setStartTime(e.target.value)}
          />
          <Input
            label="Fin"
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            error={errors.endTime}
          />
        </div>

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
          Créer la réservation
        </Button>
      </ModalFooter>
    </Modal>
  )
}
