/**
 * Contexte d'authentification pour l'application
 * Fournit l'état d'authentification à toute l'application
 */

import React, { createContext, useContext } from 'react'
import type { UseAuthReturn } from '@/types'
import { useAuth } from '@/hooks/useAuth'

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