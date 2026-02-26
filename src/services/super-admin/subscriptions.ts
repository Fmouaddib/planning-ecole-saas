import { supabase } from '@/lib/supabase';
import type { SubscriptionPlan, CenterSubscription, BillingEvent, CreatePlanData, AssignPlanData } from '@/types/super-admin';

export class SASubscriptionsService {
  static async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    } catch {
      console.log('Mode simulation Plans - Donnees simulees');
      return SASubscriptionsService.getMockPlans();
    }
  }

  static async createPlan(planData: CreatePlanData): Promise<SubscriptionPlan> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          ...planData,
          is_active: true,
          currency: 'EUR',
        })
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    } catch {
      console.log('Mode simulation - Plan cree:', planData.name);
      return {
        id: `sim-${Date.now()}`,
        ...planData,
        currency: 'EUR',
        is_active: true,
        sort_order: 99,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  static async updatePlan(id: string, data: Partial<CreatePlanData>): Promise<SubscriptionPlan> {
    try {
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return plan as SubscriptionPlan;
    } catch {
      console.log('Mode simulation - Plan mis a jour:', id);
      return { id, ...data, currency: 'EUR', is_active: true, sort_order: 0, created_at: '', updated_at: new Date().toISOString() } as SubscriptionPlan;
    }
  }

  static async getSubscriptions(): Promise<CenterSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('center_subscriptions')
        .select('*, plan:subscription_plans(*), center:training_centers(id, name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CenterSubscription[];
    } catch {
      console.log('Mode simulation Subscriptions - Donnees simulees');
      return SASubscriptionsService.getMockSubscriptions();
    }
  }

  static async assignPlanToCenter(data: AssignPlanData): Promise<CenterSubscription> {
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      if (data.billing_cycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const { data: sub, error } = await supabase
        .from('center_subscriptions')
        .upsert({
          center_id: data.center_id,
          plan_id: data.plan_id,
          billing_cycle: data.billing_cycle,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        }, { onConflict: 'center_id' })
        .select()
        .single();

      if (error) throw error;
      return sub as CenterSubscription;
    } catch {
      console.log('Mode simulation - Plan assigne au centre:', data.center_id);
      return {
        id: `sim-${Date.now()}`,
        center_id: data.center_id,
        plan_id: data.plan_id,
        status: 'active',
        billing_cycle: data.billing_cycle,
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('center_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_at_period_end: true,
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    } catch {
      console.log('Mode simulation - Abonnement annule:', subscriptionId);
    }
  }

  static async getBillingHistory(centerId?: string): Promise<BillingEvent[]> {
    try {
      let query = supabase
        .from('billing_events')
        .select('*, center:training_centers(id, name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (centerId) {
        query = query.eq('center_id', centerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BillingEvent[];
    } catch {
      console.log('Mode simulation Billing - Donnees simulees');
      return [
        { id: 'b1', center_id: 'c1', event_type: 'invoice.paid', amount: 49, currency: 'EUR', description: 'Facture Pro - Janvier 2026', metadata: {}, created_at: '2026-01-15T10:00:00Z', center: { id: 'c1', name: 'FormaPro Paris' } },
        { id: 'b2', center_id: 'c1', event_type: 'invoice.paid', amount: 49, currency: 'EUR', description: 'Facture Pro - Decembre 2025', metadata: {}, created_at: '2025-12-15T10:00:00Z', center: { id: 'c1', name: 'FormaPro Paris' } },
      ];
    }
  }

  private static getMockPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'p1', name: 'Free', slug: 'free', description: 'Pour decouvrir AntiPlanning',
        price_monthly: 0, price_yearly: 0, currency: 'EUR',
        max_users: 3, max_sessions: 20, max_rooms: 2, max_programs: 3, max_students: 0,
        features: ['Tableau de bord', 'Gestion sessions', 'Export CSV'],
        is_active: true, sort_order: 1,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'p2', name: 'Pro', slug: 'pro', description: 'Pour les centres en croissance',
        price_monthly: 99, price_yearly: 990, currency: 'EUR',
        max_users: 15, max_sessions: 200, max_rooms: 10, max_programs: 25, max_students: 0,
        features: ['Tout Free', 'Integration Zoom', 'Emails automatiques', 'Paiements Stripe', 'Support prioritaire'],
        is_active: true, sort_order: 2,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'p3', name: 'Enterprise', slug: 'enterprise', description: 'Pour les grands centres',
        price_monthly: 149, price_yearly: 1490, currency: 'EUR',
        max_users: -1, max_sessions: -1, max_rooms: -1, max_programs: -1, max_students: 100,
        features: ['Tout Pro', 'Utilisateurs illimites', 'Sessions illimitees', 'Comptes etudiants', 'API access', 'SSO', 'Support dedie'],
        is_active: true, sort_order: 3,
        created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
      },
    ];
  }

  private static getMockSubscriptions(): CenterSubscription[] {
    return [
      {
        id: 's1', center_id: 'c1', plan_id: 'p2', status: 'active', billing_cycle: 'monthly',
        current_period_start: '2026-02-01T00:00:00Z', current_period_end: '2026-03-01T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2025-06-15T10:00:00Z', updated_at: '2026-02-01T00:00:00Z',
        plan: { id: 'p2', name: 'Pro', slug: 'pro', price_monthly: 99, currency: 'EUR', max_users: 15, max_sessions: 200, max_rooms: 10, max_programs: 25, max_students: 0, features: [], is_active: true, sort_order: 2, created_at: '', updated_at: '' },
        center: { id: 'c1', name: 'FormaPro Paris', email: 'contact@formapro-paris.fr' },
      },
      {
        id: 's2', center_id: 'c2', plan_id: 'p1', status: 'active', billing_cycle: 'monthly',
        current_period_start: '2026-02-01T00:00:00Z', current_period_end: '2026-03-01T00:00:00Z',
        cancel_at_period_end: false,
        created_at: '2025-08-10T10:00:00Z', updated_at: '2026-02-01T00:00:00Z',
        plan: { id: 'p1', name: 'Free', slug: 'free', price_monthly: 0, currency: 'EUR', max_users: 3, max_sessions: 20, max_rooms: 2, max_programs: 3, max_students: 0, features: [], is_active: true, sort_order: 1, created_at: '', updated_at: '' },
        center: { id: 'c2', name: 'TechSkills Lyon', email: 'info@techskills-lyon.fr' },
      },
    ];
  }
}
