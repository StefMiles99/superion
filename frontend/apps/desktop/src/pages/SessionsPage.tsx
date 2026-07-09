import { useTranslation } from "@superion/i18n";
import { Spinner } from "@superion/ui";
import { Link } from "react-router-dom";
import { DesktopShell } from "@/components/DesktopShell";
import { useSessions } from "@/hooks/useSessions";

export default function SessionsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSessions();

  return (
    <DesktopShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{t("sessions.title")}</h1>
        <p className="mt-1 text-slate-400">{t("sessions.subtitle")}</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-rose-400">{t("sessions.error")}</p>}

      {data && data.items.length === 0 && (
        <p className="rounded-xl bg-slate-900 p-8 text-center text-slate-400">{t("sessions.empty")}</p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl ring-1 ring-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("sessions.colOt")}</th>
                <th className="px-4 py-3">{t("sessions.colAsset")}</th>
                <th className="px-4 py-3">{t("sessions.colTechnician")}</th>
                <th className="px-4 py-3">{t("sessions.colStatus")}</th>
                <th className="px-4 py-3">{t("sessions.colStarted")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3">
                    <Link
                      to={`/sessions/${item.id}`}
                      className="font-mono font-medium text-sky-400 hover:underline"
                    >
                      {item.work_order_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{item.asset_name}</td>
                  <td className="px-4 py-3 text-slate-300">{item.technician_name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {t(`sessionStatus.${item.status as "active" | "paused" | "finalized" | "aborted"}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(item.started_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DesktopShell>
  );
}
