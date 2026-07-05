import type { AssistantAnsweredPayload } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { useEffect, useState } from "react";

/** Muestra la última respuesta del asistente; se autooculta. */
export function AssistantHint({ answer }: { answer: AssistantAnsweredPayload | null }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!answer) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 9000);
    return () => clearTimeout(timer);
  }, [answer]);

  if (!answer || !visible) return null;

  return (
    <div className="animate-slide-in-right rounded-3xl bg-indigo-950/90 p-4 ring-1 ring-indigo-500/40">
      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
        {t("assistant.title")}
      </span>
      <p className="mt-1 text-slate-100">{answer.answer_text}</p>
      {answer.citations.length > 0 && (
        <p className="mt-2 text-xs text-indigo-300/80">
          {t("assistant.sources")}: {answer.citations
            .map((c) => c.section_path ?? `p.${c.page ?? "?"}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
