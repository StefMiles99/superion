import { cn } from './cn';

export interface CriticalBadgeProps {
  label: string;
  className?: string;
}

export function CriticalBadge({ label, className }: CriticalBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full bg-[hsl(0_84%_60%/0.15)] px-3 py-1 text-xs font-medium text-[hsl(0_84%_70%)]',
        className,
      )}
      data-testid="critical-badge"
    >
      {label}
    </span>
  );
}
