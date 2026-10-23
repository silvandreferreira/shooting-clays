import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createAuthProxy } from './auth-proxy';
import { loadConfig } from './config';
import { createServerApp } from './runtime';

const NEON_AUTH_URL = 'https://ep-test.neonauth.example.test/neondb/auth';

/** Fake Neon Auth: records each forwarded request and answers with `response`. */
function fakeNeonAuth(response: () => Response = () => Response.json({ ok: true })) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return response();
  }) as typeof fetch;
  return { calls, fetchFn };
}

function proxyApp(fetchFn: typeof fetch) {
  const app = new Hono();
  app.all('/auth/*', createAuthProxy(NEON_AUTH_URL, fetchFn));
  return app;
}

describe('Neon Auth proxy (/auth/*)', () => {
  it('forwards path and query to the Neon Auth URL of this environment', async () => {
    const { calls, fetchFn } = fakeNeonAuth();
    const res = await proxyApp(fetchFn).request(
      'https://shooting-clays.vercel.app/auth/get-session?disableCookieCache=true',
    );
    expect(res.status).toBe(200);
    expect(calls[0]?.url).toBe(`${NEON_AUTH_URL}/get-session?disableCookieCache=true`);
  });

  it('forwards method, body, cookies and Origin, but not our own hop headers', async () => {
    const { calls, fetchFn } = fakeNeonAuth();
    await proxyApp(fetchFn).request('https://shooting-clays.vercel.app/auth/sign-in/social', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: 'session=abc',
        origin: 'https://shooting-clays.vercel.app',
        'x-forwarded-host': 'shooting-clays.vercel.app',
        'x-vercel-id': 'fra1::xyz',
      },
      body: JSON.stringify({ provider: 'google' }),
    });
    const init = calls[0]!.init;
    const headers = new Headers(init.headers);
    expect(init.method).toBe('POST');
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"provider":"google"}');
    expect(headers.get('cookie')).toBe('session=abc');
    expect(headers.get('origin')).toBe('https://shooting-clays.vercel.app');
    expect(headers.has('x-forwarded-host')).toBe(false);
    expect(headers.has('x-vercel-id')).toBe(false);
    expect(init.redirect).toBe('manual');
  });

  it('returns redirects and every cookie to the browser, scoped to our origin', async () => {
    const { fetchFn } = fakeNeonAuth(() => {
      const headers = new Headers({ location: 'https://accounts.google.com/o/oauth2/auth' });
      headers.append('set-cookie', 'a=1; Domain=neonauth.example.test; Path=/; Secure; HttpOnly');
      headers.append('set-cookie', 'b=2; Path=/; Secure');
      return new Response(null, { status: 302, headers });
    });
    const res = await proxyApp(fetchFn).request('https://shooting-clays.vercel.app/auth/callback');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://accounts.google.com/o/oauth2/auth');
    expect(res.headers.getSetCookie()).toEqual([
      'a=1; Path=/; Secure; HttpOnly',
      'b=2; Path=/; Secure',
    ]);
  });

  it('drops the upstream encoding headers, since the body is already decoded', async () => {
    const { fetchFn } = fakeNeonAuth(
      () =>
        new Response('{}', {
          headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' },
        }),
    );
    const res = await proxyApp(fetchFn).request(
      'https://shooting-clays.vercel.app/auth/get-session',
    );
    expect(res.headers.get('content-encoding')).toBeNull();
    expect(res.headers.get('content-type')).toBe('application/json');
  });

  it('answers 503 UNAVAILABLE when Neon Auth cannot be reached', async () => {
    const fetchFn = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const res = await proxyApp(fetchFn).request(
      'https://shooting-clays.vercel.app/auth/get-session',
    );
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UNAVAILABLE');
  });
});

describe('server app (Vercel and pnpm dev)', () => {
  const config = loadConfig({
    DATABASE_URL: 'postgresql://user:password@db.example.test/neondb',
    NEON_AUTH_URL,
    ADMIN_EMAILS: 'owner@example.test',
  });

  it('serves the API under /api and Neon Auth under /auth', async () => {
    const { calls, fetchFn } = fakeNeonAuth();
    const server = createServerApp(config, fetchFn);

    const health = await server.request('/api/health');
    expect(await health.json()).toEqual({ ok: true });

    await server.request('/auth/get-session');
    expect(calls.map((c) => c.url)).toEqual([`${NEON_AUTH_URL}/get-session`]);
  });

  it('never exposes the test-only routes', async () => {
    const server = createServerApp(config, fakeNeonAuth().fetchFn);
    const res = await server.request('/api/__test__/reset', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
