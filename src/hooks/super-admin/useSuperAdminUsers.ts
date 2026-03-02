import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SAUsersService } from '@/services/super-admin/users';
import { SAAuditService } from '@/services/super-admin/audit';
import type { CreateUserData } from '@/types/super-admin';

const SA_KEYS = {
  users: (search?: string) => ['super-admin', 'users', search] as const,
};

// PostgrestError a .message mais n'est pas instanceof Error
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

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
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err);
      console.error('[useCreateSAUser]', err);
      toast.error(`Erreur creation utilisateur : ${msg}`);
    },
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
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err);
      console.error('[useUpdateSAUser]', err);
      toast.error(`Erreur mise a jour : ${msg}`);
    },
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
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err);
      console.error('[useToggleSAUserActive]', err);
      toast.error(`Erreur changement statut : ${msg}`);
    },
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
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err);
      console.error('[useBulkToggleSAUserActive]', err);
      toast.error(`Erreur mise a jour groupee : ${msg}`);
    },
  });
};

export const useDeleteSAUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SAUsersService.deleteUser(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] });
      SAAuditService.logAction({ action: 'user.deleted', entityType: 'user', entityId: id });
      toast.success('Utilisateur supprime');
    },
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err);
      console.error('[useDeleteSAUser]', err);
      toast.error(`Erreur suppression : ${msg}`);
    },
  });
};

export const useResetSAUserPassword = () => {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      SAUsersService.resetPassword(userId, newPassword),
    onSuccess: () => toast.success('Mot de passe modifie avec succes'),
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err);
      console.error('[useResetSAUserPassword]', err);
      toast.error(`Erreur reset MDP : ${msg}`);
    },
  });
};
