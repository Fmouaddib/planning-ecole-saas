import { supabase } from '@/lib/supabase';
import type { SuperAdminCenter, CreateCenterData } from '@/types/super-admin';

export class SACentersService {
  static async getCenters(search?: string): Promise<SuperAdminCenter[]> {
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

      // Enrich with counts
      const centers = data || [];
      const enriched: SuperAdminCenter[] = await Promise.all(
        centers.map(async (center) => {
          const [usersRes, sessionsRes, roomsRes, programsRes, subRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('center_id', center.id),
            supabase.from('training_sessions').select('id', { count: 'exact', head: true }),
            supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('center_id', center.id),
            supabase.from('programs').select('id', { count: 'exact', head: true }).eq('center_id', center.id),
            supabase.from('center_subscriptions').select('*, plan:subscription_plans(*)').eq('center_id', center.id).maybeSingle(),
          ]);

          return {
            ...center,
            is_active: center.is_active ?? true,
            settings: center.settings || {},
            subscription: subRes.data || undefined,
            _count: {
              users: usersRes.count || 0,
              sessions: sessionsRes.count || 0,
              rooms: roomsRes.count || 0,
              programs: programsRes.count || 0,
            },
          };
        })
      );

      return enriched;
    } catch (error) {
      console.log('Mode simulation Centers - Donnees simulees');
      return SACentersService.getMockCenters(search);
    }
  }

  static async createCenter(data: CreateCenterData): Promise<SuperAdminCenter> {
    try {
      const { data: center, error } = await supabase
        .from('training_centers')
        .insert({
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          website: data.website,
          owner_id: data.owner_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...center, settings: center.settings || {}, is_active: true, _count: { users: 0, sessions: 0, rooms: 0, programs: 0 } };
    } catch (error) {
      console.log('Mode simulation - Centre cree (simule):', data.name);
      return {
        id: `sim-${Date.now()}`,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        owner_id: data.owner_id,
        is_active: true,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _count: { users: 0, sessions: 0, rooms: 0, programs: 0 },
      };
    }
  }

  static async updateCenter(id: string, data: Partial<CreateCenterData>): Promise<SuperAdminCenter> {
    try {
      const { data: center, error } = await supabase
        .from('training_centers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...center, settings: center.settings || {}, is_active: center.is_active ?? true } as SuperAdminCenter;
    } catch (error) {
      console.log('Mode simulation - Centre mis a jour:', id);
      return { id, ...data, is_active: true, settings: {}, created_at: '', updated_at: new Date().toISOString() } as SuperAdminCenter;
    }
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('training_centers')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    } catch {
      console.log(`Mode simulation - Centre ${id} ${isActive ? 'active' : 'desactive'}`);
    }
  }

  static async deleteCenter(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('training_centers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch {
      console.log(`Mode simulation - Centre supprime: ${id}`);
    }
  }

  private static getMockCenters(search?: string): SuperAdminCenter[] {
    const centers: SuperAdminCenter[] = [
      {
        id: 'c1', name: 'FormaPro Paris', address: '123 Avenue des Champs-Elysees, Paris',
        email: 'contact@formapro-paris.fr', phone: '01 23 45 67 89', is_active: true, settings: {},
        created_at: '2025-03-15T10:00:00Z', updated_at: '2025-03-15T10:00:00Z',
        _count: { users: 12, sessions: 45, rooms: 4, programs: 6 },
        subscription: { id: 's1', center_id: 'c1', plan_id: 'p2', status: 'active', billing_cycle: 'monthly', cancel_at_period_end: false, created_at: '', updated_at: '', plan: { id: 'p2', name: 'Pro', slug: 'pro', price_monthly: 99, currency: 'EUR', max_users: 15, max_sessions: 200, max_rooms: 10, max_programs: 25, max_students: 0, features: [], is_active: true, sort_order: 2, created_at: '', updated_at: '' } },
      },
      {
        id: 'c2', name: 'TechSkills Lyon', address: '456 Rue de la Republique, Lyon',
        email: 'info@techskills-lyon.fr', phone: '04 56 78 90 12', is_active: true, settings: {},
        created_at: '2025-05-20T10:00:00Z', updated_at: '2025-05-20T10:00:00Z',
        _count: { users: 8, sessions: 23, rooms: 3, programs: 4 },
        subscription: { id: 's2', center_id: 'c2', plan_id: 'p1', status: 'active', billing_cycle: 'monthly', cancel_at_period_end: false, created_at: '', updated_at: '', plan: { id: 'p1', name: 'Free', slug: 'free', price_monthly: 0, currency: 'EUR', max_users: 3, max_sessions: 20, max_rooms: 2, max_programs: 3, max_students: 0, features: [], is_active: true, sort_order: 1, created_at: '', updated_at: '' } },
      },
      {
        id: 'c3', name: 'DigiLearn Marseille', address: '789 La Canebiere, Marseille',
        email: 'hello@digilearn.fr', is_active: false, settings: {},
        created_at: '2025-07-01T10:00:00Z', updated_at: '2025-07-01T10:00:00Z',
        _count: { users: 3, sessions: 5, rooms: 1, programs: 2 },
      },
    ];
    if (search) {
      const s = search.toLowerCase();
      return centers.filter(c => c.name.toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s));
    }
    return centers;
  }
}
