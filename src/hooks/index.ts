/**
 * Export centralisé de tous les hooks personnalisés
 */

export { useAuth } from './useAuth'
export { useRooms } from './useRooms'
export { useBookings } from './useBookings'
export { useUsers } from './useUsers'
export { useAcademicData } from './useAcademicData'
export { useEstablishmentId } from './useEstablishmentId'
export { useSubscriptionInfo } from './useSubscriptionInfo'

// Types des hooks (ré-export depuis types/index.ts)
export type {
  UseAuthReturn,
  UseRoomsReturn,
  UseBookingsReturn,
  UseUsersReturn
} from '@/types'