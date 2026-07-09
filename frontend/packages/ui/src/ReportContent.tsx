import { cn } from "./cn";

export interface ReportViewLabels {
  summary: string;
  procedure: string;
  findings: string;
  step: string;
  observations: string;
  noFindings: string;
  statusDone: string;
  statusPending: string;
  statusSkipped: string;
}

export interface ReportViewData {
  header: {
    ot_code: string;
    technician: string;
    asset: string;
    duration_min: number | null;
  };
  summary: string;
  procedure: Array<{
    index: number;
    title: string;
    status: "pending" | "done" | "skipped";
    observations: string[];
    findings: Array<{ text: string; severity: string }>;
  }>;
  findings: Array<{ text: string; step_index: number }>;
}

interface Props {
  report: ReportViewData;
  className?: string;
  labels: ReportViewLabels;
}

export function ReportContent({ report, className, labels }: Props) {
  const { header, summary, procedure, findings } = report;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <header className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
        <p className="font-mono text-sm text-sky-400">{header.ot_code}</p>
        <h2 className="mt-1 text-xl font-bold text-white">{header.asset}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-400">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Técnico</dt>
            <dd className="text-slate-200">{header.technician}</dd>
          </div>
          {header.duration_min != null && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Duración</dt>
              <dd className="text-slate-200">{header.duration_min} min</dd>
            </div>
          )}
        </dl>
      </header>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {labels.summary}
        </h3>
        <p className="rounded-xl bg-slate-900/80 p-4 text-slate-200 leading-relaxed">{summary}</p>
      </section>

      {findings.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {labels.findings}
          </h3>
          <ul className="flex flex-col gap-2">
            {findings.map((f, i) => (
              <li
                key={`${f.step_index}-${i}`}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
              >
                {f.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {labels.procedure}
        </h3>
        <ol className="flex flex-col gap-3">
          {procedure.map((step) => (
            <ProcedureStepRow key={step.index} step={step} labels={labels} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function ProcedureStepRow({
  step,
  labels,
}: {
  step: ReportViewData["procedure"][number];
  labels: ReportViewLabels;
}) {
  const statusLabel =
    step.status === "done"
      ? labels.statusDone
      : step.status === "skipped"
        ? labels.statusSkipped
        : labels.statusPending;

  return (
    <li className="rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-slate-100">
          {labels.step} {step.index + 1}: {step.title}
        </p>
        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
          {statusLabel}
        </span>
      </div>
      {step.observations.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{labels.observations}</p>
          <ul className="mt-1 flex flex-col gap-1">
            {step.observations.map((obs, i) => (
              <li key={i} className="text-sm text-slate-300">
                — {obs}
              </li>
            ))}
          </ul>
        </div>
      )}
      {step.findings.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {step.findings.map((f, i) => (
            <li key={i} className="text-sm text-amber-200/90">
              ⚠ {f.text}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
