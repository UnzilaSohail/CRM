# Permission matrix

Source of truth: `packages/types/src/index.ts` (`ROLE_PERMISSIONS`). The API enforces it deny-by-default (`RolesGuard`) and `apps/api/tests/matrix.test.mjs` checks every role against every endpoint.

| Permission           | CEO | Super Admin | Project Manager | Team Lead | Employee | Customer |
| -------------------- | --- | ----------- | --------------- | --------- | -------- | -------- |
| portfolio:read       | yes |             | yes             |           |          |          |
| customers:read       | yes | yes         | yes             |           |          |          |
| customers:write      | yes |             |                 |           |          |          |
| projects:read        | yes | yes         | yes             | yes       | yes      |          |
| projects:write       | yes |             | yes             |           |          |          |
| tasks:read           | yes | yes         | yes             | yes       | yes      |          |
| tasks:write          | yes |             | yes             | yes       | yes      |          |
| attendance:read:team | yes |             | yes             | yes       |          |          |
| attendance:read:self | yes |             | yes             | yes       | yes      |          |
| deviations:manage    | yes |             | yes             |           |          |          |
| approvals:decide     | yes |             | yes             |           |          |          |
| costs:read           | yes |             |                 |           |          |          |
| admin:manage         |     | yes         |                 |           |          |          |
| portal:read          |     |             |                 |           |          | yes      |

Scope rules the matrix does not capture yet (enforced once data access is wired): project managers and team leads see only assigned projects or teams, employees see only their own tasks and time, Super Admin cannot bypass tenant isolation.
