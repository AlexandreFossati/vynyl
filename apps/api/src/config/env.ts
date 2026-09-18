import { z } from 'zod';

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const PORT_MESSAGE = 'must be an integer between 1 and 65535';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/, PORT_MESSAGE)
    .transform(Number)
    .pipe(z.int().min(1, PORT_MESSAGE).max(65535, PORT_MESSAGE))
    .default(3000),
  DATABASE_PATH: z.string().min(1, 'must not be empty').default('./data/app.db'),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
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
