import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    environment: 'node',
    // PGlite boots a WASM Postgres per test file; give it room on slow CI machines.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
