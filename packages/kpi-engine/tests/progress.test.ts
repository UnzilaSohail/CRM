import { describe, expect, it } from 'vitest';
import { projectProgress, taskProgress } from '../src/index';

describe('taskProgress', () => {
  it('weights approved progress by estimated effort', () => {
    // (100*2 + 50*6) / 8 = 62.5
    expect(
      taskProgress([
        { progress: 100, estimatedEffort: 2, approved: true },
        { progress: 50, estimatedEffort: 6, approved: true },
      ]),
    ).toBeCloseTo(62.5);
  });

  it('is not a plain average of the percentages', () => {
    const r = taskProgress([
      { progress: 100, estimatedEffort: 1, approved: true },
      { progress: 0, estimatedEffort: 9, approved: true },
    ]);
    expect(r).toBeCloseTo(10);
    expect(r).not.toBeCloseTo(50);
  });

  it('counts unapproved progress as 0 but keeps its effort in the total', () => {
    expect(
      taskProgress([
        { progress: 100, estimatedEffort: 5, approved: true },
        { progress: 100, estimatedEffort: 5, approved: false },
      ]),
    ).toBeCloseTo(50);
  });

  it('is null with no assignments or zero total effort', () => {
    expect(taskProgress([])).toBeNull();
    expect(taskProgress([{ progress: 80, estimatedEffort: 0, approved: true }])).toBeNull();
  });

  it('rejects progress outside 0-100 and negative effort', () => {
    expect(() => taskProgress([{ progress: 101, estimatedEffort: 1, approved: true }])).toThrow(
      RangeError,
    );
    expect(() => taskProgress([{ progress: -1, estimatedEffort: 1, approved: true }])).toThrow(
      RangeError,
    );
    expect(() => taskProgress([{ progress: 10, estimatedEffort: -1, approved: true }])).toThrow(
      RangeError,
    );
  });

  it('rejects NaN progress', () => {
    expect(() =>
      taskProgress([{ progress: Number.NaN, estimatedEffort: 1, approved: true }]),
    ).toThrow(RangeError);
  });
});

describe('projectProgress', () => {
  it('weights milestone completion by milestone weight', () => {
    // 0.6*100 + 0.4*25 = 70
    expect(
      projectProgress([
        { weight: 60, completion: 100 },
        { weight: 40, completion: 25 },
      ]),
    ).toBeCloseTo(70);
  });

  it('normalises weights that do not total 100', () => {
    expect(
      projectProgress([
        { weight: 1, completion: 100 },
        { weight: 1, completion: 0 },
      ]),
    ).toBeCloseTo(50);
  });

  it('is null with no milestones or zero total weight', () => {
    expect(projectProgress([])).toBeNull();
    expect(projectProgress([{ weight: 0, completion: 50 }])).toBeNull();
  });

  it('rejects out-of-range input', () => {
    expect(() => projectProgress([{ weight: 1, completion: 120 }])).toThrow(RangeError);
    expect(() => projectProgress([{ weight: -1, completion: 10 }])).toThrow(RangeError);
  });
});
