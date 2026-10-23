import type { Context } from 'hono';

// Request headers that describe our hop, not the browser: Neon Auth must not see them (the Vite dev
// proxy does not send them either), or it could build its own URLs from our host.
const DROPPED_REQUEST_HEADERS =
  /^(host|connection|accept-encoding|content-length|forwarded|x-forwarded-.*|x-real-ip|x-vercel-.*)$/i;
// fetch() already decoded the body, so its encoding and length no longer apply.
const DROPPED_RESPONSE_HEADERS =
  /^(connection|content-encoding|content-length|transfer-encoding|set-cookie)$/i;

/**
 * Handler for `/auth/*`: forwards to this environment's Neon Auth (NEON_AUTH_URL), so the browser
 * keeps Neon Auth's session cookie first-party (decision #41). Production and previews each reach
 * their own Neon branch. Never logs headers or bodies (cookies, tokens).
 */
export function createAuthProxy(neonAuthUrl: string, fetchFn: typeof fetch = fetch) {
  return async (c: Context) => {
    const url = new URL(c.req.url);
    const target = `${neonAuthUrl}${url.pathname.replace(/^\/auth/, '')}${url.search}`;

    const headers = new Headers();
    c.req.raw.headers.forEach((value, name) => {
      if (!DROPPED_REQUEST_HEADERS.test(name)) headers.set(name, value);
    });
    const hasBody = c.req.method !== 'GET' && c.req.method !== 'HEAD';

    let upstream: Response;
    try {
      upstream = await fetchFn(target, {
        method: c.req.method,
        headers,
        body: hasBody ? await c.req.raw.arrayBuffer() : undefined,
        // OAuth redirects go back to the browser, never followed here.
        redirect: 'manual',
      });
    } catch {
      return c.json(
        { error: { code: 'UNAVAILABLE', message: 'Sign-in service unreachable', details: {} } },
        503,
      );
    }

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      if (!DROPPED_RESPONSE_HEADERS.test(name)) responseHeaders.set(name, value);
    });
    // Cookies belong to our origin, not to Neon's host.
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append('set-cookie', cookie.replace(/;\s*domain=[^;]*/i, ''));
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  };
}
