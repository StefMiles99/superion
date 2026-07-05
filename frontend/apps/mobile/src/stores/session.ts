import type {
  AssistantAnsweredPayload,
  ProcedureStep,
  SessionStatus,
  TranscriptEntry,
  WsStatus,
} from "@superion/domain";
import { create } from "zustand";

export type AnalysisState = "idle" | "uploading" | "analyzing" | "accepted" | "rejected";

export interface AnalysisInfo {
  state: AnalysisState;
  feedback?: string;
}

interface SessionUiState {
  steps: ProcedureStep[];
  currentStepIndex: number;
  status: SessionStatus | "connecting";
  wsStatus: WsStatus;
  analysis: AnalysisInfo;
  lastAnswer: AssistantAnsweredPayload | null;
  transcript: TranscriptEntry[];
  lastSeq: number;

  setSteps: (steps: ProcedureStep[]) => void;
  setStep: (index: number) => void;
  setStatus: (status: SessionStatus | "connecting") => void;
  setWsStatus: (status: WsStatus) => void;
  setAnalysis: (info: AnalysisInfo) => void;
  setAnswer: (answer: AssistantAnsweredPayload | null) => void;
  appendTranscript: (entry: TranscriptEntry) => void;
  setLastSeq: (seq: number) => void;
  reset: () => void;
}

const initial = {
  steps: [] as ProcedureStep[],
  currentStepIndex: 0,
  status: "connecting" as SessionStatus | "connecting",
  wsStatus: "connecting" as WsStatus,
  analysis: { state: "idle" } as AnalysisInfo,
  lastAnswer: null as AssistantAnsweredPayload | null,
  transcript: [] as TranscriptEntry[],
  lastSeq: 0,
};

export const useSessionStore = create<SessionUiState>((set) => ({
  ...initial,
  setSteps: (steps) => set({ steps }),
  setStep: (index) => set({ currentStepIndex: index }),
  setStatus: (status) => set({ status }),
  setWsStatus: (wsStatus) => set({ wsStatus }),
  setAnalysis: (analysis) => set({ analysis }),
  setAnswer: (lastAnswer) => set({ lastAnswer }),
  appendTranscript: (entry) =>
    set((state) => ({ transcript: [...state.transcript, entry] })),
  setLastSeq: (lastSeq) => set({ lastSeq }),
  reset: () => set({ ...initial }),
}));
