/**
 * Negative deviation, as a percentage: max(0, (planned - actual) / planned) * 100.
 * Defined only when planned > 0; returns null otherwise (zero baseline = no deviation).
 */
export function negativeDeviation(planned: number, actual: number): number | null {
  if (!(planned > 0)) return null;
  return Math.max(0, (planned - actual) / planned) * 100;
}
