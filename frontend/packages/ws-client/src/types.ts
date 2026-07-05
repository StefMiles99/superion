import type { WsEvent } from '@superion/domain';

export type SessionWsEvent = WsEvent & {
  seq: number;
  session_id: string;
  created_at: string;
};

export interface StepEnteredPayload {
  index: number;
  title: string;
  description: string;
  estimated_minutes: number;
  critical: boolean;
  requires_photo: boolean;
  photo_criteria: string | null;
}

export interface StepCompletedPayload {
  index: number;
  duration_seconds: number;
  completed_by: 'voice' | 'command';
}

export interface StepSkippedPayload {
  index: number;
  reason: string;
}

export interface SessionPausedPayload {
  reason: 'user' | 'system' | 'error';
}

export interface PhotoCapturedPayload {
  photo_id: string;
  step_index: number;
  thumbnail_url: string;
}

export interface PhotoValidatedPayload {
  photo_id: string;
  step_index: number;
  feedback: string;
  caption: string;
}

export interface PhotoRejectedPayload {
  photo_id: string;
  step_index: number;
  feedback: string;
  retries: number;
  max_retries: number;
}

export interface AssistantAnsweringPayload {
  step_index: number;
  query: string;
}

export interface AssistantAnsweredPayload {
  step_index: number;
  query: string;
  answer_text: string;
  citations: Array<{
    manual_id: string;
    manual_version: number;
    page: number;
    section_path: string;
    chunk_id: string;
    snippet: string;
  }>;
  confidence: number;
}

export interface ReportUpdatedPayload {
  report_id: string;
  version: number;
  diff: {
    summary_changed: boolean;
    step_index: number;
    added_event_seq: number;
  };
}

export interface EventAppendedPayload {
  type: string;
  event_id?: string;
  step_index?: number;
  new_speaker?: 'user' | 'agent';
  text?: string;
  [key: string]: unknown;
}

export interface CatchUpEventItem {
  seq: number;
  type: string;
  session_id: string;
  step_index?: number;
  payload: unknown;
  created_at: string;
}

export interface CatchUpResponse {
  items: CatchUpEventItem[];
  next_cursor: string | null;
}

export const WS_EVENT_PATTERNS = {
  STEP: 'step.*',
  PHOTO: 'photo.*',
  ASSISTANT: 'assistant.*',
  REPORT: 'report.*',
  EVENT_APPENDED: 'event.appended',
  SESSION: 'session.*',
  ADMIN_SESSIONS: 'session.*',
} as const;

export const WS_ADMIN_CHANNEL = 'admin:sessions' as const;
