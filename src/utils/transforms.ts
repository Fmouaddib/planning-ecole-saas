/**
 * Transformations snake_case (Supabase) → camelCase (TypeScript)
 * Adapté au schéma réel : training_sessions, profiles, rooms
 */

import type { Booking, Room, User, Program } from '@/types'

// ==================== BOOKING (from training_sessions) ====================

export function transformBooking(raw: Record<string, any>): Booking {
  // trainer = join profile
  const trainer = raw.trainer
  // subject = join subjects
  const subject = raw.subject
  // class_ = join classes (avec diploma)
  const class_ = raw.class_

  // Le session_type réel (in_person/online/hybrid) est le mode de livraison
  // On utilise 'course' par défaut car il n'y a pas de colonne booking_type dans le schéma
  const bookingType: 'course' = 'course'

  const { firstName, lastName } = parseFullName(trainer?.full_name)

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? undefined,
    startTime: raw.start_time,
    endTime: raw.end_time,
    startDateTime: raw.start_time,
    endDateTime: raw.end_time,
    roomId: raw.room_id,
    userId: raw.trainer_id,
    attendeeIds: [],
    status: raw.status || 'scheduled',
    type: bookingType,
    bookingType: bookingType,
    recurrence: undefined,
    schoolId: raw.center_id,
    establishmentId: raw.center_id,
    room: raw.room
      ? {
          id: raw.room.id,
          name: raw.room.name,
          room_type: raw.room.room_type,
          capacity: raw.room.capacity,
        }
      : undefined,
    user: trainer
      ? {
          id: trainer.id,
          firstName,
          lastName,
          email: trainer.email || '',
        }
      : undefined,
    attendees: [],
    cancelledAt: undefined,
    cancelledBy: undefined,
    cancellationReason: undefined,
    subjectId: raw.subject_id ?? undefined,
    classId: raw.class_id ?? undefined,
    matiere: subject?.name ?? undefined,
    diplome: class_?.diploma?.title ?? undefined,
    niveau: class_?.name ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== ROOM (from rooms) ====================

export function transformRoom(raw: Record<string, any>): Room {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.name, // pas de colonne code, on utilise name
    capacity: raw.capacity || 0,
    type: raw.room_type || 'classroom',
    roomType: raw.room_type || 'classroom',
    equipment: raw.equipment ?? [],
    location: raw.location || '',
    description: undefined,
    isActive: raw.is_available ?? true,
    schoolId: raw.center_id,
    establishmentId: raw.center_id,
    buildingId: undefined, // pas de buildings dans ce schéma
    building: undefined,
    floor: undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== PROGRAM (from programs) ====================

export function transformProgram(raw: Record<string, any>): Program {
  return {
    id: raw.id,
    centerId: raw.center_id,
    name: raw.name,
    code: raw.code ?? undefined,
    description: raw.description ?? undefined,
    durationHours: raw.duration_hours ?? 0,
    maxParticipants: raw.max_participants ?? 20,
    color: raw.color ?? '#3B82F6',
    isActive: raw.is_active ?? true,
    createdAt: raw.created_at,
    diplomaId: raw.diploma_id ?? undefined,
    diploma: raw.diploma ?? undefined,
  }
}

// ==================== HELPERS ====================

export function parseFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName || '').split(' ')
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' }
}

// ==================== USER (from profiles) ====================

export function transformUser(raw: Record<string, any>): User {
  const { firstName, lastName } = parseFullName(raw.full_name)

  return {
    id: raw.id,
    email: raw.email || '',
    firstName,
    lastName,
    role: raw.role || 'student',
    schoolId: raw.center_id,
    establishmentId: raw.center_id,
    avatar: raw.avatar_url ?? undefined,
    profilePicture: raw.avatar_url ?? undefined,
    isActive: raw.is_active ?? true,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
