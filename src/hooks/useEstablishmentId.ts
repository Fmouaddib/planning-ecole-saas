/**
 * Hook utilitaire pour récupérer l'establishment_id de l'utilisateur courant
 * Les super_admins n'ont pas d'establishmentId (accès global)
 * sauf en mode impersonation où useAuth override déjà establishmentId
 */

import { useAuthContext } from '@/contexts/AuthContext'
import { isImpersonating } from '@/utils/impersonation'

export function useEstablishmentId(): string | null {
  const { user } = useAuthContext()

  if (!user) return null

  // En mode impersonation, useAuth a déjà overridé establishmentId
  if (user.role === 'super_admin' && !isImpersonating()) return null

  return user.establishmentId || null
}
