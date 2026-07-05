import type { IndexStatus, ManualStatus } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { cn } from "@superion/ui";

const INDEX_STYLE: Record<IndexStatus, string> = {
  indexed: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  failed: "bg-rose-500/15 text-rose-300",
};

const MANUAL_STYLE: Record<ManualStatus, string> = {
  active: "bg-sky-500/15 text-sky-300",
  archived: "bg-slate-600/30 text-slate-400",
  indexing: "bg-indigo-500/15 text-indigo-300",
  error: "bg-rose-500/15 text-rose-300",
};

export function ManualStatusBadge({ status }: { status: ManualStatus }) {
  const { t } = useTranslation();
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", MANUAL_STYLE[status])}>
      {t(`manualStatus.${status}`)}
    </span>
  );
}

export function IndexStatusBadge({ status }: { status: IndexStatus }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        INDEX_STYLE[status],
      )}
    >
      {status === "pending" && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
      )}
      {t(`indexStatus.${status}`)}
    </span>
  );
}
