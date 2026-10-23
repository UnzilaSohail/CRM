export interface CompletedTask {
  completedAt: Date;
  dueDate: Date;
}

/**
 * On-time delivery (0-100): tasks completed on or before the due date / tasks completed in the
 * period. Pass only tasks completed in the period. Returns null when none were completed.
 */
export function onTimeDelivery(completed: CompletedTask[]): number | null {
  if (completed.length === 0) return null;
  const onTime = completed.filter((t) => t.completedAt.getTime() <= t.dueDate.getTime()).length;
  return (onTime / completed.length) * 100;
}

/** Attendance (0-100): present scheduled days / scheduled working days. Null if none scheduled. */
export function attendanceRate(presentDays: number, scheduledDays: number): number | null {
  if (!(scheduledDays > 0)) return null;
  if (presentDays < 0 || presentDays > scheduledDays) {
    throw new RangeError('presentDays must be between 0 and scheduledDays');
  }
  return (presentDays / scheduledDays) * 100;
}

export interface UtilizationInput {
  productiveHours: number;
  /** Subset of productiveHours that was billable. */
  billableHours: number;
  availableHours: number;
}

/** Utilization (0-100): productive / available hours, with billable reported separately. */
export function utilization(input: UtilizationInput): { overall: number; billable: number } | null {
  const { productiveHours, billableHours, availableHours } = input;
  if (!(availableHours > 0)) return null;
  if (productiveHours < 0 || billableHours < 0 || billableHours > productiveHours) {
    throw new RangeError('billableHours must be between 0 and productiveHours');
  }
  return {
    overall: (productiveHours / availableHours) * 100,
    billable: (billableHours / availableHours) * 100,
  };
}
