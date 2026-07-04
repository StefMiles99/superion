import type { FormHTMLAttributes, ReactNode } from 'react';

import { cn } from './cn';

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

export function Form({ children, className, ...props }: FormProps) {
  return (
    <form className={cn('flex w-full flex-col gap-4', className)} {...props}>
      {children}
    </form>
  );
}
