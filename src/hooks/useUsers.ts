/**
 * Hook personnalisé pour la gestion des utilisateurs
 * Gère toutes les opérations CRUD sur les utilisateurs
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User, RegisterData, UseUsersReturn, UUID, UserRole } from '@/types'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getErrorMessage } from '@/utils'
import { transformUser } from '@/utils/transforms'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import { AuditService } from '@/services/auditService'
import toast from 'react-hot-toast'

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user: currentUser } = useAuth()

  // ==================== HELPER FUNCTIONS ====================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: unknown, _defaultMessage = 'Une erreur est survenue') => {
    const message = getErrorMessage(error)
    setError(message)
    console.error('Users Error:', error)
    return message
  }, [])

  // ==================== FETCH FUNCTIONS ====================

  const fetchUsers = useCallback(async () => {
    if (isDemoMode || !currentUser?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('establishment_id', currentUser.establishmentId)
        .eq('is_active', true)
        .order('last_name')
        .order('first_name')

      if (fetchError) throw fetchError

      setUsers((data || []).map(transformUser))
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des utilisateurs')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.establishmentId, handleError])

  const refreshUsers = useCallback(async (): Promise<void> => {
    await fetchUsers()
  }, [fetchUsers])

  // ==================== CRUD FUNCTIONS ====================

  const createUser = useCallback(async (data: RegisterData): Promise<User> => {
    if (!currentUser?.establishmentId) {
      throw new Error('Utilisateur non connecté')
    }

    // Vérifier que seuls les admins peuvent créer des utilisateurs
    if (currentUser.role !== 'admin') {
      throw new Error('Seuls les administrateurs peuvent créer des utilisateurs')
    }

    try {
      setError(null)

      // Vérifier les limites d'abonnement
      const limitCheck = await SubscriptionLimitsService.checkLimit(currentUser.establishmentId, 'users')
      if (!limitCheck.allowed) {
        const message = `Limite du plan atteinte (${limitCheck.current}/${limitCheck.max} utilisateurs). Contactez votre administrateur pour upgrader.`
        toast.error(message)
        throw new Error(message)
      }

      // Créer le compte avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirmer l'email
        user_metadata: {
          first_name: data.firstName,
          last_name: data.lastName,
          establishment_id: data.establishmentId,
          role: data.role || 'student',
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Échec de la création du compte')

      // Créer l'entrée dans la table users
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          establishment_id: data.establishmentId,
          role: data.role || 'student',
        })
        .select()
        .single()

      if (userError) throw userError

      const transformed = transformUser(newUser)

      setUsers(prev => [...prev, transformed])
      toast.success(`Utilisateur "${transformed.firstName} ${transformed.lastName}" créé avec succès`)

      // Audit logging
      if (currentUser) {
        AuditService.logCrud('created', 'user', transformed.id, currentUser.id, currentUser.establishmentId, {
          email: transformed.email,
          role: transformed.role,
        })
      }

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la création de l\'utilisateur')
      toast.error(message)
      throw error
    }
  }, [currentUser?.establishmentId, currentUser?.role, currentUser?.id, handleError])

  const updateUser = useCallback(async (id: UUID, updateData: Partial<User>): Promise<User> => {
    // Vérifier les permissions
    const isOwnProfile = id === currentUser?.id
    const isAdmin = currentUser?.role === 'admin'
    
    if (!isOwnProfile && !isAdmin) {
      throw new Error('Permission refusée')
    }

    try {
      setError(null)

      const userData = {
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        email: updateData.email,
        role: updateData.role,
        is_active: updateData.isActive,
        profile_picture: updateData.profilePicture,
      }

      // Si ce n'est pas un admin, ne permettre que la modification de certains champs
      if (!isAdmin) {
        delete userData.role
        delete userData.is_active
      }

      // Supprimer les propriétés undefined
      Object.keys(userData).forEach(key => {
        if (userData[key as keyof typeof userData] === undefined) {
          delete userData[key as keyof typeof userData]
        }
      })

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(userData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const transformed = transformUser(updatedUser)

      // Mettre à jour l'email dans Supabase Auth si nécessaire et si c'est un admin
      if (isAdmin && updateData.email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(id, {
          email: updateData.email,
        })

        if (emailError) {
          console.warn('Could not update email in Auth:', emailError)
        }
      }

      setUsers(prev =>
        prev.map(user => user.id === id ? transformed : user)
      )

      toast.success(`Utilisateur "${transformed.firstName} ${transformed.lastName}" mis à jour avec succès`)

      // Audit logging
      if (currentUser) {
        AuditService.logCrud('updated', 'user', id, currentUser.id, currentUser.establishmentId, {
          email: transformed.email,
        })
      }

      return transformed
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour de l\'utilisateur')
      toast.error(message)
      throw error
    }
  }, [currentUser?.id, currentUser?.role, handleError])

  const deleteUser = useCallback(async (id: UUID): Promise<void> => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Seuls les administrateurs peuvent supprimer des utilisateurs')
    }

    if (id === currentUser?.id) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte')
    }

    try {
      setError(null)

      // Soft delete - marquer comme inactif
      const { error: deleteError } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError

      setUsers(prev => prev.filter(user => user.id !== id))
      toast.success('Utilisateur supprimé avec succès')

      // Audit logging
      if (currentUser) {
        AuditService.logCrud('deleted', 'user', id, currentUser.id, currentUser.establishmentId)
      }
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la suppression de l\'utilisateur')
      toast.error(message)
      throw error
    }
  }, [currentUser?.role, currentUser?.id, handleError])

  // ==================== QUERY FUNCTIONS ====================

  const getUserById = useCallback((id: UUID): User | undefined => {
    return users.find(user => user.id === id)
  }, [users])

  const getUsersByRole = useCallback((role: UserRole): User[] => {
    return users.filter(user => user.role === role)
  }, [users])

  const searchUsers = useCallback((query: string): User[] => {
    if (!query.trim()) return users

    const searchTerm = query.toLowerCase().trim()
    return users.filter(user =>
      user.firstName.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    )
  }, [users])

  // ==================== COMPUTED VALUES ====================

  const usersByRole = useMemo(() => {
    return users.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = []
      }
      acc[user.role].push(user)
      return acc
    }, {} as Record<UserRole, User[]>)
  }, [users])

  const userStats = useMemo(() => {
    const total = users.length
    const byRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      byRole,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
    }
  }, [users])

  const teachers = useMemo(() => getUsersByRole('teacher'), [getUsersByRole])
  const students = useMemo(() => getUsersByRole('student'), [getUsersByRole])
  const admins = useMemo(() => getUsersByRole('admin'), [getUsersByRole])
  const staff = useMemo(() => getUsersByRole('staff'), [getUsersByRole])

  // ==================== PERMISSIONS ====================

  const canCreateUsers = currentUser?.role === 'admin'
  const canDeleteUsers = currentUser?.role === 'admin'
  const canUpdateAllUsers = currentUser?.role === 'admin'

  const canUpdateUser = useCallback((userId: UUID): boolean => {
    return userId === currentUser?.id || currentUser?.role === 'admin'
  }, [currentUser?.id, currentUser?.role])

  const canDeleteUser = useCallback((userId: UUID): boolean => {
    return currentUser?.role === 'admin' && userId !== currentUser?.id
  }, [currentUser?.role, currentUser?.id])

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (currentUser?.establishmentId) {
      fetchUsers()
    } else {
      setIsLoading(false)
    }
  }, [currentUser?.establishmentId, fetchUsers])

  // Écouter les changements en temps réel
  useEffect(() => {
    if (isDemoMode || !currentUser?.establishmentId) return

    const channel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `establishment_id=eq.${currentUser.establishmentId}`,
        },
        (payload) => {
          console.log('User change detected:', payload)

          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              fetchUsers() // Refetch to get transformed data
              break

            case 'DELETE':
              setUsers(prev => prev.filter(user => user.id !== payload.old.id))
              break
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.establishmentId, fetchUsers])

  return {
    users,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByRole,
    refreshUsers,
    clearError,
    // Fonctions de recherche
    searchUsers,
    // Valeurs calculées
    usersByRole,
    userStats,
    teachers,
    students,
    admins,
    staff,
    // Permissions
    canCreateUsers,
    canDeleteUsers,
    canUpdateAllUsers,
    canUpdateUser,
    canDeleteUser,
  }
}