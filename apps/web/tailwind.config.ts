import type { Config } from 'tailwindcss';

// Colours come from the blueprint's design tokens (section 7). Moves to packages/ui in CRM-32.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0C2752',
        action: '#2458E8',
        surface: '#F5F7FB',
        success: '#139A72',
        warning: '#E5A23B',
        danger: '#D84750',
      },
    },
  },
};

export default config;
