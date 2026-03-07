/**
 * Contexte d'authentification pour l'application
 * Fournit l'état d'authentification à toute l'application
 * Intègre le picker de contexte multi-centres/rôles
 */

import React, { createContext, useContext } from 'react'
import type { UseAuthReturn } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { ContextPickerModal } from '@/components/ui/ContextPickerModal'
import { getActiveContext } from '@/utils/userContext'

// Créer le contexte
const AuthContext = createContext<UseAuthReturn | null>(null)

// ==================== PROVIDER ====================

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
      {/* Context picker shown when user has multiple roles/centers */}
      <ContextPickerModal
        isOpen={auth.showContextPicker}
        contexts={auth.contexts}
        currentContext={getActiveContext()}
        onSelect={auth.switchContext}
        onClose={auth.dismissContextPicker}
        closable={!!getActiveContext()}
      />
    </AuthContext.Provider>
  )
}

// ==================== HOOK ====================

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }

  return context
}
