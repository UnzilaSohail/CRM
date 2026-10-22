export type Severity = "none" | "warning" | "critical";

export interface DeviationThresholds {
  /** Attainment (actual / planned) below this raises a warning. */
  warning: number;
  /** Attainment below this raises a critical alert. */
  critical: number;
}

export const DEFAULT_THRESHOLDS: DeviationThresholds = { warning: 0.8, critical: 0.5 };

export interface Deviation {
  planned: number;
  actual: number;
  /** actual / planned; null when nothing was planned (zero baseline). */
  attainment: number | null;
  /** planned - actual in percentage points, never negative. */
  gap: number;
  severity: Severity;
}

export function computeDeviation(
  planned: number,
  actual: number,
  thresholds: DeviationThresholds = DEFAULT_THRESHOLDS,
): Deviation {
  const gap = Math.max(0, planned - actual);
  if (planned <= 0) return { planned, actual, attainment: null, gap, severity: "none" };
  const attainment = actual / planned;
  const severity: Severity =
    attainment < thresholds.critical ? "critical" : attainment < thresholds.warning ? "warning" : "none";
  return { planned, actual, attainment, gap, severity };
}

export interface AlertKeyInput {
  subjectId: string;
  baselineVersion: number;
  severity: Exclude<Severity, "none">;
  /** Period bucket, e.g. "2026-W43" or "2026-10-22". */
  period: string;
}

/** Dedupe key: one alert per (subject, baseline version, threshold, period). */
export const alertKey = (i: AlertKeyInput) =>
  `${i.subjectId}:${i.baselineVersion}:${i.severity}:${i.period}`;

/** True when the key has not been raised yet; callers persist the key on true. */
export const shouldRaise = (key: string, raised: ReadonlySet<string>) => !raised.has(key);
