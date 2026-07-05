import type { ProcedureStep } from "@superion/domain";
import { stepProgress } from "@superion/domain";
import { useTranslation } from "@superion/i18n";

interface StepBannerProps {
  step: ProcedureStep | undefined;
  currentIndex: number;
  total: number;
}

export function StepBanner({ step, currentIndex, total }: StepBannerProps) {
  const { t } = useTranslation();
  if (!step) return null;
  const progress = stepProgress(currentIndex, total);

  return (
    <div className="rounded-3xl bg-slate-900/80 p-5 shadow-lg ring-1 ring-slate-800">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
        <span>{t("session.step", { current: currentIndex + 1, total })}</span>
        <div className="flex gap-2">
          {step.critical && (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300">
              {t("session.critical")}
            </span>
          )}
          {step.requires_photo && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
              {t("session.photoRequired")}
            </span>
          )}
        </div>
      </div>
      <h2 className="text-2xl font-bold leading-tight text-white">{step.title}</h2>
      <p className="mt-1 text-slate-300">{step.description}</p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
