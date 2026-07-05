import { getApiClient } from '@superion/api-client';
import { trackEvent } from '@superion/telemetry';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

export function useManualSearch(manualId: string | undefined, query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
    };
  }, [query]);

  return useQuery({
    queryKey: ['manualSearch', manualId, debouncedQuery],
    enabled: Boolean(manualId && debouncedQuery.length > 0),
    queryFn: async () => {
      if (!manualId) {
        throw new Error('manualId requerido');
      }
      const result = await getApiClient().searchManual(manualId, debouncedQuery);
      trackEvent('manual_searched', {
        manualId,
        query: debouncedQuery,
        resultCount: result.items.length,
      });
      return result;
    },
  });
}
