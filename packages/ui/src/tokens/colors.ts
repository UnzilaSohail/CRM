/** Design tokens from the blueprint (section 7). Single source for web and mobile. */
export const colors = {
  navy: '#0C2752',
  action: '#2458E8',
  surface: '#F5F7FB',
  success: '#139A72',
  warning: '#E5A23B',
  danger: '#D84750',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
