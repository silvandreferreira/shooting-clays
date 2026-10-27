import type {
  AccountStatus,
  AdminUser,
  Dashboard,
  Leaderboard,
  LeaderboardQuery,
  Me,
  NotificationList,
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
  me: () => request<Me>('/me'),
  updateProfile: (update: ProfileUpdate) =>
    request<Me>('/me/profile', { method: 'PUT', body: JSON.stringify(update) }),
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
  leaderboard: (query: LeaderboardQuery) => {
    const params = new URLSearchParams(
      Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])),
    );
    return request<Leaderboard>(`/community/leaderboard?${params.toString()}`);
  },
  adminUsers: () => request<AdminUser[]>('/admin/users'),
  setUserStatus: (userId: string, status: AccountStatus) =>
    request<{ userId: string; status: AccountStatus }>(
      `/admin/users/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    ),
  notifications: () => request<NotificationList>('/notifications'),
  /** The list after reading it, or `accountRemoved` when it was the revocation message. */
  readNotification: (id: string) =>
    request<NotificationList | { accountRemoved: true }>(
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: 'POST' },
    ),
  revokeUser: (userId: string, message: string) =>
    request<{ userId: string; status: 'revoked' }>(
      `/admin/users/${encodeURIComponent(userId)}/revoke`,
      { method: 'POST', body: JSON.stringify({ message }) },
    ),
  removeUser: (userId: string) =>
    request<{ removed: true }>(`/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
};
