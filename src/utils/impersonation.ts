/**
 * Utilitaire d'impersonation de centre pour les super-admins
 * Stocke l'info dans sessionStorage (auto-nettoyé à la fermeture de l'onglet)
 * Communique les changements via un CustomEvent
 */

const STORAGE_KEY = 'sa_impersonate_center'
export const IMPERSONATION_EVENT = 'impersonation-changed'

export interface ImpersonationData {
  centerId: string
  centerName: string
  // Champs optionnels pour impersonation utilisateur
  userId?: string
  userName?: string
  userRole?: string
}

export function getImpersonation(): ImpersonationData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ImpersonationData
  } catch {
    return null
  }
}

export function setImpersonation(data: ImpersonationData): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(IMPERSONATION_EVENT))
}

export function clearImpersonation(): void {
  sessionStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(IMPERSONATION_EVENT))
}

export function isImpersonating(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) !== null
}
