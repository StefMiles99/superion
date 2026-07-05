import { useEffect, type ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeProviderProps {
  theme: ThemeMode;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return <>{children}</>;
}
