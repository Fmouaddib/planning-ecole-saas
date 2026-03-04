// Types pour l'application de planning d'établissement supérieur

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  schoolId: string
  establishmentId: string
  avatar?: string
  profilePicture?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UserRole = 'admin' | 'teacher' | 'student' | 'staff' | 'super_admin'

export interface School {
  id: string
  name: string
  address: string
  city: string
  country: string
  timezone: string
  settings: SchoolSettings
  createdAt: string
  updatedAt: string
}

export interface SchoolSettings {
  workingDays: number[] // 0-6 (0 = dimanche)
  workingHours: {
    start: string // HH:mm
    end: string   // HH:mm
  }
  slotDuration: number // en minutes
  theme: 'light' | 'dark' | 'auto'
  language: string
}

export interface Room {
  id: string
  name: string
  code: string
  capacity: number
  type: RoomType
  roomType: string
  equipment: Equipment[]
  location: string
  description?: string
  isActive: boolean
  schoolId: string
  establishmentId: string
  buildingId?: string
  building?: { id: string; name: string }
  floor?: number
  createdAt: string
  updatedAt: string
}

export type RoomType = 
  | 'classroom' 
  | 'lab' 
  | 'amphitheater' 
  | 'conference' 
  | 'library' 
  | 'gym' 
  | 'office'

export interface Equipment {
  id: string
  name: string
  icon?: string
  category: EquipmentCategory
}

export type EquipmentCategory = 
  | 'technology' 
  | 'furniture' 
  | 'safety' 
  | 'multimedia' 
  | 'specialized'

export interface Booking {
  id: string
  title: string
  description?: string
  startTime: string // ISO format
  endTime: string   // ISO format
  startDateTime: string // alias pour compatibilité hooks
  endDateTime: string   // alias pour compatibilité hooks
  roomId: string
  userId: string
  attendeeIds: string[]
  status: BookingStatus
  type: BookingType
  bookingType: BookingType // alias pour compatibilité hooks
  recurrence?: RecurrenceRule
  schoolId: string
  establishmentId: string
  room?: { id: string; name: string; code?: string; room_type?: string; capacity?: number }
  user?: { id: string; firstName: string; lastName: string; email: string }
  attendees?: any[]
  cancelledAt?: string
  cancelledBy?: string
  cancellationReason?: string
  subjectId?: string
  classId?: string
  matiere?: string
  diplome?: string
  niveau?: string
  meetingUrl?: string
  sessionType?: 'in_person' | 'online' | 'hybrid'
  createdAt: string
  updatedAt: string
}

export type BookingStatus =
  | 'scheduled'
  | 'in_progress'
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'completed'

export type BookingType = 
  | 'course' 
  | 'exam' 
  | 'meeting' 
  | 'event' 
  | 'maintenance'

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  daysOfWeek?: number[] // pour weekly
  endDate?: string
  exceptions?: string[] // dates d'exception
}

// Types pour les formulaires
export interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export interface SignupForm {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  schoolCode: string
  role: UserRole
  acceptTerms: boolean
}

export interface RoomForm {
  name: string
  code: string
  capacity: number
  type: RoomType
  equipment: string[]
  location: string
  description: string
}

export interface BookingForm {
  title: string
  description: string
  startDate: string
  startTime: string
  endTime: string
  roomId: string
  attendeeIds: string[]
  type: BookingType
  isRecurring: boolean
  recurrence?: Partial<RecurrenceRule>
}

// Types pour les hooks et états
export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface FilterState {
  search?: string
  type?: RoomType | BookingType
  status?: BookingStatus
  dateRange?: {
    start: string
    end: string
  }
}

// Types pour les composants UI
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: T[keyof T], item: T) => React.ReactNode
}

export interface CalendarEvent {
  id: string
  title: string
  start: string | Date
  end: string | Date
  color?: string
  roomId?: string
  roomName?: string
  userId?: string
  userName?: string
  type?: BookingType | string
  status?: BookingStatus | string
  description?: string
  matiere?: string
  diplome?: string
  niveau?: string
  recurrence?: RecurrenceRule
  teacher?: string
  classId?: string
  meetingUrl?: string
  sessionType?: 'in_person' | 'online' | 'hybrid'
}

export interface Program {
  id: string
  centerId: string
  name: string
  code?: string
  description?: string
  durationHours: number
  maxParticipants: number
  color: string
  isActive: boolean
  createdAt: string
  diplomaId?: string
  diploma?: { id: string; title: string }
}

export interface Diploma {
  id: string
  title: string
  description: string
  durationYears: number
  isActive: boolean
  centerId: string
  createdAt: string
}

export interface AlternanceConfig {
  schoolWeeks: number
  companyWeeks: number
  referenceDate: string
}

export interface ScheduleExceptions {
  schoolDays: string[]   // dates ISO où la classe a cours (override "pas cours")
  companyDays: string[]  // dates ISO où la classe n'a PAS cours (override "cours")
}

export interface ExamPeriod {
  name: string       // ex: "Semestre 1", "Partiels Mars"
  startDate: string  // ISO date
  endDate: string    // ISO date
}

export interface Class {
  id: string
  name: string
  diplomaId: string
  centerId: string
  academicYear: string
  startDate?: string
  endDate?: string
  scheduleType: string
  attendanceDays: number[]
  alternanceConfig?: AlternanceConfig
  scheduleExceptions?: ScheduleExceptions
  examPeriods?: ExamPeriod[]
  isActive: boolean
  createdAt: string
  diploma?: { id: string; title: string }
}

export interface Subject {
  id: string
  name: string
  code: string
  description?: string
  category?: string
  programId?: string
  program?: { id: string; name: string }
  isActive: boolean
  centerId: string
  createdAt: string
}

export type ExportFormat = 'excel' | 'csv' | 'word' | 'pdf' | 'ical'

// ==================== TYPES NOTIFICATIONS IN-APP ====================

export type InAppNotificationType =
  | 'session_created'
  | 'session_updated'
  | 'session_cancelled'
  | 'reminder'
  | 'weekly_recap'
  | 'system'
  | 'attendance_marked'
  | 'grade_published'
  | 'import_completed'
  | 'info'
  | 'warning'
  | 'success'
  | 'availability_requested'
  | 'unavailability_declared'
  | 'assignment_pending'
  | 'assignment_accepted'
  | 'assignment_rejected'
  | 'change_request_pending'
  | 'change_request_accepted'
  | 'change_request_rejected'
  | 'planning_message'

export interface InAppNotification {
  id: string
  userId: string
  centerId: string
  title: string
  message: string
  type: InAppNotificationType
  link?: string
  isRead: boolean
  sessionId?: string
  createdAt: string
}

// Type placeholder pour Supabase Database (généré par supabase gen types)
export type Database = any

// Types pour les notifications
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  timestamp: string
}

// Types pour l'authentification Supabase
export interface AuthState {
  user: User | null
  session: any | null
  isLoading: boolean
  error: string | null
}

// Types pour les réponses API
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationState
}

// Types pour les permissions
export interface Permission {
  resource: string
  actions: string[]
}

export interface RolePermissions {
  [key: string]: Permission[]
}

// ==================== TYPES AUTH ÉTENDUS ====================

export type UUID = string
export type DateString = string

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  establishmentId: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  establishmentId: string
  role?: UserRole
}

export interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  register: (data: RegisterData) => Promise<AuthUser>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<User>
  error: string | null
  clearError: () => void
}

// ==================== TYPES ROOMS ÉTENDUS ====================

export interface CreateRoomData {
  name: string
  code: string
  description?: string
  capacity: number
  roomType: string
  buildingId?: string
  floor?: number
  equipment?: Equipment[]
}

export interface UpdateRoomData extends Partial<CreateRoomData> {
  id: string
}

export interface RoomFilters {
  roomType?: string[]
  buildingId?: string
  capacity?: { min?: number; max?: number }
  equipment?: string[]
  isActive?: boolean
}

export interface UseRoomsReturn {
  rooms: Room[]
  isLoading: boolean
  error: string | null
  createRoom: (data: CreateRoomData) => Promise<Room>
  updateRoom: (data: UpdateRoomData) => Promise<Room>
  deleteRoom: (id: UUID) => Promise<void>
  renameEquipment: (oldName: string, newName: string) => Promise<void>
  deleteEquipment: (name: string) => Promise<void>
  updateEquipmentCategory: (name: string, newCategory: EquipmentCategory) => Promise<void>
  getRoomById: (id: UUID) => Room | undefined
  filterRooms: (filters: RoomFilters) => Room[]
  refreshRooms: () => Promise<void>
  clearError: () => void
  roomsByType: Record<string, Room[]>
  roomsByBuilding: Record<string, Room[]>
  totalCapacity: number
  buildingsWithRooms: { id: string; name: string; rooms: { id: string; name: string; capacity: number }[] }[]
}

// ==================== TYPES BOOKINGS ÉTENDUS ====================

export interface CreateBookingData {
  title: string
  description?: string
  startDateTime: DateString
  endDateTime: DateString
  roomId: string
  bookingType: BookingType
  subjectId?: string
  classId?: string
  matiere?: string
  diplome?: string
  niveau?: string
  sessionType?: 'in_person' | 'online' | 'hybrid'
  meetingUrl?: string
  attendees?: {
    userId: string
    attendeeType: string
    isRequired: boolean
    hasConfirmed: boolean
  }[]
}

export interface UpdateBookingData extends Partial<CreateBookingData> {
  id: string
}

export interface BookingFilters {
  startDate?: DateString
  endDate?: DateString
  roomId?: string
  userId?: string
  status?: BookingStatus[]
  bookingType?: BookingType[]
}

export interface BatchCreateSessionInput {
  title: string
  description?: string
  startDateTime: string
  endDateTime: string
  roomId: string
  trainerId: string
  bookingType: BookingType
  subjectId?: string
  classId?: string
}

export interface BatchCreateResult {
  created: number
  failed: Array<{ index: number; error: string }>
}

export interface UseBookingsReturn {
  bookings: Booking[]
  isLoading: boolean
  error: string | null
  createBooking: (data: CreateBookingData) => Promise<Booking>
  updateBooking: (data: UpdateBookingData) => Promise<Booking>
  deleteBooking: (id: UUID) => Promise<void>
  cancelBooking: (id: UUID, reason?: string) => Promise<Booking>
  createBatchBookings: (sessions: BatchCreateSessionInput[]) => Promise<BatchCreateResult>
  checkBookingConflict: (roomId: UUID, start: DateString, end: DateString, excludeId?: UUID) => Promise<boolean>
  checkTrainerConflict: (trainerId: UUID, start: DateString, end: DateString, excludeId?: UUID) => Promise<boolean>
  getBookingById: (id: UUID) => Booking | undefined
  filterBookings: (filters: BookingFilters) => Booking[]
  getBookingsByRoom: (roomId: UUID, date?: DateString) => Booking[]
  getBookingsByUser: (userId: UUID) => Booking[]
  refreshBookings: () => Promise<void>
  clearError: () => void
  calendarEvents: CalendarEvent[]
  upcomingBookings: Booking[]
  bookingsByStatus: Record<string, Booking[]>
}

// ==================== TYPES USERS ÉTENDUS ====================

export interface UseUsersReturn {
  users: User[]
  isLoading: boolean
  error: string | null
  createUser: (data: RegisterData) => Promise<User>
  updateUser: (id: UUID, data: Partial<User>) => Promise<User>
  deleteUser: (id: UUID) => Promise<void>
  getUserById: (id: UUID) => User | undefined
  getUsersByRole: (role: UserRole) => User[]
  refreshUsers: () => Promise<void>
  clearError: () => void
  searchUsers: (query: string) => User[]
  usersByRole: Record<UserRole, User[]>
  userStats: { total: number; byRole: Record<string, number>; active: number; inactive: number }
  teachers: User[]
  students: User[]
  admins: User[]
  staff: User[]
  canCreateUsers: boolean
  canDeleteUsers: boolean
  canUpdateAllUsers: boolean
  canUpdateUser: (userId: UUID) => boolean
  canDeleteUser: (userId: UUID) => boolean
}

// ==================== TYPES SAAS - ABONNEMENT ====================

export type SubscriptionPlanTier = 'free' | 'pro' | 'enterprise' | 'ecole-en-ligne'
export type SubscriptionStatus = 'active' | 'cancelled' | 'pending' | 'expired'

export interface SubscriptionPlan {
  id: string
  name: string
  tier: SubscriptionPlanTier
  maxUsers: number
  maxRooms: number
  maxBookingsPerMonth: number
  priceMonthly: number
  priceYearly: number
  features: string[]
}

export interface EstablishmentSubscription {
  id: string
  establishmentId: string
  planId: string
  plan?: SubscriptionPlan
  status: SubscriptionStatus
  startDate: string
  endDate: string
  renewalDate: string
  createdAt: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
}

export interface ResourceUsage {
  current: number
  max: number
}

export interface UsageSummary {
  users: ResourceUsage
  rooms: ResourceUsage
  bookingsThisMonth: ResourceUsage
}

export interface LimitCheckResult {
  allowed: boolean
  current: number
  max: number
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan | null
  subscription: EstablishmentSubscription | null
  usage: UsageSummary | null
  isLoading: boolean
  error: string | null
}

// ==================== TYPES SAAS - AUDIT ====================

// ==================== TYPES VIRTUAL ROOMS ====================

export type VirtualRoomPlatform = 'teams' | 'zoom' | 'other'

export interface VirtualRoom {
  id: string
  centerId: string
  name: string
  platform: VirtualRoomPlatform
  meetingUrl: string
  isDefault: boolean
  isActive: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface CreateVirtualRoomData {
  name: string
  platform: VirtualRoomPlatform
  meetingUrl: string
  isDefault?: boolean
}

export interface UpdateVirtualRoomData extends Partial<CreateVirtualRoomData> {
  id: string
}

// ==================== TYPES SAAS - AUDIT ====================

export interface AuditLogEntry {
  id?: string
  action: string
  resourceType: string
  resourceId?: string
  establishmentId: string
  userId: string
  userEmail?: string
  details?: Record<string, unknown>
  ipAddress?: string
  createdAt?: string
}

// ==================== TYPES ADDON SYSTEM ====================

export type AddonType = 'email' | 'teacher' | 'student' | 'attendance' | 'grades'

export interface AddonPlanInfo {
  id: string
  name: string
  slug: string
  addonType: AddonType
  quotaValue: number
  priceMonthly: number
  priceYearly?: number
}

export interface ActiveAddon {
  id: string
  addonPlanId: string
  addonType: AddonType
  quotaValue: number
  quantity: number
  name: string
  status: string
  priceMonthly: number
  periodEnd?: string
}

export interface EffectiveQuotas {
  emails: { base: number; addons: number; total: number; usedToday: number }
  teachers: { base: number; addons: number; total: number; current: number }
  students: { base: number; addons: number; total: number; current: number }
}

// ==================== TYPES ATTENDANCE ====================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface SessionAttendance {
  id: string
  sessionId: string
  studentId: string
  centerId: string
  status: AttendanceStatus
  lateMinutes?: number
  excuseReason?: string
  markedBy?: string
  markedAt?: string
  notes?: string
  student?: { id: string; firstName: string; lastName: string; email: string }
  session?: { id: string; title: string; date: string }
}

export interface AttendanceStats {
  studentId: string
  studentName: string
  totalSessions: number
  present: number
  absent: number
  late: number
  excused: number
  attendanceRate: number
}

// ==================== TYPES EVALUATIONS / GRADES ====================

export type EvaluationType = 'exam' | 'assignment' | 'project' | 'oral' | 'quiz' | 'continuous'

export interface Evaluation {
  id: string
  centerId: string
  subjectId: string
  classId: string
  teacherId: string
  title: string
  description?: string
  evaluationType: EvaluationType
  date: string
  coefficient: number
  maxGrade: number
  isPublished: boolean
  subject?: { id: string; name: string }
  class_?: { id: string; name: string }
  teacher?: { id: string; firstName: string; lastName: string }
}

export interface Grade {
  id: string
  evaluationId: string
  studentId: string
  centerId: string
  grade: number | null
  isAbsent: boolean
  comment?: string
  gradedBy?: string
  gradedAt?: string
  student?: { id: string; firstName: string; lastName: string }
  evaluation?: Evaluation
}

export interface SubjectAverage {
  subjectId: string
  subjectName: string
  coefficient: number
  average: number | null
  evaluationCount: number
}

export interface StudentBulletin {
  studentId: string
  studentName: string
  classId: string
  className: string
  subjects: SubjectAverage[]
  generalAverage: number | null
  classRank?: number
}

// ==================== TYPES NOTIFICATIONS (enhanced) ====================

export type NotificationCategory = 'all' | 'sessions' | 'reminders' | 'system' | 'academic'

export interface NotificationPreferences {
  id?: string
  userId: string
  centerId: string
  sessionCreated: boolean
  sessionUpdated: boolean
  sessionCancelled: boolean
  reminder: boolean
  weeklyRecap: boolean
  system: boolean
  attendanceMarked: boolean
  gradePublished: boolean
  importCompleted: boolean
  availabilityRequested: boolean
  unavailabilityDeclared: boolean
  assignmentPending: boolean
  assignmentResponse: boolean
  changeRequestPending: boolean
  changeRequestResponse: boolean
  planningMessage: boolean
}

// ==================== TYPES TEACHER COLLABORATION ====================

export type AvailabilityStatus = 'submitted' | 'confirmed'
export type AvailabilityRecurrence = 'none' | 'weekly'
export type UnavailabilityReason = 'vacation' | 'sick' | 'personal' | 'training' | 'other'
export type UnavailabilityStatus = 'pending' | 'approved' | 'rejected'
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
export type ChangeRequestType = 'time_change' | 'room_change' | 'cancel' | 'other'
export type ChangeRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface TeacherAvailability {
  id: string
  teacherId: string
  centerId: string
  date: string
  startTime: string
  endTime: string
  recurrence: AvailabilityRecurrence
  status: AvailabilityStatus
  notes?: string
  teacher?: { id: string; firstName: string; lastName: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface TeacherUnavailability {
  id: string
  teacherId: string
  centerId: string
  startDate: string
  endDate: string
  reason: UnavailabilityReason
  description?: string
  status: UnavailabilityStatus
  adminResponse?: string
  requestedAt: string
  respondedAt?: string
  respondedBy?: string
  teacher?: { id: string; firstName: string; lastName: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface SessionAssignment {
  id: string
  sessionId: string
  teacherId: string
  centerId: string
  status: AssignmentStatus
  assignedBy: string
  message?: string
  teacherResponse?: string
  assignedAt: string
  respondedAt?: string
  session?: { id: string; title: string; startTime: string; endTime: string; room?: { name: string } }
  teacher?: { id: string; firstName: string; lastName: string; email: string }
  assigner?: { id: string; firstName: string; lastName: string }
  createdAt: string
  updatedAt: string
}

export interface SessionChangeRequest {
  id: string
  sessionId: string
  teacherId: string
  centerId: string
  changeType: ChangeRequestType
  oldValues: Record<string, unknown>
  newValues: Record<string, unknown>
  status: ChangeRequestStatus
  requestedBy: string
  message?: string
  teacherResponse?: string
  session?: { id: string; title: string }
  teacher?: { id: string; firstName: string; lastName: string }
  requester?: { id: string; firstName: string; lastName: string }
  createdAt: string
  respondedAt?: string
  updatedAt: string
}

export interface PlanningMessage {
  id: string
  centerId: string
  senderId: string
  recipientId: string
  sessionId?: string
  subject?: string
  content: string
  isRead: boolean
  parentId?: string
  sender?: { id: string; firstName: string; lastName: string; email: string }
  recipient?: { id: string; firstName: string; lastName: string; email: string }
  createdAt: string
}