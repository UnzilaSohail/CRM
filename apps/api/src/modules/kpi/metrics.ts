import {
  actualProgress,
  computeDeviation,
  localDate,
  plannedProgress,
  type Milestone,
} from '@crm/kpi-engine';

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export interface MilestoneRow {
  weight: { toString(): string } | number;
  percentComplete: { toString(): string } | number;
  plannedStart: Date;
  plannedEnd: Date;
}

export const toEngineMilestone = (m: MilestoneRow): Milestone => ({
  weight: Number(m.weight),
  percentComplete: Number(m.percentComplete),
  plannedStart: isoDay(m.plannedStart),
  plannedEnd: isoDay(m.plannedEnd),
});

/** Planned vs actual and deviation as of "today" in the tenant time zone. */
export function projectMetrics(milestones: MilestoneRow[], timeZone: string, now = new Date()) {
  const today = localDate(now, timeZone);
  const ms = milestones.map(toEngineMilestone);
  return { today, ...computeDeviation(plannedProgress(ms, today), actualProgress(ms)) };
}
