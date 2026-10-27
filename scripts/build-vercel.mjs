// Assembles the Vercel deployment in .vercel/output (Build Output API v3) after `pnpm -r build`:
// the web app as static files and the API (with the /auth proxy) as one bundled function in fra1.
// Vercel uses this directory as is; see docs/architecture.md → Hosting.
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const out = new URL('../.vercel/output/', import.meta.url);
const fn = new URL('functions/api.func/', out);

await rm(out, { recursive: true, force: true });
await cp(new URL('../apps/web/dist/', import.meta.url), new URL('static/', out), {
  recursive: true,
});

await build({
  entryPoints: [new URL('../apps/api/src/vercel.ts', import.meta.url).pathname],
  outfile: new URL('index.mjs', fn).pathname,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  // Some dependencies are CommonJS and call require().
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: 'warning',
});

const json = (value) => JSON.stringify(value, null, 2);

// The prerendered public pages (apps/web/scripts/prerender.mjs), e.g. "/", "/en/faq".
const sitePaths = JSON.parse(
  await readFile(new URL('../apps/web/dist-ssr/routes.json', import.meta.url), 'utf8'),
);
const regex = (path) => path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

await writeFile(
  new URL('.vc-config.json', fn),
  json({
    runtime: 'nodejs24.x',
    handler: 'index.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: false,
    supportsResponseStreaming: true,
    // Next to the Neon database (aws eu-central-1).
    regions: ['fra1'],
  }),
);

await mkdir(out, { recursive: true });
await writeFile(
  new URL('config.json', out),
  json({
    version: 3,
    routes: [
      // Hashed file names: safe to cache forever.
      {
        src: '^/assets/(.*)$',
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        continue: true,
      },
      { src: '^/api(/.*)?$', dest: '/api' },
      { src: '^/auth/.*$', dest: '/api' },
      // Bookmarks from before the app moved to /app.
      {
        src: '^/(add|history|community|settings|admin)(/.*)?$',
        status: 308,
        headers: { Location: '/app/$1$2' },
      },
      // The app is a single-page app: every /app path is a client route.
      { src: '^/app(/.*)?$', dest: '/app/index.html' },
      // Public pages: one prerendered file each; a trailing slash is allowed.
      ...sitePaths.map((path) => ({
        src: `^${path === '/' ? '' : regex(path)}/?$`,
        dest: path === '/' ? '/index.html' : `${path}/index.html`,
      })),
      { handle: 'filesystem' },
      { src: '^/.*$', dest: '/404.html', status: 404 },
    ],
  }),
);

console.log('Vercel output ready in .vercel/output');
