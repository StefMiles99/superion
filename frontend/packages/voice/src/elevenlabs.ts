import type {
  IVoiceClient,
  VoiceCallbacks,
  VoiceConnectOptions,
} from "@superion/domain";

// Interfaz mínima del SDK @elevenlabs/client (desacoplada de su superficie completa).
interface ElevenLabsSession {
  endSession(): Promise<void>;
}

interface StartSessionOptions {
  signedUrl: string;
  dynamicVariables?: Record<string, string>;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (message: string) => void;
  onModeChange?: (mode: { mode: "speaking" | "listening" }) => void;
}

interface ConversationModule {
  Conversation: {
    startSession(options: StartSessionOptions): Promise<ElevenLabsSession>;
  };
}

/** Adaptador real: envuelve el SDK de ElevenLabs tras el puerto IVoiceClient. */
export class ElevenLabsVoiceClient implements IVoiceClient {
  private session: ElevenLabsSession | null = null;

  async connect(options: VoiceConnectOptions, callbacks: VoiceCallbacks): Promise<void> {
    callbacks.onState("connecting");
    const mod = (await import("@elevenlabs/client")) as unknown as ConversationModule;
    this.session = await mod.Conversation.startSession({
      signedUrl: options.signedUrl,
      dynamicVariables: options.dynamicVariables,
      onConnect: () => callbacks.onState("listening"),
      onDisconnect: () => callbacks.onState("idle"),
      onError: (message) => callbacks.onError(message),
      onModeChange: ({ mode }) =>
        callbacks.onState(mode === "speaking" ? "speaking" : "listening"),
    });
  }

  async disconnect(): Promise<void> {
    await this.session?.endSession();
    this.session = null;
  }
}
