import { jwtClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { APP_PATH } from '../site/routes';

/**
 * Neon Auth (managed Better Auth) is reached through our own origin: `/auth/*` is proxied to the
 * branch's Neon Auth URL (Vite in development, Vercel rewrite in production). The session cookie
 * is therefore first-party, which Safari (ITP) requires. See docs/architecture.md → Authentication.
 */
export const authClient = createAuthClient({
  baseURL: `${window.location.origin}/auth`,
  plugins: [jwtClient()],
});

/** Neon Auth appends this to the callback URL after Google sign-in; it is exchanged for a session. */
const VERIFIER_PARAM = 'neon_auth_session_verifier';

/** Call once before rendering: completes a Google sign-in redirect, if this page load is one. */
export async function completeSignInRedirect() {
  const url = new URL(window.location.href);
  const verifier = url.searchParams.get(VERIFIER_PARAM);
  if (!verifier) return;
  // The exchange sets the (first-party) session cookie; useSession() reads it after render.
  await authClient.$fetch('/get-session', { method: 'GET', query: { [VERIFIER_PARAM]: verifier } });
  url.searchParams.delete(VERIFIER_PARAM);
  window.history.replaceState(window.history.state, '', url.href);
}

export function signInWithGoogle() {
  return authClient.signIn.social({
    provider: 'google',
    callbackURL: `${window.location.origin}${APP_PATH}`,
  });
}

const TOKEN_MARGIN_MS = 60_000;
let cachedToken: { value: string; expiresAt: number } | null = null;

/** JWT for the API (valid 15 minutes); cached and refreshed one minute before it expires. */
export async function getApiToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_MARGIN_MS > Date.now()) return cachedToken.value;
  const { data } = await authClient.token();
  if (!data?.token) {
    cachedToken = null;
    return null;
  }
  cachedToken = { value: data.token, expiresAt: jwtExpiry(data.token) };
  return data.token;
}

export function clearApiToken() {
  cachedToken = null;
}

function jwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}
