import type { TranscriptEntry } from "@superion/domain";
import { useTranslation } from "@superion/i18n";
import { cn } from "@superion/ui";

interface Props {
  entries: TranscriptEntry[];
}

export function ConversationTranscript({ entries }: Props) {
  const { t } = useTranslation();

  if (entries.length === 0) return null;

  const recent = entries.slice(-6);

  return (
    <section
      aria-label={t("session.transcript.title")}
      aria-live="polite"
      className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {t("session.transcript.title")}
      </p>
      <ul className="flex flex-col gap-2">
        {recent.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              "text-sm leading-snug",
              entry.speaker === "agent" ? "text-sky-300" : "text-slate-200",
            )}
          >
            <span className="mr-1 font-semibold">
              {entry.speaker === "agent"
                ? t("session.transcript.agent")
                : t("session.transcript.technician")}
              :
            </span>
            {entry.kind === "observation" && (
              <span className="mr-1 text-xs text-slate-500">
                ({t("session.transcript.observation")})
              </span>
            )}
            {entry.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
