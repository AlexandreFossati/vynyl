import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './env';

const messageOf = (env: NodeJS.ProcessEnv): string => {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) {
      return error.message;
    }
    throw error;
  }
  throw new Error('expected loadConfig to throw a ConfigError');
};

describe('loadConfig', () => {
  it('uses the defaults when no variable is defined', () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_PATH: './data/app.db',
      LOG_LEVEL: 'info',
    });
  });

  it('applies the provided values', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '4000',
      DATABASE_PATH: '/var/data/app.db',
      LOG_LEVEL: 'debug',
    });

    expect(config).toEqual({
      NODE_ENV: 'production',
      PORT: 4000,
      DATABASE_PATH: '/var/data/app.db',
      LOG_LEVEL: 'debug',
    });
  });

  it('ignores variables it does not know', () => {
    expect(loadConfig({ PATH: '/usr/bin', HOME: '/home/me' }).PORT).toBe(3000);
  });

  it('accepts the boundaries of the port range', () => {
    expect(loadConfig({ PORT: '1' }).PORT).toBe(1);
    expect(loadConfig({ PORT: '65535' }).PORT).toBe(65535);
  });

  describe('rejects', () => {
    it.each(['abc', '0', '70000', '', '3000.5', '-1', ' 3000', '1e3'])('PORT=%j', (port) => {
      expect(messageOf({ PORT: port })).toContain('PORT');
    });

    it('LOG_LEVEL=verbose', () => {
      expect(messageOf({ LOG_LEVEL: 'verbose' })).toContain('LOG_LEVEL');
    });

    it('NODE_ENV=staging', () => {
      expect(messageOf({ NODE_ENV: 'staging' })).toContain('NODE_ENV');
    });

    it('an empty DATABASE_PATH', () => {
      expect(messageOf({ DATABASE_PATH: '' })).toContain('DATABASE_PATH');
    });
  });

  it('lists every invalid variable together with the reason', () => {
    const message = messageOf({ PORT: 'abc', LOG_LEVEL: 'verbose' });

    expect(message).toContain('PORT: must be an integer between 1 and 65535 (received "abc")');
    expect(message).toContain('LOG_LEVEL:');
    expect(message).toContain('(received "verbose")');
  });

  it('throws a readable message without stack frames', () => {
    const message = messageOf({ PORT: 'abc' });

    expect(message.startsWith('Invalid configuration:')).toBe(true);
    expect(message).not.toMatch(/\n\s+at /);
  });
});
