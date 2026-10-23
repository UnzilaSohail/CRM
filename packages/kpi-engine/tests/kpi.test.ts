import { describe, expect, it } from 'vitest';
import {
  actualProgress,
  plannedProgress,
  computeDeviation,
  alertKey,
  shouldRaise,
  localDate,
  isOverdue,
  taskCounts,
  type Milestone,
} from '../src/index.js';

const ms = (weight: number, pct: number, s = '2026-01-01', e = '2026-01-10'): Milestone => ({
  weight,
  percentComplete: pct,
  plannedStart: s,
  plannedEnd: e,
});

describe('progress', () => {
  it('weights milestones', () => expect(actualProgress([ms(75, 100), ms(25, 0)])).toBe(75));
  it('handles zero total weight', () => expect(actualProgress([ms(0, 50)])).toBe(0));
  it('handles no milestones', () => expect(plannedProgress([], '2026-01-05')).toBe(0));
  it('clamps out-of-range completion', () => expect(actualProgress([ms(1, 150)])).toBe(100));
  it('planned is 0 before start and 100 after end', () => {
    expect(plannedProgress([ms(1, 0)], '2025-12-31')).toBe(0);
    expect(plannedProgress([ms(1, 0)], '2026-02-01')).toBe(100);
  });
  it('planned is linear inside the window, inclusive of both ends', () => {
    expect(plannedProgress([ms(1, 0)], '2026-01-05')).toBeCloseTo(50);
    expect(plannedProgress([ms(1, 0)], '2026-01-10')).toBeCloseTo(100);
  });
});

describe('deviation', () => {
  it('UAT: planned 80, actual 40 is 50% negative deviation and critical', () => {
    const d = computeDeviation(80, 40);
    expect(d.negativeDeviation).toBe(50);
    expect(d.severity).toBe('critical');
  });
  it('25-49% is watch', () => {
    expect(computeDeviation(100, 75).severity).toBe('watch');
    expect(computeDeviation(100, 51).severity).toBe('watch');
  });
  it('below 25% is dashboard only', () => expect(computeDeviation(100, 76).severity).toBe('none'));
  it('zero baseline never alerts', () => {
    const d = computeDeviation(0, 0);
    expect(d.negativeDeviation).toBe(0);
    expect(d.severity).toBe('none');
  });
  it('ahead of plan has zero deviation', () =>
    expect(computeDeviation(40, 60).negativeDeviation).toBe(0));
  it('dedupes repeated breaches', () => {
    const k = alertKey({
      subjectId: 'p1',
      baselineVersion: 2,
      severity: 'watch',
      period: '2026-W43',
    });
    const raised = new Set<string>();
    expect(shouldRaise(k, raised)).toBe(true);
    raised.add(k);
    expect(shouldRaise(k, raised)).toBe(false);
  });
});

describe('tasks', () => {
  it('rolls the date over by time zone', () => {
    const t = new Date('2026-10-22T23:30:00Z');
    expect(localDate(t, 'UTC')).toBe('2026-10-22');
    expect(localDate(t, 'Asia/Karachi')).toBe('2026-10-23');
  });
  it('done tasks are never overdue', () =>
    expect(isOverdue({ status: 'done', dueDate: '2020-01-01' }, '2026-01-01')).toBe(false));
  it('counts overdue and ignores cancelled', () => {
    const c = taskCounts(
      [
        { status: 'open', dueDate: '2026-01-01' },
        { status: 'done', dueDate: null },
        { status: 'cancelled', dueDate: '2020-01-01' },
      ],
      '2026-02-01',
    );
    expect(c).toEqual({ total: 2, done: 1, overdue: 1, completionRate: 0.5 });
  });
  it('completion rate is null with no tasks', () =>
    expect(taskCounts([], '2026-01-01').completionRate).toBeNull());
});
