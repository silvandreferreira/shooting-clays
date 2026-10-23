import { authClient } from './auth';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  /** Google profile photo URL, if any. */
  image: string | null;
}

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: CurrentUser };

const LAST_USER_KEY = 'shooting-clays-user';

function readLastUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(LAST_USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

function writeLastUser(user: CurrentUser | null) {
  try {
    if (user) localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(LAST_USER_KEY);
  } catch {
    // Storage unavailable (private mode): offline start just won't know the user.
  }
}

/**
 * Who is signed in. When the auth service cannot be reached (offline), the last signed-in user is
 * assumed so the dashboard still opens from that user's cache; the API still requires a token.
 */
export function useAuthState(): AuthState {
  const { data, isPending, error } = authClient.useSession();
  if (data) {
    const user = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      image: data.user.image ?? null,
    };
    const last = readLastUser();
    if (last?.id !== user.id || last.name !== user.name || last.image !== user.image) {
      writeLastUser(user);
    }
    return { status: 'signedIn', user };
  }
  if (isPending) return { status: 'loading' };
  if (error) {
    const last = readLastUser();
    if (last) return { status: 'signedIn', user: last };
    return { status: 'signedOut' };
  }
  // The auth service answered "no session": nobody is signed in on this device any more.
  writeLastUser(null);
  return { status: 'signedOut' };
}

/** First word of the display name, for "Welcome, <first name>". */
export const firstName = (displayName: string) => displayName.trim().split(/\s+/)[0] ?? '';
