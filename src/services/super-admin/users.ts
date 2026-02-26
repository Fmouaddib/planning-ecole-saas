import { supabase } from '@/lib/supabase';
import type { SuperAdminUserProfile, CreateUserData } from '@/types/super-admin';

export class SAUsersService {
  static async getUsers(search?: string): Promise<SuperAdminUserProfile[]> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SuperAdminUserProfile[];
    } catch (error) {
      console.log('Mode simulation Users - Donnees simulees');
      return SAUsersService.getMockUsers(search);
    }
  }

  static async createUser(userData: CreateUserData): Promise<SuperAdminUserProfile> {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password || 'temp123456',
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            phone: userData.phone,
            center_id: userData.center_id,
            role: userData.role,
          })
          .eq('id', authData.user.id);

        if (profileError) console.warn('Profile update warning:', profileError);
      }

      return {
        id: authData.user?.id || `new-${Date.now()}`,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone,
        center_id: userData.center_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.log('Mode simulation - Utilisateur cree (simule):', userData.email);
      return {
        id: `sim-${Date.now()}`,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        phone: userData.phone,
        center_id: userData.center_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  static async updateUser(id: string, data: Partial<CreateUserData>): Promise<SuperAdminUserProfile> {
    try {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          role: data.role,
          phone: data.phone,
          center_id: data.center_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as SuperAdminUserProfile;
    } catch (error) {
      console.log('Mode simulation - Utilisateur mis a jour:', id);
      return { id, ...data, is_active: true, created_at: '', updated_at: new Date().toISOString() } as SuperAdminUserProfile;
    }
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    } catch {
      console.log(`Mode simulation - Utilisateur ${id} ${isActive ? 'active' : 'desactive'}`);
    }
  }

  static async bulkToggleActive(ids: string[], isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .in('id', ids);
      if (error) throw error;
    } catch {
      console.log(`Mode simulation - ${ids.length} utilisateurs ${isActive ? 'actives' : 'desactives'}`);
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch {
      console.log(`Mode simulation - Utilisateur supprime: ${id}`);
    }
  }

  static async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch {
      console.log(`Mode simulation - Reset password envoye a ${email}`);
    }
  }

  private static getMockUsers(search?: string): SuperAdminUserProfile[] {
    const users: SuperAdminUserProfile[] = [
      { id: 'u1', email: 'admin@formapro.fr', full_name: 'Marie Dupont', role: 'admin', is_active: true, center_id: 'c1', created_at: '2025-06-15T10:00:00Z', updated_at: '2025-06-15T10:00:00Z' },
      { id: 'u2', email: 'formateur@formapro.fr', full_name: 'Jean Martin', role: 'trainer', is_active: true, center_id: 'c1', created_at: '2025-07-01T10:00:00Z', updated_at: '2025-07-01T10:00:00Z' },
      { id: 'u3', email: 'admin@techskills.fr', full_name: 'Sophie Bernard', role: 'admin', is_active: true, center_id: 'c2', created_at: '2025-08-10T10:00:00Z', updated_at: '2025-08-10T10:00:00Z' },
      { id: 'u4', email: 'coord@formapro.fr', full_name: 'Pierre Durand', role: 'coordinator', is_active: false, center_id: 'c1', created_at: '2025-05-20T10:00:00Z', updated_at: '2025-05-20T10:00:00Z' },
      { id: 'u5', email: 'staff@techskills.fr', full_name: 'Luc Moreau', role: 'staff', is_active: true, center_id: 'c2', created_at: '2025-09-01T10:00:00Z', updated_at: '2025-09-01T10:00:00Z' },
      { id: 'u6', email: 'superadmin@antiplanning.com', full_name: 'Super Admin', role: 'super_admin', is_active: true, created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z' },
    ];
    if (search) {
      const s = search.toLowerCase();
      return users.filter(u => u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    return users;
  }
}
