import { colors } from './colors';

/** Tailwind preset built from the shared design tokens. */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        navy: colors.navy,
        brand: colors.action,
        action: colors.action,
        surface: colors.surface,
      },
    },
  },
};
