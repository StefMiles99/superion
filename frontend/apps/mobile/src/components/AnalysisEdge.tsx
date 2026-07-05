import { useTranslation } from "@superion/i18n";
import { cn } from "@superion/ui";
import type { AnalysisInfo } from "@/stores/session";

const STYLE: Record<string, { bg: string; label: string }> = {
  uploading: { bg: "bg-sky-500", label: "analysis.uploading" },
  analyzing: { bg: "bg-indigo-500", label: "analysis.analyzing" },
  accepted: { bg: "bg-emerald-500", label: "analysis.accepted" },
  rejected: { bg: "bg-rose-500", label: "analysis.rejected" },
};

/** Indicador llamativo en la orilla derecha sobre el análisis de imagen. */
export function AnalysisEdge({ analysis }: { analysis: AnalysisInfo }) {
  const { t } = useTranslation();
  if (analysis.state === "idle") return null;
  const style = STYLE[analysis.state];
  if (!style) return null;
  const busy = analysis.state === "uploading" || analysis.state === "analyzing";

  return (
    <div className="pointer-events-none fixed right-0 top-24 z-40">
      <div
        className={cn(
          "animate-slide-in-right flex items-center gap-2 rounded-l-2xl py-3 pl-4 pr-5 text-white shadow-xl",
          style.bg,
        )}
      >
        <span className={cn("h-3 w-3 rounded-full bg-white", busy && "animate-pulse")} />
        <div className="flex flex-col">
          <span className="text-sm font-bold">{t(style.label as "analysis.uploading")}</span>
          {analysis.feedback && !busy && (
            <span className="max-w-[180px] text-xs opacity-90">{analysis.feedback}</span>
          )}
        </div>
      </div>
    </div>
  );
}
