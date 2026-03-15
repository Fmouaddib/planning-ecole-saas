import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import { SIDEBAR_DATE_EVENT } from '@/components/layout/SidebarCalendar'
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { useBookings } from '@/hooks/useBookings'
import { useRooms } from '@/hooks/useRooms'
import { useAuth } from '@/hooks/useAuth'
import { Button, Select, Modal, ModalFooter, Badge, LoadingSpinner, MultiSelect, Input, Textarea, HelpBanner } from '@/components/ui'
import { formatTimeRange, isTeacherRole, isStudentRole, localToISO } from '@/utils/helpers'
import { useAcademicData } from '@/hooks/useAcademicData'
import { useVisio } from '@/hooks/useVisio'
import { navigateTo } from '@/utils/navigation'
import { useCenterSettings } from '@/hooks/useCenterSettings'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import type { CalendarEvent, ExportFormat, BookingType, UpdateBookingData } from '@/types'
import { isDemoMode } from '@/lib/supabase'
import { mockCalendarData } from '@/data/mock-calendar-data'
import { mockBuildingRooms } from '@/data/mock-room-buildings'
import { ColorLegend } from './ColorLegend'
import { CalendarIntegrationModal } from '@/components/calendar/CalendarIntegrationModal'
import { ImportModal } from '@/components/import/ImportModal'
import { printWeekSchedule } from '@/utils/export-print'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Download,
  Upload,
  ChevronDown,
  X,
  Printer,
  Repeat,
  AlertTriangle,
  Video,
  Pencil,
  Trash2,
  XCircle,
  Share2,
  Mail,
  Copy,
  Check,
  MessageCircle,
  RotateCcw,
  CalendarPlus,
} from 'lucide-react'

// Lazy-loaded views & modals
const WeekView = lazy(() => import('./WeekView'))
const MonthView = lazy(() => import('./MonthView'))
const DayView = lazy(() => import('./DayView'))
const RoomsView = lazy(() => import('./RoomsView').then(m => ({ default: m.RoomsView })))
const BatchCreateModal = lazy(() => import('./BatchCreateModal'))
const CreateBookingModal = lazy(() => import('./CreateBookingModal').then(m => ({ default: m.CreateBookingModal })))

type ViewMode = 'week' | 'month' | 'day' | 'rooms'

const bookingTypeLabels: Record<string, string> = {
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

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
  completed: 'neutral',
}

const recurrenceLabels: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
}

// ==================== MAIN COMPONENT ====================

function CalendarPage() {
  const { calendarEvents, isLoading, error, refreshBookings, createBooking, updateBooking, deleteBooking, cancelBooking, reactivateBooking, createBatchBookings, checkBookingConflict, checkTrainerConflict } = useBookings()
  const { rooms, buildingsWithRooms } = useRooms()
  const {
    diplomaOptions,
    classOptionsByDiploma,
    subjectOptionsByClass,
    allSubjectOptions,
    allDiplomaOptions,
    allClassOptions,
    teachers,
    getTeachersBySubject,
    getClassById,
    getClassIdsForStudent,
    coursList,
  } = useAcademicData()
  const { virtualRooms } = useVisio()
  const { settings: centerSettings } = useCenterSettings()
  const { plan } = useSubscriptionInfo()
  const isOnlineSchool = plan?.tier === 'ecole-en-ligne'
  const isMergedMode = !!centerSettings.merge_class_subject

  // Cours options (mode fusionné class+subject)
  const coursOptions = useMemo(
    () => coursList.map(c => ({
      value: `${c.classId}::${c.subjectId}`,
      label: c.name,
      classId: c.classId,
      subjectId: c.subjectId,
    })),
    [coursList],
  )

  // Type options (custom or default)
  const typeOptions = useMemo(() => {
    if (centerSettings.custom_session_types && centerSettings.custom_session_types.length > 0) {
      return centerSettings.custom_session_types
    }
    return [
      { value: 'course', label: 'Cours' },
      { value: 'exam', label: 'Examen' },
      { value: 'meeting', label: 'Réunion' },
      { value: 'event', label: 'Événement' },
      { value: 'maintenance', label: 'Maintenance' },
    ]
  }, [centerSettings.custom_session_types])

  // Horaires et jours d'ouverture du centre
  const rawStart = centerSettings.opening_time ? parseInt(centerSettings.opening_time.split(':')[0], 10) : 8
  const rawEnd = centerSettings.closing_time ? parseInt(centerSettings.closing_time.split(':')[0], 10) : 20
  // 00:00 = minuit = 24h ; s'assurer que hourEnd > hourStart avec minimum 1h d'écart
  const centerHourStart = isNaN(rawStart) ? 8 : rawStart
  const centerHourEnd = (isNaN(rawEnd) || rawEnd <= centerHourStart) ? (rawEnd === 0 ? 24 : Math.max(centerHourStart + 1, 20)) : rawEnd
  const centerWorkingDays = centerSettings.working_days || [1, 2, 3, 4, 5]
  const calendarLabels = centerSettings.calendar_labels || ['title', 'room', 'teacher']

  const virtualRoomOptions = useMemo(
    () => virtualRooms.map(r => ({
      value: r.id,
      label: `${r.name} (${r.platform === 'teams' ? 'Teams' : r.platform === 'zoom' ? 'Zoom' : 'Autre'})`,
      url: r.meetingUrl,
    })),
    [virtualRooms],
  )

  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [roomFilter, setRoomFilter] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([])
  const [selectedDiplomes, setSelectedDiplomes] = useState<string[]>([])
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([])
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  const [showCalendarIntegration, setShowCalendarIntegration] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const printMenuRef = useRef<HTMLDivElement>(null)
  const pendingSessionRef = useRef<string | null>(null)

  // Create booking modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [createHour, setCreateHour] = useState<number | null>(null)

  // Edit event modal state
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editRoomId, setEditRoomId] = useState('')
  const [editAdditionalRoomIds, setEditAdditionalRoomIds] = useState<string[]>([])
  const [editType, setEditType] = useState<BookingType>('course')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSessionType, setEditSessionType] = useState<'in_person' | 'online' | 'hybrid'>('in_person')
  const [editMeetingUrl, setEditMeetingUrl] = useState('')
  const [editDiplomaId, setEditDiplomaId] = useState('')
  const [editClassId, setEditClassId] = useState('')
  const [editSubjectId, setEditSubjectId] = useState('')
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [shareCopied, setShareCopied] = useState<'email' | 'whatsapp' | null>(null)
  const [visioCopied, setVisioCopied] = useState(false)

  // Batch create modal state
  const [showBatchModal, setShowBatchModal] = useState(false)
  // Import sessions modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const { user } = useAuth()
  const isTeacher = isTeacherRole(user?.role)
  const isStudent = isStudentRole(user?.role)
  const isReadOnly = isTeacher || isStudent
  const [showOnlyMine, setShowOnlyMine] = useState(isTeacher ?? false)

  // Sync showOnlyMine quand user charge après le montage (useState n'update pas)
  useEffect(() => {
    if (isTeacher) setShowOnlyMine(true)
  }, [isTeacher])

  // Class IDs for student filtering
  const studentClassIds = useMemo(() => {
    if (!isStudent || !user?.id) return []
    return getClassIdsForStudent(user.id)
  }, [isStudent, user?.id, getClassIdsForStudent])

  const teacherProfileOptions = useMemo(
    () => teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}`.trim() })),
    [teachers],
  )

  // Import context maps for session import
  const importContext = useMemo(() => {
    const roomMap = new Map<string, string>()
    rooms.forEach(r => roomMap.set(r.name.toLowerCase(), r.id))

    const teacherEmailMap = new Map<string, string>()
    teachers.forEach(t => { if (t.email) teacherEmailMap.set(t.email.toLowerCase(), t.id) })

    const classMap = new Map<string, string>()
    const classNames: string[] = []
    allClassOptions.forEach(c => { classMap.set(c.label.toLowerCase(), c.value); classNames.push(c.label) })

    const subjectMap = new Map<string, string>()
    const subjectNames: string[] = []
    allSubjectOptions.forEach(s => { subjectMap.set(s.label.toLowerCase(), s.value); subjectNames.push(s.label) })

    return {
      roomNames: rooms.map(r => r.name),
      teacherEmails: teachers.map(t => t.email).filter(Boolean) as string[],
      classNames,
      subjectNames,
      sessionTypeValues: typeOptions.map(t => t.value),
      roomMap,
      teacherEmailMap,
      classMap,
      subjectMap,
    }
  }, [rooms, teachers, allClassOptions, allSubjectOptions, typeOptions])

  // Reference data for session template (onglet Données)
  const importReferenceData = useMemo(() => ({
    rooms: rooms.map(r => r.name),
    teachers: teachers.map(t => ({
      name: `${t.firstName} ${t.lastName}`.trim(),
      email: t.email || '',
    })).filter(t => t.email),
    classes: allClassOptions.map(c => c.label),
    subjects: allSubjectOptions.map(s => s.label),
  }), [rooms, teachers, allClassOptions, allSubjectOptions])

  // Pending move confirmation state (drag & drop)
  const [pendingMove, setPendingMove] = useState<{
    eventId: string
    event: CalendarEvent
    newStart: string
    newEnd: string
  } | null>(null)

  // Editable move form state
  const [moveDate, setMoveDate] = useState('')
  const [moveStartTime, setMoveStartTime] = useState('')
  const [moveEndTime, setMoveEndTime] = useState('')
  const [moveRoomId, setMoveRoomId] = useState('')

  // Initialize editable fields when pendingMove changes
  useEffect(() => {
    if (pendingMove) {
      const newStart = parseISO(pendingMove.newStart)
      setMoveDate(format(newStart, 'yyyy-MM-dd'))
      setMoveStartTime(format(newStart, 'HH:mm'))
      const newEnd = parseISO(pendingMove.newEnd)
      setMoveEndTime(format(newEnd, 'HH:mm'))
      setMoveRoomId(pendingMove.event.roomId || '')
    }
  }, [pendingMove])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setShowPrintMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const roomOptions = rooms.map(r => ({
    value: r.id,
    label: r.building ? `${r.name} (${r.building.name})` : r.name,
  }))

  // F1 - Extract unique teachers
  const allEvents = useMemo(
    () => (isDemoMode ? mockCalendarData : calendarEvents),
    [calendarEvents],
  )

  const teacherOptions = useMemo(() => {
    const teachers = new Set<string>()
    allEvents.forEach(e => {
      const t = e.teacher || e.userName
      if (t) teachers.add(t)
    })
    return Array.from(teachers)
      .sort()
      .map(t => ({ value: t, label: t }))
  }, [allEvents])

  const activeFilterCount =
    (roomFilter ? 1 : 0) +
    (selectedMatieres.length > 0 ? 1 : 0) +
    (selectedDiplomes.length > 0 ? 1 : 0) +
    (selectedNiveaux.length > 0 ? 1 : 0) +
    (selectedTeachers.length > 0 ? 1 : 0) +
    (activeTypes.length > 0 ? 1 : 0)

  const resetFilters = () => {
    setRoomFilter('')
    setSelectedMatieres([])
    setSelectedDiplomes([])
    setSelectedNiveaux([])
    setSelectedTeachers([])
    setActiveTypes([])
  }

  const filteredEvents = useMemo(() => {
    let events = allEvents
    if (isStudent) {
      // Étudiant : TOUJOURS filtré par sa classe (pas de toggle)
      // Sans classe assignée → aucune séance visible
      events = studentClassIds.length > 0
        ? events.filter(e => e.classId && studentClassIds.includes(e.classId))
        : []
    } else if (showOnlyMine && user?.id && isTeacher) {
      // Professeur : TOUTES les séances visibles, mais celles des autres profs grisées
      events = events.map(e =>
        e.userId === user.id ? e : { ...e, isGhost: true }
      )
    } else if (showOnlyMine && user?.id) {
      events = events.filter(e => e.userId === user.id)
    }
    if (roomFilter) events = events.filter(e => e.roomId === roomFilter)
    if (selectedMatieres.length) events = events.filter(e => e.matiere && selectedMatieres.includes(e.matiere))
    if (selectedDiplomes.length) events = events.filter(e => e.diplome && selectedDiplomes.includes(e.diplome))
    if (selectedNiveaux.length) events = events.filter(e => e.niveau && selectedNiveaux.includes(e.niveau))
    if (selectedTeachers.length) {
      events = events.filter(e => {
        const t = e.teacher || e.userName
        return t && selectedTeachers.includes(t)
      })
    }
    if (activeTypes.length) events = events.filter(e => e.type && activeTypes.includes(e.type))
    return events
  }, [allEvents, showOnlyMine, isStudent, isTeacher, studentClassIds, user?.id, roomFilter, selectedMatieres, selectedDiplomes, selectedNiveaux, selectedTeachers, activeTypes])

  const totalRooms = useMemo(() => {
    if (roomFilter) return 1
    if (isDemoMode) return mockBuildingRooms.reduce((s, b) => s + b.rooms.length, 0)
    return rooms.length || 1
  }, [roomFilter, rooms.length])

  const handleToggleType = (type: string) => {
    setActiveTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    )
  }

  const handleExport = async (fmt: ExportFormat, mode: 'list' | 'calendar' | 'ical' = 'list') => {
    const exportModule = await import('@/utils/export')
    const filename = `planning-${format(currentDate, 'yyyy-MM-dd')}`
    if (mode === 'ical') {
      exportModule.exportToICal(filteredEvents, filename)
    } else if (mode === 'calendar') {
      const calFilename = `${filename}-calendrier`
      switch (fmt) {
        case 'excel': await exportModule.exportToExcelCalendar(filteredEvents, currentDate, calFilename); break
        case 'csv': exportModule.exportToCSVCalendar(filteredEvents, currentDate, calFilename); break
        case 'pdf': exportModule.exportToPDFCalendar(filteredEvents, currentDate, calFilename); break
        case 'word': exportModule.exportToWordCalendar(filteredEvents, currentDate, calFilename); break
      }
    } else {
      switch (fmt) {
        case 'excel': await exportModule.exportToExcel(filteredEvents, filename); break
        case 'csv': exportModule.exportToCSV(filteredEvents, filename); break
        case 'pdf': exportModule.exportToPDF(filteredEvents, filename); break
        case 'word': exportModule.exportToWord(filteredEvents, filename); break
      }
    }
    setShowExportMenu(false)
  }

  const handlePrint = () => {
    window.print()
  }

  // Navigation
  const goToToday = () => setCurrentDate(new Date())
  const goNext = () => {
    if (view === 'week' || view === 'rooms') setCurrentDate(d => addWeeks(d, 1))
    else if (view === 'month') setCurrentDate(d => addMonths(d, 1))
    else setCurrentDate(d => addDays(d, 1))
  }
  const goPrev = () => {
    if (view === 'week' || view === 'rooms') setCurrentDate(d => subWeeks(d, 1))
    else if (view === 'month') setCurrentDate(d => subMonths(d, 1))
    else setCurrentDate(d => subDays(d, 1))
  }

  // Listen for sidebar mini-calendar date selection
  useEffect(() => {
    // Check if a date was set before mount (e.g. navigating from another page)
    const stored = sessionStorage.getItem('planning-target-date')
    const targetSessionId = sessionStorage.getItem('planning-target-session')
    if (stored) {
      sessionStorage.removeItem('planning-target-date')
      sessionStorage.removeItem('planning-target-session')
      const targetDate = new Date(stored)
      setCurrentDate(targetDate)
      // If navigating to a specific session, stay in week view; otherwise day view
      if (!targetSessionId) {
        setView('day')
      }
    }
    // Store the target session ID to open once events are loaded
    if (targetSessionId) {
      sessionStorage.removeItem('planning-target-session')
      pendingSessionRef.current = targetSessionId
    }

    const handler = (e: Event) => {
      const date = (e as CustomEvent<Date>).detail
      setCurrentDate(date)
      setView('day')
    }
    window.addEventListener(SIDEBAR_DATE_EVENT, handler)
    return () => window.removeEventListener(SIDEBAR_DATE_EVENT, handler)
  }, [])

  // Auto-open session popup when navigated from dashboard
  useEffect(() => {
    if (pendingSessionRef.current && filteredEvents.length > 0) {
      const target = filteredEvents.find(e => e.id === pendingSessionRef.current)
      if (target) {
        setSelectedEvent(target)
        pendingSessionRef.current = null
      }
    }
  }, [filteredEvents])

  // Notify sidebar when currentDate changes (for sync)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('calendar-date-change', { detail: currentDate }))
  }, [currentDate])

  // Create event from calendar click
  const handleSlotClick = (date: Date, hour: number | null) => {
    if (isReadOnly) return
    setCreateDate(date)
    setCreateHour(hour)
    setShowCreateModal(true)
  }

  // Bloquer le clic sur les séances ghost (autres profs)
  const handleEventClick = (event: CalendarEvent) => {
    if (event.isGhost) return
    setSelectedEvent(event)
  }

  const handleCreateSubmit = async (data: {
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
  }) => {
    try {
      await createBooking({
        title: data.title,
        roomId: data.roomId,
        bookingType: data.type,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        description: data.description,
        subjectId: data.subjectId,
        classId: data.classId,
        sessionType: data.sessionType,
        meetingUrl: data.meetingUrl,
      })
    } catch {
      // Error handled by hook toast
    }
  }

  // Drag & drop handler — ouvre la modale de confirmation au lieu de sauvegarder directement
  const handleEventUpdate = (eventId: string, newStart: string, newEnd: string) => {
    if (isReadOnly) return
    const event = filteredEvents.find(e => e.id === eventId)
    if (!event) return
    setPendingMove({ eventId, event, newStart, newEnd })
  }

  // Validation : fin > début
  const moveTimeError = moveStartTime && moveEndTime && moveEndTime <= moveStartTime
    ? 'L\'heure de fin doit être après l\'heure de début'
    : ''

  // Confirmation du déplacement après validation modale
  const confirmMove = async () => {
    if (!pendingMove || !moveDate || !moveStartTime || !moveEndTime || moveTimeError) return
    const startDateTime = localToISO(moveDate, moveStartTime)
    const endDateTime = localToISO(moveDate, moveEndTime)
    const updateData: { id: string; startDateTime: string; endDateTime: string; roomId?: string } = {
      id: pendingMove.eventId,
      startDateTime,
      endDateTime,
    }
    if (moveRoomId && moveRoomId !== pendingMove.event.roomId) {
      updateData.roomId = moveRoomId
    }
    try {
      await updateBooking(updateData)
    } catch {
      // Erreur gérée par le toast du hook (conflit inclus)
    }
    setPendingMove(null)
  }

  // ─── Edit event helpers ─────────────────────────────────
  const isAdmin = !isReadOnly && !!user

  const editClassOptions = useMemo(
    () => (editDiplomaId && classOptionsByDiploma ? classOptionsByDiploma(editDiplomaId) : []),
    [editDiplomaId, classOptionsByDiploma],
  )
  const editSubjectOptions = useMemo(
    () => (editClassId && subjectOptionsByClass ? subjectOptionsByClass(editClassId) : []),
    [editClassId, subjectOptionsByClass],
  )

  const enterEditMode = () => {
    if (!selectedEvent) return
    const startDt = typeof selectedEvent.start === 'string' ? parseISO(selectedEvent.start) : selectedEvent.start
    const endDt = typeof selectedEvent.end === 'string' ? parseISO(selectedEvent.end) : selectedEvent.end
    setEditTitle(selectedEvent.title)
    setEditRoomId(selectedEvent.roomId || '')
    setEditAdditionalRoomIds(selectedEvent.additionalRoomIds || [])
    setEditType((selectedEvent.type as BookingType) || 'course')
    setEditDate(format(startDt, 'yyyy-MM-dd'))
    setEditStartTime(format(startDt, 'HH:mm'))
    setEditEndTime(format(endDt, 'HH:mm'))
    setEditDescription(selectedEvent.description || '')
    setEditSessionType(selectedEvent.sessionType || 'in_person')
    setEditMeetingUrl(selectedEvent.meetingUrl || '')
    // Resolve diplomaId from classId
    const cls = selectedEvent.classId ? getClassById(selectedEvent.classId) : undefined
    setEditDiplomaId(cls?.diplomaId || '')
    setEditClassId(selectedEvent.classId || '')
    setEditSubjectId(selectedEvent.subjectId || '')
    setEditErrors({})
    setEditMode(true)
  }

  const exitEditMode = () => {
    setEditMode(false)
    setEditErrors({})
  }

  const validateEdit = () => {
    const errs: Record<string, string> = {}
    if (!editTitle.trim()) errs.title = 'Le titre est requis'
    if (!isOnlineSchool && !centerSettings.room_optional && !editRoomId) errs.roomId = 'La salle est requise'
    if (!editDate) errs.date = 'La date est requise'
    if (editStartTime >= editEndTime) errs.endTime = "L'heure de fin doit être après le début"
    setEditErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleEditSave = async () => {
    if (!selectedEvent || !validateEdit()) return
    setEditSaving(true)
    try {
      const data: UpdateBookingData = {
        id: selectedEvent.id,
        title: editTitle.trim(),
        roomId: editRoomId || undefined,
        additionalRoomIds: editAdditionalRoomIds,
        bookingType: editType,
        startDateTime: localToISO(editDate, editStartTime),
        endDateTime: localToISO(editDate, editEndTime),
        description: editDescription.trim(),
        subjectId: editSubjectId || undefined,
        classId: editClassId || undefined,
        sessionType: editSessionType,
        meetingUrl: editMeetingUrl.trim() || undefined,
      }
      await updateBooking(data)
      setSelectedEvent(null)
      setEditMode(false)
    } catch {
      // Error handled by hook toast
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    try {
      await deleteBooking(selectedEvent.id)
      setSelectedEvent(null)
      setEditMode(false)
      setShowDeleteConfirm(false)
    } catch {
      // Error handled by hook toast
    }
  }

  const handleCancelEvent = async () => {
    if (!selectedEvent) return
    try {
      await cancelBooking(selectedEvent.id)
      setSelectedEvent(null)
      setEditMode(false)
      setShowCancelConfirm(false)
    } catch {
      // Error handled by hook toast
    }
  }

  const handleReactivateEvent = async () => {
    if (!selectedEvent) return
    try {
      await reactivateBooking(selectedEvent.id)
      setSelectedEvent(null)
    } catch {
      // Error handled by hook toast
    }
  }

  const copyVisioLink = async () => {
    if (!selectedEvent?.meetingUrl) return
    try {
      await navigator.clipboard.writeText(selectedEvent.meetingUrl)
      setVisioCopied(true)
      setTimeout(() => setVisioCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = selectedEvent.meetingUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setVisioCopied(true)
      setTimeout(() => setVisioCopied(false), 2000)
    }
  }

  // ─── Share helpers ─────────────────────────────────
  const getCoursForEvent = (event: CalendarEvent) => {
    if (!event.classId || !event.subjectId) return null
    return coursList.find(c => c.classId === event.classId && c.subjectId === event.subjectId) || null
  }

  const buildShareMessage = (event: CalendarEvent, format: 'email' | 'whatsapp') => {
    const startDt = typeof event.start === 'string' ? parseISO(event.start) : event.start
    const endDt = typeof event.end === 'string' ? parseISO(event.end) : event.end
    const dateStr = startDt ? `${startDt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : ''
    const timeStr = startDt && endDt ? `${startDt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endDt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''
    const teacher = event.teacher || event.userName || ''
    const room = event.roomName || ''
    const subject = event.matiere || ''
    const visio = event.meetingUrl || ''
    const cours = getCoursForEvent(event)
    const formationLink = cours?.formationLink || ''

    if (format === 'whatsapp') {
      let msg = `📅 *${event.title}*\n📆 ${dateStr}\n⏰ ${timeStr}`
      if (teacher) msg += `\n👨‍🏫 ${teacher}`
      if (subject) msg += `\n📚 ${subject}`
      if (room) msg += `\n📍 ${room}`
      if (visio) msg += `\n🔗 ${visio}`
      if (formationLink) msg += `\n🎓 ${formationLink}`
      if (event.description) msg += `\n\n${event.description}`
      return msg
    }
    // email
    let msg = `${event.title}\n\nDate : ${dateStr}\nHoraire : ${timeStr}`
    if (teacher) msg += `\nProfesseur : ${teacher}`
    if (subject) msg += `\nMatière : ${subject}`
    if (room) msg += `\nSalle : ${room}`
    if (visio) msg += `\nLien visio : ${visio}`
    if (formationLink) msg += `\nLien formation : ${formationLink}`
    if (event.description) msg += `\n\nDescription :\n${event.description}`
    return msg
  }

  const copyShareMessage = async (fmt: 'email' | 'whatsapp') => {
    if (!selectedEvent) return
    const msg = buildShareMessage(selectedEvent, fmt)
    try {
      await navigator.clipboard.writeText(msg)
      setShareCopied(fmt)
      setTimeout(() => setShareCopied(null), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = msg
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setShareCopied(fmt)
      setTimeout(() => setShareCopied(null), 2000)
    }
  }

  const openMailtoShare = () => {
    if (!selectedEvent) return
    const msg = buildShareMessage(selectedEvent, 'email')
    const subject = encodeURIComponent(selectedEvent.title)
    const body = encodeURIComponent(msg)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
  }

  const openWhatsAppShare = () => {
    if (!selectedEvent) return
    const msg = buildShareMessage(selectedEvent, 'whatsapp')
    const encoded = encodeURIComponent(msg)
    // If course has a WhatsApp group link, open that group directly
    const cours = getCoursForEvent(selectedEvent)
    if (cours?.whatsappLink) {
      window.open(cours.whatsappLink, '_blank')
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank')
    }
  }

  const headerLabel = useMemo(() => {
    if (view === 'week' || view === 'rooms') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`
    }
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: fr })
    return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
  }, [currentDate, view])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Chargement du calendrier..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-error-600 mb-4">{error}</p>
        <Button variant="secondary" leftIcon={RefreshCw} onClick={refreshBookings}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Print header - visible only when printing */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Calendrier - Planning</h1>
        <p className="text-neutral-600 capitalize">{headerLabel}</p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Calendrier</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 capitalize">{headerLabel}</p>
        </div>
      </div>

      <HelpBanner storageKey={isStudent ? 'student-calendar' : isTeacher ? 'teacher-calendar' : 'admin-calendar'}>
        {isStudent
          ? (<>Consultez votre emploi du temps. Cliquez sur une séance pour voir les détails : salle, horaire et lien visio le cas échéant.
            <span className="flex gap-2 mt-2">
              <button onClick={() => navigateTo('/my-class')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Ma classe →</button>
              <button onClick={() => navigateTo('/grades')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Mes notes →</button>
            </span></>)
          : isTeacher
            ? (<>Consultez votre planning de séances. Cliquez sur une séance pour voir les détails. Pour demander un changement, passez par l'espace Collaboration.
                <span className="flex gap-2 mt-2">
                  <button onClick={() => navigateTo('/teacher-collab')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Espace Collaboration →</button>
                </span></>)
            : (<>Le calendrier affiche toutes les séances de votre centre. Basculez entre les vues Semaine, Mois, Jour et Salles. Cliquez sur un créneau vide pour créer une séance.
                <span className="flex gap-2 mt-2">
                  <button onClick={() => navigateTo('/settings')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Configurer le calendrier →</button>
                  <button onClick={() => navigateTo('/rooms')} className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors">Gérer les salles →</button>
                </span></>)}
      </HelpBanner>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 no-print">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goPrev}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
          <Button variant="secondary" size="sm" onClick={goNext}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {(['day', 'week', 'month', ...(!isReadOnly && !isOnlineSchool ? ['rooms'] : [])] as ViewMode[]).map(v => (
              <button
                key={v}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v ? 'bg-primary-600 text-white' : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                onClick={() => setView(v)}
              >
                {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Salles'}
              </button>
            ))}
          </div>

          <button
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtres
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Print button with dropdown */}
          <div className="relative" ref={printMenuRef}>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setShowPrintMenu(!showPrintMenu)}
              title="Imprimer"
            >
              <Printer size={16} />
              Imprimer
              <ChevronDown size={14} className={`transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
            </button>
            {showPrintMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 z-50">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  onClick={() => { handlePrint(); setShowPrintMenu(false) }}
                >
                  Imprimer la page
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  onClick={() => {
                    printWeekSchedule({
                      title: selectedNiveaux.length === 1
                        ? (allClassOptions.find(c => c.label === selectedNiveaux[0])?.label || 'Planning')
                        : selectedTeachers.length === 1
                          ? selectedTeachers[0]
                          : 'Planning general',
                      centerName: 'Mon Centre',
                      weekStart: currentDate,
                      events: filteredEvents,
                    })
                    setShowPrintMenu(false)
                  }}
                >
                  Emploi du temps PDF (semaine)
                </button>
              </div>
            )}
          </div>


          {/* Batch create & Import buttons — admin/super_admin */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
                onClick={() => setShowBatchModal(true)}
              >
                <Repeat size={16} />
                Saisie en lot
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
                onClick={() => setShowImportModal(true)}
              >
                <Upload size={16} />
                Importer
              </button>
            </>
          )}

          {/* Subscribe to calendar feed */}
          <button
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            onClick={() => setShowCalendarIntegration(true)}
            title="Intégrer dans Google Calendar, Outlook, Apple..."
          >
            <CalendarPlus size={16} />
            S'abonner
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download size={16} />
              Export
              <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 z-50 mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Grille semaine</div>
                {([
                  { fmt: 'excel' as ExportFormat, label: 'Excel', ext: '.xlsx' },
                  { fmt: 'pdf' as ExportFormat, label: 'PDF', ext: '.pdf' },
                  { fmt: 'word' as ExportFormat, label: 'Word', ext: '.doc' },
                  { fmt: 'csv' as ExportFormat, label: 'CSV', ext: '.csv' },
                ]).map(({ fmt, label, ext }) => (
                  <button
                    key={`cal-${fmt}`}
                    className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-700 transition-colors flex items-center justify-between"
                    onClick={() => handleExport(fmt, 'calendar')}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] text-neutral-400">{ext}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Liste</div>
                {([
                  { fmt: 'excel' as ExportFormat, label: 'Excel', ext: '.xlsx' },
                  { fmt: 'pdf' as ExportFormat, label: 'PDF', ext: '.pdf' },
                  { fmt: 'word' as ExportFormat, label: 'Word', ext: '.doc' },
                  { fmt: 'csv' as ExportFormat, label: 'CSV', ext: '.csv' },
                ]).map(({ fmt, label, ext }) => (
                  <button
                    key={`list-${fmt}`}
                    className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-700 transition-colors flex items-center justify-between"
                    onClick={() => handleExport(fmt, 'list')}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] text-neutral-400">{ext}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Agenda</div>
                <button
                  className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-neutral-800 hover:text-primary-700 transition-colors flex items-center justify-between"
                  onClick={() => handleExport('ical', 'ical')}
                >
                  <span>iCal (Google, Apple, Outlook)</span>
                  <span className="text-[10px] text-neutral-400">.ics</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft p-4 mb-4 no-print">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Filtres avancés</h3>
            {activeFilterCount > 0 && (
              <button
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                onClick={resetFilters}
              >
                <X size={12} />
                Réinitialiser
              </button>
            )}
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isOnlineSchool ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-4`}>
            {!isOnlineSchool && (
              <div>
                <Select
                  label="Salle"
                  options={[{ value: '', label: 'Toutes les salles' }, ...roomOptions]}
                  value={roomFilter}
                  onChange={e => setRoomFilter(e.target.value)}
                />
              </div>
            )}
            <MultiSelect
              label="Professeur"
              options={teacherOptions}
              value={selectedTeachers}
              onChange={setSelectedTeachers}
              placeholder="Tous les professeurs"
            />
            <MultiSelect
              label="Matière"
              options={allSubjectOptions}
              value={selectedMatieres}
              onChange={setSelectedMatieres}
              placeholder="Toutes les matières"
            />
            <MultiSelect
              label="Diplôme"
              options={allDiplomaOptions}
              value={selectedDiplomes}
              onChange={setSelectedDiplomes}
              placeholder="Tous les diplômes"
            />
            <MultiSelect
              label="Classe"
              options={allClassOptions}
              value={selectedNiveaux}
              onChange={setSelectedNiveaux}
              placeholder="Toutes les classes"
            />
          </div>
        </div>
      )}

      {/* F2 - Color Legend */}
      <ColorLegend activeTypes={activeTypes} onToggleType={handleToggleType} events={allEvents} />

      {/* Calendar Views */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-soft overflow-hidden print-calendar">
        <Suspense fallback={<div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
              onEventUpdate={handleEventUpdate}
              hourStart={centerHourStart}
              hourEnd={centerHourEnd}
              workingDays={centerWorkingDays}
              calendarLabels={calendarLabels as any}
            />
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onDayClick={(day) => handleSlotClick(day, null)}
              totalRooms={totalRooms}
              hourStart={centerHourStart}
              hourEnd={centerHourEnd}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
              onEventUpdate={handleEventUpdate}
              hourStart={centerHourStart}
              hourEnd={centerHourEnd}
              calendarLabels={calendarLabels as any}
            />
          )}
        </Suspense>
        {view === 'rooms' && (
          <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
            <RoomsView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={handleEventClick}
              hourStart={centerHourStart}
              hourEnd={centerHourEnd}
              buildings={isDemoMode
                ? mockBuildingRooms.map(b => ({
                    ...b,
                    rooms: b.rooms.map(r => ({ id: r.name, name: r.name, capacity: r.capacity })),
                  }))
                : buildingsWithRooms
              }
            />
          </Suspense>
        )}
      </div>

      {/* Event Detail / Edit Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => { setSelectedEvent(null); exitEditMode(); setShowDeleteConfirm(false); setShowCancelConfirm(false); setVisioCopied(false) }}
        title={editMode ? 'Modifier la séance' : 'Détail de la séance'}
        size={editMode ? 'md' : 'sm'}
      >
        {selectedEvent && !editMode && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{selectedEvent.title}</h3>
              {selectedEvent.recurrence && (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                  <Repeat size={12} />
                  {recurrenceLabels[selectedEvent.recurrence.frequency] || selectedEvent.recurrence.frequency}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isOnlineSchool && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Salle</label>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {selectedEvent.roomName || '-'}
                    {selectedEvent.additionalRoomIds && selectedEvent.additionalRoomIds.length > 0 && (
                      <span className="text-neutral-500"> + {selectedEvent.additionalRoomIds.map(rid => rooms.find(r => r.id === rid)?.name || '?').join(', ')}</span>
                    )}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Type</label>
                <p className="text-neutral-900 dark:text-neutral-100">{typeOptions.find(t => t.value === selectedEvent.type)?.label || bookingTypeLabels[selectedEvent.type || ''] || selectedEvent.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Horaire</label>
                <p className="text-neutral-900 dark:text-neutral-100">
                  {selectedEvent.start && selectedEvent.end
                    ? formatTimeRange(selectedEvent.start as string, selectedEvent.end as string)
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Date</label>
                <p className="text-neutral-900 dark:text-neutral-100">
                  {selectedEvent.start
                    ? format(typeof selectedEvent.start === 'string' ? parseISO(selectedEvent.start) : selectedEvent.start, 'dd/MM/yyyy', { locale: fr })
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Statut</label>
                <div className="mt-1">
                  <Badge variant={statusBadgeVariant[selectedEvent.status || ''] || 'neutral'} size="sm">
                    {statusLabels[selectedEvent.status || ''] || selectedEvent.status}
                  </Badge>
                </div>
              </div>
              {(selectedEvent.teacher || selectedEvent.userName) && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Professeur</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.teacher || selectedEvent.userName}</p>
                </div>
              )}
              {selectedEvent.matiere && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Matière</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.matiere}</p>
                </div>
              )}
              {selectedEvent.diplome && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Diplôme</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.diplome}</p>
                </div>
              )}
              {selectedEvent.niveau && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Classe</label>
                  <p className="text-neutral-900 dark:text-neutral-100">{selectedEvent.niveau}</p>
                </div>
              )}
              {selectedEvent.sessionType && selectedEvent.sessionType !== 'in_person' && (
                <div>
                  <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Mode</label>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {selectedEvent.sessionType === 'online' ? 'En ligne' : 'Hybride'}
                  </p>
                </div>
              )}
            </div>
            {selectedEvent.meetingUrl && (
              <div>
                {isStudent ? (
                  <div className="flex gap-2">
                    <a
                      href={selectedEvent.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors"
                    >
                      <Video size={18} />
                      Rejoindre la visio
                    </a>
                    <button
                      onClick={copyVisioLink}
                      className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
                      title="Copier le lien"
                    >
                      {visioCopied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Lien visio</label>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={selectedEvent.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                      >
                        <Video size={16} />
                        Rejoindre la visio
                      </a>
                      <button
                        onClick={copyVisioLink}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Copier le lien"
                      >
                        {visioCopied ? <><Check size={12} className="text-green-600" /> Copié</> : <><Copy size={12} /> Copier</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {selectedEvent.description && (
              <div>
                <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Description</label>
                <p className="text-neutral-700 dark:text-neutral-300 mt-1">{selectedEvent.description}</p>
              </div>
            )}

            {/* ─── Partage ─── */}
            {(centerSettings.show_session_sharing !== false) && <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Share2 size={14} className="text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Partager</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => copyShareMessage('email')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors border border-purple-200 dark:border-purple-800"
                  >
                    {shareCopied === 'email' ? <Check size={14} /> : <Copy size={14} />}
                    {shareCopied === 'email' ? 'Copié !' : 'Copier email'}
                  </button>
                  <button
                    onClick={openMailtoShare}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
                  >
                    <Mail size={14} />
                    Envoyer par email
                  </button>
                </div>
                {/* WhatsApp */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => copyShareMessage('whatsapp')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-green-200 dark:border-green-800"
                  >
                    {shareCopied === 'whatsapp' ? <Check size={14} /> : <Copy size={14} />}
                    {shareCopied === 'whatsapp' ? 'Copié !' : 'Copier WhatsApp'}
                  </button>
                  <button
                    onClick={openWhatsAppShare}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors border border-green-200 dark:border-green-800"
                  >
                    <MessageCircle size={14} />
                    Ouvrir WhatsApp
                  </button>
                </div>
              </div>
            </div>}

            {/* Cancel confirmation */}
            {showCancelConfirm && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-3">
                  Annuler la séance « {selectedEvent?.title} » ? Les participants seront notifiés.
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleCancelEvent}>
                    Confirmer l'annulation
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowCancelConfirm(false)}>
                    Non, garder
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Edit Form (admin only) ─── */}
        {selectedEvent && editMode && (
          <div className="space-y-4">
            {/* Cascade académique ou sélecteur Cours (mode fusionné) */}
            {isMergedMode && coursOptions.length > 0 ? (
              <Select
                label="Cours"
                options={[{ value: '', label: 'Sélectionner un cours...' }, ...coursOptions]}
                value={editClassId && editSubjectId ? `${editClassId}::${editSubjectId}` : ''}
                onChange={e => {
                  const val = e.target.value
                  if (!val) { setEditClassId(''); setEditSubjectId(''); return }
                  const cours = coursOptions.find(c => c.value === val)
                  if (cours) {
                    setEditClassId(cours.classId)
                    setEditSubjectId(cours.subjectId)
                    if (!editTitle.trim()) setEditTitle(cours.label)
                  }
                }}
              />
            ) : diplomaOptions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Diplôme"
                  options={[{ value: '', label: 'Sélectionner...' }, ...diplomaOptions]}
                  value={editDiplomaId}
                  onChange={e => { setEditDiplomaId(e.target.value); setEditClassId(''); setEditSubjectId('') }}
                />
                <Select
                  label="Classe"
                  options={[{ value: '', label: editDiplomaId ? 'Sélectionner...' : 'Choisir un diplôme' }, ...editClassOptions]}
                  value={editClassId}
                  onChange={e => { setEditClassId(e.target.value); setEditSubjectId('') }}
                  disabled={!editDiplomaId}
                />
                <Select
                  label="Matière"
                  options={[{ value: '', label: editClassId ? 'Sélectionner...' : 'Choisir une classe' }, ...editSubjectOptions]}
                  value={editSubjectId}
                  onChange={e => setEditSubjectId(e.target.value)}
                  disabled={!editClassId}
                />
              </div>
            )}

            <Input
              label="Titre"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Ex: Cours de Mathématiques"
              error={editErrors.title}
            />

            <div className={`grid ${isOnlineSchool ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
              {!isOnlineSchool && (
                <Select
                  label={centerSettings.room_optional ? 'Salle (facultative)' : 'Salle'}
                  options={[{ value: '', label: centerSettings.room_optional ? 'Aucune salle' : 'Sélectionner...' }, ...roomOptions]}
                  value={editRoomId}
                  onChange={e => setEditRoomId(e.target.value)}
                  error={editErrors.roomId}
                />
              )}
              <Select
                label="Type"
                options={typeOptions}
                value={editType}
                onChange={e => setEditType(e.target.value as BookingType)}
              />
            </div>
            {!isOnlineSchool && centerSettings.allow_multi_room && editRoomId && (
              <MultiSelect
                label="Salles supplémentaires"
                options={roomOptions.filter(r => r.value !== editRoomId)}
                value={editAdditionalRoomIds}
                onChange={setEditAdditionalRoomIds}
                placeholder="Ajouter des salles..."
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Date"
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                error={editErrors.date}
              />
              <Input
                label="Début"
                type="time"
                value={editStartTime}
                onChange={e => setEditStartTime(e.target.value)}
                min={centerSettings.opening_time || '08:00'}
                max={centerSettings.closing_time || '20:00'}
              />
              <Input
                label="Fin"
                type="time"
                value={editEndTime}
                onChange={e => setEditEndTime(e.target.value)}
                min={editStartTime}
                max={centerSettings.closing_time || '20:00'}
                error={editErrors.endTime}
              />
            </div>

            <Select
              label="Mode"
              options={[
                { value: 'in_person', label: 'Présentiel' },
                { value: 'online', label: 'En ligne' },
                { value: 'hybrid', label: 'Hybride' },
              ]}
              value={editSessionType}
              onChange={e => setEditSessionType(e.target.value as 'in_person' | 'online' | 'hybrid')}
            />

            {(editSessionType === 'online' || editSessionType === 'hybrid') && (
              <Input
                label="Lien visio (Zoom/Teams/Meet)"
                value={editMeetingUrl}
                onChange={e => setEditMeetingUrl(e.target.value)}
                placeholder="https://..."
              />
            )}

            <Textarea
              label="Description (optionnel)"
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="Notes, détails..."
              rows={3}
            />

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800 rounded-lg p-4">
                <p className="text-sm text-error-700 dark:text-error-400 font-medium mb-3">
                  Supprimer définitivement cette séance ?
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleDeleteEvent}>
                    Confirmer la suppression
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Non, annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          {/* View mode footer */}
          {!editMode && (
            <div className="flex items-center justify-between w-full">
              <div className="flex gap-2">
                {isAdmin && selectedEvent?.status !== 'cancelled' && (
                  <>
                    <Button variant="primary" size="sm" leftIcon={Pencil} onClick={enterEditMode}>
                      Modifier
                    </Button>
                    <Button variant="secondary" size="sm" leftIcon={XCircle} onClick={() => setShowCancelConfirm(true)}>
                      Annuler la séance
                    </Button>
                  </>
                )}
                {isAdmin && selectedEvent?.status === 'cancelled' && (
                  <Button variant="primary" size="sm" leftIcon={RotateCcw} onClick={handleReactivateEvent}>
                    Réactiver la séance
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Fermer</Button>
            </div>
          )}
          {/* Edit mode footer */}
          {editMode && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Trash2}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-error-600 hover:text-error-700 dark:text-error-400"
              >
                Supprimer
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={exitEditMode}>Annuler</Button>
                <Button variant="primary" onClick={handleEditSave} disabled={editSaving}>
                  {editSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </ModalFooter>
      </Modal>

      {/* F5 - Create Booking Modal */}
      {showCreateModal && (
        <Suspense fallback={null}>
          <CreateBookingModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateSubmit}
            prefilledDate={createDate}
            prefilledHour={createHour}
            rooms={roomOptions}
            virtualRooms={virtualRoomOptions}
            diplomaOptions={diplomaOptions}
            classOptionsByDiploma={classOptionsByDiploma}
            subjectOptionsByClass={subjectOptionsByClass}
            getClassById={getClassById}
            isVisioAutoCreate={!!centerSettings.visio_provider && !!centerSettings.visio_auto_create}
            visioProviderName={centerSettings.visio_provider === 'zoom' ? 'Zoom' : centerSettings.visio_provider === 'teams' ? 'Teams' : centerSettings.visio_provider === 'meet' ? 'Google Meet' : undefined}
            openingTime={centerSettings.opening_time || '08:00'}
            closingTime={centerSettings.closing_time || '20:00'}
            isOnlineSchool={isOnlineSchool}
            roomOptional={!!centerSettings.room_optional}
            isMergedMode={isMergedMode}
            coursOptions={coursOptions}
            customTypeOptions={typeOptions}
          />
        </Suspense>
      )}

      {/* Batch Create Modal */}
      {showBatchModal && (
        <Suspense fallback={null}>
          <BatchCreateModal
            isOpen={showBatchModal}
            onClose={() => setShowBatchModal(false)}
            onCreateBatch={async (sessions) => { await createBatchBookings(sessions) }}
            checkRoomConflict={checkBookingConflict}
            checkTrainerConflict={checkTrainerConflict}
            rooms={roomOptions}
            teachers={teacherProfileOptions}
            currentUserId={user?.id || ''}
            diplomaOptions={diplomaOptions}
            classOptionsByDiploma={classOptionsByDiploma}
            subjectOptionsByClass={subjectOptionsByClass}
            getTeachersBySubject={getTeachersBySubject}
            getClassById={getClassById}
          />
        </Suspense>
      )}

      {/* Import Sessions Modal */}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          type="sessions"
          context={importContext}
          referenceData={importReferenceData}
          onComplete={() => refreshBookings()}
        />
      )}

      {/* Move Confirmation Modal */}
      <Modal
        isOpen={!!pendingMove}
        onClose={() => setPendingMove(null)}
        title="Déplacer la séance"
        size="sm"
      >
        {pendingMove && (() => {
          const oldStart = typeof pendingMove.event.start === 'string' ? parseISO(pendingMove.event.start) : pendingMove.event.start
          const oldRoomName = pendingMove.event.roomName || roomOptions.find(r => r.value === pendingMove.event.roomId)?.label || '—'
          return (
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">{pendingMove.event.title}</p>

              {/* Ancien créneau (lecture seule) */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                <p className="font-medium mb-0.5">Séance d'origine :</p>
                <p>{format(oldStart, 'EEEE d MMM', { locale: fr })}</p>
                <p>{formatTimeRange(pendingMove.event.start as string, pendingMove.event.end as string)} · {oldRoomName}</p>
              </div>

              {/* Formulaire éditable */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={moveDate}
                    onChange={e => setMoveDate(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Début</label>
                    <input
                      type="time"
                      value={moveStartTime}
                      onChange={e => setMoveStartTime(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Fin</label>
                    <input
                      type="time"
                      value={moveEndTime}
                      onChange={e => setMoveEndTime(e.target.value)}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                {moveTimeError && (
                  <p className="text-sm text-error-600 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    {moveTimeError}
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Salle</label>
                  <Select
                    value={moveRoomId}
                    onChange={e => setMoveRoomId(e.target.value)}
                    options={roomOptions}
                    placeholder="Sélectionner une salle"
                  />
                </div>
              </div>
            </div>
          )
        })()}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setPendingMove(null)}>Annuler</Button>
          <Button onClick={confirmMove} disabled={!moveDate || !moveStartTime || !moveEndTime || !!moveTimeError}>
            Confirmer le déplacement
          </Button>
        </ModalFooter>
      </Modal>
      <CalendarIntegrationModal
        isOpen={showCalendarIntegration}
        onClose={() => setShowCalendarIntegration(false)}
      />
    </div>
  )
}

export default CalendarPage
