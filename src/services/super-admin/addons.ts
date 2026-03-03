import { supabase, isDemoMode } from '@/lib/supabase';
import { MockStore } from './mock-store';
import type { AddonPlan, CenterAddon, CreateAddonPlanData, AssignAddonData } from '@/types/super-admin';

export class SAAddonsService {
  static async getAddonPlans(): Promise<AddonPlan[]> {
    if (isDemoMode) return MockStore.getAddonPlans();
    try {
      const { data, error } = await supabase
        .from('addon_plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as AddonPlan[];
    } catch {
      return MockStore.getAddonPlans();
    }
  }

  static async createAddonPlan(planData: CreateAddonPlanData): Promise<AddonPlan> {
    if (isDemoMode) return MockStore.addAddonPlan(planData);
    try {
      const { data, error } = await supabase
        .from('addon_plans')
        .insert({ ...planData, is_active: true, currency: 'EUR' })
        .select()
        .single();
      if (error) throw error;
      return data as AddonPlan;
    } catch {
      return MockStore.addAddonPlan(planData);
    }
  }

  static async updateAddonPlan(id: string, data: Partial<CreateAddonPlanData> & { is_active?: boolean }): Promise<AddonPlan> {
    if (isDemoMode) {
      return MockStore.updateAddonPlan(id, data) || { id, ...data, currency: 'EUR', is_active: true, sort_order: 0, created_at: '', updated_at: new Date().toISOString() } as AddonPlan;
    }
    try {
      const { data: plan, error } = await supabase
        .from('addon_plans')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return plan as AddonPlan;
    } catch {
      return MockStore.updateAddonPlan(id, data) || { id, ...data, currency: 'EUR', is_active: true, sort_order: 0, created_at: '', updated_at: new Date().toISOString() } as AddonPlan;
    }
  }

  static async deleteAddonPlan(id: string): Promise<void> {
    if (isDemoMode) { MockStore.deleteAddonPlan(id); return; }
    try {
      const { error } = await supabase.from('addon_plans').delete().eq('id', id);
      if (error) throw error;
    } catch {
      MockStore.deleteAddonPlan(id);
    }
  }

  static async getCenterAddons(centerId?: string): Promise<CenterAddon[]> {
    if (isDemoMode) return MockStore.getCenterAddons(centerId);
    try {
      let query = supabase
        .from('center_addons')
        .select('*, addon_plan:addon_plans(*), center:training_centers(id, name, acronym)')
        .order('created_at', { ascending: false });
      if (centerId) query = query.eq('center_id', centerId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CenterAddon[];
    } catch {
      return MockStore.getCenterAddons(centerId);
    }
  }

  static async assignAddonToCenter(data: AssignAddonData): Promise<CenterAddon> {
    if (isDemoMode) return MockStore.addCenterAddon(data);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      if (data.billing_cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: addon, error } = await supabase
        .from('center_addons')
        .insert({
          center_id: data.center_id,
          addon_plan_id: data.addon_plan_id,
          quantity: data.quantity,
          billing_cycle: data.billing_cycle,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select('*, addon_plan:addon_plans(*), center:training_centers(id, name, acronym)')
        .single();
      if (error) throw error;
      return addon as CenterAddon;
    } catch {
      return MockStore.addCenterAddon(data);
    }
  }

  static async updateCenterAddon(id: string, data: { quantity?: number; status?: CenterAddon['status'] }): Promise<CenterAddon> {
    if (isDemoMode) {
      return MockStore.updateCenterAddon(id, data) || { id, ...data } as unknown as CenterAddon;
    }
    try {
      const { data: addon, error } = await supabase
        .from('center_addons')
        .update(data)
        .eq('id', id)
        .select('*, addon_plan:addon_plans(*), center:training_centers(id, name, acronym)')
        .single();
      if (error) throw error;
      return addon as CenterAddon;
    } catch {
      return MockStore.updateCenterAddon(id, data) || { id, ...data } as unknown as CenterAddon;
    }
  }

  static async cancelCenterAddon(id: string): Promise<void> {
    if (isDemoMode) { MockStore.cancelCenterAddon(id); return; }
    try {
      const { error } = await supabase
        .from('center_addons')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_at_period_end: true })
        .eq('id', id);
      if (error) throw error;
    } catch {
      MockStore.cancelCenterAddon(id);
    }
  }
}
