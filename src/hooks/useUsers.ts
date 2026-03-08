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
import { getActiveContext } from '@/utils/userContext'
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
        .from('profiles')
        .select('*')
        .eq('center_id', currentUser.establishmentId)
        .eq('is_active', true)
        .order('full_name')

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

    // Vérifier que seuls les admins/super_admins peuvent créer des utilisateurs
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
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

      // Mode invitation : mot de passe aléatoire (l'utilisateur le définira via le lien)
      const effectivePassword = data.sendInvitation
        ? crypto.randomUUID() + 'Aa1!'   // Satisfait les contraintes de mot de passe
        : data.password

      // Sauvegarder la session admin avant de créer le compte
      const { data: { session: adminSession } } = await supabase.auth.getSession()

      // Créer le compte avec signUp (admin.createUser nécessite service_role key)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: effectivePassword,
        options: {
          data: {
            full_name: `${data.firstName} ${data.lastName}`,
            role: data.role || 'student',
          },
        },
      })

      if (signUpError) throw signUpError
      if (!signUpData.user) throw new Error('Échec de la création du compte')

      // Restaurer la session admin si signUp a changé la session
      if (adminSession && signUpData.session) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      // Toujours utiliser le center_id de l'admin (pas celui du formulaire)
      const centerId = currentUser.establishmentId

      // Créer l'entrée dans la table profiles
      const { data: newUser, error: userError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          email: data.email,
          full_name: `${data.firstName} ${data.lastName}`,
          center_id: centerId,
          role: data.role || 'student',
          is_active: true,
        })
        .select()
        .single()

      if (userError) throw userError

      const transformed = transformUser(newUser)

      // Envoyer l'email d'invitation si demandé
      if (data.sendInvitation) {
        const activeCtx = getActiveContext()
        const centerName = activeCtx?.centerName || 'votre centre'
        const invCenterId = activeCtx?.centerId || centerId || ''
        const redirectTo = window.location.origin

        const { error: inviteError } = await supabase.functions.invoke('send-invitation', {
          body: {
            email: data.email,
            userName: `${data.firstName} ${data.lastName}`.trim(),
            centerName,
            centerId: invCenterId,
            role: data.role || 'student',
            redirectTo,
          },
        })

        if (inviteError) {
          console.error('[useUsers] send-invitation error:', inviteError)
          toast.error('Utilisateur créé mais l\'email d\'invitation n\'a pas pu être envoyé')
        }
      }

      setUsers(prev => [...prev, transformed])
      toast.success(
        data.sendInvitation
          ? `Utilisateur "${transformed.firstName} ${transformed.lastName}" créé — invitation envoyée par email`
          : `Utilisateur "${transformed.firstName} ${transformed.lastName}" créé avec succès`
      )

      // Audit logging
      AuditService.logCrud('created', 'user', transformed.id, currentUser.id, currentUser.establishmentId, {
        email: transformed.email,
        role: transformed.role,
        sendInvitation: data.sendInvitation,
      })

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
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'

    if (!isOwnProfile && !isAdmin) {
      throw new Error('Permission refusée')
    }

    try {
      setError(null)

      const userData: Record<string, any> = {}
      if (updateData.firstName || updateData.lastName) {
        const fn = updateData.firstName || ''
        const ln = updateData.lastName || ''
        userData.full_name = `${fn} ${ln}`.trim()
      }
      if (updateData.email) userData.email = updateData.email
      if (updateData.profilePicture) userData.avatar_url = updateData.profilePicture
      if (updateData.phone !== undefined) userData.phone = updateData.phone || null
      if (updateData.linkedin !== undefined) userData.linkedin = updateData.linkedin || null

      if (isAdmin) {
        if (updateData.role) userData.role = updateData.role
        if (updateData.isActive !== undefined) userData.is_active = updateData.isActive
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('profiles')
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
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      throw new Error('Seuls les administrateurs peuvent supprimer des utilisateurs')
    }

    if (id === currentUser?.id) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte')
    }

    try {
      setError(null)

      // Soft delete - marquer comme inactif
      const { error: deleteError } = await supabase
        .from('profiles')
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

  // ==================== INVITATION ====================

  const sendInvitationToUser = useCallback(async (
    userId: UUID,
    options?: { customSubject?: string; customHtmlContent?: string }
  ) => {
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser) throw new Error('Utilisateur introuvable')

    const activeCtx = getActiveContext()
    const centerName = activeCtx?.centerName || 'votre centre'
    const centerId = activeCtx?.centerId || currentUser?.establishmentId || ''
    const redirectTo = window.location.origin

    const { error: inviteError } = await supabase.functions.invoke('send-invitation', {
      body: {
        email: targetUser.email,
        userName: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
        centerName,
        centerId,
        role: targetUser.role,
        redirectTo,
        ...(options?.customSubject && { customSubject: options.customSubject }),
        ...(options?.customHtmlContent && { customHtmlContent: options.customHtmlContent }),
      },
    })

    if (inviteError) {
      console.error('[useUsers] send-invitation error:', inviteError)
      // Extract detailed error message
      let detail = ''
      if (typeof inviteError === 'object' && inviteError !== null) {
        if ('context' in inviteError) {
          try { detail = (await (inviteError as any).context?.json())?.error || '' } catch {}
        }
        if (!detail) detail = (inviteError as any).message || JSON.stringify(inviteError)
      }
      throw new Error(detail || 'L\'email d\'invitation n\'a pas pu être envoyé')
    }

    toast.success(`Invitation envoyée à ${targetUser.firstName} ${targetUser.lastName}`)
  }, [users])

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

  const isAdminOrSuperAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
  const canCreateUsers = isAdminOrSuperAdmin
  const canDeleteUsers = isAdminOrSuperAdmin
  const canUpdateAllUsers = isAdminOrSuperAdmin

  const canUpdateUser = useCallback((userId: UUID): boolean => {
    return userId === currentUser?.id || currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
  }, [currentUser?.id, currentUser?.role])

  const canDeleteUser = useCallback((userId: UUID): boolean => {
    return (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && userId !== currentUser?.id
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
          table: 'profiles',
          filter: `center_id=eq.${currentUser.establishmentId}`,
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
    sendInvitationToUser,
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