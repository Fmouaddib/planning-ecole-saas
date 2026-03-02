import { supabase, isDemoMode } from '@/lib/supabase';
import { MockStore } from './mock-store';
import type { SuperAdminUserProfile, CreateUserData } from '@/types/super-admin';

export class SAUsersService {
  static async getUsers(search?: string): Promise<SuperAdminUserProfile[]> {
    if (isDemoMode) return MockStore.getUsers(search);

    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[SAUsers] getUsers error:', error.message);
      throw error;
    }
    return (data || []) as SuperAdminUserProfile[];
  }

  static async createUser(userData: CreateUserData): Promise<SuperAdminUserProfile> {
    if (isDemoMode) return MockStore.addUser({
      email: userData.email, full_name: userData.full_name, role: userData.role,
      phone: userData.phone, center_id: userData.center_id, is_active: true,
    });

    // Appel RPC create_user_for_center (SECURITY DEFINER, bypass GoTrue)
    const { data, error } = await supabase.rpc('create_user_for_center', {
      p_email: userData.email,
      p_full_name: userData.full_name,
      p_role: userData.role,
      p_center_id: userData.center_id,
      p_phone: userData.phone || null,
    });

    if (error) {
      console.error('[SAUsers] createUser RPC error:', error.message, error.details, error.hint);
      throw error;
    }

    const profile = (typeof data === 'string' ? JSON.parse(data) : data) as SuperAdminUserProfile;

    // Envoyer un email de reinitialisation de mot de passe
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(userData.email);
    if (resetError) {
      console.warn('[SAUsers] resetPasswordForEmail warning:', resetError.message);
    }

    return profile;
  }

  static async updateUser(id: string, data: Partial<CreateUserData>): Promise<SuperAdminUserProfile> {
    if (isDemoMode) return MockStore.updateUser(id, data as Partial<SuperAdminUserProfile>) || { id, ...data, is_active: true, created_at: '', updated_at: new Date().toISOString() } as SuperAdminUserProfile;

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ full_name: data.full_name, role: data.role, phone: data.phone, center_id: data.center_id })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SAUsers] updateUser error:', error.message);
      throw error;
    }
    return updated as SuperAdminUserProfile;
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    if (isDemoMode) { MockStore.updateUser(id, { is_active: isActive }); return; }

    const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id);
    if (error) {
      console.error('[SAUsers] toggleActive error:', error.message);
      throw error;
    }
  }

  static async bulkToggleActive(ids: string[], isActive: boolean): Promise<void> {
    if (isDemoMode) { ids.forEach(id => MockStore.updateUser(id, { is_active: isActive })); return; }

    const { error } = await supabase.from('profiles').update({ is_active: isActive }).in('id', ids);
    if (error) {
      console.error('[SAUsers] bulkToggleActive error:', error.message);
      throw error;
    }
  }

  static async deleteUser(id: string): Promise<void> {
    if (isDemoMode) { MockStore.deleteUser(id); return; }

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      console.error('[SAUsers] deleteUser error:', error.message);
      throw error;
    }
  }

  static async resetPassword(email: string): Promise<void> {
    if (isDemoMode) { console.log(`Mode simulation - Reset password envoye a ${email}`); return; }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      console.error('[SAUsers] resetPassword error:', error.message);
      throw error;
    }
  }
}
