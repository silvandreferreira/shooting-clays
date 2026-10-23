import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { ApiError } from './api';

/** Bump whenever the shape of cached data changes, so old caches are discarded. */
export const CACHE_BUSTER = 'v2';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      // The account was put on hold or disabled since the app last checked: re-check it now.
      onError: (error) => {
        if (
          error instanceof ApiError &&
          (error.code === 'ACCOUNT_PENDING' || error.code === 'ACCOUNT_DISABLED')
        ) {
          void queryClient.invalidateQueries({ queryKey: ['me'] });
        }
      },
    }),
    defaultOptions: {
      // Cached data must outlive the persister's maxAge, otherwise it is dropped on restore.
      queries: {
        gcTime: ONE_WEEK,
        // Retry network/server errors once; never retry 4xx (auth, access, validation).
        retry: (failures, error) =>
          failures < 1 && !(error instanceof ApiError && error.status < 500),
      },
    },
  });
  return queryClient;
}

// Set on sign-out: a throttled write already scheduled must not bring the cache back.
let writesBlocked = false;

const persister = createAsyncStoragePersister({
  key: 'shooting-clays-cache',
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value: string) => (writesBlocked ? Promise.resolve() : set(key, value)),
    removeItem: (key) => del(key),
  },
});

/**
 * The cache belongs to one user: the user id is part of the buster, so a cache written for
 * another account is discarded on restore instead of being shown.
 */
export function persistOptionsFor(userId: string): Omit<PersistQueryClientOptions, 'queryClient'> {
  writesBlocked = false;
  return { persister, maxAge: ONE_WEEK, buster: `${CACHE_BUSTER}:${userId}` };
}

/** Sign-out: forget everything cached in memory and on disk. */
export async function clearCache(queryClient: QueryClient) {
  writesBlocked = true;
  queryClient.clear();
  await persister.removeClient();
}
