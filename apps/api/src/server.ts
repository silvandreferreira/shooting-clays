// Local server (pnpm dev, E2E). Loads the repository's .env if present.
import { serve } from '@hono/node-server';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config';
import { createE2eApp, createNeonApp } from './runtime';

try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // No .env file: rely on the environment.
}

const config = loadConfig();
const app = config.e2e ? await createE2eApp(config) : createNeonApp(config);
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}/api (${config.env})`);
});
