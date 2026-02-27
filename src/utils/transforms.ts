/**
 * Transformations snake_case (Supabase) → camelCase (TypeScript)
 * Centralise la conversion pour tous les hooks
 */

import type { Booking, Room, User } from '@/types'

// ==================== BOOKING ====================

export function transformBooking(raw: Record<string, any>): Booking {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? undefined,
    startTime: raw.start_date_time,
    endTime: raw.end_date_time,
    startDateTime: raw.start_date_time,
    endDateTime: raw.end_date_time,
    roomId: raw.room_id,
    userId: raw.user_id,
    attendeeIds: raw.attendees?.map((a: any) => a.user_id ?? a.user?.id) ?? [],
    status: raw.status,
    type: raw.booking_type,
    bookingType: raw.booking_type,
    recurrence: raw.recurring_booking_id ? { frequency: 'weekly', interval: 1 } : undefined,
    schoolId: raw.establishment_id,
    establishmentId: raw.establishment_id,
    room: raw.room
      ? {
          id: raw.room.id,
          name: raw.room.name,
          code: raw.room.code,
          room_type: raw.room.room_type,
          capacity: raw.room.capacity,
        }
      : undefined,
    user: raw.user
      ? {
          id: raw.user.id,
          firstName: raw.user.first_name,
          lastName: raw.user.last_name,
          email: raw.user.email,
        }
      : undefined,
    attendees: raw.attendees ?? [],
    cancelledAt: raw.cancelled_at ?? undefined,
    cancelledBy: raw.cancelled_by ?? undefined,
    cancellationReason: raw.cancellation_reason ?? undefined,
    matiere: raw.matiere ?? undefined,
    diplome: raw.diplome ?? undefined,
    niveau: raw.niveau ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== ROOM ====================

export function transformRoom(raw: Record<string, any>): Room {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    capacity: raw.capacity,
    type: raw.room_type,
    roomType: raw.room_type,
    equipment: raw.equipment ?? [],
    location: raw.building?.name ?? '',
    description: raw.description ?? undefined,
    isActive: raw.is_active,
    schoolId: raw.establishment_id,
    establishmentId: raw.establishment_id,
    buildingId: raw.building_id ?? undefined,
    building: raw.building
      ? { id: raw.building.id, name: raw.building.name }
      : undefined,
    floor: raw.floor ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

// ==================== USER ====================

export function transformUser(raw: Record<string, any>): User {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.first_name,
    lastName: raw.last_name,
    role: raw.role,
    schoolId: raw.establishment_id,
    establishmentId: raw.establishment_id,
    avatar: raw.profile_picture ?? undefined,
    profilePicture: raw.profile_picture ?? undefined,
    isActive: raw.is_active,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
