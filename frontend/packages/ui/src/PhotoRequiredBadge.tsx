import { cn } from './cn';

export interface PhotoRequiredBadgeProps {
  label: string;
  className?: string;
}

export function PhotoRequiredBadge({ label, className }: PhotoRequiredBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full bg-[hsl(217_91%_60%/0.15)] px-3 py-1 text-xs font-medium text-[hsl(217_91%_70%)]',
        className,
      )}
      data-testid="photo-required-badge"
    >
      {label}
    </span>
  );
}
