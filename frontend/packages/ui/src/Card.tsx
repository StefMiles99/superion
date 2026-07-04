import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[hsl(217_33%_17%)] bg-[hsl(222_47%_9%)] p-6 text-[hsl(210_40%_98%)] shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
