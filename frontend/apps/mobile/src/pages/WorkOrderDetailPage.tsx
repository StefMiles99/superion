import { useTranslation } from "@superion/i18n";
import { Button, Screen, Spinner } from "@superion/ui";
import { useNavigate, useParams } from "react-router-dom";
import { useStartSession, useWorkOrder } from "@/hooks/useWorkOrders";

export default function WorkOrderDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading } = useWorkOrder(id);
  const startSession = useStartSession();

  if (isLoading || !order) {
    return (
      <Screen className="items-center justify-center">
        <Spinner />
      </Screen>
    );
  }

  return (
    <Screen className="pt-6">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 self-start text-slate-400">
        ← {t("common.back")}
      </button>

      <span className="font-mono text-sm text-slate-500">{order.code}</span>
      <h1 className="text-3xl font-bold text-white">{order.asset.name}</h1>
      <p className="text-slate-400">
        {order.asset.tag} · {order.asset.model}
      </p>

      <dl className="mt-6 flex flex-col gap-4">
        <Field label={t("workOrderDetail.procedure")} value={order.procedure_name ?? "—"} />
        {order.estimated_minutes != null && (
          <Field
            label={t("workOrderDetail.estimated")}
            value={t("workOrderDetail.minutes", { count: order.estimated_minutes })}
          />
        )}
        {order.description && (
          <Field label={t("workOrderDetail.description")} value={order.description} />
        )}
        {order.notes && <Field label={t("workOrderDetail.notes")} value={order.notes} />}
      </dl>

      <div className="mt-auto pb-6 pt-8">
        {startSession.isError && (
          <p className="mb-3 text-center text-sm text-rose-400">{t("workOrderDetail.startError")}</p>
        )}
        <Button onClick={() => startSession.mutate(order.id)} disabled={startSession.isPending}>
          {startSession.isPending ? t("workOrderDetail.starting") : t("workOrderDetail.start")}
        </Button>
      </div>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-100">{value}</dd>
    </div>
  );
}
