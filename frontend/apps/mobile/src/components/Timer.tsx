import { formatDuration } from '@superion/domain';

interface TimerProps {
  seconds: number;
  label: string;
  testId?: string;
}

export function Timer({ seconds, label, testId }: TimerProps) {
  return (
    <span
      className="text-sm tabular-nums text-[hsl(215_20%_65%)]"
      aria-label={label}
      data-testid={testId}
    >
      ⏱ {formatDuration(seconds)}
    </span>
  );
}
