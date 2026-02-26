import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SASubscriptionsService } from '@/services/super-admin/subscriptions';
import { SAAuditService } from '@/services/super-admin/audit';
import type { CreatePlanData, AssignPlanData } from '@/types/super-admin';

const SA_KEYS = {
  plans: ['super-admin', 'plans'] as const,
  subscriptions: ['super-admin', 'subscriptions'] as const,
  billing: (centerId?: string) => ['super-admin', 'billing', centerId] as const,
};

export const useSuperAdminPlans = () => {
  return useQuery({
    queryKey: SA_KEYS.plans,
    queryFn: () => SASubscriptionsService.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSAPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanData) => SASubscriptionsService.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SA_KEYS.plans });
      toast.success('Plan cree avec succes');
    },
    onError: () => toast.error('Erreur lors de la creation du plan'),
  });
};

export const useUpdateSAPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePlanData> }) => SASubscriptionsService.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SA_KEYS.plans });
      toast.success('Plan mis a jour');
    },
    onError: () => toast.error('Erreur lors de la mise a jour du plan'),
  });
};

export const useSuperAdminSubscriptions = () => {
  return useQuery({
    queryKey: SA_KEYS.subscriptions,
    queryFn: () => SASubscriptionsService.getSubscriptions(),
    staleTime: 2 * 60 * 1000,
  });
};

export const useAssignPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPlanData) => SASubscriptionsService.assignPlanToCenter(data),
    onSuccess: (sub) => {
      queryClient.invalidateQueries({ queryKey: SA_KEYS.subscriptions });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'centers'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'subscription.activated', entityType: 'subscription', entityId: sub.id, details: { center_id: sub.center_id, plan_id: sub.plan_id } });
      toast.success('Plan assigne avec succes');
    },
    onError: () => toast.error('Erreur lors de l\'assignation du plan'),
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) => SASubscriptionsService.cancelSubscription(subscriptionId),
    onSuccess: (_, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: SA_KEYS.subscriptions });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'subscription.cancelled', entityType: 'subscription', entityId: subscriptionId });
      toast.success('Abonnement annule');
    },
    onError: () => toast.error('Erreur lors de l\'annulation'),
  });
};

export const useBillingHistory = (centerId?: string) => {
  return useQuery({
    queryKey: SA_KEYS.billing(centerId),
    queryFn: () => SASubscriptionsService.getBillingHistory(centerId),
    staleTime: 5 * 60 * 1000,
  });
};
