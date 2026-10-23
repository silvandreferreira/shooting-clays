import { useQueryClient } from '@tanstack/react-query';
import { authClient, clearApiToken } from './auth';
import { clearCache } from './query-client';

/** Signs out and removes everything cached for this user (memory, IndexedDB, last user). */
export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    // End the session first: the app unmounts (and stops persisting the cache) before it is
    // cleared. The last user is forgotten once the session is confirmed gone (useAuthState).
    await authClient.signOut();
    clearApiToken();
    await clearCache(queryClient);
  };
}
