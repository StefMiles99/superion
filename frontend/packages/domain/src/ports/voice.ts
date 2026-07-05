export type VoiceState =
  | "idle"
  | "requesting"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export interface VoiceCallbacks {
  onState: (state: VoiceState) => void;
  onError: (message: string) => void;
}

export interface VoiceConnectOptions {
  signedUrl: string;
  dynamicVariables: Record<string, string>;
}

/**
 * Puerto de conversación de voz. Impls: ElevenLabsVoiceClient (real, SDK) e
 * InMemoryVoiceClient (simula escucha/habla sin ElevenLabs).
 */
export interface IVoiceClient {
  connect(options: VoiceConnectOptions, callbacks: VoiceCallbacks): Promise<void>;
  disconnect(): Promise<void>;
}
