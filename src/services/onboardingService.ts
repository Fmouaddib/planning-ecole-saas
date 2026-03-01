/**
 * Service d'onboarding self-service
 * Gère la création de centre et l'inscription par code
 */

import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/utils'

/** Format attendu : XX-YYYY (2 lettres, tiret, 1-6 caractères alphanumériques) ex: IS-PARIS, FP-LYON */
const ENROLLMENT_CODE_REGEX = /^[A-Z]{2}-[A-Z0-9]{1,9}$/i

export interface CreateCenterResult {
  center_id: string
  enrollment_code: string
  center_name: string
}

export interface JoinCenterResult {
  center_id: string
  center_name: string
}

export class OnboardingService {
  /**
   * Valide le format d'un code d'inscription
   */
  static isValidCodeFormat(code: string): boolean {
    return ENROLLMENT_CODE_REGEX.test(code.trim())
  }

  /**
   * Créer un centre avec l'utilisateur courant comme admin
   * L'utilisateur doit être authentifié (signUp terminé)
   */
  static async createCenterWithAdmin(params: {
    centerName: string
    acronym?: string
    address?: string
    postalCode?: string
    city?: string
    phone?: string
    email?: string
  }): Promise<CreateCenterResult> {
    try {
      const { data, error } = await supabase.rpc('create_center_with_admin', {
        p_center_name: params.centerName,
        p_acronym: params.acronym || null,
        p_address: params.address || null,
        p_postal_code: params.postalCode || null,
        p_city: params.city || null,
        p_phone: params.phone || null,
        p_email: params.email || null,
      })

      if (error) throw error
      return data as CreateCenterResult
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Rejoindre un centre existant via son code d'inscription
   * L'utilisateur doit être authentifié (signUp terminé)
   */
  static async joinCenterByCode(code: string, role: string = 'student'): Promise<JoinCenterResult> {
    try {
      const { data, error } = await supabase.rpc('join_center_by_code', {
        p_enrollment_code: code.trim(),
        p_role: role,
      })

      if (error) throw error
      return data as JoinCenterResult
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Attendre que le profil existe (trigger handle_new_user)
   * Retry avec backoff exponentiel
   */
  static async waitForProfile(userId: string, maxRetries = 8): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (data) return true
      await new Promise(r => setTimeout(r, 500 * Math.pow(1.5, i)))
    }
    return false
  }
}
