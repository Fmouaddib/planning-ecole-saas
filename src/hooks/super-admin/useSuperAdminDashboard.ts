import { useQuery } from '@tanstack/react-query';
import { SADashboardService } from '@/services/super-admin/dashboard';

const SA_KEYS = {
  dashboard: ['super-admin', 'dashboard'] as const,
  mrrHistory: ['super-admin', 'mrr-history'] as const,
};

export const useSuperAdminDashboard = () => {
  return useQuery({
    queryKey: SA_KEYS.dashboard,
    queryFn: () => SADashboardService.getStats(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
