// Fonctions utilitaires pour l'application

import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'

/**
 * Combine des classes CSS avec clsx
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Formate une date de manière lisible
 */
export function formatDate(date: string | Date, formatString: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatString, { locale: fr })
}

/**
 * Formate une date de manière relative (aujourd'hui, hier, demain)
 */
export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(dateObj)) {
    return 'Aujourd\'hui'
  }
  
  if (isTomorrow(dateObj)) {
    return 'Demain'
  }
  
  if (isYesterday(dateObj)) {
    return 'Hier'
  }
  
  return format(dateObj, 'dd/MM/yyyy', { locale: fr })
}

/**
 * Formate une heure
 */
export function formatTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'HH:mm')
}

/**
 * Formate une plage horaire
 */
export function formatTimeRange(startDate: string | Date, endDate: string | Date): string {
  return `${formatTime(startDate)} - ${formatTime(endDate)}`
}

/**
 * Capitalise la première lettre d'une chaîne
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Tronque un texte à une longueur donnée
 */
export function truncate(text: string, length: number = 100): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}

/**
 * Génère un ID aléatoire
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Vérifie si une adresse email est valide
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Vérifie la force d'un mot de passe
 */
export function getPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isValid: boolean
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('Au moins 8 caractères')
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Au moins une minuscule')
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Au moins une majuscule')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Au moins un chiffre')
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Au moins un caractère spécial')
  }

  return {
    score,
    feedback,
    isValid: score >= 4
  }
}

/**
 * Débounce une fonction
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

/**
 * Formate un nombre avec des séparateurs de milliers
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num)
}

/**
 * Calcule la capacité d'utilisation en pourcentage
 */
export function calculateUsagePercentage(used: number, total: number): number {
  if (total === 0) return 0
  return Math.round((used / total) * 100)
}

/**
 * Génère une couleur basée sur une chaîne
 */
export function getColorFromString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}

/**
 * Convertit une taille de fichier en format lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Tri un tableau d'objets par une clé donnée
 */
export function sortBy<T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Filtre un tableau d'objets par recherche textuelle
 */
export function filterBySearch<T>(
  array: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm.trim()) return array
  
  const lowerSearchTerm = searchTerm.toLowerCase()
  
  return array.filter(item =>
    searchFields.some(field => {
      const fieldValue = item[field]
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(lowerSearchTerm)
      }
      return false
    })
  )
}

/**
 * Groupe un tableau d'objets par une clé donnée
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    groups[groupKey] = groups[groupKey] || []
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Attend un certain délai (utile pour les tests et animations)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extrait un message d'erreur lisible depuis une erreur quelconque
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message)
  }
  return 'Une erreur est survenue'
}

/**
 * Formate une date avec heure
 */
export function formatDateTime(date: string | Date, formatString: string = 'dd/MM/yyyy HH:mm'): string {
  return formatDate(date, formatString)
}