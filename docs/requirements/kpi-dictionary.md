# KPI dictionary (draft for sign-off)

Status: **draft, needs product-owner approval before the formulas are treated as final** (requirements doc, section 5). Formulas below are taken from that document. Items marked OPEN are not defined there.

| Metric             | Formula                                                                                                                               | Implemented in                | Notes                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Project progress   | Sum(weight x milestone % complete) / Sum(weight)                                                                                      | `kpi-engine` `actualProgress` | Never an average of unrelated task percentages. Zero total weight gives 0.                     |
| Planned progress   | Per milestone: linear between planned start and end, inclusive of the end date; 0 before start, 100 after end. Weighted the same way. | `plannedProgress`             | OPEN: the spec mentions "plan curves"; linear is the default until other curves are specified. |
| Task progress      | Sum(approved assignment progress x estimated effort) / Sum(estimated effort)                                                          | not yet                       | Needs estimates and the approval flow on assignments.                                          |
| Negative deviation | max(0, (planned - actual) / planned) x 100, only if planned > 0                                                                       | `computeDeviation`            | Zero baseline never alerts.                                                                    |
| On-time delivery   | Tasks completed by due date / tasks completed in the period                                                                           | not yet                       |                                                                                                |
| Attendance         | Present scheduled days / scheduled working days                                                                                       | not yet                       | OPEN: leave and holiday calendar rules.                                                        |
| Utilization        | Tracked productive hours / available scheduled hours                                                                                  | not yet                       | Billable shown separately.                                                                     |
| Overdue tasks      | Open or in-progress tasks with due date before today in the tenant time zone                                                          | `taskCounts`                  |                                                                                                |
| Completion rate    | Done / non-cancelled tasks; null when there are none                                                                                  | `taskCounts`                  |                                                                                                |

## Alert thresholds

| Negative deviation | Behaviour                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| Below 25%          | Dashboard only                                                                  |
| 25-49%             | Watch: employee notification                                                    |
| 50% and above      | Critical: employee and manager notification, audit record, required explanation |

Thresholds are configurable per tenant (`thresholdsInput`, Settings screen). Alerts are deduplicated on (project, baseline version, severity, period).

## Open decisions

- Aggregation weights for employee, project and customer rollups. The source materials disagree, so the scorecard currently uses a simple average for the customer view and says so on screen.
- Whether employee progress needs manager approval before it counts.
- Period boundaries: weeks start Monday, months on the 1st, all in the tenant time zone (assumption).
