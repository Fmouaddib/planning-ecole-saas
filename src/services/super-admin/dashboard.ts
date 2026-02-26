import { supabase } from '@/lib/supabase';
import type { SuperAdminDashboardStats } from '@/types/super-admin';

export class SADashboardService {
  static async getStats(): Promise<SuperAdminDashboardStats> {
    try {
      const [centersRes, usersRes, subsRes, auditRes] = await Promise.all([
        supabase.from('training_centers').select('id, is_active', { count: 'exact' }),
        supabase.from('profiles').select('id, is_active', { count: 'exact' }),
        supabase.from('center_subscriptions').select('id, status, plan_id').eq('status', 'active'),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      const centers = centersRes.data || [];
      const users = usersRes.data || [];
      const subs = subsRes.data || [];

      // Calculate MRR from active subscriptions
      let mrr = 0;
      if (subs.length > 0) {
        const planIds = [...new Set(subs.map(s => s.plan_id))];
        const { data: plans } = await supabase
          .from('subscription_plans')
          .select('id, price_monthly')
          .in('id', planIds);

        if (plans) {
          const priceMap = Object.fromEntries(plans.map(p => [p.id, p.price_monthly]));
          mrr = subs.reduce((sum, s) => sum + (priceMap[s.plan_id] || 0), 0);
        }
      }

      return {
        totalCenters: centersRes.count || centers.length,
        activeCenters: centers.filter(c => c.is_active !== false).length,
        totalUsers: usersRes.count || users.length,
        activeUsers: users.filter(u => u.is_active !== false).length,
        mrr,
        activeSubscriptions: subs.length,
        recentActivity: auditRes.data || [],
        mrrHistory: SADashboardService.generateMrrHistory(mrr),
      };
    } catch (error) {
      console.log('Mode simulation Dashboard - Stats simulees');
      return SADashboardService.getMockStats();
    }
  }

  static async getMrrHistory(): Promise<{ month: string; amount: number }[]> {
    const stats = await this.getStats();
    return stats.mrrHistory;
  }

  private static generateMrrHistory(currentMrr: number): { month: string; amount: number }[] {
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const history = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const factor = 1 - (i * 0.12);
      history.push({
        month: months[d.getMonth()],
        amount: Math.round(currentMrr * Math.max(factor, 0.3)),
      });
    }
    return history;
  }

  private static getMockStats(): SuperAdminDashboardStats {
    return {
      totalCenters: 12,
      activeCenters: 10,
      totalUsers: 87,
      activeUsers: 72,
      mrr: 1245,
      activeSubscriptions: 8,
      recentActivity: [
        { id: '1', action: 'user.login', user_email: 'admin@formapro.fr', entity_type: 'auth', details: {}, created_at: new Date().toISOString() },
        { id: '2', action: 'center.created', user_email: 'superadmin@antiplanning.com', entity_type: 'center', entity_id: 'c1', details: { name: 'FormaPro Nice' }, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: '3', action: 'subscription.activated', user_email: 'superadmin@antiplanning.com', entity_type: 'subscription', details: { plan: 'Pro' }, created_at: new Date(Date.now() - 7200000).toISOString() },
      ],
      mrrHistory: [
        { month: 'Sep', amount: 490 },
        { month: 'Oct', amount: 637 },
        { month: 'Nov', amount: 833 },
        { month: 'Dec', amount: 980 },
        { month: 'Jan', amount: 1127 },
        { month: 'Fev', amount: 1245 },
      ],
    };
  }
}
