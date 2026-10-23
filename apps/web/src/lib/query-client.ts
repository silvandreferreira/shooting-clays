import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { ApiError } from './api';

/** Bump whenever the shape of cached data changes, so old caches are discarded. */
export const CACHE_BUSTER = 'v1';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
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
}

const persister = createAsyncStoragePersister({
  key: 'shooting-clays-cache',
  storage: {
    getItem: (key) => get<string>(key).then((v) => v ?? null),
    setItem: (key, value: string) => set(key, value),
    removeItem: (key) => del(key),
  },
});

/**
 * The cache belongs to one user: the user id is part of the buster, so a cache written for
 * another account is discarded on restore instead of being shown.
 */
export function persistOptionsFor(userId: string): Omit<PersistQueryClientOptions, 'queryClient'> {
  return { persister, maxAge: ONE_WEEK, buster: `${CACHE_BUSTER}:${userId}` };
}

/** Sign-out: forget everything cached in memory and on disk. */
export async function clearCache(queryClient: QueryClient) {
  queryClient.clear();
  await persister.removeClient();
}
