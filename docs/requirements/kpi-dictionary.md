# KPI dictionary (draft for sign-off)

Status: **approved by the team on 2026-10-24** because the stakeholder delegated the decision (see `docs/decisions/0002-team-decisions.md`). Revisit if the stakeholder later disagrees. Formulas below are taken from that document. Items marked OPEN are not defined there.

| Metric             | Formula                                                                                                                               | Implemented in                | Notes                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Project progress   | Sum(weight x milestone % complete) / Sum(weight)                                                                                      | `kpi-engine` `actualProgress` | Never an average of unrelated task percentages. Zero total weight gives 0.                     |
| Planned progress   | Per milestone: linear between planned start and end, inclusive of the end date; 0 before start, 100 after end. Weighted the same way. | `plannedProgress`             | OPEN: the spec mentions "plan curves"; linear is the default until other curves are specified. |
| Task progress      | Sum(approved assignment progress x estimated effort) / Sum(estimated effort)                                                          | `taskProgress`                | Function done; the DB still lacks effort estimates and the approval flow on assignments.       |
| Negative deviation | max(0, (planned - actual) / planned) x 100, only if planned > 0                                                                       | `computeDeviation`            | Zero baseline never alerts.                                                                    |
| On-time delivery   | Tasks completed by due date / tasks completed in the period                                                                           | `onTimeDelivery`              | Function done; not yet wired to snapshots.                                                     |
| Attendance         | Present scheduled days / scheduled working days                                                                                       | `attendanceRate`              | Function done. Leave and holiday calendar rules still need a calendar.                         |
| Utilization        | Tracked productive hours / available scheduled hours                                                                                  | `utilization`                 | Function done. Billable shown separately (needs a billable flag on time entries).              |
| Overdue tasks      | Open or in-progress tasks with due date before today in the tenant time zone                                                          | `taskCounts`                  |                                                                                                |
| Completion rate    | Done / non-cancelled tasks; null when there are none                                                                                  | `taskCounts`                  |                                                                                                |

## Alert thresholds

| Negative deviation | Behaviour                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| Below 25%          | Dashboard only                                                                  |
| 25-49%             | Watch: employee notification                                                    |
| 50% and above      | Critical: employee and manager notification, audit record, required explanation |

Thresholds are configurable per tenant (`thresholdsInput`, Settings screen). Alerts are deduplicated on (project, baseline version, severity, period).

## Decisions (2026-10-24, team, stakeholder delegated)

- Rollup weights: project progress uses the milestone weights set by the project manager; the customer view is a simple average of that customer's projects and the screen says so.
- Employee progress counts only after a lead or manager approves it.
- Period boundaries: weeks start Monday, months on the 1st, all in the tenant time zone.
- Plan curve: linear between each milestone's planned start and end until another curve is requested.
- Still open (needs a calendar, not a decision): leave and public-holiday rules for the attendance rate.
