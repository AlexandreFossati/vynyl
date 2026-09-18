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
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_WINDOW_MS: 60000,
      TRUST_PROXY: 0,
    });
  });

  it('applies the provided values', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '4000',
      DATABASE_PATH: '/var/data/app.db',
      LOG_LEVEL: 'debug',
      RATE_LIMIT_MAX: '20',
      RATE_LIMIT_WINDOW_MS: '30000',
      TRUST_PROXY: '1',
    });

    expect(config).toEqual({
      NODE_ENV: 'production',
      PORT: 4000,
      DATABASE_PATH: '/var/data/app.db',
      LOG_LEVEL: 'debug',
      RATE_LIMIT_MAX: 20,
      RATE_LIMIT_WINDOW_MS: 30000,
      TRUST_PROXY: 1,
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

describe('loadConfig: rate limit and proxy settings', () => {
  it.each([
    ['RATE_LIMIT_MAX', '0'],
    ['RATE_LIMIT_MAX', 'abc'],
    ['RATE_LIMIT_MAX', ''],
    ['RATE_LIMIT_MAX', '1.5'],
    ['RATE_LIMIT_WINDOW_MS', '0'],
    ['RATE_LIMIT_WINDOW_MS', 'abc'],
    ['RATE_LIMIT_WINDOW_MS', '-5'],
    ['TRUST_PROXY', '-1'],
    ['TRUST_PROXY', '99'],
    ['TRUST_PROXY', 'abc'],
    ['TRUST_PROXY', 'true'],
  ])('rejects %s=%j', (name, value) => {
    expect(messageOf({ [name]: value })).toContain(`${name}:`);
  });

  it('accepts the boundaries', () => {
    const config = loadConfig({
      RATE_LIMIT_MAX: '1',
      RATE_LIMIT_WINDOW_MS: '1',
      TRUST_PROXY: '32',
    });

    expect(config).toMatchObject({ RATE_LIMIT_MAX: 1, RATE_LIMIT_WINDOW_MS: 1, TRUST_PROXY: 32 });
    expect(loadConfig({ TRUST_PROXY: '0' }).TRUST_PROXY).toBe(0);
  });

  it('lists every invalid variable together with the reason', () => {
    const message = messageOf({
      RATE_LIMIT_MAX: '0',
      RATE_LIMIT_WINDOW_MS: 'abc',
      TRUST_PROXY: '99',
    });

    expect(message).toContain('RATE_LIMIT_MAX: must be an integer greater than or equal to 1');
    expect(message).toContain('RATE_LIMIT_WINDOW_MS:');
    expect(message).toContain('TRUST_PROXY: must be an integer between 0 and 32');
  });
});
