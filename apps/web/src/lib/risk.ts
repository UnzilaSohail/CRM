import type { Severity } from './types';

/** Delivery-risk label shown next to a project, derived from its negative deviation. */
export const riskLabel: Record<Severity, string> = {
  none: 'On Track',
  watch: 'At Risk',
  critical: 'Delayed',
};
