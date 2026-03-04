/**
 * Hook for fetching billing events for the current center
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'

export interface BillingEvent {
  id: string
  centerId: string
  eventType: string
  amount: number | null
  currency: string
  status: string
  description: string | null
  stripeEventId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

function transformBillingEvent(raw: any): BillingEvent {
  return {
    id: raw.id,
    centerId: raw.center_id,
    eventType: raw.event_type,
    amount: raw.amount,
    currency: raw.currency || 'eur',
    status: raw.status,
    description: raw.description,
    stripeEventId: raw.stripe_event_id,
    metadata: raw.metadata,
    createdAt: raw.created_at,
  }
}

export function useBillingHistory() {
  const { user } = useAuthContext()
  const [events, setEvents] = useState<BillingEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    if (isDemoMode || !user?.establishmentId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('billing_events')
        .select('*')
        .eq('center_id', user.establishmentId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching billing events:', error)
      } else {
        setEvents((data || []).map(transformBillingEvent))
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.establishmentId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, isLoading, refetch: fetchEvents }
}
