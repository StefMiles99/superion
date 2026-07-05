import { useCallback, useMemo, useState } from 'react';

import type { ActiveSessionsFilter, SessionStatus } from '@superion/domain';

export function useDashboardFilters() {
  const [filters, setFilters] = useState<ActiveSessionsFilter>({});

  const setStatus = useCallback((status: SessionStatus | undefined) => {
    setFilters((current) => {
      const next = { ...current };
      if (status) {
        next.status = status;
      } else {
        delete next.status;
      }
      return next;
    });
  }, []);

  const setTechnicianId = useCallback((technicianId: string | undefined) => {
    setFilters((current) => {
      const next = { ...current };
      if (technicianId) {
        next.technicianId = technicianId;
      } else {
        delete next.technicianId;
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return useMemo(
    () => ({
      filters,
      setStatus,
      setTechnicianId,
      clearFilters,
    }),
    [clearFilters, filters, setStatus, setTechnicianId],
  );
}
