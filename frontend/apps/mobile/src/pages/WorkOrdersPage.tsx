import { useAuthStore } from "@superion/auth";
import { useTranslation } from "@superion/i18n";
import { Screen, Spinner } from "@superion/ui";
import { useNavigate } from "react-router-dom";
import { WorkOrderCard } from "@/components/WorkOrderCard";
import { useLogout } from "@/hooks/useAuth";
import { useWorkOrders } from "@/hooks/useWorkOrders";

export default function WorkOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data, isLoading, isError } = useWorkOrders();

  return (
    <Screen className="pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{t("workOrders.greeting", { name: user?.full_name ?? "" })}</p>
          <h1 className="text-2xl font-bold text-white">{t("workOrders.title")}</h1>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200"
        >
          {t("workOrders.logout")}
        </button>
      </header>

      {isLoading && (
        <div className="mt-20 flex justify-center">
          <Spinner />
        </div>
      )}
      {isError && <p className="mt-10 text-center text-rose-400">{t("workOrders.error")}</p>}

      <div className="flex flex-col gap-4">
        {data?.items.map((order) => (
          <WorkOrderCard
            key={order.id}
            order={order}
            onClick={() => navigate(`/work-orders/${order.id}`)}
          />
        ))}
        {data && data.items.length === 0 && (
          <p className="mt-10 text-center text-slate-500">{t("workOrders.empty")}</p>
        )}
      </div>
    </Screen>
  );
}
