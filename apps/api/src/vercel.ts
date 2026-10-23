// Vercel Function entry point, bundled by scripts/build-vercel.mjs. Serves `/api/*` and `/auth/*`.
import { getRequestListener } from '@hono/node-server';
import { loadConfig } from './config';
import { createServerApp } from './runtime';

export default getRequestListener(createServerApp(loadConfig()).fetch);
