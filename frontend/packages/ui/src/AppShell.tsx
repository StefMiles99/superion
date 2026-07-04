import type { ReactNode } from 'react';

import { Button } from './Button';
import { cn } from './cn';

export interface AppShellProps {
  title: string;
  userName?: string;
  logoutLabel?: string;
  onLogout?: () => void;
  backLabel?: string;
  onBack?: () => void;
  headerActions?: ReactNode;
  headerMeta?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppShell({
  title,
  userName,
  logoutLabel,
  onLogout,
  backLabel,
  onBack,
  headerActions,
  headerMeta,
  children,
  className,
}: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col', className)}>
      <header className="border-b border-[hsl(217_33%_17%)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {onBack ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 shrink-0 px-2"
                onClick={onBack}
                aria-label={backLabel ?? 'Volver'}
              >
                ◀
              </Button>
            ) : null}
            <h1 className="truncate text-lg font-semibold text-[hsl(210_40%_98%)]">{title}</h1>
            {headerMeta ? (
              <span className="shrink-0 text-sm text-[hsl(215_20%_65%)]">{headerMeta}</span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            {userName ? (
              <span className="hidden text-sm text-[hsl(215_20%_65%)] sm:inline">{userName}</span>
            ) : null}
            {onLogout && logoutLabel ? (
              <Button variant="ghost" onClick={onLogout} aria-label={logoutLabel}>
                {logoutLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
