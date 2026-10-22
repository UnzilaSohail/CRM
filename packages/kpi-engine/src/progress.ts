function assertPercent(value: number, label: string): void {
  if (!(value >= 0 && value <= 100)) {
    throw new RangeError(`${label} must be between 0 and 100, got ${value}`);
  }
}

export interface AssignmentProgress {
  /** 0-100 as reported by the assignee. */
  progress: number;
  /** Estimated effort (hours or points); only the ratio between assignments matters. */
  estimatedEffort: number;
  /** Only approved progress counts; unapproved progress counts as 0 but keeps its weight. */
  approved: boolean;
}

/**
 * Task progress: sum(approved progress x effort) / sum(effort). Returns null if total effort is 0.
 * Unrounded; round only for display.
 */
export function taskProgress(assignments: AssignmentProgress[]): number | null {
  let weighted = 0;
  let total = 0;
  for (const a of assignments) {
    assertPercent(a.progress, 'progress');
    if (!(a.estimatedEffort >= 0)) throw new RangeError('estimatedEffort must be >= 0');
    total += a.estimatedEffort;
    if (a.approved) weighted += a.progress * a.estimatedEffort;
  }
  return total === 0 ? null : weighted / total;
}

export interface MilestoneProgress {
  /** Milestone weight; weights are normalised, so they need not total 100. */
  weight: number;
  /** 0-100 completion of this milestone. */
  completion: number;
}

/**
 * Project progress: weighted milestone completion, never a plain average of task percentages.
 * Returns null if total weight is 0.
 */
export function projectProgress(milestones: MilestoneProgress[]): number | null {
  let weighted = 0;
  let total = 0;
  for (const m of milestones) {
    assertPercent(m.completion, 'completion');
    if (!(m.weight >= 0)) throw new RangeError('weight must be >= 0');
    weighted += m.completion * m.weight;
    total += m.weight;
  }
  return total === 0 ? null : weighted / total;
}
