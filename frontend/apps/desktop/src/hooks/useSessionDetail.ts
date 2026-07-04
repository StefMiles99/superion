import { getApiClient } from '@superion/api-client';
import { useAuth } from '@superion/auth';
import type { Session, WsEvent } from '@superion/domain';
import { getWsClient, WS_EVENT_PATTERNS } from '@superion/ws-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STALE_TIME_MS = 5_000;
const EVENTS_PAGE_SIZE = 50;

export function sessionEventsQueryKey(sessionId: string | undefined) {
  return ['session', sessionId, 'events'] as const;
}

export function sessionReportQueryKey(sessionId: string | undefined) {
  return ['session', sessionId, 'report'] as const;
}

function isStreamEvent(event: WsEvent, sessionId: string): boolean {
  if (event.session_id && event.session_id !== sessionId) {
    return false;
  }

  return (
    event.type.startsWith('step.') ||
    event.type.startsWith('photo.') ||
    event.type.startsWith('assistant.') ||
    event.type === 'event.appended' ||
    event.type.startsWith('report.')
  );
}

function mergeEvents(current: WsEvent[], incoming: WsEvent): WsEvent[] {
  if (typeof incoming.seq === 'number') {
    const exists = current.some((item) => item.seq === incoming.seq);
    if (exists) {
      return current;
    }
  }

  return [...current, incoming].sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0));
}

export interface SessionDetailState {
  session: Session | undefined;
  report: import('@superion/domain').MaintenanceReport | undefined;
  events: WsEvent[];
  visibleEvents: WsEvent[];
  hasMoreEvents: boolean;
  selectedSeq: number | null;
  highlightedStepIndex: number | null;
  isLoading: boolean;
  isError: boolean;
  selectEvent: (seq: number | null, stepIndex: number | null) => void;
  loadMoreEvents: () => void;
}

export function useSessionDetail(sessionId: string | undefined): SessionDetailState {
  const queryClient = useQueryClient();
  const { session: authSession, user } = useAuth();
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [highlightedStepIndex, setHighlightedStepIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(EVENTS_PAGE_SIZE);

  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => getApiClient().getSession(sessionId!),
    enabled: Boolean(sessionId && authSession?.accessToken),
    staleTime: STALE_TIME_MS,
  });

  const reportQuery = useQuery({
    queryKey: sessionReportQueryKey(sessionId),
    queryFn: async () => getApiClient().getReport(sessionId!),
    enabled: Boolean(sessionId && authSession?.accessToken),
    staleTime: STALE_TIME_MS,
  });

  const eventsQuery = useQuery({
    queryKey: sessionEventsQueryKey(sessionId),
    queryFn: async () => {
      const api = getApiClient();
      if (api.listSessionEvents) {
        return api.listSessionEvents(sessionId!);
      }
      return [];
    },
    enabled: Boolean(sessionId && authSession?.accessToken),
    staleTime: STALE_TIME_MS,
  });

  const handleWsEvent = useCallback(
    (event: WsEvent) => {
      if (!sessionId || !isStreamEvent(event, sessionId)) {
        return;
      }

      queryClient.setQueryData<WsEvent[]>(sessionEventsQueryKey(sessionId), (current) => {
        const base = current ?? [];
        return mergeEvents(base, event);
      });

      if (event.type.startsWith('assistant.') || event.type.startsWith('report.')) {
        void queryClient.invalidateQueries({ queryKey: sessionReportQueryKey(sessionId) });
      }

      if (event.type.startsWith('step.') || event.type === 'session.paused' || event.type === 'session.resumed') {
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        void queryClient.invalidateQueries({ queryKey: ['activeSessions', user?.plantId] });
      }
    },
    [queryClient, sessionId, user?.plantId],
  );

  useEffect(() => {
    if (!sessionId || !authSession?.accessToken) {
      return;
    }

    const ws = getWsClient();
    const patterns = [
      WS_EVENT_PATTERNS.STEP,
      WS_EVENT_PATTERNS.PHOTO,
      WS_EVENT_PATTERNS.ASSISTANT,
      WS_EVENT_PATTERNS.EVENT_APPENDED,
      WS_EVENT_PATTERNS.REPORT,
      WS_EVENT_PATTERNS.SESSION,
    ] as const;

    const unsubscribes = patterns.map((pattern) => ws.subscribe(pattern, handleWsEvent));

    void ws.connect(sessionId, authSession.accessToken);

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
      void ws.disconnect();
      if (user?.plantId && ws.connectAdmin) {
        void ws.connectAdmin(user.plantId, authSession.accessToken);
      }
    };
  }, [authSession?.accessToken, handleWsEvent, sessionId, user?.plantId]);

  useEffect(() => {
    if (!sessionId || !authSession?.accessToken) {
      return;
    }

    const ws = getWsClient();
    const unsubscribe = ws.subscribe(WS_EVENT_PATTERNS.REPORT, (event) => {
      if (event.type !== 'report.updated' || event.session_id !== sessionId) {
        return;
      }

      void getApiClient()
        .getReport(sessionId)
        .then((report) => {
          queryClient.setQueryData(sessionReportQueryKey(sessionId), report);
        });
    });

    return unsubscribe;
  }, [authSession?.accessToken, queryClient, sessionId]);

  const events = eventsQuery.data ?? [];
  const visibleEvents = useMemo(
    () => events.slice(Math.max(0, events.length - visibleCount)),
    [events, visibleCount],
  );

  const selectEvent = useCallback((seq: number | null, stepIndex: number | null) => {
    setSelectedSeq(seq);
    setHighlightedStepIndex(stepIndex);
  }, []);

  const loadMoreEvents = useCallback(() => {
    setVisibleCount((current) => current + EVENTS_PAGE_SIZE);
  }, []);

  return {
    session: sessionQuery.data,
    report: reportQuery.data,
    events,
    visibleEvents,
    hasMoreEvents: events.length > visibleCount,
    selectedSeq,
    highlightedStepIndex,
    isLoading: sessionQuery.isLoading || reportQuery.isLoading || eventsQuery.isLoading,
    isError: sessionQuery.isError || reportQuery.isError || eventsQuery.isError,
    selectEvent,
    loadMoreEvents,
  };
}
