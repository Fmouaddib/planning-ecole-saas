import { supabase, isDemoMode } from '@/lib/supabase';
import { MockStore } from './mock-store';
import type { SuperAdminCenter, CreateCenterData } from '@/types/super-admin';

// Helper : retire les clés undefined/null pour éviter d'envoyer des colonnes inexistantes
function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null)) as Partial<T>;
}

export class SACentersService {
  static async getCenters(search?: string): Promise<SuperAdminCenter[]> {
    if (isDemoMode) return MockStore.getCenters(search);

    let query = supabase
      .from('training_centers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,acronym.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[SACenters] getCenters error:', error.message);
      throw error;
    }

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
  }

  static async createCenter(data: CreateCenterData): Promise<SuperAdminCenter> {
    if (isDemoMode) return MockStore.addCenter(data);

    const payload = defined({
      name: data.name,
      acronym: data.acronym || null,
      address: data.address || null,
      postal_code: data.postal_code || null,
      city: data.city || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      is_active: true,
    });

    const { data: center, error } = await supabase
      .from('training_centers')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SACenters] createCenter error:', error.message, error.details, error.hint);
      throw error;
    }

    return { ...center, settings: center.settings || {}, is_active: true, _count: { users: 0, sessions: 0, rooms: 0, programs: 0 } };
  }

  static async updateCenter(id: string, data: Partial<CreateCenterData>): Promise<SuperAdminCenter> {
    if (isDemoMode) return MockStore.updateCenter(id, data) || { id, ...data, is_active: true, settings: {}, created_at: '', updated_at: new Date().toISOString() } as SuperAdminCenter;

    const { data: center, error } = await supabase
      .from('training_centers')
      .update(defined(data as Record<string, unknown>))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SACenters] updateCenter error:', error.message);
      throw error;
    }

    return { ...center, settings: center.settings || {}, is_active: center.is_active ?? true } as SuperAdminCenter;
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (isDemoMode) { MockStore.updateCenter(id, { is_active: isActive }); return; }

    const { error } = await supabase.from('training_centers').update({ is_active: isActive }).eq('id', id);
    if (error) {
      console.error('[SACenters] toggleActive error:', error.message);
      throw error;
    }
  }

  static async deleteCenter(id: string): Promise<void> {
    if (isDemoMode) { MockStore.deleteCenter(id); return; }

    const { error } = await supabase.from('training_centers').delete().eq('id', id);
    if (error) {
      console.error('[SACenters] deleteCenter error:', error.message);
      throw error;
    }
  }
}
