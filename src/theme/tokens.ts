export const spacing = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
} as const;

export const fontSize = {
  xxs: 10,
  xs: 12,
  sm: 14,
  base: 16,
} as const;

/** System-friendly stacks; host apps can override via theme.fontFamily. */
export const defaultFontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
} as const;
