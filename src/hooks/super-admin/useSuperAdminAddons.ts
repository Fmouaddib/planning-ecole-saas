import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SAAddonsService } from '@/services/super-admin/addons';
import { SAAuditService } from '@/services/super-admin/audit';
import type { CreateAddonPlanData, AssignAddonData, CenterAddon } from '@/types/super-admin';

const SA_ADDON_KEYS = {
  addonPlans: ['super-admin', 'addon-plans'] as const,
  centerAddons: (centerId?: string) => ['super-admin', 'center-addons', centerId] as const,
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

// ── Addon Plans (catalogue) ──

export const useSuperAdminAddonPlans = () => {
  return useQuery({
    queryKey: SA_ADDON_KEYS.addonPlans,
    queryFn: () => SAAddonsService.getAddonPlans(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateAddonPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAddonPlanData) => SAAddonsService.createAddonPlan(data),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: SA_ADDON_KEYS.addonPlans });
      SAAuditService.logAction({ action: 'addon_plan.created', entityType: 'addon_plan', entityId: plan.id, details: { name: plan.name } });
      toast.success('Option creee avec succes');
    },
    onError: (err: unknown) => toast.error(`Erreur : ${extractErrorMessage(err)}`),
  });
};

export const useUpdateAddonPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAddonPlanData> & { is_active?: boolean } }) =>
      SAAddonsService.updateAddonPlan(id, data),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: SA_ADDON_KEYS.addonPlans });
      SAAuditService.logAction({ action: 'addon_plan.updated', entityType: 'addon_plan', entityId: plan.id, details: { name: plan.name } });
      toast.success('Option mise a jour');
    },
    onError: (err: unknown) => toast.error(`Erreur : ${extractErrorMessage(err)}`),
  });
};

export const useDeleteAddonPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SAAddonsService.deleteAddonPlan(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: SA_ADDON_KEYS.addonPlans });
      SAAuditService.logAction({ action: 'addon_plan.deleted', entityType: 'addon_plan', entityId: id });
      toast.success('Option supprimee');
    },
    onError: (err: unknown) => toast.error(`Erreur : ${extractErrorMessage(err)}`),
  });
};

// ── Center Addons (souscriptions) ──

export const useCenterAddons = (centerId?: string) => {
  return useQuery({
    queryKey: SA_ADDON_KEYS.centerAddons(centerId),
    queryFn: () => SAAddonsService.getCenterAddons(centerId),
    staleTime: 2 * 60 * 1000,
  });
};

export const useAssignAddon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignAddonData) => SAAddonsService.assignAddonToCenter(data),
    onSuccess: (addon) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'center-addons'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'center_addon.assigned', entityType: 'center_addon', entityId: addon.id, details: { center_id: addon.center_id, addon_plan_id: addon.addon_plan_id } });
      toast.success('Option assignee au centre');
    },
    onError: (err: unknown) => toast.error(`Erreur : ${extractErrorMessage(err)}`),
  });
};

export const useUpdateCenterAddon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity?: number; status?: CenterAddon['status'] } }) =>
      SAAddonsService.updateCenterAddon(id, data),
    onSuccess: (addon) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'center-addons'] });
      SAAuditService.logAction({ action: 'center_addon.updated', entityType: 'center_addon', entityId: addon.id });
      toast.success('Option mise a jour');
    },
    onError: (err: unknown) => toast.error(`Erreur : ${extractErrorMessage(err)}`),
  });
};

export const useCancelAddon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SAAddonsService.cancelCenterAddon(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'center-addons'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'center_addon.cancelled', entityType: 'center_addon', entityId: id });
      toast.success('Option annulee');
    },
    onError: (err: unknown) => toast.error(`Erreur : ${extractErrorMessage(err)}`),
  });
};
