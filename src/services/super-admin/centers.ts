import { supabase, isDemoMode } from '@/lib/supabase';
import { MockStore } from './mock-store';
import type { SuperAdminCenter, CreateCenterData } from '@/types/super-admin';

export class SACentersService {
  static async getCenters(search?: string): Promise<SuperAdminCenter[]> {
    if (isDemoMode) return MockStore.getCenters(search);
    try {
      let query = supabase
        .from('training_centers')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const centers = data || [];
      const enriched: SuperAdminCenter[] = await Promise.all(
        centers.map(async (center) => {
          const [usersRes, sessionsRes, roomsRes, programsRes, subRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('center_id', center.id),
            supabase.from('training_sessions').select('id', { count: 'exact', head: true }).eq('center_id', center.id),
            supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('center_id', center.id),
            supabase.from('programs').select('id', { count: 'exact', head: true }).eq('center_id', center.id),
            supabase.from('center_subscriptions').select('*, plan:subscription_plans(*)').eq('center_id', center.id).maybeSingle(),
          ]);
          return {
            ...center, is_active: center.is_active ?? true, settings: center.settings || {},
            subscription: subRes.data || undefined,
            _count: { users: usersRes.count || 0, sessions: sessionsRes.count || 0, rooms: roomsRes.count || 0, programs: programsRes.count || 0 },
          };
        })
      );
      return enriched;
    } catch {
      return MockStore.getCenters(search);
    }
  }

  static async createCenter(data: CreateCenterData): Promise<SuperAdminCenter> {
    if (isDemoMode) return MockStore.addCenter(data);
    try {
      const { data: center, error } = await supabase
        .from('training_centers')
        .insert({ name: data.name, address: data.address, phone: data.phone, email: data.email, website: data.website, owner_id: data.owner_id, is_active: true })
        .select()
        .single();

      if (error) throw error;
      return { ...center, settings: center.settings || {}, is_active: true, _count: { users: 0, sessions: 0, rooms: 0, programs: 0 } };
    } catch {
      return MockStore.addCenter(data);
    }
  }

  static async updateCenter(id: string, data: Partial<CreateCenterData>): Promise<SuperAdminCenter> {
    if (isDemoMode) return MockStore.updateCenter(id, data) || { id, ...data, is_active: true, settings: {}, created_at: '', updated_at: new Date().toISOString() } as SuperAdminCenter;
    try {
      const { data: center, error } = await supabase
        .from('training_centers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...center, settings: center.settings || {}, is_active: center.is_active ?? true } as SuperAdminCenter;
    } catch {
      return MockStore.updateCenter(id, data) || { id, ...data, is_active: true, settings: {}, created_at: '', updated_at: new Date().toISOString() } as SuperAdminCenter;
    }
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (isDemoMode) { MockStore.updateCenter(id, { is_active: isActive }); return; }
    try {
      const { error } = await supabase.from('training_centers').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    } catch {
      MockStore.updateCenter(id, { is_active: isActive });
    }
  }

  static async deleteCenter(id: string): Promise<void> {
    if (isDemoMode) { MockStore.deleteCenter(id); return; }
    try {
      const { error } = await supabase.from('training_centers').delete().eq('id', id);
      if (error) throw error;
    } catch {
      MockStore.deleteCenter(id);
    }
  }
}
