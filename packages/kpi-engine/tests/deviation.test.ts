import { describe, expect, it } from 'vitest';
import { negativeDeviation } from '../src/index';

describe('negativeDeviation', () => {
  it('planned 80 / actual 40 is 50 (UAT scenario 3)', () => {
    expect(negativeDeviation(80, 40)).toBe(50);
  });

  it('is 0 when actual meets or beats plan', () => {
    expect(negativeDeviation(50, 50)).toBe(0);
    expect(negativeDeviation(50, 70)).toBe(0);
  });

  it('is null for a zero or negative baseline', () => {
    expect(negativeDeviation(0, 0)).toBeNull();
    expect(negativeDeviation(0, 40)).toBeNull();
    expect(negativeDeviation(-5, 10)).toBeNull();
  });

  it('is null for a non-numeric baseline', () => {
    expect(negativeDeviation(Number.NaN, 10)).toBeNull();
  });

  it('is 100 when nothing is done against a positive plan', () => {
    expect(negativeDeviation(60, 0)).toBe(100);
  });
});
