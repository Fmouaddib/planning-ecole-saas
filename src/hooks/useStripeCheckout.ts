/**
 * Hook pour interagir avec les Edge Functions Stripe (Checkout + Portal)
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface CheckoutParams {
  planSlug: string
  billingCycle: 'monthly' | 'yearly'
  successUrl?: string
  cancelUrl?: string
}

export function useStripeCheckout() {
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Ouvre une session Stripe Checkout (redirige vers Stripe)
   */
  const openCheckout = useCallback(async (params: CheckoutParams) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan_slug: params.planSlug,
          billing_cycle: params.billingCycle,
          success_url: params.successUrl || `${window.location.origin}/#/?checkout=success`,
          cancel_url: params.cancelUrl || `${window.location.origin}/#/?checkout=cancelled`,
        },
      })

      if (error) throw error
      if (!data?.url) throw new Error('URL de checkout manquante')

      // Redirection vers Stripe Checkout
      window.location.href = data.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création du checkout'
      console.error('[useStripeCheckout] openCheckout error:', err)
      toast.error(msg)
      setIsLoading(false)
    }
  }, [])

  /**
   * Ouvre le portail de gestion Stripe (facturation, annulation, changement de plan)
   */
  const openPortal = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          return_url: `${window.location.origin}/#/profile`,
        },
      })

      if (error) throw error
      if (!data?.url) throw new Error('URL du portail manquante')

      window.location.href = data.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'ouverture du portail'
      console.error('[useStripeCheckout] openPortal error:', err)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { openCheckout, openPortal, isLoading }
}
