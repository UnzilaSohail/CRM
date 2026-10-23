import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_TASK_STATUSES,
  INTERNAL_ROLES,
  ROLES,
  TASK_TRANSITIONS,
  canTransitionTask,
  can,
  type TaskStatus,
} from '../src/index.js';

describe('task status transitions', () => {
  it('allows the normal life cycle and reopening', () => {
    expect(canTransitionTask('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionTask('IN_PROGRESS', 'DONE')).toBe(true);
    expect(canTransitionTask('DONE', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionTask('CANCELLED', 'OPEN')).toBe(true);
  });
  it('rejects skipping steps', () => {
    expect(canTransitionTask('OPEN', 'DONE')).toBe(false);
    expect(canTransitionTask('DONE', 'OPEN')).toBe(false);
    expect(canTransitionTask('CANCELLED', 'DONE')).toBe(false);
    expect(canTransitionTask('DONE', 'CANCELLED')).toBe(false);
  });
  it('treats the same status as a no-op', () => {
    for (const s of Object.keys(TASK_TRANSITIONS) as TaskStatus[])
      expect(canTransitionTask(s, s)).toBe(true);
  });
  it('employees can start and pause work but not complete or cancel it', () => {
    expect([...EMPLOYEE_TASK_STATUSES]).toEqual(['OPEN', 'IN_PROGRESS']);
  });
});

describe('attendance permissions', () => {
  it('everyone who works can check in; admins and customers cannot', () => {
    expect(ROLES.filter((r) => can(r, 'attendance:write:self'))).toEqual([
      'CEO',
      'PROJECT_MANAGER',
      'TEAM_LEAD',
      'EMPLOYEE',
    ]);
  });
});

describe('permission matrix', () => {
  it('only the CEO can read costs', () => {
    expect(ROLES.filter((r) => can(r, 'costs:read'))).toEqual(['CEO']);
  });
  it('customers get portal access and nothing internal', () => {
    expect(can('CUSTOMER', 'portal:read')).toBe(true);
    for (const p of [
      'projects:read',
      'tasks:read',
      'attendance:read:self',
      'attendance:read:team',
      'customers:read',
      'portfolio:read',
    ] as const) {
      expect(can('CUSTOMER', p)).toBe(false);
    }
  });
  it('internal roles never receive portal:read', () => {
    for (const r of INTERNAL_ROLES) expect(can(r, 'portal:read')).toBe(false);
  });
  it('employees cannot read team attendance or manage deviations', () => {
    expect(can('EMPLOYEE', 'attendance:read:team')).toBe(false);
    expect(can('EMPLOYEE', 'deviations:manage')).toBe(false);
  });
  it('super admin manages the tenant but cannot see costs', () => {
    expect(can('SUPER_ADMIN', 'admin:manage')).toBe(true);
    expect(can('SUPER_ADMIN', 'costs:read')).toBe(false);
  });
});
