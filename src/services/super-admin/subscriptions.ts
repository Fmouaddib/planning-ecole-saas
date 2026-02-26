import { supabase, isDemoMode } from '@/lib/supabase';
import { MockStore } from './mock-store';
import type { SubscriptionPlan, CenterSubscription, BillingEvent, CreatePlanData, AssignPlanData } from '@/types/super-admin';

export class SASubscriptionsService {
  static async getPlans(): Promise<SubscriptionPlan[]> {
    if (isDemoMode) return MockStore.getPlans();
    try {
      const { data, error } = await supabase.from('subscription_plans').select('*').order('sort_order');
      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    } catch {
      return MockStore.getPlans();
    }
  }

  static async createPlan(planData: CreatePlanData): Promise<SubscriptionPlan> {
    if (isDemoMode) return MockStore.addPlan(planData);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({ ...planData, is_active: true, currency: 'EUR' })
        .select()
        .single();
      if (error) throw error;
      return data as SubscriptionPlan;
    } catch {
      return MockStore.addPlan(planData);
    }
  }

  static async updatePlan(id: string, data: Partial<CreatePlanData>): Promise<SubscriptionPlan> {
    if (isDemoMode) return MockStore.updatePlan(id, data) || { id, ...data, currency: 'EUR', is_active: true, sort_order: 0, created_at: '', updated_at: new Date().toISOString() } as SubscriptionPlan;
    try {
      const { data: plan, error } = await supabase
        .from('subscription_plans').update(data).eq('id', id).select().single();
      if (error) throw error;
      return plan as SubscriptionPlan;
    } catch {
      return MockStore.updatePlan(id, data) || { id, ...data, currency: 'EUR', is_active: true, sort_order: 0, created_at: '', updated_at: new Date().toISOString() } as SubscriptionPlan;
    }
  }

  static async deletePlan(id: string): Promise<void> {
    if (isDemoMode) { MockStore.deletePlan(id); return; }
    try {
      const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
      if (error) throw error;
    } catch {
      MockStore.deletePlan(id);
    }
  }

  static async getSubscriptions(): Promise<CenterSubscription[]> {
    if (isDemoMode) return MockStore.getSubscriptions();
    try {
      const { data, error } = await supabase
        .from('center_subscriptions')
        .select('*, plan:subscription_plans(*), center:training_centers(id, name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CenterSubscription[];
    } catch {
      return MockStore.getSubscriptions();
    }
  }

  static async assignPlanToCenter(data: AssignPlanData): Promise<CenterSubscription> {
    if (isDemoMode) return MockStore.addSubscription(data);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      if (data.billing_cycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const { data: sub, error } = await supabase
        .from('center_subscriptions')
        .upsert({
          center_id: data.center_id, plan_id: data.plan_id, billing_cycle: data.billing_cycle,
          status: 'active', current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        }, { onConflict: 'center_id' })
        .select()
        .single();
      if (error) throw error;
      return sub as CenterSubscription;
    } catch {
      return MockStore.addSubscription(data);
    }
  }

  static async updateSubscription(id: string, data: { plan_id?: string; billing_cycle?: 'monthly' | 'yearly' }): Promise<CenterSubscription> {
    if (isDemoMode) return MockStore.updateSubscription(id, data) || { id, ...data, status: 'active', cancel_at_period_end: false, created_at: '', updated_at: new Date().toISOString() } as CenterSubscription;
    try {
      const { data: sub, error } = await supabase
        .from('center_subscriptions')
        .update(data)
        .eq('id', id)
        .select('*, plan:subscription_plans(*), center:training_centers(id, name, email)')
        .single();
      if (error) throw error;
      return sub as CenterSubscription;
    } catch {
      return MockStore.updateSubscription(id, data) || { id, ...data, status: 'active', cancel_at_period_end: false, created_at: '', updated_at: new Date().toISOString() } as CenterSubscription;
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<void> {
    if (isDemoMode) { MockStore.cancelSubscription(subscriptionId); return; }
    try {
      const { error } = await supabase
        .from('center_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_at_period_end: true })
        .eq('id', subscriptionId);
      if (error) throw error;
    } catch {
      MockStore.cancelSubscription(subscriptionId);
    }
  }

  static async getBillingHistory(centerId?: string): Promise<BillingEvent[]> {
    if (isDemoMode) return MockStore.getBilling(centerId);
    try {
      let query = supabase
        .from('billing_events')
        .select('*, center:training_centers(id, name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (centerId) query = query.eq('center_id', centerId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BillingEvent[];
    } catch {
      return MockStore.getBilling(centerId);
    }
  }
}
