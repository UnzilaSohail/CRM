import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0C2752', 700: '#14366C', 800: '#0C2752', 900: '#081B3A' },
        brand: { DEFAULT: '#2458E8', 50: '#EAF0FE', 600: '#1D49C4' },
        action: '#2458E8',
        surface: '#F5F7FB',
        success: { DEFAULT: '#139A72', 50: '#E3F5EF' },
        warning: { DEFAULT: '#E5A23B', 50: '#FDF3E1' },
        danger: { DEFAULT: '#D84750', 50: '#FBE9EA' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'] },
      screens: { md: '768px', xl: '1440px' },
    },
  },
  plugins: [],
};
export default config;
