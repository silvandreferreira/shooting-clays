// Vercel Functions entry point: Vercel serves the default-exported Hono app.
import { loadConfig } from './config';
import { createNeonApp } from './runtime';

export default createNeonApp(loadConfig());
