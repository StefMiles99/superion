import { cn } from "./cn";

export interface TranscriptLine {
  id: string;
  speaker: "technician" | "agent";
  text: string;
  kind: "utterance" | "observation" | "answer";
}

interface Props {
  entries: TranscriptLine[];
  className?: string;
  labels: {
    title: string;
    technician: string;
    agent: string;
    observation: string;
    empty: string;
  };
  full?: boolean;
}

export function ConversationLog({ entries, className, labels, full = false }: Props) {
  const visible = full ? entries : entries.slice(-12);

  if (entries.length === 0) {
    return <p className={cn("text-sm text-slate-500", className)}>{labels.empty}</p>;
  }

  return (
    <section className={cn("rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800", className)}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {labels.title}
      </h3>
      <ul className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto">
        {visible.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              "text-sm leading-relaxed",
              entry.speaker === "agent" ? "text-sky-300" : "text-slate-200",
            )}
          >
            <span className="mr-1 font-semibold">
              {entry.speaker === "agent" ? labels.agent : labels.technician}:
            </span>
            {entry.kind === "observation" && (
              <span className="mr-1 text-xs text-slate-500">({labels.observation})</span>
            )}
            {entry.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
