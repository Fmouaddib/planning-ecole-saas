/**
 * Service d'authentification
 * Contient la logique métier pour l'authentification
 */

import type { LoginCredentials, RegisterData, User, AuthUser } from '@/types'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/utils'

export class AuthService {
  // ==================== AUTHENTICATION ====================

  /**
   * Connexion d'un utilisateur
   */
  static async signIn(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error
      if (!data.user) throw new Error('Aucune données utilisateur reçues')

      // Récupérer les informations utilisateur depuis la base
      const authUser = await this.getUserProfile(data.user.id)
      return authUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  static async signUp(data: RegisterData): Promise<AuthUser> {
    try {
      // Créer le compte auth
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

      const authUser = await this.getUserProfile(authData.user.id)
      return authUser
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Déconnexion
   */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(getErrorMessage(error))
  }

  /**
   * Récupérer le profil utilisateur complet
   */
  static async getUserProfile(userId: string): Promise<AuthUser> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, establishment_id')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Profil utilisateur introuvable')

      return {
        id: data.id,
        email: data.email,
        role: data.role,
        establishmentId: data.establishment_id,
      }
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Récupérer la session actuelle
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Vérifier si un email existe déjà
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1)

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      
      return (data && data.length > 0) || false
    } catch (error) {
      console.error('Error checking email existence:', error)
      return false
    }
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Demander une réinitialisation de mot de passe
   */
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Mettre à jour le mot de passe
   */
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Mettre à jour le profil utilisateur
   */
  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          email: updates.email,
          profile_picture: updates.profilePicture,
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Mettre à jour l'email dans auth si nécessaire
      if (updates.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: updates.email,
        })
        
        if (emailError) {
          console.warn('Could not update email in Auth:', emailError)
        }
      }

      return data
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  // ==================== VALIDATION ====================

  /**
   * Vérifier si l'utilisateur a le rôle requis
   */
  static hasRole(user: AuthUser | null, requiredRole: string): boolean {
    if (!user) return false
    return user.role === requiredRole
  }

  /**
   * Vérifier si l'utilisateur a l'un des rôles requis
   */
  static hasAnyRole(user: AuthUser | null, requiredRoles: string[]): boolean {
    if (!user) return false
    return requiredRoles.includes(user.role)
  }

  /**
   * Vérifier si l'utilisateur est admin
   */
  static isAdmin(user: AuthUser | null): boolean {
    return this.hasRole(user, 'admin')
  }

  /**
   * Vérifier si l'utilisateur peut modifier un autre utilisateur
   */
  static canManageUser(currentUser: AuthUser | null, targetUserId: string): boolean {
    if (!currentUser) return false
    
    // L'utilisateur peut toujours modifier son propre profil
    if (currentUser.id === targetUserId) return true
    
    // Les admins peuvent modifier tous les utilisateurs
    return this.isAdmin(currentUser)
  }
}