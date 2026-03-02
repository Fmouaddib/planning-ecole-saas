import { supabase, isDemoMode } from '@/lib/supabase';
import { MockStore } from './mock-store';
import type { AuditLogEntry } from '@/types/super-admin';

// Cache session pour eviter des appels auth repetitifs
let cachedUser: { id: string; email: string } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 min

async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const now = Date.now();
  if (cachedUser && now - cacheTimestamp < CACHE_TTL) return cachedUser;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    cachedUser = { id: user.id, email: user.email || '' };
    cacheTimestamp = now;
  }
  return cachedUser;
}

export class SAAuditService {
  static async getAuditLog(filters?: {
    action?: string;
    userId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogEntry[]> {
    if (isDemoMode) return MockStore.getAudit(filters);
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.action) query = query.eq('action', filters.action);
      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    } catch {
      return MockStore.getAudit(filters);
    }
  }

  static async getLoginActivity(): Promise<AuditLogEntry[]> {
    return this.getAuditLog({ action: 'user.login' });
  }

  static async logAction(data: {
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
    userId?: string;
    userEmail?: string;
  }): Promise<void> {
    // Auto-remplir user_id et user_email depuis la session
    let userId = data.userId;
    let userEmail = data.userEmail;

    if (!userId || !userEmail) {
      const user = isDemoMode ? null : await getCurrentUser();
      if (user) {
        userId = userId || user.id;
        userEmail = userEmail || user.email;
      }
    }

    if (isDemoMode) {
      MockStore.addAuditEntry({
        user_id: userId,
        user_email: userEmail || 'superadmin@antiplanning.com',
        action: data.action, entity_type: data.entityType,
        entity_id: data.entityId, details: data.details || {},
      });
      return;
    }
    try {
      const { error } = await supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          user_email: userEmail,
          action: data.action,
          entity_type: data.entityType,
          entity_id: data.entityId,
          details: data.details || {},
        });
      if (error) console.warn('[SAAudit] logAction error:', error.message);
    } catch (err) {
      console.warn('[SAAudit] logAction failed:', err);
    }
  }
}
