import { describe, expect, it } from 'vitest';
import { echo } from '../src/jobs/echo.js';

describe('echo job', () => {
  it('returns the message it was given', async () => {
    expect(await echo({ data: { message: 'hi' } })).toEqual({ echoed: 'hi' });
  });
});
