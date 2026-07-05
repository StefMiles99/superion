import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { create } from 'zustand';

import type { WorkOrderFilter, WorkOrderPriority, WorkOrderStatus } from '@superion/domain';
import {
  parseWorkOrderFilterFromSearchParams,
  serializeWorkOrderFilterToSearchParams,
} from '@superion/domain';

interface WorkOrderFilterState {
  filters: WorkOrderFilter;
  setFilters: (filters: WorkOrderFilter) => void;
  setStatus: (status: WorkOrderStatus | undefined) => void;
  setPriority: (priority: WorkOrderPriority | undefined) => void;
  setQuery: (q: string) => void;
  clearFilters: () => void;
}

export const useWorkOrderFilterStore = create<WorkOrderFilterState>((set, get) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
  setStatus: (status) => {
    const next = { ...get().filters };
    if (status) {
      next.status = status;
    } else {
      delete next.status;
    }
    delete next.cursor;
    set({ filters: next });
  },
  setPriority: (priority) => {
    const next = { ...get().filters };
    if (priority) {
      next.priority = priority;
    } else {
      delete next.priority;
    }
    delete next.cursor;
    set({ filters: next });
  },
  setQuery: (q) => {
    const next = { ...get().filters };
    const trimmed = q.trim();
    if (trimmed) {
      next.q = trimmed;
    } else {
      delete next.q;
    }
    delete next.cursor;
    set({ filters: next });
  },
  clearFilters: () => set({ filters: {} }),
}));

export function useWorkOrderFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useWorkOrderFilterStore((state) => state.filters);
  const setFilters = useWorkOrderFilterStore((state) => state.setFilters);
  const setStatus = useWorkOrderFilterStore((state) => state.setStatus);
  const setPriority = useWorkOrderFilterStore((state) => state.setPriority);
  const setQuery = useWorkOrderFilterStore((state) => state.setQuery);
  const clearFilters = useWorkOrderFilterStore((state) => state.clearFilters);

  useEffect(() => {
    setFilters(parseWorkOrderFilterFromSearchParams(searchParams));
  }, [searchParams, setFilters]);

  const syncToUrl = useCallback(
    (nextFilters: WorkOrderFilter) => {
      const params = serializeWorkOrderFilterToSearchParams(nextFilters);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const updateStatus = useCallback(
    (status: WorkOrderStatus | undefined) => {
      setStatus(status);
      const next = { ...useWorkOrderFilterStore.getState().filters };
      syncToUrl(next);
    },
    [setStatus, syncToUrl],
  );

  const updatePriority = useCallback(
    (priority: WorkOrderPriority | undefined) => {
      setPriority(priority);
      const next = { ...useWorkOrderFilterStore.getState().filters };
      syncToUrl(next);
    },
    [setPriority, syncToUrl],
  );

  const updateQuery = useCallback(
    (q: string) => {
      setQuery(q);
      const next = { ...useWorkOrderFilterStore.getState().filters };
      syncToUrl(next);
    },
    [setQuery, syncToUrl],
  );

  const resetFilters = useCallback(() => {
    clearFilters();
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [clearFilters, setSearchParams]);

  return {
    filters,
    setStatus: updateStatus,
    setPriority: updatePriority,
    setQuery: updateQuery,
    clearFilters: resetFilters,
  };
}
