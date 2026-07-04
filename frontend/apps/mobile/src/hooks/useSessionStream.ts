import { useAuth } from '@superion/auth';
import type { ProcedureTemplate, Session, WsConnectionState } from '@superion/domain';
import { getWsClient, WS_EVENT_PATTERNS } from '@superion/ws-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { applyWsEvent, type VoiceIndicatorMode } from './applyWsEvent';
import {
  addAcceptedPhotoStep,
  setStepThumbnail,
} from './photo_state';

const STREAM_PATTERNS = [
  WS_EVENT_PATTERNS.STEP,
  WS_EVENT_PATTERNS.EVENT_APPENDED,
  WS_EVENT_PATTERNS.PHOTO,
  WS_EVENT_PATTERNS.ASSISTANT,
  WS_EVENT_PATTERNS.REPORT,
  WS_EVENT_PATTERNS.SESSION,
] as const;

export interface SessionStreamState {
  connectionState: WsConnectionState;
  voiceMode: VoiceIndicatorMode;
  showRetryCta: boolean;
  retryConnection: () => void;
}

export function useSessionStream(sessionId: string | undefined): SessionStreamState {
  const queryClient = useQueryClient();
  const { session: authSession } = useAuth();
  const [connectionState, setConnectionState] = useState<WsConnectionState>('closed');
  const [voiceMode, setVoiceMode] = useState<VoiceIndicatorMode>('idle');
  const [showRetryCta, setShowRetryCta] = useState(false);
  const disconnectedAtRef = useRef<number | null>(null);

  const handleEvent = useCallback(
    (event: Parameters<typeof applyWsEvent>[2]) => {
      if (!sessionId) {
        return;
      }

      const currentSession = queryClient.getQueryData<Session>(['session', sessionId]);
      const currentProcedure = queryClient.getQueryData<ProcedureTemplate>([
        'session',
        sessionId,
        'procedure',
      ]);

      const result = applyWsEvent(currentSession ?? undefined, currentProcedure ?? undefined, event);

      if (result.session) {
        queryClient.setQueryData(['session', sessionId], result.session);
      }
      if (result.procedure) {
        queryClient.setQueryData(['session', sessionId, 'procedure'], result.procedure);
      }
      if (result.voiceMode) {
        setVoiceMode(result.voiceMode);
      }
      if (result.acceptedPhotoStepIndex !== null) {
        addAcceptedPhotoStep(queryClient, sessionId, result.acceptedPhotoStepIndex);
      }
      if (result.photoThumbnail) {
        setStepThumbnail(
          queryClient,
          sessionId,
          result.photoThumbnail.stepIndex,
          result.photoThumbnail.url,
        );
      }

      if (event.type.startsWith('assistant.') || event.type.startsWith('report.')) {
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      }
    },
    [queryClient, sessionId],
  );

  const retryConnection = useCallback(() => {
    const ws = getWsClient();
    if (ws.reconnect) {
      void ws.reconnect();
    }
    disconnectedAtRef.current = null;
    setShowRetryCta(false);
  }, []);

  useEffect(() => {
    if (!sessionId || !authSession?.accessToken) {
      return;
    }

    const ws = getWsClient();
    let mounted = true;
    const unsubscribes: Array<() => void> = [];

    const trackDisconnected = (state: WsConnectionState) => {
      if (!mounted) {
        return;
      }

      setConnectionState(state);

      if (state === 'open') {
        disconnectedAtRef.current = null;
        setShowRetryCta(false);
        return;
      }

      if (state === 'reconnecting' || state === 'closed') {
        if (disconnectedAtRef.current === null) {
          disconnectedAtRef.current = Date.now();
        }
      }
    };

    if (ws.onConnectionStateChange) {
      unsubscribes.push(ws.onConnectionStateChange(trackDisconnected));
    }

    for (const pattern of STREAM_PATTERNS) {
      unsubscribes.push(ws.subscribe(pattern, handleEvent));
    }

    void ws.connect(sessionId, authSession.accessToken);

    const retryInterval = window.setInterval(() => {
      if (disconnectedAtRef.current === null) {
        return;
      }
      const elapsed = Date.now() - disconnectedAtRef.current;
      if (elapsed >= 30_000) {
        setShowRetryCta(true);
      }
    }, 1_000);

    return () => {
      mounted = false;
      window.clearInterval(retryInterval);
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
      void ws.disconnect();
      setVoiceMode('idle');
    };
  }, [authSession?.accessToken, handleEvent, sessionId]);

  return {
    connectionState,
    voiceMode,
    showRetryCta,
    retryConnection,
  };
}
