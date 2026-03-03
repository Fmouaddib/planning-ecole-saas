/**
 * Service de vérification des limites d'abonnement
 * Vérifie que les actions respectent les quotas du plan actif
 *
 * Tables DB (super-admin-migration.sql) :
 *   - subscription_plans: max_users, max_sessions, max_rooms, max_programs
 *   - center_subscriptions: center_id, plan_id, status
 *
 * Mapping : l'app utilise establishment_id (table users/rooms/bookings)
 * mais le SaaS utilise center_id (table center_subscriptions).
 * On utilise establishment_id comme center_id car ce sont la même entité.
 */

import type { LimitCheckResult, UsageSummary, SubscriptionPlan, ActiveAddon, EffectiveQuotas } from '@/types'
import { supabase } from '@/lib/supabase'

// Plan par défaut pour le mode démo / si pas d'abonnement (limites Pro)
const DEMO_PLAN: SubscriptionPlan = {
  id: 'demo-plan',
  name: 'Pro (Démo)',
  tier: 'pro',
  maxUsers: 100,
  maxRooms: 50,
  maxBookingsPerMonth: 500,
  priceMonthly: 0,
  priceYearly: 0,
  features: ['Toutes les fonctionnalités'],
}

export class SubscriptionLimitsService {
  /**
   * Récupérer le plan actif d'un centre/établissement
   * center_id = establishment_id dans notre contexte
   */
  static async getActivePlan(centerId: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await supabase
        .from('center_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('center_id', centerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        console.error('Error fetching active plan:', error)
        return null
      }

      if (!data?.plan) return null

      return {
        id: data.plan.id,
        name: data.plan.name,
        tier: data.plan.slug || data.plan.tier || 'free',
        maxUsers: data.plan.max_users,
        maxRooms: data.plan.max_rooms,
        // max_sessions sert de limite mensuelle de réservations
        maxBookingsPerMonth: data.plan.max_sessions,
        priceMonthly: data.plan.price_monthly,
        priceYearly: data.plan.price_yearly || data.plan.price_monthly * 12,
        features: data.plan.features || [],
      }
    } catch (error) {
      console.error('Error getting active plan:', error)
      return null
    }
  }

  /**
   * Compter les ressources actuelles d'un établissement
   */
  static async countResources(centerId: string): Promise<{
    users: number
    rooms: number
    bookingsThisMonth: number
  }> {
    try {
      // Compter les utilisateurs actifs (table profiles, colonne center_id)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .eq('is_active', true)

      // Compter les salles actives (table rooms, colonne is_available)
      const { count: roomsCount } = await supabase
        .from('rooms')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .eq('is_available', true)

      // Compter les séances du mois en cours (table training_sessions)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const { count: bookingsCount } = await supabase
        .from('training_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      return {
        users: usersCount || 0,
        rooms: roomsCount || 0,
        bookingsThisMonth: bookingsCount || 0,
      }
    } catch (error) {
      console.error('Error counting resources:', error)
      return { users: 0, rooms: 0, bookingsThisMonth: 0 }
    }
  }

  /**
   * Vérifier si une ressource peut être créée selon les limites du plan
   * centerId = establishmentId (passé par les hooks)
   */
  static async checkLimit(
    centerId: string,
    resource: 'users' | 'rooms' | 'bookings'
  ): Promise<LimitCheckResult> {
    try {
      const [plan, counts] = await Promise.all([
        this.getActivePlan(centerId),
        this.countResources(centerId),
      ])

      // Si pas de plan trouvé, utiliser le plan démo (toujours autorisé)
      const activePlan = plan || DEMO_PLAN

      let current: number
      let max: number

      switch (resource) {
        case 'users':
          current = counts.users
          max = activePlan.maxUsers
          // Ajouter le quota add-on teacher si pas illimité
          if (max !== -1) {
            const teacherAddon = await this.getAddonQuota(centerId, 'teacher')
            max += teacherAddon
          }
          break
        case 'rooms':
          current = counts.rooms
          max = activePlan.maxRooms
          break
        case 'bookings':
          current = counts.bookingsThisMonth
          max = activePlan.maxBookingsPerMonth
          break
        default:
          return { allowed: true, current: 0, max: 0 }
      }

      // -1 = illimité (Enterprise plan)
      if (max === -1) {
        return { allowed: true, current, max: -1 }
      }

      return {
        allowed: current < max,
        current,
        max,
      }
    } catch (error) {
      console.error('Error checking limit:', error)
      return { allowed: true, current: 0, max: 0 }
    }
  }

  /**
   * Récupérer un résumé complet de l'utilisation
   */
  static async getUsageSummary(centerId: string): Promise<UsageSummary> {
    try {
      const [plan, counts] = await Promise.all([
        this.getActivePlan(centerId),
        this.countResources(centerId),
      ])

      const activePlan = plan || DEMO_PLAN

      return {
        users: {
          current: counts.users,
          max: activePlan.maxUsers,
        },
        rooms: {
          current: counts.rooms,
          max: activePlan.maxRooms,
        },
        bookingsThisMonth: {
          current: counts.bookingsThisMonth,
          max: activePlan.maxBookingsPerMonth,
        },
      }
    } catch (error) {
      console.error('Error getting usage summary:', error)
      return {
        users: { current: 0, max: DEMO_PLAN.maxUsers },
        rooms: { current: 0, max: DEMO_PLAN.maxRooms },
        bookingsThisMonth: { current: 0, max: DEMO_PLAN.maxBookingsPerMonth },
      }
    }
  }

  /**
   * Récupérer les add-ons actifs d'un centre
   */
  static async getActiveAddons(centerId: string): Promise<ActiveAddon[]> {
    try {
      const { data, error } = await supabase
        .from('center_addons')
        .select('*, addon_plan:addon_plans(*)')
        .eq('center_id', centerId)
        .eq('status', 'active')

      if (error) throw error
      return (data || []).map((a: Record<string, unknown>) => {
        const plan = a.addon_plan as Record<string, unknown> | undefined
        return {
          id: a.id as string,
          addonPlanId: a.addon_plan_id as string,
          addonType: plan?.addon_type as ActiveAddon['addonType'],
          quotaValue: (plan?.quota_value as number) || 0,
          quantity: (a.quantity as number) || 1,
          name: (plan?.name as string) || '',
          status: a.status as string,
          priceMonthly: (plan?.price_monthly as number) || 0,
          periodEnd: a.current_period_end as string | undefined,
        }
      })
    } catch (error) {
      console.error('Error getting active addons:', error)
      return []
    }
  }

  /**
   * Calculer le quota additionnel pour un type d'add-on
   * Cumul de (quota_value * quantity) pour tous les add-ons actifs de ce type
   */
  static async getAddonQuota(centerId: string, addonType: 'email' | 'teacher' | 'student'): Promise<number> {
    try {
      const addons = await this.getActiveAddons(centerId)
      return addons
        .filter(a => a.addonType === addonType)
        .reduce((sum, a) => sum + a.quotaValue * a.quantity, 0)
    } catch {
      return 0
    }
  }

  /**
   * Vérifier le quota email d'un centre :
   * base (Enterprise=200, autres=0) + add-ons email cumulés vs emails envoyés aujourd'hui
   */
  static async checkEmailQuota(centerId: string): Promise<LimitCheckResult> {
    try {
      const plan = await this.getActivePlan(centerId)
      const isEnterprise = plan?.tier === 'enterprise'
      const baseEmails = isEnterprise ? 200 : 0
      const addonEmails = await this.getAddonQuota(centerId, 'email')
      const totalQuota = baseEmails + addonEmails

      if (totalQuota <= 0) {
        return { allowed: false, current: 0, max: 0 }
      }

      // Compter les emails envoyés aujourd'hui
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .eq('status', 'sent')
        .gte('sent_at', todayStart.toISOString())

      const usedToday = count || 0
      return { allowed: usedToday < totalQuota, current: usedToday, max: totalQuota }
    } catch (error) {
      console.error('Error checking email quota:', error)
      return { allowed: true, current: 0, max: 0 }
    }
  }

  /**
   * Quotas effectifs (plan de base + add-ons) pour affichage
   */
  static async getEffectiveQuotas(centerId: string): Promise<EffectiveQuotas> {
    try {
      const [plan, counts, addons] = await Promise.all([
        this.getActivePlan(centerId),
        this.countResources(centerId),
        this.getActiveAddons(centerId),
      ])

      const activePlan = plan || DEMO_PLAN
      const isEnterprise = activePlan.tier === 'enterprise'

      const emailAddonQuota = addons.filter(a => a.addonType === 'email').reduce((s, a) => s + a.quotaValue * a.quantity, 0)
      const teacherAddonQuota = addons.filter(a => a.addonType === 'teacher').reduce((s, a) => s + a.quotaValue * a.quantity, 0)
      const studentAddonQuota = addons.filter(a => a.addonType === 'student').reduce((s, a) => s + a.quotaValue * a.quantity, 0)

      // Compter étudiants actifs
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .eq('role', 'student')
        .eq('is_active', true)

      // Compter emails aujourd'hui
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count: emailsToday } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .eq('status', 'sent')
        .gte('sent_at', todayStart.toISOString())

      const baseEmails = isEnterprise ? 200 : 0

      return {
        emails: { base: baseEmails, addons: emailAddonQuota, total: baseEmails + emailAddonQuota, usedToday: emailsToday || 0 },
        teachers: { base: activePlan.maxUsers, addons: teacherAddonQuota, total: activePlan.maxUsers === -1 ? -1 : activePlan.maxUsers + teacherAddonQuota, current: counts.users },
        students: { base: 0, addons: studentAddonQuota, total: studentAddonQuota, current: studentCount || 0 },
      }
    } catch (error) {
      console.error('Error getting effective quotas:', error)
      return {
        emails: { base: 0, addons: 0, total: 0, usedToday: 0 },
        teachers: { base: DEMO_PLAN.maxUsers, addons: 0, total: DEMO_PLAN.maxUsers, current: 0 },
        students: { base: 0, addons: 0, total: 0, current: 0 },
      }
    }
  }
}
