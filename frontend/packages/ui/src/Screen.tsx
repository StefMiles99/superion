import type { ReactNode } from "react";
import { cn } from "./cn";

interface ScreenProps {
  children: ReactNode;
  className?: string;
}

/** Contenedor de pantalla mobile-first con safe-areas y ancho máximo. */
export function Screen({ children, className }: ScreenProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-slate-950 text-slate-100">
      <div
        className={cn(
          "flex w-full max-w-[440px] flex-col px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="loading"
      className={cn(
        "h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400",
        className,
      )}
    />
  );
}
