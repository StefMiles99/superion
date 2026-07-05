import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "ghost" | "danger" | "surface";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-sky-500 text-white active:bg-sky-600 disabled:bg-slate-700",
  ghost: "bg-transparent text-slate-200 border border-slate-700 active:bg-slate-800",
  danger: "bg-rose-500/90 text-white active:bg-rose-600",
  surface: "bg-slate-800 text-slate-100 active:bg-slate-700",
};

/** Botón grande, táctil, estilizado. Base de la UX mobile-first. */
export function Button({
  variant = "primary",
  fullWidth = true,
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-semibold",
        "transition-transform active:scale-[0.98] disabled:opacity-60",
        fullWidth && "w-full",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
