import { pino, type DestinationStream, type Logger } from 'pino';
import type { LogLevel } from '../config/env';

export type { Logger };

// `destination` lets tests capture what would be written to stdout.
export function createLogger(options: {
  level: LogLevel;
  destination?: DestinationStream;
}): Logger {
  const { level, destination } = options;
  return destination ? pino({ level }, destination) : pino({ level });
}
