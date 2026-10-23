import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createLogger } from './logger';

describe('request logging', () => {
  it('writes one JSON line per request with route, status and duration', async () => {
    const lines: string[] = [];
    const logger = createLogger(
      { env: 'test', release: 'abc', logsSourceToken: undefined, logsIngestUrl: '' },
      (line) => lines.push(line),
    );
    const app = createApp({ db: {} as never, now: () => new Date(), logger });
    await app.request('/api/health');
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!);
    expect(entry).toMatchObject({
      level: 'info',
      method: 'GET',
      route: '/api/health',
      status: 200,
      env: 'test',
      release: 'abc',
    });
    expect(typeof entry.durationMs).toBe('number');
    expect(entry.requestId).toBeTruthy();
  });
});
