export interface Milestone {
  /** Relative weight; need not sum to 100. */
  weight: number;
  /** Actual completion, 0..100. */
  percentComplete: number;
  /** ISO dates (yyyy-mm-dd) the milestone is planned to start and finish. */
  plannedStart: string;
  plannedEnd: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const DAY_MS = 86_400_000;
const toDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Weighted actual progress (0..100). Zero total weight yields 0, never NaN. */
export function actualProgress(milestones: readonly Milestone[]): number {
  const total = milestones.reduce((s, m) => s + Math.max(0, m.weight), 0);
  if (total === 0) return 0;
  const done = milestones.reduce(
    (s, m) => s + Math.max(0, m.weight) * clamp(m.percentComplete, 0, 100),
    0,
  );
  return done / total;
}

/** Linear planned progress of one milestone on `asOf` (yyyy-mm-dd), 0..100. */
export function plannedMilestoneProgress(m: Milestone, asOf: string): number {
  const start = toDay(m.plannedStart);
  const end = toDay(m.plannedEnd);
  const now = toDay(asOf);
  if (now < start) return 0;
  if (now > end) return 100;
  // Inclusive day count: the end date itself counts as a full working day.
  return ((now - start + DAY_MS) / (end - start + DAY_MS)) * 100;
}

/** Weighted planned progress (0..100) on `asOf`. */
export function plannedProgress(milestones: readonly Milestone[], asOf: string): number {
  const total = milestones.reduce((s, m) => s + Math.max(0, m.weight), 0);
  if (total === 0) return 0;
  const planned = milestones.reduce(
    (s, m) => s + Math.max(0, m.weight) * plannedMilestoneProgress(m, asOf),
    0,
  );
  return planned / total;
}
