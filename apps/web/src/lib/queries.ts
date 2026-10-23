import type {
  AccountStatus,
  AdminUser,
  Dashboard,
  SessionInput,
  SessionsQuery,
} from '@shooting-clays/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const queryKeys = {
  me: ['me'] as const,
  adminUsers: ['admin', 'users'] as const,
  dashboard: ['dashboard'] as const,
  sessions: (filters: SessionsQuery = {}) => ['sessions', filters] as const,
};

/**
 * The signed-in user with their role and account status. Re-checked whenever the app opens or
 * regains focus, so an approval (or a disable) applies without signing out.
 */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: api.me,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
}

export const DASHBOARD_FRESH_MS = 30_000;

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.dashboard,
    // Revalidate in the background when the app opens (the restored cache is older than this)
    // and whenever the window regains focus. Data written by a mutation counts as fresh, so
    // returning to the dashboard after saving makes no second request.
    staleTime: DASHBOARD_FRESH_MS,
    refetchOnWindowFocus: 'always',
  });
}

export function useSessions(filters: SessionsQuery) {
  return useQuery({
    queryKey: queryKeys.sessions(filters),
    queryFn: () => api.sessions(filters),
    staleTime: 0,
  });
}

/** Writes the dashboard returned by a mutation into the cache (no second request). */
function useApplyDashboard() {
  const queryClient = useQueryClient();
  return (dashboard: Dashboard) => {
    queryClient.setQueryData(queryKeys.dashboard, dashboard);
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };
}

export function useCreateSession() {
  const applyDashboard = useApplyDashboard();
  return useMutation({
    mutationFn: (input: SessionInput) => api.createSession(input),
    onSuccess: ({ dashboard }) => applyDashboard(dashboard),
  });
}

export function useUpdateSession(id: string) {
  const applyDashboard = useApplyDashboard();
  return useMutation({
    mutationFn: (input: SessionInput) => api.updateSession(id, input),
    onSuccess: ({ dashboard }) => applyDashboard(dashboard),
  });
}

export function useDeleteSession() {
  const applyDashboard = useApplyDashboard();
  return useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: ({ dashboard }) => applyDashboard(dashboard),
  });
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: api.adminUsers,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
}

/** Changes a user's status, shown at once in the list (rolled back if the request fails). */
export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AccountStatus }) =>
      api.setUserStatus(userId, status),
    onMutate: async ({ userId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.adminUsers });
      const previous = queryClient.getQueryData<AdminUser[]>(queryKeys.adminUsers);
      queryClient.setQueryData<AdminUser[]>(queryKeys.adminUsers, (users) =>
        users?.map((u) => (u.userId === userId ? { ...u, status } : u)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(queryKeys.adminUsers, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeUser(userId),
    onSuccess: (_result, userId) => {
      queryClient.setQueryData<AdminUser[]>(queryKeys.adminUsers, (users) =>
        users?.filter((u) => u.userId !== userId),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}
