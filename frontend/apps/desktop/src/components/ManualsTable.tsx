import type { Manual } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { useManualActions } from "@/hooks/useManuals";
import { IndexStatusBadge, ManualStatusBadge } from "./StatusBadge";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function ManualsTable({ manuals }: { manuals: Manual[] }) {
  const { t } = useTranslation();
  const { reindex, archive } = useManualActions();

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">{t("manuals.colTitle")}</th>
            <th className="px-4 py-3">{t("manuals.colModel")}</th>
            <th className="px-4 py-3">{t("manuals.colVersion")}</th>
            <th className="px-4 py-3">{t("manuals.colStatus")}</th>
            <th className="px-4 py-3">{t("manuals.colIndex")}</th>
            <th className="px-4 py-3">{t("manuals.colChunks")}</th>
            <th className="px-4 py-3">{t("manuals.colUploaded")}</th>
            <th className="px-4 py-3 text-right">{t("manuals.colActions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {manuals.map((m) => (
            <tr key={m.id} className="bg-slate-950 hover:bg-slate-900/50">
              <td className="px-4 py-3 font-medium text-white">{m.title}</td>
              <td className="px-4 py-3 text-slate-300">{m.asset_model}</td>
              <td className="px-4 py-3 text-slate-400">v{m.version}</td>
              <td className="px-4 py-3">
                <ManualStatusBadge status={m.status} />
              </td>
              <td className="px-4 py-3">
                <IndexStatusBadge status={m.index_status} />
              </td>
              <td className="px-4 py-3 text-slate-400">{m.chunk_count}</td>
              <td className="px-4 py-3 text-slate-400">{fmtDate(m.uploaded_at)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={m.index_status === "pending" || reindex.isPending}
                    onClick={() => reindex.mutate(m.id)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                  >
                    {t("manuals.reindex")}
                  </button>
                  <button
                    type="button"
                    disabled={m.status === "archived" || archive.isPending}
                    onClick={() => {
                      if (confirm(t("manuals.archiveConfirm"))) archive.mutate(m.id);
                    }}
                    className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/25 disabled:opacity-40"
                  >
                    {t("manuals.archive")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
