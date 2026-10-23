// Local server (pnpm dev, E2E). Loads the repository's .env if present.
import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config';
import { createServerApp } from './runtime';

try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // No .env file: rely on the environment.
}

const config = loadConfig();
// Imported only in E2E mode, so normal runs never load PGlite or the test routes.
const app = config.e2e
  ? await (await import('./e2e-runtime')).createE2eApp(config)
  : createServerApp(config);
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}/api (${config.env})`);
});
