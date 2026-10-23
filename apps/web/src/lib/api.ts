import type {
  Dashboard,
  Profile,
  ProfileUpdate,
  Session,
  SessionInput,
  SessionsQuery,
} from '@shooting-clays/shared';
import { clearApiToken, getApiToken } from './auth';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function send(path: string, init: RequestInit | undefined) {
  const token = await getApiToken();
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in required');
  return fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401) {
    // The cached JWT may have expired early (e.g. clock skew): fetch a fresh one and retry once.
    clearApiToken();
    res = await send(path, init);
  }
  const body = (await res.json().catch(() => null)) as
    (T & { error?: { code: string; message: string } }) | null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? `Request failed (${res.status})`,
    );
  }
  return body as T;
}

export interface SessionMutationResult {
  session: Session;
  dashboard: Dashboard;
}

export const api = {
  profile: () => request<Profile>('/me/profile'),
  updateProfile: (update: ProfileUpdate) =>
    request<Profile>('/me/profile', { method: 'PUT', body: JSON.stringify(update) }),
  dashboard: () => request<Dashboard>('/dashboard'),
  sessions: (query: SessionsQuery = {}) => {
    const params = new URLSearchParams(
      Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])),
    );
    const qs = params.toString();
    return request<Session[]>(`/sessions${qs ? `?${qs}` : ''}`);
  },
  createSession: (input: SessionInput) =>
    request<SessionMutationResult>('/sessions', { method: 'POST', body: JSON.stringify(input) }),
  updateSession: (id: string, input: SessionInput) =>
    request<SessionMutationResult>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteSession: (id: string) =>
    request<{ dashboard: Dashboard }>(`/sessions/${id}`, { method: 'DELETE' }),
};
