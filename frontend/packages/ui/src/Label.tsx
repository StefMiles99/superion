import type { LabelHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label
      className={cn('mb-1 block text-sm font-medium text-[hsl(210_40%_98%)]', className)}
      {...props}
    >
      {children}
    </label>
  );
}
