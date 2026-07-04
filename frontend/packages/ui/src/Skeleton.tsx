import type { HTMLAttributes } from 'react';

import { cn } from './cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export function Skeleton({
  className,
  width = '100%',
  height = '1rem',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-[hsl(217_33%_17%)]', className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
