import {
  actualProgress,
  localDate,
  plannedProgress,
  taskCounts,
  type Milestone,
  type TaskLike,
} from '@crm/kpi-engine';

export type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface SnapshotInput {
  projectId: string;
  tenantId: string;
  timeZone: string;
  baselineVersion: number;
  milestones: Milestone[];
  tasks: TaskLike[];
}

export interface Snapshot {
  projectId: string;
  tenantId: string;
  period: Period;
  periodStart: string;
  timeZone: string;
  baselineVersion: number;
  planned: number;
  actual: number;
  overdueTasks: number;
  completionRate: number | null;
}

/** First day of the period containing `day` (yyyy-mm-dd); weeks start on Monday. */
export function periodStart(day: string, period: Period): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (period === 'WEEKLY') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (period === 'MONTHLY') d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

/** Pure: one snapshot row. The tenant's time zone, not the server's, decides which day "today" is. */
export function buildSnapshot(i: SnapshotInput, period: Period, now: Date): Snapshot {
  const today = localDate(now, i.timeZone);
  const counts = taskCounts(i.tasks, today);
  return {
    projectId: i.projectId,
    tenantId: i.tenantId,
    period,
    periodStart: periodStart(today, period),
    timeZone: i.timeZone,
    baselineVersion: i.baselineVersion,
    planned: plannedProgress(i.milestones, today),
    actual: actualProgress(i.milestones),
    overdueTasks: counts.overdue,
    completionRate: counts.completionRate,
  };
}
