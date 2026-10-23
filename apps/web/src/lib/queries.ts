import type { Dashboard, SessionInput, SessionsQuery } from '@shooting-clays/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  sessions: (filters: SessionsQuery = {}) => ['sessions', filters] as const,
};

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
