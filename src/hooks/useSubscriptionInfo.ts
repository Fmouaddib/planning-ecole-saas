/**
 * Hook pour récupérer les informations d'abonnement de l'établissement courant
 * Utilise les tables center_subscriptions + subscription_plans (super-admin-migration.sql)
 * Mapping : establishment_id = center_id
 */

import { useState, useEffect, useCallback } from 'react'
import type { SubscriptionPlan, EstablishmentSubscription, UsageSummary, SubscriptionInfo } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { SubscriptionLimitsService } from '@/services/subscriptionLimitsService'

export function useSubscriptionInfo(): SubscriptionInfo & { refresh: () => Promise<void> } {
  const { user } = useAuthContext()
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [subscription, setSubscription] = useState<EstablishmentSubscription | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptionInfo = useCallback(async () => {
    if (!user?.establishmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // center_id = establishment_id dans notre mapping
      const centerId = user.establishmentId

      // Récupérer l'abonnement actif avec le plan
      const { data: subData, error: subError } = await supabase
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

      if (subError && subError.code !== 'PGRST116') {
        throw subError
      }

      if (subData) {
        setSubscription({
          id: subData.id,
          establishmentId: subData.center_id,
          planId: subData.plan_id,
          status: subData.status,
          startDate: subData.current_period_start || subData.created_at,
          endDate: subData.current_period_end || '',
          renewalDate: subData.cancel_at_period_end ? '' : (subData.current_period_end || ''),
          createdAt: subData.created_at,
          stripeSubscriptionId: subData.stripe_subscription_id || undefined,
          stripeCustomerId: subData.stripe_customer_id || undefined,
        })

        if (subData.plan) {
          setPlan({
            id: subData.plan.id,
            name: subData.plan.name,
            tier: subData.plan.slug || 'free',
            maxUsers: subData.plan.max_users,
            maxRooms: subData.plan.max_rooms,
            maxBookingsPerMonth: subData.plan.max_sessions,
            priceMonthly: subData.plan.price_monthly,
            priceYearly: subData.plan.price_yearly || subData.plan.price_monthly * 12,
            features: subData.plan.features || [],
            hasChat: subData.plan.has_chat ?? false,
          })
        }
      }

      // Récupérer l'utilisation
      const usageSummary = await SubscriptionLimitsService.getUsageSummary(centerId)
      setUsage(usageSummary)
    } catch (err) {
      console.error('Error fetching subscription info:', err)
      setError('Impossible de charger les informations d\'abonnement')
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  useEffect(() => {
    fetchSubscriptionInfo()
  }, [fetchSubscriptionInfo])

  return {
    plan,
    subscription,
    usage,
    isLoading,
    error,
    refresh: fetchSubscriptionInfo,
  }
}
