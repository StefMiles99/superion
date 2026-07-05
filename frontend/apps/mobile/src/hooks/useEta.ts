import { useMemo } from 'react';

import { computeEta } from '@superion/domain';
import type { ProcedureTemplate, Session } from '@superion/domain';

export function useEta(
  session: Session | undefined,
  procedure: ProcedureTemplate | undefined,
  totalActiveSeconds: number,
): number {
  return useMemo(() => {
    if (!session || !procedure || procedure.steps.length === 0) {
      return 0;
    }

    const planAvgStepSeconds = Math.round(
      (procedure.estimatedMinutes * 60) / procedure.steps.length,
    );

    return computeEta({
      currentStepIndex: session.currentStepIndex,
      totalSteps: procedure.steps.length,
      totalActiveSeconds,
      avgStepSeconds: session.metrics.avgStepSeconds,
      planAvgStepSeconds,
    });
  }, [
    procedure,
    session?.currentStepIndex,
    session?.metrics.avgStepSeconds,
    totalActiveSeconds,
  ]);
}
