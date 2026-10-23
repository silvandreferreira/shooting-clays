import { waitUntil } from '@vercel/functions';
import type { Config } from './config';

type Level = 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

export interface Logger {
  log(level: Level, fields: LogFields): void;
}

/**
 * Structured JSON logger: one line per event on the console, and shipped to Better Stack
 * when LOGS_SOURCE_TOKEN is set. Callers must never pass secrets, emails or session notes.
 */
export function createLogger(
  config: Pick<Config, 'env' | 'release' | 'logsSourceToken' | 'logsIngestUrl'>,
  write: (line: string) => void = (line) => console.log(line),
): Logger {
  return {
    log(level, fields) {
      const entry = {
        level,
        time: new Date().toISOString(),
        ...fields,
        env: config.env,
        release: config.release,
      };
      write(JSON.stringify(entry));
      if (config.logsSourceToken) {
        // waitUntil keeps the serverless function alive until the log is shipped.
        waitUntil(
          fetch(config.logsIngestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.logsSourceToken}`,
            },
            body: JSON.stringify({ ...entry, dt: entry.time, message: fields.message ?? '' }),
          }).catch(() => undefined),
        );
      }
    },
  };
}

export const silentLogger: Logger = { log: () => undefined };
