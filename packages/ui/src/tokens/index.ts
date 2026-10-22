/** Design tokens from the spec; consumed by the Tailwind preset. */
export const colors = {
  navy: "#0C2752",
  blue: "#2458E8",
  background: "#F5F7FB",
} as const;

export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        navy: colors.navy,
        brand: colors.blue,
        surface: colors.background,
      },
    },
  },
};
