import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

/** Bump whenever the shape of cached data changes, so old caches are discarded. */
export const CACHE_BUSTER = 'v1';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Cached data must outlive the persister's maxAge, otherwise it is dropped on restore.
      queries: { gcTime: ONE_WEEK, retry: 1 },
    },
  });
}

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({
    key: 'shooting-clays-cache',
    storage: {
      getItem: (key) => get<string>(key).then((v) => v ?? null),
      setItem: (key, value: string) => set(key, value),
      removeItem: (key) => del(key),
    },
  }),
  maxAge: ONE_WEEK,
  buster: CACHE_BUSTER,
};
