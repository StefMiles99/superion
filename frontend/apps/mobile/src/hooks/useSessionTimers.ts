import { useEffect, useState } from 'react';

import type { Session } from '@superion/domain';

export interface SessionTimers {
  totalSeconds: number;
  stepSeconds: number;
}

export function useSessionTimers(session: Session | undefined): SessionTimers {
  const [elapsed, setElapsed] = useState(0);
  const baseTotal = session?.metrics.totalActiveSeconds ?? 0;

  useEffect(() => {
    setElapsed(0);
  }, [session?.currentStepIndex, session?.id, session?.metrics.totalActiveSeconds]);

  useEffect(() => {
    if (!session || session.status !== 'active') {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsed((previous) => previous + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [session?.id, session?.status]);

  if (!session) {
    return { totalSeconds: 0, stepSeconds: 0 };
  }

  return {
    totalSeconds: baseTotal + elapsed,
    stepSeconds: elapsed,
  };
}
