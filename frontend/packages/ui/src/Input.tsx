import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, hasError = false, type = 'text', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'min-h-12 w-full rounded-md border bg-[hsl(222_47%_8%)] px-3 py-2 text-sm text-[hsl(210_40%_98%)]',
        'placeholder:text-[hsl(215_20%_55%)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(217_91%_60%)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        hasError
          ? 'border-[hsl(0_72%_51%)]'
          : 'border-[hsl(217_33%_22%)] focus-visible:border-[hsl(217_91%_60%)]',
        className,
      )}
      {...props}
    />
  );
});
