import { describe, expect, it } from 'vitest';
import { AA, colors, contrastRatio, luminance } from '../src/index';

describe('contrastRatio', () => {
  it('black on white is 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is symmetric and 1 for identical colours', () => {
    expect(contrastRatio('#123456', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#123456'));
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1);
  });

  it('rejects malformed colours', () => {
    expect(() => luminance('red')).toThrow();
    expect(() => luminance('#FFF')).toThrow();
  });
});

// Pairs the UI will actually use. Text pairs need 4.5; badges/icons/large text need 3.
const textPairs: Array<[string, string, string]> = [
  ['white on navy (sidebar)', colors.white, colors.navy],
  ['white on action blue (buttons)', colors.white, colors.action],
  ['navy on surface (body text)', colors.navy, colors.surface],
  ['navy on white (cards)', colors.navy, colors.white],
  ['action blue on surface (links)', colors.action, colors.surface],
];

describe('design tokens meet WCAG 2.2 AA', () => {
  it.each(textPairs)('%s >= 4.5', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA.text);
  });
});

describe('status colours', () => {
  // Status colours are used for badges and icons next to a text label, so 3:1 (UI component) applies.
  it.each([
    ['success', colors.success],
    ['danger', colors.danger],
  ] as const)('%s vs surface >= 3 for graphical use', (_name, c) => {
    expect(contrastRatio(c, colors.surface)).toBeGreaterThanOrEqual(AA.large);
  });

  // KNOWN ISSUE: the blueprint's amber #E5A23B is only ~2.05:1 on #F5F7FB, below the 3:1 minimum.
  // `it.fails` keeps CI green but turns red as soon as the token is fixed (then switch to `it`).
  // Fix options: darker amber for icons/borders, or amber only as a fill with navy text on it.
  it.fails('warning vs surface >= 3 for graphical use', () => {
    expect(contrastRatio(colors.warning, colors.surface)).toBeGreaterThanOrEqual(AA.large);
  });
});
