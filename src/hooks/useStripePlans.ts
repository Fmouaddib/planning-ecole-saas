/**
 * Hook pour récupérer les plans d'abonnement avec les Stripe Price IDs depuis la DB
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface StripePlan {
  id: string
  name: string
  slug: string
  description: string | null
  priceMonthly: number
  priceYearly: number | null
  currency: string
  maxUsers: number
  maxRooms: number
  maxSessions: number
  maxStudents: number
  features: string[]
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  stripeProductId: string | null
  sortOrder: number
}

export function useStripePlans() {
  const [plans, setPlans] = useState<StripePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (fetchError) throw fetchError

        setPlans(
          (data || []).map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceMonthly: Number(p.price_monthly),
            priceYearly: p.price_yearly ? Number(p.price_yearly) : null,
            currency: p.currency || 'EUR',
            maxUsers: p.max_users,
            maxRooms: p.max_rooms,
            maxSessions: p.max_sessions,
            maxStudents: p.max_students || 0,
            features: p.features || [],
            stripePriceIdMonthly: p.stripe_price_id_monthly,
            stripePriceIdYearly: p.stripe_price_id_yearly,
            stripeProductId: p.stripe_product_id,
            sortOrder: p.sort_order,
          }))
        )
      } catch (err) {
        console.error('[useStripePlans] Error:', err)
        setError('Impossible de charger les plans')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const getPlanBySlug = (slug: string) => plans.find((p) => p.slug === slug)

  return { plans, isLoading, error, getPlanBySlug }
}
