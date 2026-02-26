/**
 * Composant de protection des routes
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  fallback 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuthContext()
  const location = useLocation()

  // Afficher le spinner pendant le chargement
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Rediriger vers la page de connexion si non authentifié
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }

  // Vérifier les rôles requis
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user.role)) {
      // Afficher le fallback ou un message d'erreur
      return fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg 
                className="h-6 w-6 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Accès refusé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}

// ==================== HELPER COMPONENTS ====================

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  return (
    <ProtectedRoute requiredRoles={['admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

interface TeacherOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function TeacherOnly({ children, fallback }: TeacherOnlyProps) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'teacher']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

interface StaffOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function StaffOnly({ children, fallback }: StaffOnlyProps) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'staff']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}