import type {
  AssistantAnsweredPayload,
  PhotoRejectedPayload,
  PhotoValidatedPayload,
  StepEnteredPayload,
  TranscriptEntry,
  WsEvent,
} from "@superion/domain";
import { useEffect } from "react";
import { useServices } from "@/services/context";
import { useSessionStore } from "@/stores/session";

/** Suscribe la sesión al stream de eventos WS y actualiza el store de UI. */
export function useSessionEvents(sessionId: string): void {
  const { ws } = useServices();

  useEffect(() => {
    const store = useSessionStore.getState();

    const dispatchReplay = (evt: WsEvent) => {
      if (evt.type === "replay.batch") {
        const payload = evt.payload;
        if (isRecord(payload) && Array.isArray(payload.items)) {
          for (const item of payload.items) {
            if (isWsEvent(item)) dispatchEvent(item);
          }
        }
        return;
      }
      dispatchEvent(evt);
    };

    const sub = ws.subscribe(sessionId, store.lastSeq, {
      onEvent: (evt) => {
        if (typeof evt.seq === "number") useSessionStore.getState().setLastSeq(evt.seq);
        dispatchReplay(evt);
      },
      onStatus: (status) => useSessionStore.getState().setWsStatus(status),
    });

    return () => sub.close();
  }, [ws, sessionId]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWsEvent(value: unknown): value is WsEvent {
  return isRecord(value) && typeof value.type === "string";
}

function appendFromAppended(evt: WsEvent): void {
  const payload = evt.payload;
  if (!isRecord(payload)) return;

  const innerType = payload.type;
  const text = payload.text;
  if (typeof innerType !== "string" || typeof text !== "string") return;

  const stepIndex = typeof payload.step_index === "number" ? payload.step_index : 0;
  const eventId = typeof payload.event_id === "string" ? payload.event_id : `seq-${evt.seq ?? 0}`;

  if (innerType === "utterance") {
    const speakerRaw = payload.speaker;
    const speaker = speakerRaw === "agent" ? "agent" : "technician";
    const entry: TranscriptEntry = {
      id: eventId,
      speaker,
      text,
      stepIndex,
      kind: "utterance",
      createdAt: evt.created_at,
    };
    useSessionStore.getState().appendTranscript(entry);
    return;
  }

  if (innerType === "observation") {
    const entry: TranscriptEntry = {
      id: eventId,
      speaker: "technician",
      text,
      stepIndex,
      kind: "observation",
      createdAt: evt.created_at,
    };
    useSessionStore.getState().appendTranscript(entry);
  }
}

function dispatchEvent(evt: WsEvent): void {
  const s = useSessionStore.getState();
  switch (evt.type) {
    case "session.started":
      s.setStatus("active");
      break;
    case "session.paused":
      s.setStatus("paused");
      break;
    case "session.resumed":
      s.setStatus("active");
      break;
    case "session.closed":
      s.setStatus("finalized");
      break;
    case "step.entered": {
      const p = evt.payload as unknown as StepEnteredPayload;
      s.setStep(p.index);
      s.setAnalysis({ state: "idle" });
      break;
    }
    case "photo.captured":
      s.setAnalysis({ state: "analyzing" });
      break;
    case "photo.validated": {
      const p = evt.payload as unknown as PhotoValidatedPayload;
      s.setAnalysis({ state: "accepted", feedback: p.caption ?? p.feedback });
      break;
    }
    case "photo.rejected": {
      const p = evt.payload as unknown as PhotoRejectedPayload;
      s.setAnalysis({ state: "rejected", feedback: p.feedback });
      break;
    }
    case "assistant.answered": {
      const p = evt.payload as unknown as AssistantAnsweredPayload;
      s.setAnswer(p);
      s.appendTranscript({
        id: `answer-${evt.seq ?? 0}`,
        speaker: "agent",
        text: p.answer_text,
        stepIndex: p.step_index,
        kind: "answer",
        createdAt: evt.created_at,
      });
      break;
    }
    case "event.appended":
      appendFromAppended(evt);
      break;
    default:
      break;
  }
}
