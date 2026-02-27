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
  COURSES: '/courses',
  BOOKINGS: '/bookings',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  HELP: '/help'
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

// Constantes académiques
export const MATIERES = [
  { value: 'mathematiques', label: 'Mathématiques' },
  { value: 'francais', label: 'Français' },
  { value: 'anglais', label: 'Anglais' },
  { value: 'histoire_geo', label: 'Histoire-Géo' },
  { value: 'physique_chimie', label: 'Physique-Chimie' },
  { value: 'svt', label: 'SVT' },
  { value: 'informatique', label: 'Informatique' },
  { value: 'eps', label: 'EPS' },
  { value: 'arts', label: 'Arts' },
  { value: 'philosophie', label: 'Philosophie' },
  { value: 'economie', label: 'Économie' },
  { value: 'droit', label: 'Droit' },
]

export const DIPLOMES = [
  { value: 'bac_general', label: 'Bac Général' },
  { value: 'bac_techno', label: 'Bac Technologique' },
  { value: 'bac_pro', label: 'Bac Professionnel' },
  { value: 'bts', label: 'BTS' },
  { value: 'licence', label: 'Licence' },
  { value: 'master', label: 'Master' },
  { value: 'doctorat', label: 'Doctorat' },
  { value: 'cap', label: 'CAP' },
]

export const NIVEAUX = [
  { value: '1ere_annee', label: '1ère année' },
  { value: '2eme_annee', label: '2ème année' },
  { value: '3eme_annee', label: '3ème année' },
  { value: '4eme_annee', label: '4ème année' },
  { value: '5eme_annee', label: '5ème année' },
]

// Messages de succès
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  SIGNUP_SUCCESS: 'Inscription réussie',
  ROOM_CREATED: 'Salle créée avec succès',
  ROOM_UPDATED: 'Salle mise à jour avec succès',
  ROOM_DELETED: 'Salle supprimée avec succès',
  BOOKING_CREATED: 'Réservation créée avec succès',
  BOOKING_UPDATED: 'Réservation mise à jour avec succès',
  BOOKING_CANCELLED: 'Réservation annulée avec succès',
  PROFILE_UPDATED: 'Profil mis à jour avec succès'
}