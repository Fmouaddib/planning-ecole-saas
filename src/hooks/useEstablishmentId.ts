/**
 * Hook utilitaire pour récupérer l'establishment_id de l'utilisateur courant
 * Les super_admins n'ont pas d'establishmentId (accès global)
 */

import { useAuthContext } from '@/contexts/AuthContext'

export function useEstablishmentId(): string | null {
  const { user } = useAuthContext()

  if (!user) return null

  // Les super_admins ont accès global, pas d'establishment_id
  if (user.role === 'super_admin') return null

  return user.establishmentId || null
}
