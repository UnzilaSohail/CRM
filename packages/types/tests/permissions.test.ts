import { describe, expect, it } from 'vitest';
import { ROLES, can, INTERNAL_ROLES } from '../src/index.js';

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
