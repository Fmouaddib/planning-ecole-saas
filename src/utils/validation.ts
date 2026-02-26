/**
 * Schémas de validation Zod pour l'application
 */

import { z } from 'zod'

// Enum objects pour z.nativeEnum (les types TS ne fonctionnent pas avec nativeEnum)
const UserRoleEnum = { admin: 'admin', teacher: 'teacher', student: 'student', staff: 'staff' } as const
const RoomTypeEnum = { classroom: 'classroom', lab: 'lab', amphitheater: 'amphitheater', conference: 'conference', library: 'library', gym: 'gym', office: 'office' } as const
const BookingTypeEnum = { course: 'course', exam: 'exam', meeting: 'meeting', event: 'event', maintenance: 'maintenance' } as const
const BookingStatusEnum = { confirmed: 'confirmed', pending: 'pending', cancelled: 'cancelled', completed: 'completed' } as const
const RecurrencePatternEnum = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' } as const

// ==================== VALIDATION HELPERS ====================

const requiredString = (field: string) =>
  z.string().min(1, `${field} est requis`)

const email = z.string().email('Email invalide')

const password = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')

const uuid = z.string().uuid('UUID invalide')

const dateString = z.string().datetime('Date invalide')

const _timeString = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Heure invalide (format HH:MM)')

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Mot de passe requis'),
})

export const registerSchema = z.object({
  firstName: requiredString('Le prénom'),
  lastName: requiredString('Le nom'),
  email,
  password,
  establishmentId: uuid,
  role: z.nativeEnum(UserRoleEnum).optional(),
})

export const updateProfileSchema = z.object({
  firstName: requiredString('Le prénom').optional(),
  lastName: requiredString('Le nom').optional(),
  email: email.optional(),
  profilePicture: z.string().url('URL invalide').optional(),
})

// ==================== ROOM SCHEMAS ====================

export const createRoomSchema = z.object({
  name: requiredString('Le nom'),
  code: requiredString('Le code'),
  description: z.string().optional(),
  capacity: z.number().min(1, 'La capacité doit être supérieure à 0'),
  roomType: z.nativeEnum(RoomTypeEnum),
  buildingId: uuid.optional(),
  floor: z.number().optional(),
  equipment: z.array(z.object({
    name: requiredString('Le nom de l\'équipement'),
    description: z.string().optional(),
    quantity: z.number().min(1, 'La quantité doit être supérieure à 0'),
    isWorking: z.boolean(),
  })).optional(),
})

export const updateRoomSchema = createRoomSchema.partial().extend({
  id: uuid,
})

export const roomFiltersSchema = z.object({
  roomType: z.array(z.nativeEnum(RoomTypeEnum)).optional(),
  buildingId: uuid.optional(),
  capacity: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  equipment: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// ==================== BOOKING SCHEMAS ====================

const createBookingSchemaBase = z.object({
  title: requiredString('Le titre'),
  description: z.string().optional(),
  startDateTime: dateString,
  endDateTime: dateString,
  roomId: uuid,
  bookingType: z.nativeEnum(BookingTypeEnum),
  attendees: z.array(z.object({
    userId: uuid,
    attendeeType: z.string(),
    isRequired: z.boolean(),
    hasConfirmed: z.boolean(),
  })).optional(),
})

export const createBookingSchema = createBookingSchemaBase.refine((data) => {
  const start = new Date(data.startDateTime)
  const end = new Date(data.endDateTime)
  return end > start
}, {
  message: 'La date de fin doit être après la date de début',
  path: ['endDateTime'],
})

export const updateBookingSchema = createBookingSchemaBase.partial().extend({
  id: uuid,
})

export const bookingFiltersSchema = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  roomId: uuid.optional(),
  userId: uuid.optional(),
  status: z.array(z.nativeEnum(BookingStatusEnum)).optional(),
  bookingType: z.array(z.nativeEnum(BookingTypeEnum)).optional(),
})

// ==================== RECURRING BOOKING SCHEMAS ====================

export const createRecurringBookingSchema = z.object({
  title: requiredString('Le titre'),
  description: z.string().optional(),
  startTime: _timeString,
  endTime: _timeString,
  roomId: uuid,
  pattern: z.nativeEnum(RecurrencePatternEnum),
  startDate: dateString,
  endDate: dateString.optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
}).refine((data) => {
  if (data.endDate) {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return end > start
  }
  return true
}, {
  message: 'La date de fin doit être après la date de début',
  path: ['endDate'],
})

// ==================== USER SCHEMAS ====================

export const createUserSchema = registerSchema

export const updateUserSchema = z.object({
  id: uuid,
  firstName: requiredString('Le prénom').optional(),
  lastName: requiredString('Le nom').optional(),
  email: email.optional(),
  role: z.nativeEnum(UserRoleEnum).optional(),
  isActive: z.boolean().optional(),
})

// ==================== ESTABLISHMENT SCHEMAS ====================

export const createEstablishmentSchema = z.object({
  name: requiredString('Le nom'),
  address: requiredString('L\'adresse'),
  city: requiredString('La ville'),
  postalCode: requiredString('Le code postal'),
  country: requiredString('Le pays'),
  phone: z.string().optional(),
  email: email.optional(),
  website: z.string().url('URL invalide').optional(),
})

export const updateEstablishmentSchema = createEstablishmentSchema.partial().extend({
  id: uuid,
})

// ==================== BUILDING SCHEMAS ====================

export const createBuildingSchema = z.object({
  name: requiredString('Le nom'),
  address: requiredString('L\'adresse'),
  establishmentId: uuid,
  floors: z.number().min(1, 'Le nombre d\'étages doit être supérieur à 0'),
})

export const updateBuildingSchema = createBuildingSchema.partial().extend({
  id: uuid,
})

// ==================== TYPE EXPORTS ====================

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

export type CreateRoomFormData = z.infer<typeof createRoomSchema>
export type UpdateRoomFormData = z.infer<typeof updateRoomSchema>
export type RoomFiltersFormData = z.infer<typeof roomFiltersSchema>

export type CreateBookingFormData = z.infer<typeof createBookingSchema>
export type UpdateBookingFormData = z.infer<typeof updateBookingSchema>
export type BookingFiltersFormData = z.infer<typeof bookingFiltersSchema>

export type CreateRecurringBookingFormData = z.infer<typeof createRecurringBookingSchema>

export type CreateUserFormData = z.infer<typeof createUserSchema>
export type UpdateUserFormData = z.infer<typeof updateUserSchema>

export type CreateEstablishmentFormData = z.infer<typeof createEstablishmentSchema>
export type UpdateEstablishmentFormData = z.infer<typeof updateEstablishmentSchema>

export type CreateBuildingFormData = z.infer<typeof createBuildingSchema>
export type UpdateBuildingFormData = z.infer<typeof updateBuildingSchema>
