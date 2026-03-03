// Constantes de l'application

export const APP_CONFIG = {
  name: 'PlanningÉcole',
  version: '1.0.0',
  description: 'Gestion de planning pour établissements supérieurs',
  author: 'PlanningÉcole Team'
}

export const SUPABASE_CONFIG = {
  url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
  anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
}

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  PLANNING: '/planning',
  ROOMS: '/rooms',
  USERS: '/users',
  BOOKINGS: '/bookings',
  ACADEMIC: '/academic',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  HELP: '/help',
  VISIO: '/visio'
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  STAFF: 'staff'
} as const

export const ROOM_TYPES = {
  CLASSROOM: 'classroom',
  LAB: 'lab',
  AMPHITHEATER: 'amphitheater',
  CONFERENCE: 'conference',
  LIBRARY: 'library',
  GYM: 'gym',
  OFFICE: 'office'
} as const

export const BOOKING_TYPES = {
  COURSE: 'course',
  EXAM: 'exam',
  MEETING: 'meeting',
  EVENT: 'event',
  MAINTENANCE: 'maintenance'
} as const

export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const

export const EQUIPMENT_CATEGORIES = {
  TECHNOLOGY: 'technology',
  FURNITURE: 'furniture',
  SAFETY: 'safety',
  MULTIMEDIA: 'multimedia',
  SPECIALIZED: 'specialized'
} as const

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20
}

export const TIME_SLOTS = {
  DURATION: 60, // en minutes
  START_HOUR: 8, // 8h00
  END_HOUR: 20   // 20h00
}

export const WORKING_DAYS = [1, 2, 3, 4, 5] // Lundi à Vendredi

// Messages d'erreur
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erreur de connexion réseau',
  AUTH_REQUIRED: 'Authentification requise',
  PERMISSION_DENIED: 'Permission insuffisante',
  NOT_FOUND: 'Ressource introuvable',
  VALIDATION_ERROR: 'Données de formulaire invalides',
  SERVER_ERROR: 'Erreur serveur interne'
}

// Couleurs par type de réservation
export const BOOKING_TYPE_COLORS: Record<string, string> = {
  course: '#3b82f6',
  exam: '#dc2626',
  meeting: '#059669',
  event: '#7c3aed',
  maintenance: '#6b7280',
}

// Couleurs par statut
export const BOOKING_STATUS_COLORS: Record<string, string> = {
  confirmed: '#22c55e',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  completed: '#6b7280',
}

// Labels des catégories d'équipements
export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  technology: 'Technologie',
  multimedia: 'Multimédia',
  furniture: 'Mobilier',
  safety: 'Sécurité',
  specialized: 'Spécialisé',
}

// Catalogue prédéfini d'équipements
export const PREDEFINED_EQUIPMENT: { name: string; category: string }[] = [
  // Technologie
  { name: 'Ordinateur fixe', category: 'technology' },
  { name: 'Ordinateur portable', category: 'technology' },
  { name: 'Imprimante', category: 'technology' },
  { name: 'Wi-Fi', category: 'technology' },
  { name: 'Prises réseau', category: 'technology' },
  // Multimédia
  { name: 'Vidéoprojecteur', category: 'multimedia' },
  { name: 'Écran / TV', category: 'multimedia' },
  { name: 'Tableau blanc interactif', category: 'multimedia' },
  { name: 'Webcam', category: 'multimedia' },
  { name: 'Sono', category: 'multimedia' },
  { name: 'Micro', category: 'multimedia' },
  // Mobilier
  { name: 'Tableau blanc', category: 'furniture' },
  { name: 'Tableau noir', category: 'furniture' },
  { name: 'Paperboard', category: 'furniture' },
  { name: 'Tables modulables', category: 'furniture' },
  { name: 'Chaises à roulettes', category: 'furniture' },
  { name: 'Rangements', category: 'furniture' },
  // Sécurité
  { name: 'Extincteur', category: 'safety' },
  { name: 'Défibrillateur', category: 'safety' },
  { name: 'Trousse de secours', category: 'safety' },
  { name: 'Caméra', category: 'safety' },
  // Spécialisé
  { name: 'Matériel de laboratoire', category: 'specialized' },
  { name: 'Climatisation', category: 'specialized' },
  { name: 'Stores occultants', category: 'specialized' },
  { name: 'Accès PMR', category: 'specialized' },
  { name: 'Prises électriques renforcées', category: 'specialized' },
]

// Plateformes visio
export const VISIO_PLATFORMS = {
  teams: { label: 'Teams', color: '#6264A7', bgColor: '#6264A715' },
  zoom: { label: 'Zoom', color: '#2D8CFF', bgColor: '#2D8CFF15' },
  other: { label: 'Autre', color: '#6b7280', bgColor: '#6b728015' },
} as const

// Messages de succès
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  SIGNUP_SUCCESS: 'Inscription réussie',
  ROOM_CREATED: 'Salle créée avec succès',
  ROOM_UPDATED: 'Salle mise à jour avec succès',
  ROOM_DELETED: 'Salle supprimée avec succès',
  BOOKING_CREATED: 'Séance créée avec succès',
  BOOKING_UPDATED: 'Séance mise à jour avec succès',
  BOOKING_CANCELLED: 'Séance annulée avec succès',
  PROFILE_UPDATED: 'Profil mis à jour avec succès'
}