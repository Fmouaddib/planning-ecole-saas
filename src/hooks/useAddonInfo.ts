/**
 * Hook utilisateur pour les add-ons actifs du centre courant + quotas effectifs
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import type { ActiveAddon, AddonPlanInfo, EffectiveQuotas } from '@/types'

// Demo fallback plans (when running without Supabase)
const DEMO_ADDON_PLANS: AddonPlanInfo[] = [
  { id: 'demo-email-25', name: 'Pack Email 25', slug: 'email-25', description: '25 emails/jour supplémentaires', addonType: 'email', quotaValue: 25, priceMonthly: 9.90, priceYearly: 99.00 },
  { id: 'demo-email-50', name: 'Pack Email 50', slug: 'email-50', description: '50 emails/jour supplémentaires', addonType: 'email', quotaValue: 50, priceMonthly: 14.90, priceYearly: 149.00 },
  { id: 'demo-email-200', name: 'Pack Email 200', slug: 'email-200', description: '200 emails/jour supplémentaires', addonType: 'email', quotaValue: 200, priceMonthly: 19.90, priceYearly: 199.00 },
  { id: 'demo-teacher-5', name: 'Pack Profs +5', slug: 'teacher-5', description: '5 professeurs supplémentaires', addonType: 'teacher', quotaValue: 5, priceMonthly: 9.90, priceYearly: 99.00 },
  { id: 'demo-teacher-15', name: 'Pack Profs +15', slug: 'teacher-15', description: '15 professeurs supplémentaires', addonType: 'teacher', quotaValue: 15, priceMonthly: 19.90, priceYearly: 199.00 },
  { id: 'demo-teacher-30', name: 'Pack Profs +30', slug: 'teacher-30', description: '30 professeurs supplémentaires', addonType: 'teacher', quotaValue: 30, priceMonthly: 29.90, priceYearly: 299.00 },
  { id: 'demo-student-50', name: 'Pack Étudiants +50', slug: 'student-50', description: '50 étudiants supplémentaires', addonType: 'student', quotaValue: 50, priceMonthly: 9.90, priceYearly: 99.00 },
  { id: 'demo-student-150', name: 'Pack Étudiants +150', slug: 'student-150', description: '150 étudiants supplémentaires', addonType: 'student', quotaValue: 150, priceMonthly: 19.90, priceYearly: 199.00 },
  { id: 'demo-student-500', name: 'Pack Étudiants +500', slug: 'student-500', description: '500 étudiants supplémentaires', addonType: 'student', quotaValue: 500, priceMonthly: 29.90, priceYearly: 299.00 },
  { id: 'demo-attendance', name: 'Suivi Présences', slug: 'attendance-basic', description: 'Suivi des présences et absences, rapports et statistiques', addonType: 'attendance', quotaValue: 1, priceMonthly: 19.90, priceYearly: 199.00 },
  { id: 'demo-grades', name: 'Notes & Bulletins', slug: 'grades-basic', description: 'Évaluations, notes, moyennes pondérées et bulletins PDF', addonType: 'grades', quotaValue: 1, priceMonthly: 24.90, priceYearly: 249.00 },
  { id: 'demo-pedagogy', name: 'Pack Pédagogique', slug: 'pedagogy-bundle', description: 'Présences + Notes & Bulletins en un seul pack', addonType: 'attendance', quotaValue: 1, priceMonthly: 39.90, priceYearly: 399.00 },
]

export function useAddonInfo() {
  const { user } = useAuthContext()
  const centerId = user?.establishmentId

  const [activeAddons, setActiveAddons] = useState<ActiveAddon[]>([])
  const [addonPlans, setAddonPlans] = useState<AddonPlanInfo[]>([])
  const [effectiveQuotas, setEffectiveQuotas] = useState<EffectiveQuotas | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!centerId) {
      // Even without centerId, provide plans catalog for display
      if (addonPlans.length === 0) {
        setAddonPlans(DEMO_ADDON_PLANS)
      }
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Charger les plans d'add-ons disponibles
      if (!isDemoMode) {
        const { data: plans, error: plansError } = await supabase
          .from('addon_plans')
          .select('id, name, slug, description, addon_type, quota_value, price_monthly, price_yearly')
          .eq('is_active', true)
          .order('sort_order')

        if (plansError) {
          console.error('[useAddonInfo] addon_plans query error:', plansError)
        }

        if (plans && plans.length > 0) {
          setAddonPlans(plans.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description || undefined,
            addonType: p.addon_type as AddonPlanInfo['addonType'],
            quotaValue: p.quota_value,
            priceMonthly: Number(p.price_monthly),
            priceYearly: p.price_yearly ? Number(p.price_yearly) : undefined,
          })))
        } else if (addonPlans.length === 0) {
          // Fallback to demo plans if query returned nothing
          setAddonPlans(DEMO_ADDON_PLANS)
        }
      } else {
        // Demo mode: use fallback plans
        setAddonPlans(DEMO_ADDON_PLANS)
      }

      // Charger les add-ons actifs et quotas effectifs
      const [addons, quotas] = await Promise.all([
        SubscriptionLimitsService.getActiveAddons(centerId),
        SubscriptionLimitsService.getEffectiveQuotas(centerId),
      ])

      setActiveAddons(addons)
      setEffectiveQuotas(quotas)
    } catch (err) {
      console.error('[useAddonInfo] Error:', err)
      // Even on error, provide plans catalog for display
      if (addonPlans.length === 0) {
        setAddonPlans(DEMO_ADDON_PLANS)
      }
    } finally {
      setIsLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    refresh()
  }, [refresh])

  /**
   * Poll center_addons toutes les 2s jusqu'à trouver un addon actif du type demandé.
   * Retourne true si trouvé, false si timeout (max 30s / 15 essais).
   */
  const pollForAddon = useCallback(async (addonType: string, maxAttempts = 15): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      await refresh()
      // Vérifier après refresh si l'addon est actif
      if (!centerId) return false
      const { data: addonsWithType } = await supabase
        .from('center_addons')
        .select('id, addon_plan:addon_plans!inner(addon_type)')
        .eq('center_id', centerId)
        .eq('status', 'active')
        .eq('addon_plans.addon_type', addonType)
        .limit(1)
      if (addonsWithType && addonsWithType.length > 0) return true
      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    return false
  }, [centerId, refresh])

  return { activeAddons, addonPlans, effectiveQuotas, isLoading, refresh, pollForAddon }
}
