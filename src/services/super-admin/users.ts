import { supabase, isolatedClient, isDemoMode } from '@/lib/supabase';
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
   * Fallback : création via signUp (isolatedClient) si la RPC n'existe pas ou échoue.
   * Utilise un mot de passe aléatoire — l'admin devra faire "mot de passe oublié".
   */
  private static async createUserViaSignUp(userData: CreateUserData): Promise<SuperAdminUserProfile> {
    const randomPassword = crypto.randomUUID() + '!Aa1';

    const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
      email: userData.email,
      password: randomPassword,
      options: {
        data: {
          full_name: userData.full_name,
          role: userData.role,
        },
      },
    });

    if (signUpError) {
      console.error('[SAUsers] signUp fallback error:', signUpError.message);
      throw signUpError;
    }
    if (!signUpData.user) throw new Error('Échec de la création du compte (signUp)');

    const newId = signUpData.user.id;

    // Attendre un court instant pour que le trigger handle_new_user s'exécute
    await new Promise(r => setTimeout(r, 500));

    // Mettre à jour le profil avec les bonnes infos
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newId,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        center_id: userData.center_id,
        phone: userData.phone || null,
        is_active: true,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error('[SAUsers] signUp fallback profile error:', profileError.message);
      throw profileError;
    }

    return profile as SuperAdminUserProfile;
  }

  static async createUser(userData: CreateUserData): Promise<SuperAdminUserProfile> {
    if (isDemoMode) return MockStore.addUser({
      email: userData.email, full_name: userData.full_name, role: userData.role,
      phone: userData.phone, center_id: userData.center_id, is_active: true,
    });

    let profile: SuperAdminUserProfile;

    // 1. Tenter la RPC create_user_for_center
    const { data, error } = await supabase.rpc('create_user_for_center', {
      p_email: userData.email,
      p_full_name: userData.full_name,
      p_role: userData.role,
      p_center_id: userData.center_id,
      p_phone: userData.phone || null,
    });

    if (error) {
      console.warn('[SAUsers] RPC create_user_for_center echouee, fallback signUp:', error.message);
      // 2. Fallback signUp via isolatedClient
      profile = await this.createUserViaSignUp(userData);
    } else {
      profile = (typeof data === 'string' ? JSON.parse(data) : data) as SuperAdminUserProfile;
    }

    // Envoyer un email d'invitation (reset password) si demande
    if (userData.send_invitation !== false) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(userData.email);
      if (resetError) {
        console.warn('[SAUsers] resetPasswordForEmail warning:', resetError.message);
      }
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

  static async resetPassword(userId: string, newPassword: string): Promise<void> {
    if (isDemoMode) { console.log(`Demo: reset password for ${userId}`); return; }

    const { error } = await supabase.rpc('sa_reset_user_password', {
      p_user_id: userId,
      p_new_password: newPassword,
    });
    if (error) {
      console.error('[SAUsers] resetPassword RPC error:', error.message);
      throw error;
    }
  }
}
