import { formatEtaLabel } from '@superion/domain';

interface EtaBadgeProps {
  etaSeconds: number;
}

export function EtaBadge({ etaSeconds }: EtaBadgeProps) {
  return (
    <span
      className="rounded-full bg-[hsl(215_28%_17%)] px-3 py-1 text-xs font-medium tabular-nums text-[hsl(215_20%_75%)]"
      data-testid="eta"
      aria-live="polite"
    >
      {formatEtaLabel(etaSeconds)}
    </span>
  );
}
