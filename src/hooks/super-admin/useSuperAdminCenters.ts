import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SACentersService } from '@/services/super-admin/centers';
import { SAAuditService } from '@/services/super-admin/audit';
import type { CreateCenterData } from '@/types/super-admin';

const SA_KEYS = {
  centers: (search?: string) => ['super-admin', 'centers', search] as const,
};

export const useSuperAdminCenters = (search?: string) => {
  return useQuery({
    queryKey: SA_KEYS.centers(search),
    queryFn: () => SACentersService.getCenters(search),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateSACenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCenterData) => SACentersService.createCenter(data),
    onSuccess: (center) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'centers'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'center.created', entityType: 'center', entityId: center.id, details: { name: center.name } });
      toast.success('Centre cree avec succes');
    },
    onError: () => toast.error('Erreur lors de la creation du centre'),
  });
};

export const useUpdateSACenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCenterData> }) => SACentersService.updateCenter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'centers'] });
      toast.success('Centre mis a jour');
    },
    onError: () => toast.error('Erreur lors de la mise a jour'),
  });
};

export const useDeleteSACenter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SACentersService.deleteCenter(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'centers'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'center.deleted', entityType: 'center', entityId: id });
      toast.success('Centre supprime');
    },
    onError: () => toast.error('Erreur lors de la suppression du centre'),
  });
};

export const useToggleSACenterActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => SACentersService.toggleActive(id, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'centers'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'center.updated', entityType: 'center', entityId: vars.id, details: { field: 'is_active', value: vars.isActive } });
      toast.success('Statut du centre mis a jour');
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });
};
