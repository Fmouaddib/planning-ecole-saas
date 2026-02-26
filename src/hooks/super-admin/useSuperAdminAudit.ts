import { useQuery } from '@tanstack/react-query';
import { SAAuditService } from '@/services/super-admin/audit';

const SA_KEYS = {
  audit: (filters?: Record<string, string>) => ['super-admin', 'audit', filters] as const,
  loginActivity: ['super-admin', 'audit', 'logins'] as const,
};

export const useSuperAdminAudit = (filters?: {
  action?: string;
  userId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: SA_KEYS.audit(filters as Record<string, string>),
    queryFn: () => SAAuditService.getAuditLog(filters),
    staleTime: 1 * 60 * 1000,
  });
};

export const useLoginActivity = () => {
  return useQuery({
    queryKey: SA_KEYS.loginActivity,
    queryFn: () => SAAuditService.getLoginActivity(),
    staleTime: 1 * 60 * 1000,
  });
};
