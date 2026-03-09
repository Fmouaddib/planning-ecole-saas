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

  /**
   * Crée un utilisateur via l'Edge Function create-user-for-center.
   * Utilise le service_role côté serveur pour bypasser la confirmation d'email.
   */
  static async createUser(userData: CreateUserData): Promise<SuperAdminUserProfile> {
    if (isDemoMode) return MockStore.addUser({
      email: userData.email, full_name: userData.full_name, role: userData.role,
      phone: userData.phone, center_id: userData.center_id, is_active: true,
    });

    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Non authentifié');
    }

    // Call the Edge Function
    const response = await supabase.functions.invoke('create-user-for-center', {
      body: {
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        center_id: userData.center_id,
        phone: userData.phone || null,
        password: userData.password || null,
        send_invitation: userData.send_invitation !== false && !userData.password,
      },
    });

    if (response.error) {
      console.error('[SAUsers] create-user-for-center error:', response.error);
      throw new Error(response.error.message || 'Erreur lors de la création de l\'utilisateur');
    }

    const result = response.data;
    if (!result?.success || !result?.user) {
      const errMsg = result?.error || 'Erreur inconnue lors de la création';
      throw new Error(errMsg);
    }

    return result.user as SuperAdminUserProfile;
  }

  static async updateUser(id: string, data: Partial<CreateUserData>): Promise<SuperAdminUserProfile> {
    if (isDemoMode) return MockStore.updateUser(id, data as Partial<SuperAdminUserProfile>) || { id, ...data, is_active: true, created_at: '', updated_at: new Date().toISOString() } as SuperAdminUserProfile;

    // Update password if provided
    if (data.password) {
      await this.resetPassword(id, data.password);
    }

    // Sync email in auth.users if changed
    if (data.email) {
      const { error: emailError } = await supabase.rpc('sa_update_user_email', {
        p_user_id: id,
        p_email: data.email,
      });
      if (emailError) {
        console.warn('[SAUsers] sa_update_user_email warning:', emailError.message);
      }
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ full_name: data.full_name, role: data.role, phone: data.phone, center_id: data.center_id, email: data.email })
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

  static async resetPassword(userId: string, newPassword: string): Promise<void> {
    if (isDemoMode) { console.log(`Demo: reset password for ${userId}`); return; }

    if (newPassword.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    const { error } = await supabase.rpc('sa_reset_password_v2', {
      p_user_id: userId,
      p_password: newPassword,
    });

    if (error) {
      console.error('[SAUsers] resetPassword error:', error.message);
      throw new Error(error.message || 'Erreur lors du changement de mot de passe');
    }
  }
}
