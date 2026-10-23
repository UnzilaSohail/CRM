import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env';

describe('parseEnv', () => {
  it('applies defaults', () => {
    expect(parseEnv({})).toEqual({ NODE_ENV: 'development', PORT: 3001 });
  });

  it('coerces PORT from a string', () => {
    expect(parseEnv({ PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a bad PORT with a readable message', () => {
    expect(() => parseEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => parseEnv({ PORT: '70000' })).toThrow(/PORT/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => parseEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
