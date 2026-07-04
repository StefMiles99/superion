import type { ReactNode } from 'react';

import { Button } from './Button';
import { cn } from './cn';

export interface AppShellProps {
  title: string;
  userName?: string;
  logoutLabel: string;
  onLogout?: () => void;
  children: ReactNode;
  className?: string;
}

export function AppShell({
  title,
  userName,
  logoutLabel,
  onLogout,
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col', className)}>
      <header className="flex items-center justify-between border-b border-[hsl(217_33%_17%)] px-4 py-3">
        <h1 className="text-lg font-semibold text-[hsl(210_40%_98%)]">{title}</h1>
        <div className="flex items-center gap-3">
          {userName ? (
            <span className="text-sm text-[hsl(215_20%_65%)]">{userName}</span>
          ) : null}
          {onLogout ? (
            <Button variant="ghost" onClick={onLogout} aria-label={logoutLabel}>
              {logoutLabel}
            </Button>
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
