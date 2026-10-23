# Permission matrix

Source of truth: `packages/types/src/index.ts` (`ROLE_PERMISSIONS`). The API enforces it deny-by-default (`RolesGuard`) and `apps/api/tests/matrix.test.mjs` checks every role against every endpoint.

| Permission            | CEO | Super Admin | Project Manager | Team Lead | Employee | Customer |
| --------------------- | --- | ----------- | --------------- | --------- | -------- | -------- |
| portfolio:read        | yes |             | yes             |           |          |          |
| customers:read        | yes | yes         | yes             |           |          |          |
| customers:write       | yes |             |                 |           |          |          |
| projects:read         | yes | yes         | yes             | yes       | yes      |          |
| projects:write        | yes |             | yes             |           |          |          |
| tasks:read            | yes | yes         | yes             | yes       | yes      |          |
| tasks:write           | yes |             | yes             | yes       | yes      |          |
| attendance:read:team  | yes |             | yes             | yes       |          |          |
| attendance:read:self  | yes |             | yes             | yes       | yes      |          |
| attendance:write:self | yes |             | yes             | yes       | yes      |          |
| deviations:manage     | yes |             | yes             |           |          |          |
| approvals:decide      | yes |             | yes             |           |          |          |
| costs:read            | yes |             |                 |           |          |          |
| admin:manage          |     | yes         |                 |           |          |          |
| portal:read           |     |             |                 |           |          | yes      |

## Task rules (provisional, enforced by `TasksController`)

- Employees see and update only tasks assigned to them; a task they cannot see answers 404, not 403.
- Employees may set OPEN or IN_PROGRESS. Completing or cancelling needs a team lead, project manager or CEO (the spec's "manager approves completion"). Employees cannot rename, re-date or re-assign.
- Creating tasks and changing assignees: CEO, project manager, team lead. Assignees must be active internal users; customers can never be assigned.
- Status moves follow `TASK_TRANSITIONS` in `@crm/types`; skipping steps (for example OPEN to DONE) is rejected.
- Every change writes an audit event (`task.create`, `task.status`, `task.update`, `task.assign`, `task.unassign`).
- Check-in and check-out use the tenant calendar day, allow one check-in per person per day, and are audited.

Scope rules the matrix does not capture yet (enforced once data access is wired): project managers and team leads see only assigned projects or teams, employees see only their own tasks and time, Super Admin cannot bypass tenant isolation.

- Time entries: log only on a task you are assigned to (anything else is 404), at most 24 hours per person per day, no future days, no cancelled tasks. Leads and managers may read anyone's time; employees only their own. Responses never include cost.
