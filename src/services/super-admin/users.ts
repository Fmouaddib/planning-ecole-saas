import { supabase } from '@/lib/supabase';
import { MockStore } from './mock-store';
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
    } catch {
      return MockStore.getUsers(search);
    }
  }

  static async createUser(userData: CreateUserData): Promise<SuperAdminUserProfile> {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password || 'temp123456',
        user_metadata: { full_name: userData.full_name, role: userData.role },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone: userData.phone, center_id: userData.center_id, role: userData.role })
          .eq('id', authData.user.id);
        if (profileError) console.warn('Profile update warning:', profileError);
      }

      return {
        id: authData.user?.id || `new-${Date.now()}`,
        email: userData.email, full_name: userData.full_name, role: userData.role,
        phone: userData.phone, center_id: userData.center_id,
        is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
    } catch {
      return MockStore.addUser({
        email: userData.email, full_name: userData.full_name, role: userData.role,
        phone: userData.phone, center_id: userData.center_id, is_active: true,
      });
    }
  }

  static async updateUser(id: string, data: Partial<CreateUserData>): Promise<SuperAdminUserProfile> {
    try {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, role: data.role, phone: data.phone, center_id: data.center_id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as SuperAdminUserProfile;
    } catch {
      return MockStore.updateUser(id, data as Partial<SuperAdminUserProfile>) || { id, ...data, is_active: true, created_at: '', updated_at: new Date().toISOString() } as SuperAdminUserProfile;
    }
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id);
      if (error) throw error;
    } catch {
      MockStore.updateUser(id, { is_active: isActive });
    }
  }

  static async bulkToggleActive(ids: string[], isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase.from('profiles').update({ is_active: isActive }).in('id', ids);
      if (error) throw error;
    } catch {
      ids.forEach(id => MockStore.updateUser(id, { is_active: isActive }));
    }
  }

  static async deleteUser(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    } catch {
      MockStore.deleteUser(id);
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
}
