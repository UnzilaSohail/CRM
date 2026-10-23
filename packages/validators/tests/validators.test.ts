import { describe, expect, it } from 'vitest';
import {
  assigneeInput,
  deviationAckInput,
  messageInput,
  projectInput,
  taskInput,
  taskListQuery,
  taskPatchInput,
  taskProgressInput,
  thresholdsInput,
} from '../src/index.js';

const uuid = '11111111-1111-1111-1111-111111111111';

describe('task validators', () => {
  const base = { projectId: uuid, title: 'Write the spec' };

  it('accepts a minimal task and a dated one', () => {
    expect(taskInput.safeParse(base).success).toBe(true);
    expect(taskInput.safeParse({ ...base, dueDate: '2026-11-05' }).success).toBe(true);
  });
  it('rejects short titles, bad ids and impossible dates', () => {
    expect(taskInput.safeParse({ ...base, title: 'x' }).success).toBe(false);
    expect(taskInput.safeParse({ ...base, projectId: 'nope' }).success).toBe(false);
    for (const dueDate of ['2026-02-30', '2026-13-01', '05/11/2026', '2026-1-1'])
      expect(taskInput.safeParse({ ...base, dueDate }).success, dueDate).toBe(false);
  });
  it('accepts a leap day only in a leap year', () => {
    expect(taskInput.safeParse({ ...base, dueDate: '2028-02-29' }).success).toBe(true);
    expect(taskInput.safeParse({ ...base, dueDate: '2027-02-29' }).success).toBe(false);
  });
  it('patch needs at least one field, and can clear the date or milestone', () => {
    expect(taskPatchInput.safeParse({}).success).toBe(false);
    expect(taskPatchInput.safeParse({ dueDate: null }).success).toBe(true);
    expect(taskPatchInput.safeParse({ milestoneId: null }).success).toBe(true);
    expect(taskPatchInput.safeParse({ status: 'DONE' }).success).toBe(true);
    expect(taskPatchInput.safeParse({ status: 'FINISHED' }).success).toBe(false);
  });
  it('list query defaults the page size and caps it', () => {
    expect(taskListQuery.parse({}).limit).toBe(25);
    expect(taskListQuery.safeParse({ limit: '500' }).success).toBe(false);
    expect(taskListQuery.parse({ limit: '10' }).limit).toBe(10);
  });
  it('assignee must be a uuid', () => {
    expect(assigneeInput.safeParse({ userId: uuid }).success).toBe(true);
    expect(assigneeInput.safeParse({ userId: '1' }).success).toBe(false);
  });
});

describe('validators', () => {
  it('critical acknowledgement requires a cause', () => {
    expect(deviationAckInput.safeParse({ severity: 'critical', cause: '' }).success).toBe(false);
    expect(
      deviationAckInput.safeParse({ severity: 'critical', cause: 'Vendor delay' }).success,
    ).toBe(true);
    expect(deviationAckInput.safeParse({ severity: 'watch' }).success).toBe(true);
  });
  it('thresholds must be ordered', () => {
    expect(thresholdsInput.safeParse({ watch: 25, critical: 50 }).success).toBe(true);
    expect(thresholdsInput.safeParse({ watch: 50, critical: 25 }).success).toBe(false);
  });
  it('messages default to internal', () => {
    expect(messageInput.parse({ body: 'hi' }).internal).toBe(true);
  });
  it('progress is bounded 0..100', () => {
    expect(taskProgressInput.safeParse({ percentComplete: 101 }).success).toBe(false);
    expect(
      taskProgressInput.safeParse({ percentComplete: 40, blocker: 'Waiting on client' }).success,
    ).toBe(true);
  });
  it('rejects a project that ends before it starts', () => {
    const base = {
      name: 'X1',
      customerId: uuid,
      milestones: [
        { name: 'M', weight: 100, plannedStart: '2026-01-01', plannedEnd: '2026-02-01' },
      ],
    };
    expect(
      projectInput.safeParse({ ...base, startDate: '2026-03-01', endDate: '2026-01-01' }).success,
    ).toBe(false);
    expect(
      projectInput.safeParse({ ...base, startDate: '2026-01-01', endDate: '2026-03-01' }).success,
    ).toBe(true);
  });
});
