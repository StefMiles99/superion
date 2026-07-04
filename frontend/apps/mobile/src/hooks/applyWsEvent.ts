import type { ProcedureTemplate, Session, WsEvent } from '@superion/domain';
import type { EventAppendedPayload, StepEnteredPayload } from '@superion/ws-client';

export type VoiceIndicatorMode = 'idle' | 'listening' | 'speaking';

export interface ApplyWsEventResult {
  session: Session | null;
  procedure: ProcedureTemplate | null;
  voiceMode: VoiceIndicatorMode | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseStepEnteredPayload(payload: unknown): StepEnteredPayload | null {
  if (!isRecord(payload) || typeof payload.index !== 'number') {
    return null;
  }

  return {
    index: payload.index,
    title: typeof payload.title === 'string' ? payload.title : '',
    description: typeof payload.description === 'string' ? payload.description : '',
    estimated_minutes:
      typeof payload.estimated_minutes === 'number' ? payload.estimated_minutes : 0,
    critical: payload.critical === true,
    requires_photo: payload.requires_photo === true,
    photo_criteria:
      typeof payload.photo_criteria === 'string' ? payload.photo_criteria : null,
  };
}

function parseEventAppendedPayload(payload: unknown): EventAppendedPayload | null {
  if (!isRecord(payload) || typeof payload.type !== 'string') {
    return null;
  }
  return payload as EventAppendedPayload;
}

export function applyWsEvent(
  session: Session | undefined,
  procedure: ProcedureTemplate | undefined,
  event: WsEvent,
): ApplyWsEventResult {
  if (!session) {
    return { session: null, procedure: null, voiceMode: null };
  }

  let nextSession: Session = session;
  let nextProcedure: ProcedureTemplate | null = procedure ?? null;
  let voiceMode: VoiceIndicatorMode | null = null;

  switch (event.type) {
    case 'step.entered': {
      const payload = parseStepEnteredPayload(event.payload);
      if (!payload) {
        break;
      }
      nextSession = { ...session, currentStepIndex: payload.index };
      if (procedure) {
        nextProcedure = {
          ...procedure,
          steps: procedure.steps.map((step) =>
            step.index === payload.index
              ? {
                  ...step,
                  title: payload.title || step.title,
                  description: payload.description || step.description,
                  estimatedMinutes: payload.estimated_minutes || step.estimatedMinutes,
                  critical: payload.critical,
                  requiresPhoto: payload.requires_photo,
                  photoCriteria: payload.photo_criteria,
                }
              : step,
          ),
        };
      }
      break;
    }
    case 'step.completed':
    case 'step.skipped': {
      if (isRecord(event.payload) && typeof event.payload.index === 'number') {
        const nextIndex = event.payload.index + 1;
        if (procedure && nextIndex < procedure.steps.length) {
          nextSession = { ...session, currentStepIndex: nextIndex };
        }
      }
      break;
    }
    case 'session.paused':
      nextSession = { ...session, status: 'paused' };
      break;
    case 'session.resumed':
      nextSession = { ...session, status: 'active' };
      break;
    case 'session.closed':
      nextSession = { ...session, status: 'finalized', endedAt: new Date().toISOString() };
      break;
    case 'photo.captured':
      nextSession = {
        ...session,
        metrics: {
          ...session.metrics,
          photosCount: session.metrics.photosCount + 1,
        },
      };
      break;
    case 'event.appended': {
      const payload = parseEventAppendedPayload(event.payload);
      if (payload?.type === 'turn.speaker_changed') {
        if (payload.new_speaker === 'agent') {
          voiceMode = 'speaking';
        } else if (payload.new_speaker === 'user') {
          voiceMode = 'listening';
        }
      }
      break;
    }
    default:
      break;
  }

  if (typeof event.seq === 'number' && event.seq >= session.nextSeq) {
    nextSession = { ...nextSession, nextSeq: event.seq + 1 };
  }

  return {
    session: nextSession,
    procedure: nextProcedure,
    voiceMode,
  };
}
