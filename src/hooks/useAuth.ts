/**
 * Hook d'authentification personnalisé avec Supabase Auth
 * Gère toutes les opérations d'authentification et l'état utilisateur
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser, LoginCredentials, RegisterData, User, UseAuthReturn } from '@/types'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/utils'
import { AuditService } from '@/services/auditService'
import toast from 'react-hot-toast'

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // ==================== HELPER FUNCTIONS ====================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: unknown, _defaultMessage = 'Une erreur est survenue') => {
    const message = getErrorMessage(error)
    setError(message)
    console.error('Auth Error:', error)
    return message
  }, [])

  // Convertir l'utilisateur Supabase en AuthUser
  const transformUser = useCallback(async (supabaseUser: any): Promise<AuthUser | null> => {
    if (!supabaseUser?.id || !supabaseUser?.email) return null

    try {
      // Récupérer les informations complètes de l'utilisateur depuis la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, establishment_id')
        .eq('id', supabaseUser.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        return null
      }

      return {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        establishmentId: userData.establishment_id,
      }
    } catch (error) {
      console.error('Error transforming user:', error)
      return null
    }
  }, [])

  // ==================== AUTH FUNCTIONS ====================

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (authError) throw authError
      if (!data.user) throw new Error('Aucune données utilisateur reçues')

      const authUser = await transformUser(data.user)
      if (!authUser) throw new Error('Impossible de récupérer les informations utilisateur')

      setUser(authUser)
      toast.success('Connexion réussie')

      // Audit logging
      if (authUser.establishmentId) {
        AuditService.logLogin(authUser.id, authUser.email, authUser.establishmentId)
      }

      return authUser
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la connexion')
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [transformUser, handleError])

  const register = useCallback(async (data: RegisterData): Promise<AuthUser> => {
    try {
      setIsLoading(true)
      setError(null)

      // Créer le compte avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            establishment_id: data.establishmentId,
            role: data.role || 'student',
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Échec de la création du compte')

      // Créer l'entrée dans la table users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          establishment_id: data.establishmentId,
          role: data.role || 'student',
        })

      if (userError) throw userError

      const authUser = await transformUser(authData.user)
      if (!authUser) throw new Error('Impossible de récupérer les informations utilisateur')

      setUser(authUser)
      toast.success('Compte créé avec succès')
      
      return authUser
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création du compte')
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [transformUser, handleError])

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      // Audit logging avant la déconnexion
      if (user?.establishmentId) {
        AuditService.logLogout(user.id, user.email, user.establishmentId)
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      toast.success('Déconnexion réussie')
      navigate('/login')
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la déconnexion')
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [navigate, handleError])

  const updateProfile = useCallback(async (updateData: Partial<User>): Promise<User> => {
    try {
      if (!user) throw new Error('Utilisateur non connecté')

      setIsLoading(true)
      setError(null)

      // Mettre à jour les données dans la table users
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          first_name: updateData.firstName,
          last_name: updateData.lastName,
          email: updateData.email,
          profile_picture: updateData.profilePicture,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Mettre à jour l'email dans Supabase Auth si nécessaire
      if (updateData.email && updateData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: updateData.email,
        })
        
        if (emailError) throw emailError
      }

      // Mettre à jour l'état local
      setUser(prev => prev ? { ...prev, email: data.email } : null)
      
      toast.success('Profil mis à jour avec succès')
      return data
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour du profil')
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, handleError])

  // ==================== EFFECTS ====================

  // Initialiser l'authentification au chargement
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Récupérer la session actuelle
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          return
        }

        if (session?.user) {
          const authUser = await transformUser(session.user)
          setUser(authUser)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [transformUser])

  // Écouter les changements d'authentification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              const authUser = await transformUser(session.user)
              setUser(authUser)
            }
            break
          
          case 'SIGNED_OUT':
            setUser(null)
            break
          
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              const authUser = await transformUser(session.user)
              setUser(authUser)
            }
            break
          
          default:
            break
        }

        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [transformUser])

  // ==================== COMPUTED VALUES ====================

  const isAuthenticated = user !== null

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    error,
    clearError,
  }
}