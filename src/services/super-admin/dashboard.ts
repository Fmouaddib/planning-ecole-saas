import { supabase, isDemoMode } from '@/lib/supabase';
import { MockStore } from './mock-store';
import type { SuperAdminDashboardStats } from '@/types/super-admin';

export class SADashboardService {
  static async getStats(): Promise<SuperAdminDashboardStats> {
    if (isDemoMode) return MockStore.getStats();

    const [centersRes, usersRes, subsRes, auditRes] = await Promise.all([
      supabase.from('training_centers').select('id, is_active', { count: 'exact' }),
      supabase.from('profiles').select('id, is_active', { count: 'exact' }),
      supabase.from('center_subscriptions').select('id, status, plan_id').eq('status', 'active'),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(15),
    ]);

    const centers = centersRes.data || [];
    const users = usersRes.data || [];
    const subs = subsRes.data || [];
    const auditEntries = auditRes.data || [];

    // Calculer MRR et compter les abonnements payants
    let mrr = 0;
    let paidSubscriptions = 0;

    if (subs.length > 0) {
      const planIds = [...new Set(subs.map(s => s.plan_id))];
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, price_monthly')
        .in('id', planIds);

      if (plans) {
        const priceMap = Object.fromEntries(plans.map(p => [p.id, p.price_monthly]));
        for (const s of subs) {
          const price = priceMap[s.plan_id] || 0;
          mrr += price;
          if (price > 0) paidSubscriptions++;
        }
      }
    }

    // Enrichir les activites avec noms utilisateurs et centres
    const enrichedActivity = await this.enrichAuditEntries(auditEntries);

    return {
      totalCenters: centersRes.count || centers.length,
      activeCenters: centers.filter(c => c.is_active !== false).length,
      totalUsers: usersRes.count || users.length,
      activeUsers: users.filter(u => u.is_active !== false).length,
      mrr,
      activeSubscriptions: paidSubscriptions,
      totalSubscriptions: subs.length,
      recentActivity: enrichedActivity,
      mrrHistory: [],
    };
  }

  private static async enrichAuditEntries(entries: Record<string, unknown>[]): Promise<SuperAdminDashboardStats['recentActivity']> {
    if (entries.length === 0) return [];

    // Collecter les user_ids et entity_ids uniques
    const userIds = [...new Set(entries.map(e => e.user_id as string).filter(Boolean))];
    const centerEntityIds = [...new Set(
      entries.filter(e => e.entity_type === 'center').map(e => e.entity_id as string).filter(Boolean)
    )];
    const userEntityIds = [...new Set(
      entries.filter(e => e.entity_type === 'user').map(e => e.entity_id as string).filter(Boolean)
    )];

    // Batch-fetch profiles pour les auteurs + les entites user
    const allProfileIds = [...new Set([...userIds, ...userEntityIds])];
    const profileMap: Record<string, { full_name: string; email: string; center_id?: string }> = {};
    if (allProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, center_id')
        .in('id', allProfileIds);
      if (profiles) {
        for (const p of profiles) profileMap[p.id] = p;
      }
    }

    // Batch-fetch centers pour les entites center + les centres des utilisateurs
    const profileCenterIds = Object.values(profileMap).map(p => p.center_id).filter(Boolean) as string[];
    const allCenterIds = [...new Set([...centerEntityIds, ...profileCenterIds])];
    const centerMap: Record<string, string> = {};
    if (allCenterIds.length > 0) {
      const { data: centerData } = await supabase
        .from('training_centers')
        .select('id, name, acronym')
        .in('id', allCenterIds);
      if (centerData) {
        for (const c of centerData) centerMap[c.id] = c.acronym || c.name;
      }
    }

    // Enrichir chaque entree
    return entries.map(entry => {
      const userId = entry.user_id as string | undefined;
      const entityId = entry.entity_id as string | undefined;
      const entityType = entry.entity_type as string | undefined;
      const details = (entry.details || {}) as Record<string, unknown>;
      const profile = userId ? profileMap[userId] : undefined;

      // Determiner le nom du centre concerne
      let centerName: string | undefined;
      if (entityType === 'center' && entityId && centerMap[entityId]) {
        centerName = centerMap[entityId];
      } else if (profile?.center_id && centerMap[profile.center_id]) {
        centerName = centerMap[profile.center_id];
      }

      // Determiner le nom de l'entite cible
      let targetName: string | undefined;
      if (details.name) targetName = String(details.name);
      else if (details.email) targetName = String(details.email);
      else if (entityType === 'user' && entityId && profileMap[entityId]) {
        targetName = profileMap[entityId].full_name || profileMap[entityId].email;
      }

      return {
        ...entry,
        id: entry.id as string,
        action: entry.action as string,
        created_at: entry.created_at as string,
        user_email: entry.user_email as string | undefined,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        details: {
          ...details,
          _user_name: profile?.full_name,
          _center_name: centerName,
          _target_name: targetName,
        },
      };
    });
  }
}
