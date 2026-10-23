import { describe, expect, it } from 'vitest';
import { attendanceRate, onTimeDelivery, utilization } from '../src/index';

const d = (iso: string) => new Date(iso);

describe('onTimeDelivery', () => {
  it('counts tasks completed on or before the due date', () => {
    expect(
      onTimeDelivery([
        { completedAt: d('2026-10-10T10:00:00Z'), dueDate: d('2026-10-10T10:00:00Z') }, // exactly on time
        { completedAt: d('2026-10-09T10:00:00Z'), dueDate: d('2026-10-10T10:00:00Z') },
        { completedAt: d('2026-10-11T10:00:00Z'), dueDate: d('2026-10-10T10:00:00Z') }, // late
        { completedAt: d('2026-10-12T10:00:00Z'), dueDate: d('2026-10-10T10:00:00Z') }, // late
      ]),
    ).toBeCloseTo(50);
  });

  it('is null when nothing was completed in the period', () => {
    expect(onTimeDelivery([])).toBeNull();
  });
});

describe('attendanceRate', () => {
  it('is present / scheduled days', () => {
    expect(attendanceRate(18, 20)).toBeCloseTo(90);
    expect(attendanceRate(0, 20)).toBe(0);
    expect(attendanceRate(20, 20)).toBe(100);
  });

  it('is null when no days were scheduled (e.g. all leave)', () => {
    expect(attendanceRate(0, 0)).toBeNull();
  });

  it('rejects impossible counts', () => {
    expect(() => attendanceRate(21, 20)).toThrow(RangeError);
    expect(() => attendanceRate(-1, 20)).toThrow(RangeError);
  });
});

describe('utilization', () => {
  it('reports overall and billable separately', () => {
    const r = utilization({ productiveHours: 30, billableHours: 20, availableHours: 40 });
    expect(r?.overall).toBeCloseTo(75);
    expect(r?.billable).toBeCloseTo(50);
  });

  it('is null with no available hours', () => {
    expect(utilization({ productiveHours: 0, billableHours: 0, availableHours: 0 })).toBeNull();
  });

  it('rejects billable hours above productive hours', () => {
    expect(() =>
      utilization({ productiveHours: 10, billableHours: 11, availableHours: 40 }),
    ).toThrow(RangeError);
  });
});
