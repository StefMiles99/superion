import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({
  children,
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-12 min-w-12 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' &&
          'bg-[hsl(217_91%_60%)] text-[hsl(222_47%_6%)] hover:bg-[hsl(217_91%_55%)]',
        variant === 'secondary' &&
          'bg-[hsl(217_33%_17%)] text-[hsl(210_40%_98%)] hover:bg-[hsl(217_33%_22%)]',
        variant === 'ghost' &&
          'bg-transparent text-[hsl(210_40%_98%)] hover:bg-[hsl(217_33%_17%)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
