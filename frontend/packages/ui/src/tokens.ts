export const tokens = {
  colors: {
    background: 'hsl(222 47% 6%)',
    foreground: 'hsl(210 40% 98%)',
    card: 'hsl(222 47% 9%)',
    cardForeground: 'hsl(210 40% 98%)',
    primary: 'hsl(217 91% 60%)',
    primaryForeground: 'hsl(222 47% 6%)',
    muted: 'hsl(217 33% 17%)',
    mutedForeground: 'hsl(215 20% 65%)',
    border: 'hsl(217 33% 17%)',
    ring: 'hsl(217 91% 60%)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.5rem',
      '2xl': '2rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
  },
} as const;

export type ThemeTokens = typeof tokens;
