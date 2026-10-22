import {
  actualProgress, alertKey, computeDeviation, plannedProgress, shouldRaise,
  type DeviationThresholds, type Milestone,
} from "@crm/kpi-engine";

export interface ProjectInput {
  id: string;
  name: string;
  tenantId: string;
  baselineVersion: number;
  milestones: Milestone[];
  employeeIds: string[];
  managerIds: string[];
}

export interface AlertToRaise {
  tenantId: string;
  projectId: string;
  severity: "watch" | "critical";
  dedupeKey: string;
  baselineVersion: number;
  planned: number;
  actual: number;
  negativeDeviation: number;
  recipients: string[];
  /** Critical alerts need an audit record and a required explanation. */
  requiresExplanation: boolean;
  writeAudit: boolean;
  message: string;
}

/**
 * Decide which alert a project should raise right now.
 *  - watch (25-49%): employees only
 *  - critical (>=50%): employees + managers, audit record, explanation required
 * Alerts already raised for the same (project, baseline, severity, period) are skipped, so repeated
 * recomputes never double-notify. Zero-baseline projects never alert.
 */
export function evaluateProject(
  p: ProjectInput,
  today: string,
  period: string,
  alreadyRaised: ReadonlySet<string>,
  thresholds?: DeviationThresholds,
): AlertToRaise | null {
  const planned = plannedProgress(p.milestones, today);
  const actual = actualProgress(p.milestones);
  const d = computeDeviation(planned, actual, thresholds);
  if (d.severity === "none") return null;

  const key = alertKey({ subjectId: p.id, baselineVersion: p.baselineVersion, severity: d.severity, period });
  if (!shouldRaise(key, alreadyRaised)) return null;

  const critical = d.severity === "critical";
  return {
    tenantId: p.tenantId,
    projectId: p.id,
    severity: d.severity,
    dedupeKey: key,
    baselineVersion: p.baselineVersion,
    planned,
    actual,
    negativeDeviation: d.negativeDeviation,
    recipients: critical ? [...new Set([...p.employeeIds, ...p.managerIds])] : [...p.employeeIds],
    requiresExplanation: critical,
    writeAudit: critical,
    message: `${p.name}: planned ${planned.toFixed(0)}%, actual ${actual.toFixed(0)}% (${d.negativeDeviation.toFixed(0)}% behind)`,
  };
}
