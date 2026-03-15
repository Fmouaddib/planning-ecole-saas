/**
 * Hook d'authentification personnalisé avec Supabase Auth
 * Gère toutes les opérations d'authentification et l'état utilisateur
 * Supporte le multi-centres/rôles via user_centers
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser, LoginCredentials, RegisterData, User, UseAuthReturn, UserContextInfo } from '@/types'
import { supabase } from '@/lib/supabase'
import { parseFullName, getUserFriendlyError } from '@/utils'
import { AuditService } from '@/services/auditService'
import { getImpersonation, clearImpersonation, IMPERSONATION_EVENT } from '@/utils/impersonation'
import { getActiveContext, setActiveContext, clearActiveContext, USER_CONTEXT_EVENT } from '@/utils/userContext'
import toast from 'react-hot-toast'
import { logError } from '@/services/errorLogger'

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contexts, setContexts] = useState<UserContextInfo[]>([])
  const [showContextPicker, setShowContextPicker] = useState(false)
  const navigate = useNavigate()

  // ==================== HELPER FUNCTIONS ====================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: unknown, _defaultMessage = 'Une erreur est survenue') => {
    const message = getUserFriendlyError(error)
    setError(message)
    console.error('Auth Error:', error)
    logError(error, { component: 'useAuth', action: 'auth operation' })
    return message
  }, [])

  // Convertir l'utilisateur Supabase en AuthUser
  const transformUser = useCallback(async (supabaseUser: any): Promise<AuthUser | null> => {
    if (!supabaseUser?.id || !supabaseUser?.email) return null

    try {
      // Récupérer les informations complètes de l'utilisateur depuis la table profiles
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, center_id, phone, linkedin, avatar_url, is_active')
        .eq('id', supabaseUser.id)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
        return null
      }

      const { firstName, lastName } = parseFullName(userData.full_name)
      return {
        id: userData.id,
        email: userData.email,
        firstName,
        lastName,
        role: userData.role,
        establishmentId: userData.center_id,
        phone: userData.phone ?? undefined,
        linkedin: userData.linkedin ?? undefined,
        avatar: userData.avatar_url ?? undefined,
        profilePicture: userData.avatar_url ?? undefined,
        isActive: userData.is_active ?? true,
      }
    } catch (error) {
      console.error('Error transforming user:', error)
      return null
    }
  }, [])

  // Fetch all contexts for a user (profile + user_centers)
  const fetchContexts = useCallback(async (authUser: AuthUser): Promise<UserContextInfo[]> => {
    try {
      // 1. Primary context from profiles
      const { data: centerData } = await supabase
        .from('training_centers')
        .select('id, name')
        .eq('id', authUser.establishmentId)
        .single()

      const primaryCtx: UserContextInfo = {
        centerId: authUser.establishmentId,
        centerName: centerData?.name || 'Centre principal',
        role: authUser.role,
      }

      // 2. Additional contexts from user_centers
      const { data: extraContexts } = await supabase
        .from('user_centers')
        .select('center_id, role, training_centers:center_id(name)')
        .eq('user_id', authUser.id)
        .eq('is_active', true)

      const additional: UserContextInfo[] = (extraContexts || [])
        .filter((uc: any) => !(uc.center_id === primaryCtx.centerId && uc.role === primaryCtx.role))
        .map((uc: any) => ({
          centerId: uc.center_id,
          centerName: (uc.training_centers as any)?.name || 'Centre',
          role: uc.role,
        }))

      return [primaryCtx, ...additional]
    } catch (err) {
      console.error('Error fetching contexts:', err)
      return [{
        centerId: authUser.establishmentId,
        centerName: 'Centre principal',
        role: authUser.role,
      }]
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

      // Fetch contexts and show picker if multiple
      const allContexts = await fetchContexts(authUser)
      setContexts(allContexts)

      // Check if there's a saved context from before
      const savedCtx = getActiveContext()
      if (savedCtx && allContexts.some(c => c.centerId === savedCtx.centerId && c.role === savedCtx.role)) {
        // Restore saved context
        setActiveContext(savedCtx)
      } else if (allContexts.length > 1) {
        // Multiple contexts, show picker
        clearActiveContext()
        setShowContextPicker(true)
      }

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
  }, [transformUser, fetchContexts, handleError])

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
            full_name: `${data.firstName} ${data.lastName}`,
            center_id: data.establishmentId,
            role: data.role || 'student',
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Échec de la création du compte')

      // Créer l'entrée dans la table profiles
      const { error: userError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: `${data.firstName} ${data.lastName}`,
          center_id: data.establishmentId,
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

      // Nettoyer l'impersonation et le contexte avant déconnexion
      clearImpersonation()
      clearActiveContext()

      // Audit logging avant la déconnexion
      if (user?.establishmentId) {
        AuditService.logLogout(user.id, user.email, user.establishmentId)
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setContexts([])
      setShowContextPicker(false)
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

      // Construire full_name à partir de firstName/lastName
      const fullName = [updateData.firstName, updateData.lastName].filter(Boolean).join(' ')

      // Mettre à jour les données dans la table profiles
      const updateFields: Record<string, unknown> = {}
      if (fullName) updateFields.full_name = fullName
      if (updateData.phone !== undefined) updateFields.phone = updateData.phone || null
      if (updateData.linkedin !== undefined) updateFields.linkedin = updateData.linkedin || null

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateFields)
        .eq('id', user.id)

      if (updateError) throw updateError

      // Mettre à jour l'email via Edge Function si nécessaire
      const emailChanged = updateData.email && updateData.email !== user.email
      if (emailChanged) {
        // Use change-email Edge Function for proper confirmation flow
        const { error: emailError } = await supabase.functions.invoke('change-email', {
          body: { user_id: user.id, new_email: updateData.email },
        })
        if (emailError) {
          toast.error('Impossible d\'initier le changement d\'email')
          console.error('[useAuth] change-email error:', emailError)
        } else {
          toast.success('Un email de confirmation a été envoyé à la nouvelle adresse. Vérifiez votre boîte de réception.')
        }
        // Don't update local state for email yet — it will change after confirmation
      }

      // Mettre à jour l'état local
      setUser(prev => prev ? {
        ...prev,
        firstName: updateData.firstName ?? prev.firstName,
        lastName: updateData.lastName ?? prev.lastName,
        // email stays unchanged until confirmed
        phone: updateData.phone !== undefined ? (updateData.phone || undefined) : prev.phone,
        linkedin: updateData.linkedin !== undefined ? (updateData.linkedin || undefined) : prev.linkedin,
      } : null)

      if (emailChanged) {
        toast.success('Profil mis à jour. Confirmez le changement d\'email via le lien envoyé.')
      } else {
        toast.success('Profil mis à jour avec succès')
      }
      return { ...updateData, id: user.id, email: updateData.email ?? user.email } as User
    } catch (error) {
      const message = handleError(error, 'Erreur lors de la mise à jour du profil')
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, handleError])

  // ==================== CONTEXT SWITCHING ====================

  const switchContext = useCallback((ctx: UserContextInfo) => {
    setActiveContext(ctx)
    setShowContextPicker(false)
    toast.success(`Espace actif : ${ctx.centerName} (${ctx.role === 'super_admin' ? 'Super Admin' : ctx.role === 'teacher' ? 'Professeur' : ctx.role === 'admin' ? 'Admin' : ctx.role === 'student' ? 'Étudiant' : ctx.role})`)
  }, [])

  const dismissContextPicker = useCallback(() => {
    // If no active context set, use the first one (primary)
    if (!getActiveContext() && contexts.length > 0) {
      setActiveContext(contexts[0])
    }
    setShowContextPicker(false)
  }, [contexts])

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

          // Fetch contexts
          if (authUser) {
            const allContexts = await fetchContexts(authUser)
            setContexts(allContexts)

            // If multiple contexts and no saved context, show picker
            const savedCtx = getActiveContext()
            if (allContexts.length > 1 && !savedCtx) {
              setShowContextPicker(true)
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [transformUser, fetchContexts])

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
              if (authUser) {
                const allContexts = await fetchContexts(authUser)
                setContexts(allContexts)
              }
            }
            break

          case 'SIGNED_OUT':
            setUser(null)
            setContexts([])
            clearActiveContext()
            break

          case 'TOKEN_REFRESHED':
            if (session?.user) {
              const authUser = await transformUser(session.user)
              setUser(authUser)
            }
            break

          case 'USER_UPDATED':
            // Sync email from auth to profiles after email confirmation
            if (session?.user) {
              const authUser = await transformUser(session.user)
              if (authUser) {
                // Check if auth email differs from profile — sync if needed
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', session.user.id)
                  .single()
                if (profile && profile.email !== session.user.email) {
                  await supabase
                    .from('profiles')
                    .update({ email: session.user.email })
                    .eq('id', session.user.id)
                  toast.success('Adresse email mise à jour avec succès')
                }
                setUser(authUser)
              }
            }
            break

          default:
            break
        }

        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [transformUser, fetchContexts])

  // ==================== IMPERSONATION + CONTEXT ====================

  // Tick counter pour forcer le recalcul de effectiveUser
  const [_impersonationTick, setImpersonationTick] = useState(0)
  const [_contextTick, setContextTick] = useState(0)

  useEffect(() => {
    const onImpChanged = () => setImpersonationTick(t => t + 1)
    window.addEventListener(IMPERSONATION_EVENT, onImpChanged)
    return () => window.removeEventListener(IMPERSONATION_EVENT, onImpChanged)
  }, [])

  useEffect(() => {
    const onCtxChanged = () => setContextTick(t => t + 1)
    window.addEventListener(USER_CONTEXT_EVENT, onCtxChanged)
    return () => window.removeEventListener(USER_CONTEXT_EVENT, onCtxChanged)
  }, [])

  // Compute effective user based on context + impersonation
  const effectiveUser = useMemo(() => {
    if (!user) return null

    // 1. Apply context switching (multi-role/center)
    let base = { ...user }
    const activeCtx = getActiveContext()
    if (activeCtx) {
      base = {
        ...base,
        role: activeCtx.role,
        establishmentId: activeCtx.centerId,
      }
    }

    // 2. Apply impersonation on top (only for super_admin base role)
    if (user.role === 'super_admin') {
      const imp = getImpersonation()
      if (imp) {
        const overrides: Partial<AuthUser> = {
          establishmentId: imp.centerId,
        }
        if (imp.userRole) overrides.role = imp.userRole as AuthUser['role']
        if (imp.userId) {
          overrides.id = imp.userId
          if (imp.userName) {
            const parts = imp.userName.trim().split(/\s+/)
            overrides.firstName = parts[0] || ''
            overrides.lastName = parts.slice(1).join(' ') || ''
          }
          if (imp.userEmail) overrides.email = imp.userEmail
        }
        return { ...base, ...overrides }
      }
    }

    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, _impersonationTick, _contextTick])

  // ==================== COMPUTED VALUES ====================

  const isAuthenticated = effectiveUser !== null

  return {
    user: effectiveUser,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    error,
    clearError,
    contexts,
    showContextPicker,
    dismissContextPicker,
    switchContext,
  }
}
