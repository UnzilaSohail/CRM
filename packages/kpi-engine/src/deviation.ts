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
