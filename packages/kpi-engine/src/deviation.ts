/** none: dashboard only (<25). watch: employee notification (25-49). critical: employee + manager (>=50). */
export type Severity = 'none' | 'watch' | 'critical';

export interface DeviationThresholds {
  /** Negative deviation (percent) at or above which a watch is raised. */
  watch: number;
  /** Negative deviation (percent) at or above which a critical alert is raised. */
  critical: number;
}

export const DEFAULT_THRESHOLDS: DeviationThresholds = { watch: 25, critical: 50 };

export interface Deviation {
  planned: number;
  actual: number;
  /** max(0, (planned - actual) / planned) * 100; 0 when planned <= 0. */
  negativeDeviation: number;
  severity: Severity;
}

export function computeDeviation(
  planned: number,
  actual: number,
  thresholds: DeviationThresholds = DEFAULT_THRESHOLDS,
): Deviation {
  if (planned <= 0) return { planned, actual, negativeDeviation: 0, severity: 'none' };
  const negativeDeviation = Math.max(0, (planned - actual) / planned) * 100;
  const severity: Severity =
    negativeDeviation >= thresholds.critical
      ? 'critical'
      : negativeDeviation >= thresholds.watch
        ? 'watch'
        : 'none';
  return { planned, actual, negativeDeviation, severity };
}

export interface AlertKeyInput {
  subjectId: string;
  baselineVersion: number;
  severity: Exclude<Severity, 'none'>;
  /** Period bucket, e.g. "2026-W43" or "2026-10-22". */
  period: string;
}

/** Dedupe key: one alert per (subject, baseline version, threshold, period). */
export const alertKey = (i: AlertKeyInput) =>
  `${i.subjectId}:${i.baselineVersion}:${i.severity}:${i.period}`;

/** True when the key has not been raised yet; callers persist the key on true. */
export const shouldRaise = (key: string, raised: ReadonlySet<string>) => !raised.has(key);

// --- Percent-based helpers (null when there is no baseline) ---

/**
 * Negative deviation, as a percentage: max(0, (planned - actual) / planned) * 100.
 * Defined only when planned > 0; returns null otherwise (zero baseline = no deviation).
 */
export function negativeDeviation(planned: number, actual: number): number | null {
  if (!(planned > 0)) return null;
  return Math.max(0, (planned - actual) / planned) * 100;
}

export type DeviationLevel = 'none' | 'dashboard' | 'watch' | 'critical';

/**
 * Alert level for a deviation percentage:
 * under 25 dashboard only, 25 up to (not incl.) 50 watch, 50 and above critical.
 * null (no baseline) is 'none'.
 */
export function classifyDeviation(deviation: number | null): DeviationLevel {
  if (deviation === null || Number.isNaN(deviation)) return 'none';
  if (deviation >= 50) return 'critical';
  if (deviation >= 25) return 'watch';
  return 'dashboard';
}
