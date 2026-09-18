import type { DestinationStream } from 'pino';
import { createLogger, type Logger } from '../lib/logger';

export interface LogEntry {
  level: number;
  msg?: string;
  req?: { id: string; method: string; url: string };
  res?: { statusCode: number };
  responseTime?: number;
  err?: { message: string; stack?: string };
  [key: string]: unknown;
}

// pino numeric levels
export const LEVEL = { info: 30, warn: 40, error: 50 } as const;

// Test helper: a real pino logger that keeps its output in memory.
export function createLogCapture(level: Parameters<typeof createLogger>[0]['level'] = 'info'): {
  logger: Logger;
  raw: () => string;
  entries: () => LogEntry[];
} {
  const chunks: string[] = [];
  const destination: DestinationStream = {
    write: (chunk) => {
      chunks.push(chunk);
    },
  };

  return {
    logger: createLogger({ level, destination }),
    raw: () => chunks.join(''),
    entries: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as LogEntry),
  };
}
