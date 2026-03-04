/**
 * Hook utilisateur pour les add-ons actifs du centre courant + quotas effectifs
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'
import type { ActiveAddon, AddonPlanInfo, EffectiveQuotas } from '@/types'

export function useAddonInfo() {
  const { user } = useAuthContext()
  const centerId = user?.establishmentId

  const [activeAddons, setActiveAddons] = useState<ActiveAddon[]>([])
  const [addonPlans, setAddonPlans] = useState<AddonPlanInfo[]>([])
  const [effectiveQuotas, setEffectiveQuotas] = useState<EffectiveQuotas | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!centerId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Charger les plans d'add-ons disponibles
      if (!isDemoMode) {
        const { data: plans } = await supabase
          .from('addon_plans')
          .select('id, name, slug, addon_type, quota_value, price_monthly, price_yearly')
          .eq('is_active', true)
          .order('sort_order')

        if (plans) {
          setAddonPlans(plans.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            addonType: p.addon_type as AddonPlanInfo['addonType'],
            quotaValue: p.quota_value,
            priceMonthly: Number(p.price_monthly),
            priceYearly: p.price_yearly ? Number(p.price_yearly) : undefined,
          })))
        }
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
