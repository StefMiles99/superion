export interface ComputeEtaInput {
  currentStepIndex: number;
  totalSteps: number;
  totalActiveSeconds: number;
  avgStepSeconds: number;
  planAvgStepSeconds: number;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function resolveAvgStepSeconds(input: ComputeEtaInput): number {
  if (input.avgStepSeconds > 0) {
    return input.avgStepSeconds;
  }

  const stepsDone = input.currentStepIndex;
  if (stepsDone > 0 && input.totalActiveSeconds > 0) {
    return Math.round(input.totalActiveSeconds / stepsDone);
  }

  return input.planAvgStepSeconds;
}

export function computeEta(input: ComputeEtaInput): number {
  const remainingSteps = Math.max(0, input.totalSteps - input.currentStepIndex);
  if (remainingSteps === 0) {
    return 0;
  }

  const avgStepSeconds = resolveAvgStepSeconds(input);
  return remainingSteps * avgStepSeconds;
}

export function formatEtaLabel(totalSeconds: number): string {
  const minutes = Math.ceil(Math.max(0, totalSeconds) / 60);
  return `ETA ${String(minutes)}m`;
}
