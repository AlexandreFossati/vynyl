import { z } from 'zod';

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

// Environment values are text: digits only, so forms like "1e3" or " 5" are rejected.
const digits = (message: string) => z.string().regex(/^\d+$/, message).transform(Number);

const integerBetween = (min: number, max: number) => {
  const message = `must be an integer between ${min} and ${max}`;
  return digits(message).pipe(z.int().min(min, message).max(max, message));
};

const integerAtLeast = (min: number) => {
  const message = `must be an integer greater than or equal to ${min}`;
  return digits(message).pipe(z.int().min(min, message));
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: integerBetween(1, 65535).default(3000),
  DATABASE_PATH: z.string().min(1, 'must not be empty').default('./data/app.db'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  RATE_LIMIT_MAX: integerAtLeast(1).default(100),
  RATE_LIMIT_WINDOW_MS: integerAtLeast(1).default(60000),
  // Number of reverse proxies whose X-Forwarded-For is trusted; 0 ignores the header.
  TRUST_PROXY: integerBetween(0, 32).default(0),
});
export type Config = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Fails fast: the message names every invalid variable, so one run is enough to fix them all.
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = envSchema.safeParse(env);
  if (result.success) {
    return result.data;
  }

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join('.');
    const received = env[name];
    return `  - ${name}: ${issue.message}${received === undefined ? '' : ` (received "${received}")`}`;
  });
  throw new ConfigError(`Invalid configuration:\n${problems.join('\n')}`);
}
