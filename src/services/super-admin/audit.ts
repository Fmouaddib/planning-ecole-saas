import { supabase } from '@/lib/supabase';
import type { AuditLogEntry } from '@/types/super-admin';

export class SAAuditService {
  static async getAuditLog(filters?: {
    action?: string;
    userId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    } catch {
      console.log('Mode simulation Audit - Donnees simulees');
      return SAAuditService.getMockAuditLog();
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
    try {
      const { error } = await supabase
        .from('audit_log')
        .insert({
          user_id: data.userId,
          user_email: data.userEmail,
          action: data.action,
          entity_type: data.entityType,
          entity_id: data.entityId,
          details: data.details || {},
        });

      if (error) throw error;
    } catch {
      console.log('Mode simulation - Action loguee:', data.action);
    }
  }

  private static getMockAuditLog(): AuditLogEntry[] {
    const now = Date.now();
    return [
      {
        id: 'a1', user_email: 'admin@formapro.fr', action: 'user.login',
        entity_type: 'auth', details: { ip: '192.168.1.1' },
        created_at: new Date(now - 300000).toISOString(),
      },
      {
        id: 'a2', user_email: 'superadmin@antiplanning.com', action: 'center.created',
        entity_type: 'center', entity_id: 'c3', details: { name: 'DigiLearn Marseille' },
        created_at: new Date(now - 3600000).toISOString(),
      },
      {
        id: 'a3', user_email: 'superadmin@antiplanning.com', action: 'subscription.activated',
        entity_type: 'subscription', entity_id: 's1', details: { plan: 'Pro', center: 'FormaPro Paris' },
        created_at: new Date(now - 7200000).toISOString(),
      },
      {
        id: 'a4', user_email: 'admin@techskills.fr', action: 'user.login',
        entity_type: 'auth', details: { ip: '10.0.0.5' },
        created_at: new Date(now - 14400000).toISOString(),
      },
      {
        id: 'a5', user_email: 'superadmin@antiplanning.com', action: 'user.updated',
        entity_type: 'user', entity_id: 'u4', details: { field: 'is_active', value: false },
        created_at: new Date(now - 28800000).toISOString(),
      },
      {
        id: 'a6', user_email: 'formateur@formapro.fr', action: 'session.created',
        entity_type: 'session', details: { title: 'Excel Avance - Groupe B' },
        created_at: new Date(now - 43200000).toISOString(),
      },
      {
        id: 'a7', user_email: 'superadmin@antiplanning.com', action: 'plan.updated',
        entity_type: 'plan', entity_id: 'p2', details: { field: 'price_monthly', old: 39, new: 49 },
        created_at: new Date(now - 86400000).toISOString(),
      },
      {
        id: 'a8', user_email: 'admin@formapro.fr', action: 'user.login',
        entity_type: 'auth', details: {},
        created_at: new Date(now - 172800000).toISOString(),
      },
    ];
  }
}
