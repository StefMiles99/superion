import type { WorkOrder } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { cn } from "@superion/ui";

const PRIORITY: Record<WorkOrder["priority"], string> = {
  low: "bg-slate-600",
  med: "bg-amber-500",
  high: "bg-rose-500",
};

export function WorkOrderCard({ order, onClick }: { order: WorkOrder; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-3xl bg-slate-900 p-5 text-left ring-1 ring-slate-800 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-slate-400">{order.code}</span>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold text-white", PRIORITY[order.priority])}>
          {t(`priority.${order.priority}`)}
        </span>
      </div>
      <span className="text-xl font-bold text-white">{order.asset.name}</span>
      <span className="text-sm text-slate-400">
        {order.asset.tag} · {order.asset.model}
      </span>
      <span className="mt-1 text-xs text-slate-500">{t(`status.${order.status}`)}</span>
    </button>
  );
}
