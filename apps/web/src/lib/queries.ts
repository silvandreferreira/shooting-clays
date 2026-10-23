import type { Dashboard, SessionInput, SessionsQuery } from '@shooting-clays/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  sessions: (filters: SessionsQuery = {}) => ['sessions', filters] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.dashboard,
    // Always revalidate in the background; the persisted cache is shown meanwhile.
    staleTime: 0,
    refetchOnWindowFocus: true,
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
