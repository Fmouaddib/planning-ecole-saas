/**
 * Hook personnalisé pour la gestion des utilisateurs
 * Gère toutes les opérations CRUD sur les utilisateurs
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User, RegisterData, UseUsersReturn, UUID, UserRole } from '@/types'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getUserFriendlyError } from '@/utils'
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
    const message = getUserFriendlyError(error)
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

      const centerId = currentUser.establishmentId

      // 1. Profils directs du centre
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('center_id', centerId)
        .order('full_name')

      if (fetchError) throw fetchError

      const directUsers = (data || []).map(transformUser)
      const directIds = new Set(directUsers.map(u => u.id))

      // 2. Utilisateurs liés via user_centers (multi-centre)
      const { data: linkedData } = await supabase
        .rpc('get_center_linked_users', { p_center_id: centerId })

      const linkedUsers = (linkedData || [])
        .filter((u: any) => !directIds.has(u.id))
        .map(transformUser)

      setUsers([...directUsers, ...linkedUsers])
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
      const centerId = currentUser.establishmentId

      // Vérifier les limites d'abonnement
      const limitCheck = await SubscriptionLimitsService.checkLimit(centerId, 'users')
      if (!limitCheck.allowed) {
        const message = `Limite du plan atteinte (${limitCheck.current}/${limitCheck.max} utilisateurs). Contactez votre administrateur pour upgrader.`
        toast.error(message)
        throw new Error(message)
      }

      // ========== VÉRIFICATION EMAIL EXISTANT ==========
      // Chercher dans les profils du même centre (RLS-scoped)
      const { data: existingInCenter } = await supabase
        .from('profiles')
        .select('id, is_active, role, full_name')
        .eq('email', data.email)
        .eq('center_id', centerId)
        .maybeSingle()

      // Cas 1 : L'email existe déjà dans ce centre et est actif
      if (existingInCenter && existingInCenter.is_active) {
        throw new Error(`Un utilisateur avec l'email "${data.email}" existe déjà dans votre centre`)
      }

      // Cas 2 : L'email existe dans ce centre mais est bloqué/inactif → réactiver
      if (existingInCenter && !existingInCenter.is_active) {
        const { data: reactivated, error: reactivateError } = await supabase
          .from('profiles')
          .update({
            is_active: true,
            full_name: `${data.firstName} ${data.lastName}`,
            role: data.role || 'student',
          })
          .eq('id', existingInCenter.id)
          .select()
          .single()

        if (reactivateError) throw reactivateError

        // Débloquer dans GoTrue
        await supabase.functions.invoke('admin-update-user', {
          body: { user_id: existingInCenter.id, action: 'unban' },
        })

        const transformed = transformUser(reactivated)

        // Envoyer l'invitation si demandé
        if (data.sendInvitation) {
          const activeCtx = getActiveContext()
          const centerName = activeCtx?.centerName || 'votre centre'
          const invCenterId = activeCtx?.centerId || centerId || ''

          const { error: inviteError } = await supabase.functions.invoke('send-invitation', {
            body: {
              email: data.email,
              userName: `${data.firstName} ${data.lastName}`.trim(),
              centerName,
              centerId: invCenterId,
              role: data.role || 'student',
              redirectTo: window.location.origin,
            },
          })
          if (inviteError) {
            console.error('[useUsers] send-invitation error:', inviteError)
            toast.error('Compte réactivé mais l\'email d\'invitation n\'a pas pu être envoyé')
          }
        }

        setUsers(prev => {
          const existing = prev.find(u => u.id === transformed.id)
          if (existing) return prev.map(u => u.id === transformed.id ? transformed : u)
          return [...prev, transformed]
        })
        toast.success(
          data.sendInvitation
            ? `Compte "${transformed.firstName} ${transformed.lastName}" réactivé — invitation envoyée`
            : `Compte "${transformed.firstName} ${transformed.lastName}" réactivé avec succès`
        )

        AuditService.logCrud('updated', 'user', transformed.id, currentUser.id, centerId, {
          email: transformed.email, action: 'reactivated',
        })

        return transformed
      }

      // ========== CRÉATION VIA EDGE FUNCTION ==========
      // Utilise create-user-for-center qui gère :
      // - Création d'un nouvel utilisateur (auth.users + profiles)
      // - Liaison d'un utilisateur existant (autre centre → user_centers)
      // - Envoi d'invitation email
      // Tout côté serveur avec service_role, sans perturber la session admin

      const { data: result, error: fnError } = await supabase.functions.invoke('create-user-for-center', {
        body: {
          email: data.email,
          full_name: `${data.firstName} ${data.lastName}`.trim(),
          role: data.role || 'student',
          center_id: centerId,
          phone: (data as any).phone || null,
          password: data.sendInvitation ? null : data.password,
          send_invitation: data.sendInvitation,
        },
      })

      if (fnError) {
        // Extraire le message d'erreur depuis la réponse de l'Edge Function
        let errMsg = ''
        try {
          // FunctionsHttpError : la réponse est dans .context (Response object)
          if (typeof fnError === 'object' && 'context' in fnError) {
            const resp = (fnError as any).context
            if (resp && typeof resp.json === 'function') {
              const body = await resp.json()
              errMsg = body?.error || ''
            }
          }
          // Fallback: message direct
          if (!errMsg && (fnError as any)?.message) {
            const msg = (fnError as any).message
            // Tenter de parser si c'est du JSON
            try {
              const parsed = JSON.parse(msg)
              errMsg = parsed?.error || msg
            } catch {
              errMsg = msg
            }
          }
        } catch (parseErr) {
          console.error('[useUsers] Error parsing fnError:', parseErr, fnError)
        }
        throw new Error(errMsg || 'Erreur edge function create-user-for-center')
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Réponse inattendue de create-user-for-center')
      }

      const createdUser = result.user
      const transformed = transformUser({
        ...createdUser,
        avatar_url: createdUser.avatar_url || null,
        linkedin: createdUser.linkedin || null,
        created_at: createdUser.created_at || new Date().toISOString(),
        updated_at: createdUser.updated_at || new Date().toISOString(),
      })

      setUsers(prev => [...prev, transformed])

      const isLinked = result.linked === true
      toast.success(
        isLinked
          ? `Utilisateur existant "${data.firstName} ${data.lastName}" ajouté à votre centre`
          : data.sendInvitation
            ? `Utilisateur "${transformed.firstName} ${transformed.lastName}" créé — invitation envoyée`
            : `Utilisateur "${transformed.firstName} ${transformed.lastName}" créé avec succès`
      )

      AuditService.logCrud('created', 'user', createdUser.id, currentUser.id, centerId, {
        email: data.email,
        role: data.role,
        action: isLinked ? 'linked_from_other_center' : 'created',
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
      // Email is NOT updated in profiles here — it will be synced by the USER_UPDATED auth handler after confirmation
      if (updateData.profilePicture) userData.avatar_url = updateData.profilePicture
      if (updateData.phone !== undefined) userData.phone = updateData.phone || null
      if (updateData.linkedin !== undefined) userData.linkedin = updateData.linkedin || null

      if (isAdmin) {
        if (updateData.role) {
          // Prevent privilege escalation to super_admin
          const safeRoles = ['student', 'teacher', 'staff', 'admin', 'trainer', 'coordinator']
          if (safeRoles.includes(updateData.role)) {
            userData.role = updateData.role
          }
        }
        if (updateData.isActive !== undefined) userData.is_active = updateData.isActive
      }

      const existingUser = users.find(u => u.id === id)

      const { data: updatedUser, error: updateError } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', id)
        .eq('center_id', currentUser?.establishmentId)
        .select()
        .single()

      if (updateError) throw updateError

      const transformed = transformUser(updatedUser)

      // Email change: use change-email Edge Function for confirmation flow
      if (isAdmin && updateData.email && updateData.email !== existingUser?.email) {
        const { error: emailChangeError } = await supabase.functions.invoke('change-email', {
          body: { user_id: id, new_email: updateData.email },
        })
        if (emailChangeError) {
          console.error('[useUsers] change-email error:', emailChangeError)
          toast.error('Le changement d\'email n\'a pas pu être initié')
        } else {
          toast.success(`Un email de confirmation a été envoyé à ${updateData.email}`)
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

      // Soft delete - marquer comme inactif (scoped to center)
      // Essayer d'abord profiles (profil direct), puis user_centers (lien multi-centre)
      const { data: profileHit, error: deleteError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)
        .eq('center_id', currentUser?.establishmentId)
        .select('id')

      if (deleteError) throw deleteError

      // Si pas trouvé dans profiles, désactiver dans user_centers
      if (!profileHit || profileHit.length === 0) {
        const { error: ucError } = await supabase
          .from('user_centers')
          .update({ is_active: false })
          .eq('user_id', id)
          .eq('center_id', currentUser?.establishmentId)
        if (ucError) throw ucError
      }

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

  // ==================== BLOCK / UNBLOCK ====================

  const blockUser = useCallback(async (id: UUID): Promise<void> => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      throw new Error('Seuls les administrateurs peuvent bloquer des utilisateurs')
    }
    if (id === currentUser?.id) {
      throw new Error('Vous ne pouvez pas bloquer votre propre compte')
    }
    try {
      setError(null)
      // Update profile (direct ou via user_centers)
      const { data: profileHit } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)
        .eq('center_id', currentUser?.establishmentId)
        .select('id')

      if (!profileHit || profileHit.length === 0) {
        // Utilisateur lié via user_centers
        const { error: ucError } = await supabase
          .from('user_centers')
          .update({ is_active: false })
          .eq('user_id', id)
          .eq('center_id', currentUser?.establishmentId)
        if (ucError) throw ucError
      }

      // Ban in GoTrue seulement si c'est un profil direct (pas multi-centre)
      if (profileHit && profileHit.length > 0) {
        const { error: banError } = await supabase.functions.invoke('admin-update-user', {
          body: { user_id: id, action: 'ban' },
        })
        if (banError) console.error('GoTrue ban error:', banError)
      }

      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: false } : u))
      toast.success('Utilisateur bloqué')
    } catch (error) {
      const message = handleError(error, 'Erreur lors du blocage')
      toast.error(message)
      throw error
    }
  }, [currentUser?.role, currentUser?.id, currentUser?.establishmentId, handleError])

  const unblockUser = useCallback(async (id: UUID): Promise<void> => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      throw new Error('Seuls les administrateurs peuvent débloquer des utilisateurs')
    }
    if (id === currentUser?.id) {
      throw new Error('Vous ne pouvez pas débloquer votre propre compte')
    }
    try {
      setError(null)
      // Update profile (direct ou via user_centers)
      const { data: profileHit } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', id)
        .eq('center_id', currentUser?.establishmentId)
        .select('id')

      if (!profileHit || profileHit.length === 0) {
        // Utilisateur lié via user_centers
        const { error: ucError } = await supabase
          .from('user_centers')
          .update({ is_active: true })
          .eq('user_id', id)
          .eq('center_id', currentUser?.establishmentId)
        if (ucError) throw ucError
      }

      // Unban in GoTrue seulement si c'est un profil direct
      if (profileHit && profileHit.length > 0) {
        const { error: unbanError } = await supabase.functions.invoke('admin-update-user', {
          body: { user_id: id, action: 'unban' },
        })
        if (unbanError) console.error('GoTrue unban error:', unbanError)
      }

      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: true } : u))
      toast.success('Utilisateur débloqué')
    } catch (error) {
      const message = handleError(error, 'Erreur lors du déblocage')
      toast.error(message)
      throw error
    }
  }, [currentUser?.role, currentUser?.id, currentUser?.establishmentId, handleError])

  // ==================== PASSWORD RESET ====================

  const sendPasswordReset = useCallback(async (userId: UUID): Promise<void> => {
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser) throw new Error('Utilisateur introuvable')

    const activeCtx = getActiveContext()
    const centerName = activeCtx?.centerName || 'votre centre'
    const centerId = activeCtx?.centerId || currentUser?.establishmentId || ''

    const { error } = await supabase.functions.invoke('send-invitation', {
      body: {
        email: targetUser.email,
        userName: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
        centerName,
        centerId,
        role: targetUser.role,
        redirectTo: window.location.origin,
        customSubject: 'Réinitialisation de votre mot de passe — AntiPlanning',
        customHtmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Réinitialisation de mot de passe</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
    <p style="font-size:15px;color:#333">Bonjour <strong>${targetUser.firstName}</strong>,</p>
    <p style="font-size:15px;color:#333">Votre administrateur a initié une réinitialisation de votre mot de passe sur <strong>${centerName}</strong>.</p>
    <p style="font-size:15px;color:#333">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
    <p style="text-align:center;margin:28px 0">
      <a href="{{setup_url}}" style="display:inline-block;background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
        Définir un nouveau mot de passe
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Ce lien est valable 24 heures. Si vous n'avez pas demandé cette réinitialisation, contactez votre administrateur.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center">AntiPlanning — Ne pas répondre à cet email</p>
</div>`,
      },
    })

    if (error) {
      console.error('[useUsers] password reset error:', error)
      throw new Error('L\'email de réinitialisation n\'a pas pu être envoyé')
    }

    toast.success(`Email de réinitialisation envoyé à ${targetUser.email}`)
  }, [users, currentUser?.establishmentId])

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
    blockUser,
    unblockUser,
    sendPasswordReset,
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