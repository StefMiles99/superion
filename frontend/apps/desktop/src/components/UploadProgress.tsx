import type { UploadProgressPhase } from '@superion/domain';
import { useTranslation } from 'react-i18next';

interface UploadProgressProps {
  phase: UploadProgressPhase;
  errorMessage?: string | null;
}

const PHASE_ORDER: UploadProgressPhase[] = [
  'pending',
  'uploading',
  'indexing',
  'indexed',
  'error',
];

function phaseIndex(phase: UploadProgressPhase): number {
  if (phase === 'idle') {
    return -1;
  }
  return PHASE_ORDER.indexOf(phase);
}

export function UploadProgress({ phase, errorMessage }: UploadProgressProps) {
  const { t } = useTranslation();

  if (phase === 'idle') {
    return null;
  }

  const currentIndex = phaseIndex(phase);
  const progressPercent =
    phase === 'indexed'
      ? 100
      : phase === 'error'
        ? 100
        : Math.max(10, Math.round(((currentIndex + 1) / 4) * 100));

  const labelKey =
    phase === 'error'
      ? 'manuals.upload.progress.error'
      : (`manuals.upload.progress.${phase}` as const);

  return (
    <div className="mt-4" aria-live="polite" data-testid="upload-progress">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>{t(labelKey, { defaultValue: labelKey })}</span>
        <span className="tabular-nums text-[hsl(215_20%_65%)]">{progressPercent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[hsl(217_33%_17%)]"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={
            phase === 'error'
              ? 'h-full bg-[hsl(0_84%_60%)] transition-all duration-300'
              : 'h-full bg-[hsl(217_91%_60%)] transition-all duration-300'
          }
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {phase === 'error' && errorMessage ? (
        <p className="mt-2 text-sm text-[hsl(0_84%_60%)]" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
