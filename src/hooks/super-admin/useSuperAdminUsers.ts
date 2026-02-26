import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SAUsersService } from '@/services/super-admin/users';
import { SAAuditService } from '@/services/super-admin/audit';
import type { CreateUserData } from '@/types/super-admin';

const SA_KEYS = {
  users: (search?: string) => ['super-admin', 'users', search] as const,
};

export const useSuperAdminUsers = (search?: string) => {
  return useQuery({
    queryKey: SA_KEYS.users(search),
    queryFn: () => SAUsersService.getUsers(search),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateSAUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      return SAUsersService.createUser(data);
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'user.created', entityType: 'user', entityId: user.id, details: { email: user.email, role: user.role } });
      toast.success('Utilisateur cree avec succes');
    },
    onError: (error: Error) => toast.error(error.message || 'Erreur lors de la creation de l\'utilisateur'),
  });
};

export const useUpdateSAUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserData> }) => SAUsersService.updateUser(id, data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      SAAuditService.logAction({ action: 'user.updated', entityType: 'user', entityId: user.id, details: { email: user.email } });
      toast.success('Utilisateur mis a jour');
    },
    onError: () => toast.error('Erreur lors de la mise a jour'),
  });
};

export const useToggleSAUserActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => SAUsersService.toggleActive(id, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'user.updated', entityType: 'user', entityId: vars.id, details: { field: 'is_active', value: vars.isActive } });
      toast.success('Statut mis a jour');
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });
};

export const useBulkToggleSAUserActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) => SAUsersService.bulkToggleActive(ids, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'user.bulk_updated', entityType: 'user', details: { count: vars.ids.length, is_active: vars.isActive } });
      toast.success(`${vars.ids.length} utilisateur(s) mis a jour`);
    },
    onError: () => toast.error('Erreur lors de la mise a jour groupee'),
  });
};

export const useResetSAUserPassword = () => {
  return useMutation({
    mutationFn: (email: string) => SAUsersService.resetPassword(email),
    onSuccess: () => toast.success('Email de reinitialisation envoye'),
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });
};
