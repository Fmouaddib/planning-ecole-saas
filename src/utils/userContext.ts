/**
 * Gestion du contexte utilisateur multi-centres/rôles
 * Stocké en sessionStorage, similaire à l'impersonation mais pour le switching de rôle
 */

import type { UserRole } from '@/types'

export interface UserContext {
  centerId: string
  centerName: string
  role: UserRole
}

const STORAGE_KEY = 'active_user_context'
const EVENT_NAME = 'user-context-changed'

export function getActiveContext(): UserContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveContext(ctx: UserContext): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function clearActiveContext(): void {
  sessionStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function hasActiveContext(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) !== null
}

export const USER_CONTEXT_EVENT = EVENT_NAME
