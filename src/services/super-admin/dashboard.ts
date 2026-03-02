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
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(10),
    ]);

    const centers = centersRes.data || [];
    const users = usersRes.data || [];
    const subs = subsRes.data || [];

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

    return {
      totalCenters: centersRes.count || centers.length,
      activeCenters: centers.filter(c => c.is_active !== false).length,
      totalUsers: usersRes.count || users.length,
      activeUsers: users.filter(u => u.is_active !== false).length,
      mrr,
      activeSubscriptions: paidSubscriptions,
      totalSubscriptions: subs.length,
      recentActivity: auditRes.data || [],
      mrrHistory: [],
    };
  }
}
